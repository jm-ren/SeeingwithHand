import { Point, Tool } from '../types/annotations';
import { CanvasRenderer } from './CanvasRenderer';

export interface InputEvent {
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointerleave' | 'keydown' | 'keyup';
  point?: Point;
  key?: string;
  shiftKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  preventDefault?: () => void;
}

export interface InputHandlerConfig {
  selectedTool: Tool;
  isPolygonMode: boolean;
  isCreatingPolygon: boolean;
  isShiftKeyDown: boolean;
  dwellTime: number;
  moveThreshold: number;
  hoverFadeTime: number;
}

export type InputEventHandler = (event: InputEvent) => void;

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private config: InputHandlerConfig;
  private eventHandlers: Map<string, InputEventHandler[]> = new Map();
  private isPointerDown = false;
  private lastPointerDownTime = 0;
  private lastPointerDownPoint: Point | null = null;
  private dwellTimer: NodeJS.Timeout | null = null;
  private hoverTimer: NodeJS.Timeout | null = null;
  private boundHandlers: Map<string, EventListener> = new Map();

  constructor(canvas: HTMLCanvasElement, renderer: CanvasRenderer, config: InputHandlerConfig) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.config = config;
    this.setupEventListeners();
  }

  updateConfig(config: Partial<InputHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  on(eventType: string, handler: InputEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  off(eventType: string, handler: InputEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(eventType: string, event: InputEvent): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }
  }

  private setupEventListeners(): void {
    // Pointer events
    const handlePointerDown = (e: PointerEvent) => {
      e.preventDefault();
      const point = this.renderer.getCanvasCoordinates(e.clientX, e.clientY);
      if (!point) return;

      this.isPointerDown = true;
      this.lastPointerDownTime = Date.now();
      this.lastPointerDownPoint = point;

      // Clear any existing timers
      if (this.dwellTimer) {
        clearTimeout(this.dwellTimer);
        this.dwellTimer = null;
      }

      // Start dwell timer for point tool
      if (this.config.selectedTool === 'point') {
        this.dwellTimer = setTimeout(() => {
          this.emit('dwell', { type: 'pointerdown', point });
        }, this.config.dwellTime);
      }

      this.emit('pointerdown', {
        type: 'pointerdown',
        point,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        preventDefault: () => e.preventDefault()
      });
    };

    const handlePointerMove = (e: PointerEvent) => {
      e.preventDefault();
      const point = this.renderer.getCanvasCoordinates(e.clientX, e.clientY);
      if (!point) return;

      // Check if we've moved enough to switch from point to freehand
      if (this.isPointerDown && this.lastPointerDownPoint && this.config.selectedTool === 'freehand') {
        const distance = Math.hypot(
          point.x - this.lastPointerDownPoint.x,
          point.y - this.lastPointerDownPoint.y
        );

        if (distance > this.config.moveThreshold) {
          // Cancel dwell timer
          if (this.dwellTimer) {
            clearTimeout(this.dwellTimer);
            this.dwellTimer = null;
          }

          this.emit('freehand-start', { type: 'pointermove', point });
        }
      }

      this.emit('pointermove', {
        type: 'pointermove',
        point,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        preventDefault: () => e.preventDefault()
      });

      // Handle hover traces
      if (!this.isPointerDown) {
        this.handleHoverMove(point);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      e.preventDefault();
      const point = this.renderer.getCanvasCoordinates(e.clientX, e.clientY);
      
      // Clear timers
      if (this.dwellTimer) {
        clearTimeout(this.dwellTimer);
        this.dwellTimer = null;
      }

      const duration = Date.now() - this.lastPointerDownTime;
      
      this.emit('pointerup', {
        type: 'pointerup',
        point,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        preventDefault: () => e.preventDefault()
      });

      // Emit specific events based on interaction type
      if (this.config.selectedTool === 'point' && this.lastPointerDownPoint) {
        if (duration < this.config.dwellTime) {
          this.emit('tap', { type: 'pointerup', point: this.lastPointerDownPoint });
        } else {
          this.emit('dwell', { type: 'pointerup', point: this.lastPointerDownPoint });
        }
      }

      this.isPointerDown = false;
      this.lastPointerDownPoint = null;
    };

    const handlePointerLeave = (e: PointerEvent) => {
      e.preventDefault();
      
      // Clear timers
      if (this.dwellTimer) {
        clearTimeout(this.dwellTimer);
        this.dwellTimer = null;
      }

      this.emit('pointerleave', {
        type: 'pointerleave',
        preventDefault: () => e.preventDefault()
      });

      if (this.isPointerDown) {
        // Treat as pointer up if we were drawing
        this.emit('pointerup', {
          type: 'pointerup',
          point: this.lastPointerDownPoint,
          preventDefault: () => e.preventDefault()
        });
      }

      this.isPointerDown = false;
      this.lastPointerDownPoint = null;
    };

    // Keyboard events
    const handleKeyDown = (e: KeyboardEvent) => {
      this.emit('keydown', {
        type: 'keydown',
        key: e.key,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        preventDefault: () => e.preventDefault()
      });

      // Handle specific key combinations
      if (e.key === 'Escape') {
        this.emit('escape', { type: 'keydown', key: e.key });
      }

      if (e.key === 'Shift') {
        this.emit('shift-down', { type: 'keydown', key: e.key });
      }

      if (e.key === ' ' && e.shiftKey) {
        this.emit('shift-space', { type: 'keydown', key: e.key });
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      this.emit('keyup', {
        type: 'keyup',
        key: e.key,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        preventDefault: () => e.preventDefault()
      });

      if (e.key === 'Shift') {
        this.emit('shift-up', { type: 'keyup', key: e.key });
      }
    };

    // Bind and store event listeners
    this.boundHandlers.set('pointerdown', handlePointerDown);
    this.boundHandlers.set('pointermove', handlePointerMove);
    this.boundHandlers.set('pointerup', handlePointerUp);
    this.boundHandlers.set('pointerleave', handlePointerLeave);
    this.boundHandlers.set('keydown', handleKeyDown);
    this.boundHandlers.set('keyup', handleKeyUp);

    // Add event listeners
    this.canvas.addEventListener('pointerdown', handlePointerDown);
    this.canvas.addEventListener('pointermove', handlePointerMove);
    this.canvas.addEventListener('pointerup', handlePointerUp);
    this.canvas.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Prevent context menu and selection
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('selectstart', (e) => e.preventDefault());
    this.canvas.addEventListener('copy', (e) => e.preventDefault());
    this.canvas.addEventListener('cut', (e) => e.preventDefault());
    this.canvas.addEventListener('paste', (e) => e.preventDefault());
  }

  private handleHoverMove(point: Point): void {
    // Clear existing hover timer
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
    }

    // Emit hover move event
    this.emit('hover-move', { type: 'pointermove', point });

    // Set new hover timer
    this.hoverTimer = setTimeout(() => {
      this.emit('hover-end', { type: 'pointermove', point });
    }, this.config.hoverFadeTime);
  }

  public destroy(): void {
    // Remove all event listeners
    this.boundHandlers.forEach((handler, eventType) => {
      if (eventType === 'keydown' || eventType === 'keyup') {
        window.removeEventListener(eventType, handler);
      } else {
        this.canvas.removeEventListener(eventType, handler);
      }
    });

    // Clear timers
    if (this.dwellTimer) {
      clearTimeout(this.dwellTimer);
      this.dwellTimer = null;
    }

    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }

    // Clear handlers
    this.eventHandlers.clear();
    this.boundHandlers.clear();
  }

  // Utility methods
  public isDrawing(): boolean {
    return this.isPointerDown;
  }

  public getCurrentTool(): Tool {
    return this.config.selectedTool;
  }

  public getLastPointerPosition(): Point | null {
    return this.lastPointerDownPoint;
  }
} 
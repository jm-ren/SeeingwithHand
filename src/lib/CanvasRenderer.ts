import { Annotation, Point, Tool } from '../types/annotations';
import { appSettings } from '../config/appConfig';

export interface CanvasConfig {
  width: number;
  height: number;
  imageScaling: {
    width: number;
    height: number;
    x: number;
    y: number;
  } | null;
  selectedColor: string;
  selectedAnnotations: string[];
}

export interface DrawingState {
  currentTrace: Point[];
  traceType: 'none' | 'point' | 'freehand' | 'hover';
  dwellRadius: number;
  hoverTrace: Point[];
  hoverFadeAlpha: number;
  currentAnnotation: Point[];
  tempMousePos: Point | null;
  isCreatingPolygon: boolean;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private image: HTMLImageElement | null = null;
  private config: CanvasConfig;

  constructor(canvas: HTMLCanvasElement, config: CanvasConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
    
    if (!this.ctx) {
      throw new Error('Unable to get 2D context from canvas');
    }
  }

  setImage(image: HTMLImageElement): void {
    this.image = image;
  }

  updateConfig(config: Partial<CanvasConfig>): void {
    this.config = { ...this.config, ...config };
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawImage(): void {
    console.log('[CanvasRenderer] drawImage called, image:', !!this.image, 'imageScaling:', this.config.imageScaling);
    if (!this.image || !this.config.imageScaling) return;

    const { x, y, width, height } = this.config.imageScaling;
    console.log('[CanvasRenderer] Drawing image at:', { x, y, width, height });
    this.ctx.drawImage(this.image, x, y, width, height);
  }

  drawAnnotations(annotations: Annotation[]): void {
    annotations.forEach(annotation => {
      this.drawAnnotation(annotation);
    });
  }

  private drawAnnotation(annotation: Annotation): void {
    const isSelected = this.config.selectedAnnotations.includes(annotation.id);
    const strokeColor = isSelected ? `${this.config.selectedColor}CC` : `${this.config.selectedColor}AA`;
    const lineWidth = isSelected ? appSettings.canvas.selectionLineWidth : appSettings.canvas.lineWidth;
    const fillColor = isSelected ? `${this.config.selectedColor}33` : `${this.config.selectedColor}1A`;

    this.ctx.save();
    this.ctx.strokeStyle = strokeColor;
    this.ctx.fillStyle = fillColor;
    this.ctx.lineWidth = lineWidth;

    switch (annotation.type) {
      case 'point':
        this.drawPoint(annotation.points[0], isSelected);
        break;
      case 'line':
        if (annotation.points.length >= 2) {
          this.drawLine(annotation.points[0], annotation.points[1]);
        }
        break;
      case 'frame':
        this.drawFrame(annotation.points);
        break;
      case 'area':
        this.drawArea(annotation.points);
        break;
      case 'freehand':
        this.drawFreehand(annotation.points);
        break;
      case 'hover':
        this.drawHover(annotation.points);
        break;
    }

    this.ctx.restore();
  }

  private drawPoint(point: Point, isSelected: boolean): void {
    const radius = isSelected ? appSettings.canvas.pointRadius + 2 : appSettings.canvas.pointRadius;
    
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    if (isSelected) {
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, radius + 3, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  private drawLine(start: Point, end: Point): void {
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();
  }

  private drawFrame(points: Point[]): void {
    if (points.length < 2) return;

    this.ctx.beginPath();
    
    if (points.length >= 3) {
      // Polygon mode
      this.ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this.ctx.lineTo(points[i].x, points[i].y);
      }
      this.ctx.closePath();
    } else {
      // Rectangle mode (legacy)
      const width = points[1].x - points[0].x;
      const height = points[1].y - points[0].y;
      this.ctx.rect(points[0].x, points[0].y, width, height);
    }
    
    this.ctx.stroke();
  }

  private drawArea(points: Point[]): void {
    if (points.length < 2) return;

    this.ctx.beginPath();
    
    if (points.length >= 3) {
      // Polygon mode
      this.ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this.ctx.lineTo(points[i].x, points[i].y);
      }
      this.ctx.closePath();
    } else {
      // Rectangle mode (legacy)
      const width = points[1].x - points[0].x;
      const height = points[1].y - points[0].y;
      this.ctx.rect(points[0].x, points[0].y, width, height);
    }
    
    this.ctx.fill();
    this.ctx.stroke();
  }

  private drawFreehand(points: Point[]): void {
    if (points.length < 2) return;

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    
    this.ctx.stroke();
  }

  private drawHover(points: Point[]): void {
    if (points.length < 2) return;

    this.ctx.save();
    this.ctx.globalAlpha = 0.3;
    this.ctx.lineWidth = appSettings.canvas.lineWidth * 0.8;
    
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawCurrentTrace(state: DrawingState): void {
    if (state.currentTrace.length === 0) return;

    this.ctx.save();
    this.ctx.strokeStyle = this.config.selectedColor;
    this.ctx.fillStyle = this.config.selectedColor;
    this.ctx.lineWidth = appSettings.canvas.lineWidth;

    switch (state.traceType) {
      case 'point':
        if (state.currentTrace.length === 1) {
          this.ctx.beginPath();
          this.ctx.arc(
            state.currentTrace[0].x,
            state.currentTrace[0].y,
            state.dwellRadius,
            0,
            Math.PI * 2
          );
          this.ctx.fill();
        }
        break;
      case 'freehand':
        if (state.currentTrace.length >= 2) {
          this.ctx.beginPath();
          this.ctx.moveTo(state.currentTrace[0].x, state.currentTrace[0].y);
          for (let i = 1; i < state.currentTrace.length; i++) {
            this.ctx.lineTo(state.currentTrace[i].x, state.currentTrace[i].y);
          }
          this.ctx.stroke();
        }
        break;
    }

    this.ctx.restore();
  }

  drawHoverTrace(points: Point[], alpha: number): void {
    if (points.length < 2 || alpha <= 0) return;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.strokeStyle = this.config.selectedColor;
    this.ctx.lineWidth = appSettings.canvas.lineWidth;
    this.ctx.shadowColor = this.config.selectedColor;
    this.ctx.shadowBlur = 6;

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawPolygonInProgress(points: Point[], tempMousePos: Point | null): void {
    if (points.length === 0) return;

    this.ctx.save();
    this.ctx.strokeStyle = this.config.selectedColor;
    this.ctx.lineWidth = appSettings.canvas.lineWidth;
    this.ctx.setLineDash([5, 5]);

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    
    // Draw line to current mouse position
    if (tempMousePos) {
      this.ctx.lineTo(tempMousePos.x, tempMousePos.y);
    }
    
    this.ctx.stroke();
    this.ctx.restore();

    // Draw points
    points.forEach((point, index) => {
      this.ctx.save();
      this.ctx.fillStyle = index === 0 ? '#ff0000' : this.config.selectedColor;
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  render(annotations: Annotation[], drawingState: DrawingState): void {
    this.clear();
    this.drawImage();
    this.drawAnnotations(annotations);
    this.drawCurrentTrace(drawingState);
    this.drawHoverTrace(drawingState.hoverTrace, drawingState.hoverFadeAlpha);
    
    if (drawingState.isCreatingPolygon) {
      this.drawPolygonInProgress(drawingState.currentAnnotation, drawingState.tempMousePos);
    }
  }

  // Utility methods for coordinate conversion
  getCanvasCoordinates(clientX: number, clientY: number): Point | null {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  isPointInAnnotation(point: Point, annotation: Annotation): boolean {
    switch (annotation.type) {
      case 'point':
        if (annotation.points[0]) {
          const distance = Math.hypot(
            annotation.points[0].x - point.x,
            annotation.points[0].y - point.y
          );
          return distance <= appSettings.canvas.pointRadius + 5;
        }
        break;
      case 'line':
        if (annotation.points.length >= 2) {
          return this.isPointNearLine(point, annotation.points[0], annotation.points[1], 10);
        }
        break;
      case 'frame':
      case 'area':
        if (annotation.points.length >= 3) {
          return this.isPointInPolygon(point, annotation.points);
        } else if (annotation.points.length === 2) {
          return this.isPointInRect(point, annotation.points[0], annotation.points[1]);
        }
        break;
      case 'freehand':
        return this.isPointNearPolyline(point, annotation.points, 10);
    }
    return false;
  }

  private isPointNearLine(point: Point, start: Point, end: Point, tolerance: number): boolean {
    const A = point.x - start.x;
    const B = point.y - start.y;
    const C = end.x - start.x;
    const D = end.y - start.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = start.x;
      yy = start.y;
    } else if (param > 1) {
      xx = end.x;
      yy = end.y;
    } else {
      xx = start.x + param * C;
      yy = start.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy) <= tolerance;
  }

  private isPointInPolygon(point: Point, polygon: Point[]): boolean {
    const x = point.x;
    const y = point.y;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  private isPointInRect(point: Point, topLeft: Point, bottomRight: Point): boolean {
    return point.x >= Math.min(topLeft.x, bottomRight.x) &&
           point.x <= Math.max(topLeft.x, bottomRight.x) &&
           point.y >= Math.min(topLeft.y, bottomRight.y) &&
           point.y <= Math.max(topLeft.y, bottomRight.y);
  }

  private isPointNearPolyline(point: Point, polyline: Point[], tolerance: number): boolean {
    for (let i = 0; i < polyline.length - 1; i++) {
      if (this.isPointNearLine(point, polyline[i], polyline[i + 1], tolerance)) {
        return true;
      }
    }
    return false;
  }
} 
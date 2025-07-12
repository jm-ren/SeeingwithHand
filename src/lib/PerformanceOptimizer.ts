import { Annotation } from '../types/annotations';

export interface PerformanceMetrics {
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  lastRenderTime: number;
  frameDrops: number;
}

export class PerformanceOptimizer {
  private metrics: PerformanceMetrics = {
    renderCount: 0,
    totalRenderTime: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    frameDrops: 0,
  };

  private renderCache = new Map<string, ImageData>();
  private lastRenderHash = '';
  private animationFrameId: number | null = null;
  private pendingRender: (() => void) | null = null;

  // Memoization for expensive calculations
  private memoCache = new Map<string, any>();

  constructor(private maxCacheSize = 50) {}

  // Generate a hash for the current render state
  generateRenderHash(annotations: Annotation[], selectedAnnotations: string[], selectedColor: string): string {
    const data = {
      annotations: annotations.map(a => ({
        id: a.id,
        type: a.type,
        points: a.points,
        color: a.color,
        selected: selectedAnnotations.includes(a.id),
      })),
      selectedColor,
      selectedCount: selectedAnnotations.length,
    };
    
    return JSON.stringify(data);
  }

  // Check if render is needed
  shouldRender(renderHash: string): boolean {
    return renderHash !== this.lastRenderHash;
  }

  // Throttle render calls using requestAnimationFrame
  throttleRender(renderFn: () => void): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.pendingRender = renderFn;
    this.animationFrameId = requestAnimationFrame(() => {
      if (this.pendingRender) {
        this.executeRender(this.pendingRender);
        this.pendingRender = null;
      }
      this.animationFrameId = null;
    });
  }

  // Execute render with performance tracking
  private executeRender(renderFn: () => void): void {
    const startTime = performance.now();
    
    try {
      renderFn();
    } catch (error) {
      console.error('Render error:', error);
    }
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    this.updateMetrics(renderTime);
    
    // Check for frame drops (> 16ms indicates dropped frames at 60fps)
    if (renderTime > 16) {
      this.metrics.frameDrops++;
      console.warn(`Slow render detected: ${renderTime.toFixed(2)}ms`);
    }
  }

  // Update performance metrics
  private updateMetrics(renderTime: number): void {
    this.metrics.renderCount++;
    this.metrics.totalRenderTime += renderTime;
    this.metrics.averageRenderTime = this.metrics.totalRenderTime / this.metrics.renderCount;
    this.metrics.lastRenderTime = renderTime;
  }

  // Memoize expensive calculations
  memoize<T>(key: string, computeFn: () => T): T {
    if (this.memoCache.has(key)) {
      return this.memoCache.get(key);
    }

    const result = computeFn();
    
    // Limit cache size
    if (this.memoCache.size >= this.maxCacheSize) {
      const firstKey = this.memoCache.keys().next().value;
      this.memoCache.delete(firstKey);
    }
    
    this.memoCache.set(key, result);
    return result;
  }

  // Cache canvas ImageData for unchanged regions
  cacheCanvasRegion(canvas: HTMLCanvasElement, region: string, x: number, y: number, width: number, height: number): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const imageData = ctx.getImageData(x, y, width, height);
      
      if (this.renderCache.size >= this.maxCacheSize) {
        const firstKey = this.renderCache.keys().next().value;
        this.renderCache.delete(firstKey);
      }
      
      this.renderCache.set(region, imageData);
    } catch (error) {
      console.warn('Failed to cache canvas region:', error);
    }
  }

  // Restore cached canvas region
  restoreCanvasRegion(canvas: HTMLCanvasElement, region: string, x: number, y: number): boolean {
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    const imageData = this.renderCache.get(region);
    if (!imageData) return false;

    try {
      ctx.putImageData(imageData, x, y);
      return true;
    } catch (error) {
      console.warn('Failed to restore canvas region:', error);
      return false;
    }
  }

  // Batch annotation processing
  batchProcessAnnotations<T>(annotations: Annotation[], processFn: (annotation: Annotation) => T, batchSize = 10): T[] {
    const results: T[] = [];
    
    for (let i = 0; i < annotations.length; i += batchSize) {
      const batch = annotations.slice(i, i + batchSize);
      const batchResults = batch.map(processFn);
      results.push(...batchResults);
      
      // Yield control to prevent blocking
      if (i + batchSize < annotations.length) {
        // Use a micro-task to yield control
        Promise.resolve().then(() => {});
      }
    }
    
    return results;
  }

  // Optimize drawing by grouping similar operations
  optimizeDrawingOperations(annotations: Annotation[]): Map<string, Annotation[]> {
    const grouped = new Map<string, Annotation[]>();
    
    for (const annotation of annotations) {
      const key = `${annotation.type}-${annotation.color}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      
      grouped.get(key)!.push(annotation);
    }
    
    return grouped;
  }

  // Dirty region tracking for partial redraws
  private dirtyRegions: Set<string> = new Set();

  markRegionDirty(region: string): void {
    this.dirtyRegions.add(region);
  }

  clearDirtyRegions(): void {
    this.dirtyRegions.clear();
  }

  getDirtyRegions(): string[] {
    return Array.from(this.dirtyRegions);
  }

  // Viewport culling - only render visible annotations
  cullAnnotations(annotations: Annotation[], viewportBounds: { x: number; y: number; width: number; height: number }): Annotation[] {
    return annotations.filter(annotation => {
      if (!annotation.points || annotation.points.length === 0) return false;
      
      // Simple bounding box check
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      for (const point of annotation.points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
      
      // Check if annotation bounding box intersects with viewport
      return !(maxX < viewportBounds.x || 
               minX > viewportBounds.x + viewportBounds.width ||
               maxY < viewportBounds.y || 
               minY > viewportBounds.y + viewportBounds.height);
    });
  }

  // Level of detail - simplify annotations based on zoom level
  applyLevelOfDetail(annotations: Annotation[], zoomLevel: number): Annotation[] {
    if (zoomLevel >= 1) return annotations; // Full detail

    return annotations.map(annotation => {
      if (annotation.type === 'freehand' && annotation.points.length > 10) {
        // Simplify freehand annotations at low zoom
        const step = Math.max(1, Math.floor(annotation.points.length / 20));
        const simplifiedPoints = annotation.points.filter((_, index) => index % step === 0);
        
        return {
          ...annotation,
          points: simplifiedPoints,
        };
      }
      
      return annotation;
    });
  }

  // Get performance metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Reset performance metrics
  resetMetrics(): void {
    this.metrics = {
      renderCount: 0,
      totalRenderTime: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      frameDrops: 0,
    };
  }

  // Clear all caches
  clearCaches(): void {
    this.renderCache.clear();
    this.memoCache.clear();
    this.dirtyRegions.clear();
  }

  // Cleanup resources
  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.clearCaches();
    this.pendingRender = null;
  }
}

// Global performance optimizer instance
export const performanceOptimizer = new PerformanceOptimizer();

// Performance monitoring utilities
export class PerformanceMonitor {
  private observers: Map<string, PerformanceObserver> = new Map();
  private metrics: Map<string, number[]> = new Map();

  startMonitoring(name: string): void {
    if (this.observers.has(name)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        if (entry.name === name) {
          this.recordMetric(name, entry.duration);
        }
      }
    });

    observer.observe({ entryTypes: ['measure'] });
    this.observers.set(name, observer);
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }

  getAverageMetric(name: string): number {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return 0;
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  stopMonitoring(name: string): void {
    const observer = this.observers.get(name);
    if (observer) {
      observer.disconnect();
      this.observers.delete(name);
    }
  }

  destroy(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
    this.metrics.clear();
  }
}

// Helper function to measure performance
export function measurePerformance<T>(name: string, fn: () => T): T {
  performance.mark(`${name}-start`);
  const result = fn();
  performance.mark(`${name}-end`);
  performance.measure(name, `${name}-start`, `${name}-end`);
  return result;
} 
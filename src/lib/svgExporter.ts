import { Annotation, Point } from '../types/annotations';

export interface SvgExportOptions {
  width?: number;
  height?: number;
  strokeWidth?: number;
  includeTimestamps?: boolean;
  backgroundColor?: string;
}

/**
 * Converts an array of annotations to a transparent SVG string
 */
export function exportAnnotationsToSvg(
  annotations: Annotation[],
  options: SvgExportOptions = {}
): string {
  const {
    width = 1200,
    height = 800,
    strokeWidth = 2,
    includeTimestamps = false,
    backgroundColor = 'transparent'
  } = options;

  // Calculate bounding box of all annotations to optimize SVG size
  const bounds = calculateAnnotationBounds(annotations);
  const svgWidth = bounds.width > 0 ? Math.max(bounds.width + 100, width) : width;
  const svgHeight = bounds.height > 0 ? Math.max(bounds.height + 100, height) : height;

  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" 
     xmlns="http://www.w3.org/2000/svg" 
     style="background: ${backgroundColor};">
  <defs>
    <style>
      .annotation-trace { 
        stroke-linecap: round; 
        stroke-linejoin: round; 
        fill: none; 
      }
      .annotation-point { 
        stroke-linecap: round; 
        stroke-linejoin: round; 
      }
      .annotation-area { 
        stroke-linecap: round; 
        stroke-linejoin: round; 
        fill-opacity: 0.2; 
      }
    </style>
  </defs>
  <g id="annotations">
`;

  // Sort annotations by timestamp to maintain drawing order
  const sortedAnnotations = [...annotations].sort((a, b) => a.timestamp - b.timestamp);

  sortedAnnotations.forEach((annotation, index) => {
    const opacity = 0.8;
    const color = annotation.color || '#2CA800';
    
    svgContent += `    <!-- Annotation ${index + 1}: ${annotation.type} -->
`;

    switch (annotation.type) {
      case 'point':
        if (annotation.points.length > 0) {
          const point = annotation.points[0];
          svgContent += `    <circle cx="${point.x}" cy="${point.y}" r="6" 
                      fill="${color}" opacity="${opacity}" 
                      class="annotation-point"`;
          if (includeTimestamps) {
            svgContent += ` data-timestamp="${annotation.timestamp}"`;
          }
          svgContent += `/>\n`;
        }
        break;

      case 'line':
        if (annotation.points.length >= 2) {
          const start = annotation.points[0];
          const end = annotation.points[1];
          svgContent += `    <line x1="${start.x}" y1="${start.y}" 
                     x2="${end.x}" y2="${end.y}" 
                     stroke="${color}" stroke-width="${strokeWidth}" 
                     opacity="${opacity}" class="annotation-trace"`;
          if (includeTimestamps) {
            svgContent += ` data-timestamp="${annotation.timestamp}"`;
          }
          svgContent += `/>\n`;
        }
        break;

      case 'frame':
        if (annotation.points.length >= 3) {
          // Multi-point polygon
          const pathData = annotation.points.map((point, i) => 
            i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
          ).join(' ') + ' Z';
          
          svgContent += `    <path d="${pathData}" 
                     stroke="${color}" stroke-width="${strokeWidth}" 
                     fill="none" opacity="${opacity}" 
                     class="annotation-trace"`;
          if (includeTimestamps) {
            svgContent += ` data-timestamp="${annotation.timestamp}"`;
          }
          svgContent += `/>\n`;
        } else if (annotation.points.length === 2) {
          // Legacy rectangle format
          const start = annotation.points[0];
          const end = annotation.points[1];
          const width = end.x - start.x;
          const height = end.y - start.y;
          
          svgContent += `    <rect x="${start.x}" y="${start.y}" 
                     width="${width}" height="${height}" 
                     stroke="${color}" stroke-width="${strokeWidth}" 
                     fill="none" opacity="${opacity}" 
                     class="annotation-trace"`;
          if (includeTimestamps) {
            svgContent += ` data-timestamp="${annotation.timestamp}"`;
          }
          svgContent += `/>\n`;
        }
        break;

      case 'area':
        if (annotation.points.length >= 3) {
          // Multi-point polygon with fill
          const pathData = annotation.points.map((point, i) => 
            i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
          ).join(' ') + ' Z';
          
          svgContent += `    <path d="${pathData}" 
                     stroke="${color}" stroke-width="${strokeWidth}" 
                     fill="${color}" opacity="${opacity}" 
                     class="annotation-area"`;
          if (includeTimestamps) {
            svgContent += ` data-timestamp="${annotation.timestamp}"`;
          }
          svgContent += `/>\n`;
        } else if (annotation.points.length === 2) {
          // Legacy rectangle format with fill
          const start = annotation.points[0];
          const end = annotation.points[1];
          const width = end.x - start.x;
          const height = end.y - start.y;
          
          svgContent += `    <rect x="${start.x}" y="${start.y}" 
                     width="${width}" height="${height}" 
                     stroke="${color}" stroke-width="${strokeWidth}" 
                     fill="${color}" fill-opacity="0.2" opacity="${opacity}" 
                     class="annotation-area"`;
          if (includeTimestamps) {
            svgContent += ` data-timestamp="${annotation.timestamp}"`;
          }
          svgContent += `/>\n`;
        }
        break;

      case 'freehand':
        if (annotation.points.length > 1) {
          const pathData = annotation.points.map((point, i) => 
            i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
          ).join(' ');
          
          svgContent += `    <path d="${pathData}" 
                     stroke="${color}" stroke-width="${strokeWidth}" 
                     fill="none" opacity="${opacity}" 
                     class="annotation-trace"`;
          if (includeTimestamps) {
            svgContent += ` data-timestamp="${annotation.timestamp}"`;
          }
          svgContent += `/>\n`;
        } else if (annotation.points.length === 1) {
          // Single point freehand as a small circle
          const point = annotation.points[0];
          svgContent += `    <circle cx="${point.x}" cy="${point.y}" r="3" 
                      fill="${color}" opacity="${opacity}" 
                      class="annotation-point"`;
          if (includeTimestamps) {
            svgContent += ` data-timestamp="${annotation.timestamp}"`;
          }
          svgContent += `/>\n`;
        }
        break;

      default:
        console.warn(`Unknown annotation type: ${annotation.type}`);
        break;
    }
  });

  svgContent += `  </g>
</svg>`;

  return svgContent;
}

/**
 * Calculate bounding box of all annotations
 */
function calculateAnnotationBounds(annotations: Annotation[]): { 
  minX: number; 
  minY: number; 
  maxX: number; 
  maxY: number; 
  width: number; 
  height: number; 
} {
  if (annotations.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  annotations.forEach(annotation => {
    annotation.points.forEach(point => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
  });

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Download SVG file
 */
export function downloadSvgFile(svgContent: string, filename: string = 'annotations-traces.svg'): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Main export function that combines everything
 */
export function exportAndDownloadTraces(
  annotations: Annotation[],
  options: SvgExportOptions = {},
  filename?: string
): void {
  if (annotations.length === 0) {
    console.warn('No annotations to export');
    return;
  }

  const svgContent = exportAnnotationsToSvg(annotations, options);
  const defaultFilename = `traces-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.svg`;
  downloadSvgFile(svgContent, filename || defaultFilename);
  
  console.log(`Exported ${annotations.length} annotations to SVG file`);
} 
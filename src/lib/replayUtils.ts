import { Annotation, Point } from "../types/annotations";

/**
 * Returns a new array of annotations sorted ascending by timestamp.
 */
export function sortAnnotationsByTime(annotations: Annotation[]): Annotation[] {
  return [...annotations].sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Determines the timeline anchor point (t=0 for playback).
 * Uses sessionStartTime when available, otherwise falls back to the first
 * stroke's timestamp, and finally to 0 if there are no strokes.
 */
export function computeReplayBaseTime(
  sortedAnnotations: Annotation[],
  sessionStartTime: number | null | undefined
): number {
  return sessionStartTime ?? (sortedAnnotations[0]?.timestamp ?? 0);
}

/**
 * Returns the total playback duration in milliseconds.
 * Duration spans from replayBaseTime to the last stroke's timestamp.
 * Returns 0 for an empty annotation set.
 */
export function computeTotalDuration(
  sortedAnnotations: Annotation[],
  replayBaseTime: number
): number {
  if (sortedAnnotations.length === 0) return 0;
  return Math.max(...sortedAnnotations.map((a) => a.timestamp)) - replayBaseTime;
}

/**
 * Draws a single annotation onto a canvas context with time-based progressive
 * animation. This is the per-annotation drawing logic extracted from SessionReplay
 * so it can be unit-tested independently of the React component.
 *
 * @param ctx         The 2D canvas context to draw onto
 * @param annotation  The annotation to draw
 * @param timeSinceStart  Milliseconds elapsed since this annotation's start time
 * @param convertPoint    Coordinate transformer (recording space → display space)
 */
export function drawProgressiveAnnotation(
  ctx: CanvasRenderingContext2D,
  annotation: Annotation,
  timeSinceStart: number,
  convertPoint: (p: Point) => Point
): void {
  ctx.strokeStyle = annotation.color || '#2CA800';
  ctx.fillStyle = annotation.color || '#2CA800';
  ctx.lineWidth = 2;

  switch (annotation.type) {
    case 'point':
      if (annotation.points[0]) {
        const point = convertPoint(annotation.points[0]);
        ctx.beginPath();
        ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'line':
      if (annotation.points.length >= 2) {
        const startPoint = convertPoint(annotation.points[0]);
        const endPoint = convertPoint(annotation.points[1]);

        const lineDuration = 1000;
        const lineProgress = Math.min(timeSinceStart / lineDuration, 1);

        const currentEndX = startPoint.x + (endPoint.x - startPoint.x) * lineProgress;
        const currentEndY = startPoint.y + (endPoint.y - startPoint.y) * lineProgress;

        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(currentEndX, currentEndY);
        ctx.stroke();
      }
      break;

    case 'freehand':
      if (annotation.points.length > 1) {
        const freehandDuration = 2000;
        const freehandProgress = Math.min(timeSinceStart / freehandDuration, 1);
        const pointsToShow = Math.floor(annotation.points.length * freehandProgress);

        if (pointsToShow > 0) {
          ctx.beginPath();
          const firstPoint = convertPoint(annotation.points[0]);
          ctx.moveTo(firstPoint.x, firstPoint.y);

          for (let i = 1; i < pointsToShow; i++) {
            const point = convertPoint(annotation.points[i]);
            ctx.lineTo(point.x, point.y);
          }

          if (pointsToShow < annotation.points.length) {
            const lastComplete = convertPoint(annotation.points[pointsToShow - 1]);
            const next = convertPoint(annotation.points[pointsToShow]);
            const segProgress = (annotation.points.length * freehandProgress) - pointsToShow;
            ctx.lineTo(
              lastComplete.x + (next.x - lastComplete.x) * segProgress,
              lastComplete.y + (next.y - lastComplete.y) * segProgress
            );
          }

          ctx.stroke();
        }
      }
      break;

    case 'frame':
    case 'area':
      if (annotation.points.length >= 3) {
        const animationDuration = 1500;
        // The closing segment (last point → first point) is one extra segment
        const totalSegments = annotation.points.length; // N vertices = N segments (last closes back)
        const animationProgress = Math.min(timeSinceStart / animationDuration, 1);
        const segmentsProgress = totalSegments * animationProgress;
        const completeSegments = Math.floor(segmentsProgress);

        if (segmentsProgress > 0) {
          ctx.beginPath();
          const firstPoint = convertPoint(annotation.points[0]);
          ctx.moveTo(firstPoint.x, firstPoint.y);

          // Draw all fully complete segments
          for (let i = 1; i <= Math.min(completeSegments, annotation.points.length - 1); i++) {
            const point = convertPoint(annotation.points[i]);
            ctx.lineTo(point.x, point.y);
          }

          // Draw the partial segment currently in progress
          const partialProgress = segmentsProgress - completeSegments;
          if (animationProgress < 1 && partialProgress > 0) {
            const fromIndex = Math.min(completeSegments, annotation.points.length - 1);
            const from = convertPoint(annotation.points[fromIndex]);
            // The closing segment connects last point back to first
            const toIndex = fromIndex === annotation.points.length - 1 ? 0 : fromIndex + 1;
            const to = convertPoint(annotation.points[toIndex]);
            ctx.lineTo(
              from.x + (to.x - from.x) * partialProgress,
              from.y + (to.y - from.y) * partialProgress
            );
          }

          if (animationProgress >= 1) {
            ctx.closePath();
          }

          ctx.stroke();

          if (annotation.type === 'area' && animationProgress >= 1) {
            ctx.globalAlpha = 0.2;
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      }
      break;

    default:
      if (annotation.points[0]) {
        const point = convertPoint(annotation.points[0]);
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
  }
}

export interface PolygonSVGResult {
  pathData: string;
  isClosed: boolean;
  shouldFill: boolean;
}

/**
 * SVG-output equivalent of the frame/area branch in drawProgressiveAnnotation.
 * Uses the same segment-based math (1500ms duration, edge interpolation, closing
 * segment) but returns an SVG path string instead of issuing canvas commands.
 *
 * This allows AmbienceSurvey (SVG) and SessionReplay (canvas) to share one
 * animation algorithm.
 */
export function computeProgressivePolygonPath(
  points: Point[],
  annotationType: "frame" | "area",
  timeSinceStart: number,
  convertPoint: (p: Point) => Point
): PolygonSVGResult {
  if (points.length < 3 || timeSinceStart <= 0) {
    return { pathData: "", isClosed: false, shouldFill: false };
  }

  const animationDuration = 1500;
  const totalSegments = points.length;
  const progress = Math.min(timeSinceStart / animationDuration, 1);
  const segmentsProgress = totalSegments * progress;
  const completeSegments = Math.floor(segmentsProgress);

  const parts: string[] = [];
  const first = convertPoint(points[0]);
  parts.push(`M ${first.x} ${first.y}`);

  for (let i = 1; i <= Math.min(completeSegments, points.length - 1); i++) {
    const p = convertPoint(points[i]);
    parts.push(`L ${p.x} ${p.y}`);
  }

  const partialProgress = segmentsProgress - completeSegments;
  if (progress < 1 && partialProgress > 0) {
    const fromIndex = Math.min(completeSegments, points.length - 1);
    const from = convertPoint(points[fromIndex]);
    const toIndex = fromIndex === points.length - 1 ? 0 : fromIndex + 1;
    const to = convertPoint(points[toIndex]);
    parts.push(
      `L ${from.x + (to.x - from.x) * partialProgress} ${from.y + (to.y - from.y) * partialProgress}`
    );
  }

  const isClosed = progress >= 1;
  if (isClosed) {
    parts.push("Z");
  }

  return {
    pathData: parts.join(" "),
    isClosed,
    shouldFill: annotationType === "area" && isClosed,
  };
}

/**
 * Filters annotations to only those whose relative time is at or before
 * currentTime. Assumes sortedAnnotations are already sorted by timestamp.
 */
export function getAnnotationsAtTime(
  sortedAnnotations: Annotation[],
  replayBaseTime: number,
  currentTime: number
): Annotation[] {
  return sortedAnnotations.filter(
    (annotation) => annotation.timestamp - replayBaseTime <= currentTime
  );
}

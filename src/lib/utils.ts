import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Point, Annotation, TraceItem, Tool } from "../types/annotations"
import { v4 as uuidv4 } from 'uuid';

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a timestamp in milliseconds to a human-readable format
 * @param ms Timestamp in milliseconds
 * @returns Formatted time string
 */
export function formatTimeGap(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.round(ms / 100) / 10
  return `${seconds}s`
}

/**
 * Formats coordinates for display in the traceboard
 * @param points Array of points
 * @param type Tool type
 * @returns Formatted coordinates string
 */
export function formatCoordinates(points: Point[], type: Tool): string {
  if (points.length === 0) return "";

  switch (type) {
    case "point":
      return `(${Math.round(points[0].x)},${Math.round(points[0].y)})`;
    
    case "line":
      if (points.length < 2) return `Start: (${Math.round(points[0].x)},${Math.round(points[0].y)})`;
      return `(${Math.round(points[0].x)},${Math.round(points[0].y)}) → (${Math.round(points[1].x)},${Math.round(points[1].y)})`;
    
    case "frame":
      // For polygon frames with 3+ points
      if (points.length > 2) {
        return `Polygon: ${points.length} points`;
      }
      // For legacy rectangle frames
      if (points.length < 2) return `Top-left: (${Math.round(points[0].x)},${Math.round(points[0].y)})`;
      return `Rectangle: (${Math.round(points[0].x)},${Math.round(points[0].y)}) to (${Math.round(points[1].x)},${Math.round(points[1].y)})`;
    
    case "area":
      // For polygon areas with 3+ points
      if (points.length > 2) {
        return `Polygon area: ${points.length} points`;
      }
      // For legacy rectangle areas
      if (points.length < 2) return `Top-left: (${Math.round(points[0].x)},${Math.round(points[0].y)})`;
      return `Rectangle area: (${Math.round(points[0].x)},${Math.round(points[0].y)}) to (${Math.round(points[1].x)},${Math.round(points[1].y)})`;
    
    case "freehand":
      return `Freehand: ${points.length} points`;
    
    case "group":
      return "Group created";
    
    default:
      return points.map(p => `(${Math.round(p.x)},${Math.round(p.y)})`).join(", ");
  }
}

/**
 * Formats freehand trace coordinates for display
 * @param coordinates Raw coordinate string
 * @returns Formatted coordinate string
 */
export function formatFreehandTrace(coordinates: string): string {
  // Extract the number of points from the coordinates string
  const pointCount = coordinates.split("),").length
  return `Freehand trace with ${pointCount} points`
}

/**
 * Processes annotation data for display in the traceboard
 * @param annotations Array of annotations
 * @returns Formatted trace items for display
 */
export function processTracesForDisplay(annotations: Annotation[]): TraceItem[] {
  const annotationTraces = annotations.map((annotation) => ({
    id: annotation.timestamp.toString(),
    timestamp: new Date(annotation.timestamp).toLocaleTimeString(),
    type: annotation.type,
    coordinates: formatCoordinates(annotation.points, annotation.type),
    // Use the first groupId for display purposes if multiple exist
    groupId: annotation.groupIds?.[0],
    numericTimestamp: annotation.timestamp
  }));

  // Create a set to track unique groupIds that we've processed
  const processedGroupIds = new Set<string>();
  const groupTraces: TraceItem[] = [];

  // Process all annotations to find all groups
  annotations.forEach(annotation => {
    if (annotation.groupIds && annotation.groupIds.length > 0) {
      // For each group this annotation belongs to
      annotation.groupIds.forEach(groupId => {
        // Only process each group once
        if (!processedGroupIds.has(groupId)) {
          processedGroupIds.add(groupId);
          
          const groupTimestamp = parseInt(groupId.split("-")[1] || "0");
          groupTraces.push({
            id: `group-${groupId}`,
            timestamp: new Date(groupTimestamp).toLocaleTimeString(),
            type: "group",
            coordinates: "Group created",
            groupId: groupId,
            numericTimestamp: groupTimestamp
          });
        }
      });
    }
  });

  return [...annotationTraces, ...groupTraces].sort(
    (a, b) => (a.numericTimestamp || 0) - (b.numericTimestamp || 0)
  );
}

/**
 * Generates a unique ID with an optional prefix
 * @param prefix Optional prefix for the ID
 * @returns Unique ID string
 */
export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Debounces a function call
 * @param fn Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  
  return function(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}

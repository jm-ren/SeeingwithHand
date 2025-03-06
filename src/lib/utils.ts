import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Point, Annotation, TraceItem } from "../types/annotations"

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
 * Formats coordinates for display in the UI
 * @param points Array of points
 * @returns Formatted coordinate string
 */
export function formatCoordinates(points: Point[]): string {
  return points
    .map((p) => `(${Math.round(p.x)},${Math.round(p.y)})`)
    .join(", ")
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
 * Processes annotations into trace items for display
 * @param annotations Array of annotations
 * @returns Array of trace items
 */
export function processTracesForDisplay(annotations: Annotation[]): TraceItem[] {
  const annotationTraces = annotations.map((annotation) => ({
    id: annotation.timestamp.toString(),
    timestamp: new Date(annotation.timestamp).toLocaleTimeString(),
    type: annotation.type,
    coordinates: formatCoordinates(annotation.points),
    groupId: annotation.groupId,
    numericTimestamp: annotation.timestamp
  }))

  const groupTraces = annotations
    .filter((a) => a.groupId)
    .reduce((groups: TraceItem[], annotation) => {
      const groupExists = groups.some(
        (g) => g.id === `group-${annotation.groupId}`,
      )
      if (!groupExists && annotation.groupId) {
        const groupTimestamp = parseInt(annotation.groupId.split("-")[1] || "0")
        groups.push({
          id: `group-${annotation.groupId}`,
          timestamp: new Date(groupTimestamp).toLocaleTimeString(),
          type: "group",
          coordinates: "Group created",
          groupId: annotation.groupId,
          numericTimestamp: groupTimestamp
        })
      }
      return groups
    }, [])

  return [...annotationTraces, ...groupTraces].sort(
    (a, b) => (a.numericTimestamp || 0) - (b.numericTimestamp || 0)
  )
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

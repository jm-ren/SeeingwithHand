import { Annotation } from "../types/annotations";

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

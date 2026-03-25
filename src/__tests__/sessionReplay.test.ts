import { describe, it, expect } from "vitest";
import {
  sortAnnotationsByTime,
  computeReplayBaseTime,
  computeTotalDuration,
  getAnnotationsAtTime,
} from "../lib/replayUtils";
import { Annotation } from "../types/annotations";

function makeAnnotation(timestamp: number): Annotation {
  return {
    id: `a-${timestamp}`,
    type: "point",
    points: [{ x: 0, y: 0 }],
    color: "#000000",
    timestamp,
  };
}

const unsortedAnnotations = [
  makeAnnotation(5000),
  makeAnnotation(1000),
  makeAnnotation(3000),
];

describe("sortAnnotationsByTime", () => {
  it("returns annotations sorted ascending by timestamp", () => {
    const sorted = sortAnnotationsByTime(unsortedAnnotations);
    expect(sorted.map((a) => a.timestamp)).toEqual([1000, 3000, 5000]);
  });

  it("does not mutate the original array", () => {
    const original = [...unsortedAnnotations];
    sortAnnotationsByTime(unsortedAnnotations);
    expect(unsortedAnnotations.map((a) => a.timestamp)).toEqual(
      original.map((a) => a.timestamp)
    );
  });

  it("handles an empty array without crashing", () => {
    expect(sortAnnotationsByTime([])).toEqual([]);
  });

  it("handles a single annotation", () => {
    const single = [makeAnnotation(7000)];
    expect(sortAnnotationsByTime(single).map((a) => a.timestamp)).toEqual([7000]);
  });
});

describe("computeReplayBaseTime", () => {
  const sorted = sortAnnotationsByTime(unsortedAnnotations);

  it("uses sessionStartTime when provided", () => {
    expect(computeReplayBaseTime(sorted, 800)).toBe(800);
  });

  it("falls back to first stroke timestamp when sessionStartTime is null", () => {
    expect(computeReplayBaseTime(sorted, null)).toBe(1000);
  });

  it("falls back to first stroke timestamp when sessionStartTime is undefined", () => {
    expect(computeReplayBaseTime(sorted, undefined)).toBe(1000);
  });

  it("returns 0 when no annotations and no sessionStartTime", () => {
    expect(computeReplayBaseTime([], null)).toBe(0);
  });

  it("sessionStartTime=0 is used (not treated as falsy fallback)", () => {
    expect(computeReplayBaseTime(sorted, 0)).toBe(0);
  });
});

describe("computeTotalDuration", () => {
  const sorted = sortAnnotationsByTime(unsortedAnnotations);

  it("calculates duration from replayBaseTime to last stroke", () => {
    // timestamps [1000,3000,5000], baseTime=1000 → duration=4000
    expect(computeTotalDuration(sorted, 1000)).toBe(4000);
  });

  it("uses sessionStartTime that precedes first stroke", () => {
    // timestamps [1000,3000,5000], baseTime=800 → duration=4200
    expect(computeTotalDuration(sorted, 800)).toBe(4200);
  });

  it("returns 0 for empty annotation array", () => {
    expect(computeTotalDuration([], 0)).toBe(0);
  });

  it("returns 0 when only one annotation and baseTime equals its timestamp", () => {
    const single = [makeAnnotation(2000)];
    expect(computeTotalDuration(single, 2000)).toBe(0);
  });
});

describe("getAnnotationsAtTime", () => {
  const sorted = sortAnnotationsByTime(unsortedAnnotations);

  it("returns only annotations whose relative time is <= currentTime", () => {
    // replayBaseTime=1000, currentTime=2500
    // relative times: 0 (ts=1000), 2000 (ts=3000), 4000 (ts=5000)
    const visible = getAnnotationsAtTime(sorted, 1000, 2500);
    expect(visible.map((a) => a.timestamp)).toEqual([1000, 3000]);
  });

  it("returns all annotations when currentTime >= totalDuration", () => {
    const visible = getAnnotationsAtTime(sorted, 1000, 4000);
    expect(visible.map((a) => a.timestamp)).toEqual([1000, 3000, 5000]);
  });

  it("returns no annotations when currentTime < first relative time", () => {
    // First annotation is at relative time 0 (ts=1000, base=1000)
    // At currentTime=-1 nothing should be visible
    const visible = getAnnotationsAtTime(sorted, 1000, -1);
    expect(visible).toHaveLength(0);
  });

  it("includes the annotation at exactly currentTime (inclusive boundary)", () => {
    // relative time of ts=3000 is exactly 2000 when base=1000
    const visible = getAnnotationsAtTime(sorted, 1000, 2000);
    expect(visible.map((a) => a.timestamp)).toEqual([1000, 3000]);
  });

  it("handles empty annotations without crashing", () => {
    expect(getAnnotationsAtTime([], 0, 5000)).toEqual([]);
  });
});

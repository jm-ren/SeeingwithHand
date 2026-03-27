import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sortAnnotationsByTime,
  computeReplayBaseTime,
  computeTotalDuration,
  getAnnotationsAtTime,
  drawProgressiveAnnotation,
} from "../lib/replayUtils";
import { Annotation, Point } from "../types/annotations";

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

// ─── drawProgressiveAnnotation ────────────────────────────────────────────────

function makeReplayCtx() {
  return {
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    closePath: vi.fn(),
    rect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

// Identity transformer — no coordinate conversion needed for unit tests
const identity = (p: Point): Point => p;

// A rectangle drawn as a 4-point polygon: TL → TR → BR → BL
const rectPoints: Point[] = [
  { x: 0, y: 0 },    // TL
  { x: 100, y: 0 },  // TR
  { x: 100, y: 100 }, // BR
  { x: 0, y: 100 },  // BL
];

function makeFrameAnnotation(points: Point[], timestamp = 5000): Annotation {
  return {
    id: "frame-test",
    type: "frame",
    points,
    color: "#2CA800",
    timestamp,
  };
}

function makeAreaAnnotation(points: Point[], timestamp = 5000): Annotation {
  return {
    id: "area-test",
    type: "area",
    points,
    color: "#2CA800",
    timestamp,
  };
}

describe("drawProgressiveAnnotation — frame polygon", () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = makeReplayCtx();
  });

  it("draws nothing when timeSinceStart is 0", () => {
    drawProgressiveAnnotation(ctx, makeFrameAnnotation(rectPoints), 0, identity);
    expect((ctx as any).stroke).not.toHaveBeenCalled();
  });

  // At 25% of 1500ms (t=375ms): segmentsProgress = 4 * 0.25 = 1.0 exactly,
  // so 1 complete segment is drawn (TL→TR). No partial segment at this boundary.
  it("draws one complete side at 25% progress (timeSinceStart=375)", () => {
    drawProgressiveAnnotation(ctx, makeFrameAnnotation(rectPoints), 375, identity);
    expect((ctx as any).moveTo).toHaveBeenCalledWith(0, 0);
    expect((ctx as any).lineTo).toHaveBeenCalledTimes(1);
    expect((ctx as any).stroke).toHaveBeenCalled();
  });

  // At 50% (t=750ms): segmentsProgress = 4 * 0.5 = 2.0 exactly,
  // so 2 complete segments are drawn (TL→TR, TR→BR).
  it("draws two complete sides at 50% progress (timeSinceStart=750)", () => {
    drawProgressiveAnnotation(ctx, makeFrameAnnotation(rectPoints), 750, identity);
    expect((ctx as any).lineTo).toHaveBeenCalledTimes(2);
    expect((ctx as any).stroke).toHaveBeenCalled();
  });

  // At 75% (t=1125ms): segmentsProgress = 4 * 0.75 = 3.0 exactly,
  // so 3 complete segments are drawn (TL→TR, TR→BR, BR→BL).
  it("draws three complete sides at 75% progress (timeSinceStart=1125)", () => {
    drawProgressiveAnnotation(ctx, makeFrameAnnotation(rectPoints), 1125, identity);
    expect((ctx as any).lineTo).toHaveBeenCalledTimes(3);
    expect((ctx as any).stroke).toHaveBeenCalled();
  });

  // At 100% (t=1500ms), all 4 sides are complete and the path is closed.
  // This already works correctly with the current code.
  it("draws all 4 sides and closes the path at 100% progress (timeSinceStart=1500)", () => {
    drawProgressiveAnnotation(ctx, makeFrameAnnotation(rectPoints), 1500, identity);
    expect((ctx as any).moveTo).toHaveBeenCalledWith(0, 0);
    expect((ctx as any).lineTo).toHaveBeenCalledTimes(3); // TL→TR, TR→BR, BR→BL
    expect((ctx as any).closePath).toHaveBeenCalled();    // closes BL→TL
    expect((ctx as any).stroke).toHaveBeenCalled();
  });
});

describe("drawProgressiveAnnotation — area polygon", () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = makeReplayCtx();
  });

  it("fills the area only when animation is complete (timeSinceStart=1500)", () => {
    drawProgressiveAnnotation(ctx, makeAreaAnnotation(rectPoints), 1500, identity);
    expect((ctx as any).closePath).toHaveBeenCalled();
    expect((ctx as any).fill).toHaveBeenCalled();
    expect((ctx as any).stroke).toHaveBeenCalled();
  });

  it("does not fill the area before animation is complete (timeSinceStart=750)", () => {
    drawProgressiveAnnotation(ctx, makeAreaAnnotation(rectPoints), 750, identity);
    expect((ctx as any).fill).not.toHaveBeenCalled();
  });
});

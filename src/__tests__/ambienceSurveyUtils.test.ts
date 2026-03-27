import { describe, it, expect } from "vitest";
import { computeProgressivePolygonPath } from "../lib/replayUtils";
import { Point } from "../types/annotations";

const identity = (p: Point): Point => p;

// A rectangle drawn as a 4-point polygon: TL → TR → BR → BL
const rectPoints: Point[] = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

// A triangle drawn as a 3-point polygon
const triPoints: Point[] = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 50, y: 100 },
];

/**
 * Counts the number of visible edges in an SVG path string.
 * Each `L` command draws one edge; a `Z` command draws the closing edge.
 */
function countEdges(pathData: string): number {
  const lineSegments = (pathData.match(/L /g) || []).length;
  const closeSegments = (pathData.match(/Z/g) || []).length;
  return lineSegments + closeSegments;
}

// Animation duration for frame/area is 1500ms in replayUtils.
// timeSinceStart values: 25% = 375ms, 50% = 750ms, 75% = 1125ms, 100% = 1500ms

// ─── Core polygon progressive rendering ──────────────────────────────────────
//
// A 4-vertex polygon has 4 edges (3 explicit sides + 1 closing edge).
// At X% of the animation, approximately X% of the edges should be visible.
// The closing edge (Z) counts as a real edge — it draws the final side of the
// polygon back to the starting vertex.

describe("computeProgressivePolygonPath — edge visibility for a 4-vertex polygon", () => {
  it("draws nothing when timeSinceStart is 0", () => {
    const result = computeProgressivePolygonPath(rectPoints, "frame", 0, identity);
    expect(result.pathData).toBe("");
  });

  it("shows at least 1 edge at 25% progress (375ms)", () => {
    const result = computeProgressivePolygonPath(rectPoints, "frame", 375, identity);
    expect(countEdges(result.pathData)).toBeGreaterThanOrEqual(1);
  });

  it("shows at least 2 edges at 50% progress (750ms)", () => {
    const result = computeProgressivePolygonPath(rectPoints, "frame", 750, identity);
    expect(countEdges(result.pathData)).toBeGreaterThanOrEqual(2);
  });

  it("shows at least 3 edges at 75% progress (1125ms)", () => {
    const result = computeProgressivePolygonPath(rectPoints, "frame", 1125, identity);
    expect(countEdges(result.pathData)).toBeGreaterThanOrEqual(3);
  });

  it("shows all 4 edges and closes the path at 100% progress (1500ms)", () => {
    const result = computeProgressivePolygonPath(rectPoints, "frame", 1500, identity);
    expect(countEdges(result.pathData)).toBe(4);
    expect(result.isClosed).toBe(true);
  });

  it("includes partial edge interpolation between boundaries (500ms)", () => {
    const result = computeProgressivePolygonPath(rectPoints, "frame", 500, identity);
    // At 500ms: progress=0.333, segmentsProgress=1.333 → 1 complete + 1 partial
    expect(countEdges(result.pathData)).toBe(2);
  });
});

describe("computeProgressivePolygonPath — edge visibility for a 3-vertex polygon", () => {
  it("shows at least 2 edges at 66% progress (1000ms)", () => {
    const result = computeProgressivePolygonPath(triPoints, "frame", 1000, identity);
    expect(countEdges(result.pathData)).toBeGreaterThanOrEqual(2);
  });

  it("shows all 3 edges and closes at 100% progress (1500ms)", () => {
    const result = computeProgressivePolygonPath(triPoints, "frame", 1500, identity);
    expect(countEdges(result.pathData)).toBe(3);
    expect(result.isClosed).toBe(true);
  });
});

describe("computeProgressivePolygonPath — area fill behavior", () => {
  it("does not fill area before the polygon is fully closed", () => {
    const result = computeProgressivePolygonPath(rectPoints, "area", 750, identity);
    expect(result.shouldFill).toBe(false);
  });

  it("fills area once the polygon is fully closed at 100%", () => {
    const result = computeProgressivePolygonPath(rectPoints, "area", 1500, identity);
    expect(result.shouldFill).toBe(true);
  });

  it("frame type never requests fill even when closed", () => {
    const result = computeProgressivePolygonPath(rectPoints, "frame", 1500, identity);
    expect(result.shouldFill).toBe(false);
  });
});

describe("computeProgressivePolygonPath — coordinate transformation", () => {
  const doubleScale = (p: Point): Point => ({ x: p.x * 2, y: p.y * 2 });

  it("applies the convertPoint transform to all vertices in the path", () => {
    const result = computeProgressivePolygonPath(rectPoints, "frame", 1500, doubleScale);
    expect(result.pathData).toContain("M 0 0");
    expect(result.pathData).toContain("L 200 0");
    expect(result.pathData).toContain("L 200 200");
    expect(result.pathData).toContain("L 0 200");
  });
});

describe("computeProgressivePolygonPath — edge cases", () => {
  it("returns empty for fewer than 3 points", () => {
    const twoPoints: Point[] = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const result = computeProgressivePolygonPath(twoPoints, "frame", 1500, identity);
    expect(result.pathData).toBe("");
  });

  it("returns empty for negative timeSinceStart", () => {
    const result = computeProgressivePolygonPath(rectPoints, "frame", -100, identity);
    expect(result.pathData).toBe("");
  });

  it("clamps progress at 100% for timeSinceStart beyond duration", () => {
    const result = computeProgressivePolygonPath(rectPoints, "frame", 5000, identity);
    expect(result.isClosed).toBe(true);
    expect(countEdges(result.pathData)).toBe(4);
  });
});

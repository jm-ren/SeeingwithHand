import { describe, it, expect } from "vitest";
import {
  formatTimeGap,
  formatCoordinates,
  calculateImageScaling,
  imagePointToDisplay,
  displayPointToImage,
  createCoordinateTransform,
} from "../lib/utils";
import { Point } from "../types/annotations";

describe("formatTimeGap", () => {
  it("returns milliseconds for values under 1000ms", () => {
    expect(formatTimeGap(0)).toBe("0ms");
    expect(formatTimeGap(500)).toBe("500ms");
    expect(formatTimeGap(999)).toBe("999ms");
  });

  it("returns seconds for values at or above 1000ms", () => {
    expect(formatTimeGap(1000)).toBe("1s");
    expect(formatTimeGap(2500)).toBe("2.5s");
    expect(formatTimeGap(10000)).toBe("10s");
  });
});

describe("formatCoordinates", () => {
  it("formats a single point", () => {
    const points: Point[] = [{ x: 10.7, y: 20.3 }];
    expect(formatCoordinates(points, "point")).toBe("(11,20)");
  });

  it("formats a line with two points", () => {
    const points: Point[] = [{ x: 0, y: 0 }, { x: 100, y: 50 }];
    expect(formatCoordinates(points, "line")).toBe("(0,0) → (100,50)");
  });

  it("formats a line with only one point as partial", () => {
    const points: Point[] = [{ x: 5, y: 10 }];
    expect(formatCoordinates(points, "line")).toBe("Start: (5,10)");
  });

  it("formats a legacy rectangle frame (2 points)", () => {
    const points: Point[] = [{ x: 10, y: 20 }, { x: 110, y: 120 }];
    expect(formatCoordinates(points, "frame")).toBe(
      "Rectangle: (10,20) to (110,120)"
    );
  });

  it("formats a polygon frame (3+ points)", () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 25, y: 50 },
    ];
    expect(formatCoordinates(points, "frame")).toBe("Polygon: 3 points");
  });

  it("formats a legacy rectangle area (2 points)", () => {
    const points: Point[] = [{ x: 0, y: 0 }, { x: 100, y: 100 }];
    expect(formatCoordinates(points, "area")).toBe(
      "Rectangle area: (0,0) to (100,100)"
    );
  });

  it("formats a polygon area (3+ points)", () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 25, y: 50 },
      { x: 0, y: 50 },
    ];
    expect(formatCoordinates(points, "area")).toBe("Polygon area: 4 points");
  });

  it("formats a freehand trace", () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 5 },
    ];
    expect(formatCoordinates(points, "freehand")).toBe("Freehand: 3 points");
  });

  it("returns empty string for empty points array", () => {
    expect(formatCoordinates([], "point")).toBe("");
  });
});

describe("calculateImageScaling", () => {
  it("fits a wide image to container width", () => {
    // 200x100 image in a 100x100 container → constrained by width
    const result = calculateImageScaling(200, 100, 100, 100);
    expect(result.displayWidth).toBe(100);
    expect(result.displayHeight).toBe(50);
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(25); // (100 - 50) / 2
    expect(result.scaleX).toBe(0.5);
    expect(result.scaleY).toBe(0.5);
  });

  it("fits a tall image to container height", () => {
    // 100x200 image in a 100x100 container → constrained by height
    const result = calculateImageScaling(100, 200, 100, 100);
    expect(result.displayWidth).toBe(50);
    expect(result.displayHeight).toBe(100);
    expect(result.offsetX).toBe(25); // (100 - 50) / 2
    expect(result.offsetY).toBe(0);
    expect(result.scaleX).toBe(0.5);
    expect(result.scaleY).toBe(0.5);
  });

  it("handles square image in square container", () => {
    const result = calculateImageScaling(100, 100, 200, 200);
    expect(result.displayWidth).toBe(200);
    expect(result.displayHeight).toBe(200);
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(0);
    expect(result.scaleX).toBe(2);
    expect(result.scaleY).toBe(2);
  });
});

describe("imagePointToDisplay", () => {
  it("transforms a point from image space to display space", () => {
    const scaling = {
      displayWidth: 100,
      displayHeight: 50,
      offsetX: 0,
      offsetY: 25,
      scaleX: 0.5,
      scaleY: 0.5,
    };
    const result = imagePointToDisplay({ x: 50, y: 50 }, scaling);
    expect(result.x).toBe(25);  // 50 * 0.5 + 0
    expect(result.y).toBe(50);  // 50 * 0.5 + 25
  });
});

describe("displayPointToImage", () => {
  it("transforms a point from display space back to image space", () => {
    const scaling = {
      displayWidth: 100,
      displayHeight: 50,
      offsetX: 0,
      offsetY: 25,
      scaleX: 0.5,
      scaleY: 0.5,
    };
    const result = displayPointToImage({ x: 25, y: 50 }, scaling);
    expect(result.x).toBe(50);  // (25 - 0) / 0.5
    expect(result.y).toBe(50);  // (50 - 25) / 0.5
  });

  it("is the inverse of imagePointToDisplay", () => {
    const scaling = calculateImageScaling(800, 600, 400, 300);
    const original: Point = { x: 123, y: 456 };
    const display = imagePointToDisplay(original, scaling);
    const recovered = displayPointToImage(display, scaling);
    expect(recovered.x).toBeCloseTo(original.x, 5);
    expect(recovered.y).toBeCloseTo(original.y, 5);
  });
});

describe("createCoordinateTransform", () => {
  it("returns a function that transforms points correctly", () => {
    // 400x300 original image displayed in a 200x150 container (same aspect ratio, scale 0.5)
    const transform = createCoordinateTransform(400, 300, 200, 150);
    const result = transform({ x: 100, y: 100 });
    expect(result.x).toBeCloseTo(50, 5);
    expect(result.y).toBeCloseTo(50, 5);
  });

  it("handles letterboxing with offsetY", () => {
    // Wide image (400x100) in a square container (200x200)
    // displayWidth=200, displayHeight=50, offsetY=75
    const transform = createCoordinateTransform(400, 100, 200, 200);
    const result = transform({ x: 200, y: 50 });
    expect(result.x).toBeCloseTo(100, 5); // 200 * 0.5 + 0
    expect(result.y).toBeCloseTo(100, 5); // 50 * 0.5 + 75
  });
});

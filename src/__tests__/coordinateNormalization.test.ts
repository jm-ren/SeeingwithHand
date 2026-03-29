import { describe, it, expect, vi } from "vitest";
import {
  normalizeToImage,
  imageToDisplay,
  drawProgressiveAnnotation,
  ImageRect,
} from "../lib/replayUtils";
import { Point } from "../types/annotations";

// ─── normalizeToImage ─────────────────────────────────────────────────────────
// Converts a canvas-space point to normalized [0,1] image-relative coordinates.
// Formula: normalized = (canvasPoint - imageOffset) / imageSize

describe("normalizeToImage", () => {
  it("returns (0,0) for a point at the image's top-left corner", () => {
    const imageRect: ImageRect = { x: 50, y: 100, width: 800, height: 600 };
    const canvasPoint: Point = { x: 50, y: 100 };
    expect(normalizeToImage(canvasPoint, imageRect)).toEqual({ x: 0, y: 0 });
  });

  it("returns (1,1) for a point at the image's bottom-right corner", () => {
    const imageRect: ImageRect = { x: 50, y: 100, width: 800, height: 600 };
    const canvasPoint: Point = { x: 850, y: 700 };
    expect(normalizeToImage(canvasPoint, imageRect)).toEqual({ x: 1, y: 1 });
  });

  it("returns (0.5, 0.5) for a point at the image center", () => {
    const imageRect: ImageRect = { x: 50, y: 100, width: 800, height: 600 };
    const canvasPoint: Point = { x: 450, y: 400 };
    expect(normalizeToImage(canvasPoint, imageRect)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("handles zero offset (image fills container width)", () => {
    const imageRect: ImageRect = { x: 0, y: 128, width: 1652, height: 838 };
    const canvasPoint: Point = { x: 826, y: 547 };
    const result = normalizeToImage(canvasPoint, imageRect);
    expect(result.x).toBeCloseTo(0.5, 5);
    expect(result.y).toBeCloseTo(0.5, 5);
  });

  it("produces values outside [0,1] for points outside image bounds", () => {
    const imageRect: ImageRect = { x: 100, y: 100, width: 400, height: 400 };
    const canvasPoint: Point = { x: 50, y: 50 };
    const result = normalizeToImage(canvasPoint, imageRect);
    expect(result.x).toBeLessThan(0);
    expect(result.y).toBeLessThan(0);
  });

  it("works with non-square images (wide landscape)", () => {
    const imageRect: ImageRect = { x: 0, y: 200, width: 1000, height: 600 };
    const canvasPoint: Point = { x: 250, y: 350 };
    const result = normalizeToImage(canvasPoint, imageRect);
    expect(result.x).toBeCloseTo(0.25, 5);
    expect(result.y).toBeCloseTo(0.25, 5);
  });

  it("works with non-square images (tall portrait)", () => {
    const imageRect: ImageRect = { x: 300, y: 0, width: 400, height: 1000 };
    const canvasPoint: Point = { x: 500, y: 500 };
    const result = normalizeToImage(canvasPoint, imageRect);
    expect(result.x).toBeCloseTo(0.5, 5);
    expect(result.y).toBeCloseTo(0.5, 5);
  });
});

// ─── imageToDisplay ───────────────────────────────────────────────────────────
// Converts a normalized [0,1] point to display coordinates for a given rendered image rect.
// Formula: display = normalized * imageSize + imageOffset

describe("imageToDisplay", () => {
  it("maps (0,0) to the image's top-left in the display", () => {
    const displayRect: ImageRect = { x: 20, y: 40, width: 500, height: 375 };
    const result = imageToDisplay({ x: 0, y: 0 }, displayRect);
    expect(result).toEqual({ x: 20, y: 40 });
  });

  it("maps (1,1) to the image's bottom-right in the display", () => {
    const displayRect: ImageRect = { x: 20, y: 40, width: 500, height: 375 };
    const result = imageToDisplay({ x: 1, y: 1 }, displayRect);
    expect(result).toEqual({ x: 520, y: 415 });
  });

  it("maps (0.5, 0.5) to the image center in the display", () => {
    const displayRect: ImageRect = { x: 20, y: 40, width: 500, height: 375 };
    const result = imageToDisplay({ x: 0.5, y: 0.5 }, displayRect);
    expect(result).toEqual({ x: 270, y: 227.5 });
  });

  it("handles zero offset", () => {
    const displayRect: ImageRect = { x: 0, y: 0, width: 800, height: 600 };
    const result = imageToDisplay({ x: 0.25, y: 0.75 }, displayRect);
    expect(result).toEqual({ x: 200, y: 450 });
  });

  it("handles values outside [0,1] for off-image points", () => {
    const displayRect: ImageRect = { x: 50, y: 50, width: 400, height: 400 };
    const result = imageToDisplay({ x: -0.1, y: 1.1 }, displayRect);
    expect(result.x).toBeCloseTo(10, 5);
    expect(result.y).toBeCloseTo(490, 5);
  });
});

// ─── Round-trip: normalize → denormalize at different sizes ──────────────────
// The key property: a point at a given relative position on the image during
// recording should appear at the same relative position during playback,
// regardless of the recording and playback container sizes.

describe("round-trip: normalizeToImage → imageToDisplay", () => {
  it("preserves image-center across different container sizes", () => {
    const recordingRect: ImageRect = { x: 0, y: 128, width: 1652, height: 838 };
    const playbackRect: ImageRect = { x: 30, y: 0, width: 440, height: 330 };

    const canvasPoint: Point = { x: 826, y: 547 }; // center of recording image
    const normalized = normalizeToImage(canvasPoint, recordingRect);
    const displayed = imageToDisplay(normalized, playbackRect);

    // Should land at the center of the playback image
    expect(displayed.x).toBeCloseTo(30 + 220, 1); // offsetX + width/2
    expect(displayed.y).toBeCloseTo(0 + 165, 1);  // offsetY + height/2
  });

  it("preserves top-left corner across different container sizes", () => {
    const recordingRect: ImageRect = { x: 100, y: 50, width: 600, height: 400 };
    const playbackRect: ImageRect = { x: 10, y: 20, width: 300, height: 200 };

    const canvasPoint: Point = { x: 100, y: 50 }; // top-left of image
    const normalized = normalizeToImage(canvasPoint, recordingRect);
    const displayed = imageToDisplay(normalized, playbackRect);

    expect(displayed.x).toBeCloseTo(10, 5);
    expect(displayed.y).toBeCloseTo(20, 5);
  });

  it("preserves bottom-right corner across different container sizes", () => {
    const recordingRect: ImageRect = { x: 100, y: 50, width: 600, height: 400 };
    const playbackRect: ImageRect = { x: 10, y: 20, width: 300, height: 200 };

    const canvasPoint: Point = { x: 700, y: 450 }; // bottom-right of image
    const normalized = normalizeToImage(canvasPoint, recordingRect);
    const displayed = imageToDisplay(normalized, playbackRect);

    expect(displayed.x).toBeCloseTo(310, 5);
    expect(displayed.y).toBeCloseTo(220, 5);
  });

  it("preserves a quarter-way point across wildly different aspect ratios", () => {
    // Recording: wide landscape container, image letterboxed vertically
    const recordingRect: ImageRect = { x: 0, y: 200, width: 1920, height: 680 };
    // Playback: small square container, image letterboxed horizontally
    const playbackRect: ImageRect = { x: 50, y: 0, width: 300, height: 200 };

    // Point at 25% across, 25% down the image
    const canvasPoint: Point = { x: 480, y: 370 };
    const normalized = normalizeToImage(canvasPoint, recordingRect);

    expect(normalized.x).toBeCloseTo(0.25, 5);
    expect(normalized.y).toBeCloseTo(0.25, 5);

    const displayed = imageToDisplay(normalized, playbackRect);
    expect(displayed.x).toBeCloseTo(50 + 75, 1);  // offsetX + 0.25 * width
    expect(displayed.y).toBeCloseTo(0 + 50, 1);   // offsetY + 0.25 * height
  });

  it("is a true inverse: normalize then display with same rect returns original point", () => {
    const rect: ImageRect = { x: 37, y: 82, width: 926, height: 531 };
    const original: Point = { x: 500, y: 300 };

    const normalized = normalizeToImage(original, rect);
    const recovered = imageToDisplay(normalized, rect);

    expect(recovered.x).toBeCloseTo(original.x, 5);
    expect(recovered.y).toBeCloseTo(original.y, 5);
  });
});

// ─── drawProgressiveAnnotation with coordinate transform ─────────────────────
// Verify that drawProgressiveAnnotation correctly applies a convertPoint built
// from normalizeToImage + imageToDisplay.

describe("drawProgressiveAnnotation uses normalized convertPoint", () => {
  function makeCtx() {
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

  const playbackRect: ImageRect = { x: 10, y: 20, width: 500, height: 375 };

  const convertPoint = (p: Point): Point => imageToDisplay(p, playbackRect);

  it("draws a normalized point annotation at the correct display position", () => {
    const ctx = makeCtx();
    const annotation = {
      id: "pt-1",
      type: "point" as const,
      points: [{ x: 0.5, y: 0.5 }], // center of image in normalized coords
      color: "#FF0000",
      timestamp: 1000,
    };

    drawProgressiveAnnotation(ctx, annotation, 100, convertPoint);

    expect((ctx as any).arc).toHaveBeenCalledWith(
      260,  // 0.5 * 500 + 10
      207.5, // 0.5 * 375 + 20
      6, 0, Math.PI * 2
    );
  });

  it("draws a normalized freehand annotation with correctly transformed points", () => {
    const ctx = makeCtx();
    const annotation = {
      id: "fh-1",
      type: "freehand" as const,
      points: [
        { x: 0, y: 0 },     // image top-left
        { x: 0.5, y: 0.5 }, // image center
        { x: 1, y: 1 },     // image bottom-right
      ],
      color: "#00FF00",
      timestamp: 1000,
    };

    // t=2000 is 100% of freehand duration → all points shown
    drawProgressiveAnnotation(ctx, annotation, 2000, convertPoint);

    expect((ctx as any).moveTo).toHaveBeenCalledWith(10, 20);     // (0,0) → offset
    expect((ctx as any).lineTo).toHaveBeenCalledWith(260, 207.5); // (0.5,0.5) → center
    expect((ctx as any).lineTo).toHaveBeenCalledWith(510, 395);   // (1,1) → bottom-right
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { drawAnnotations } from "../lib/imageProcessing";
import { Annotation } from "../types/annotations";

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

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: "test",
    type: "point",
    points: [{ x: 10, y: 20 }],
    color: "#FF0000",
    timestamp: 1000,
    ...overrides,
  };
}

describe("drawAnnotations", () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = makeCtx();
  });

  it("does nothing for an empty annotation array", () => {
    drawAnnotations(ctx, []);
    expect((ctx as any).beginPath).not.toHaveBeenCalled();
  });

  it("sets strokeStyle and fillStyle from annotation color", () => {
    drawAnnotations(ctx, [makeAnnotation({ color: "#AABBCC" })]);
    expect(ctx.strokeStyle).toBe("#AABBCC");
    expect(ctx.fillStyle).toBe("#AABBCC");
  });

  it("uses lineWidth 3 for selected annotations, 2 otherwise", () => {
    drawAnnotations(ctx, [makeAnnotation({ selected: true })]);
    expect(ctx.lineWidth).toBe(3);

    const ctx2 = makeCtx();
    drawAnnotations(ctx2, [makeAnnotation({ selected: false })]);
    expect(ctx2.lineWidth).toBe(2);
  });

  it("draws a point annotation using arc", () => {
    drawAnnotations(ctx, [makeAnnotation({ type: "point" })]);
    expect((ctx as any).beginPath).toHaveBeenCalled();
    expect((ctx as any).arc).toHaveBeenCalledWith(10, 20, 4, 0, Math.PI * 2);
    expect((ctx as any).fill).toHaveBeenCalled();
  });

  it("draws a selected point with a larger radius", () => {
    drawAnnotations(ctx, [makeAnnotation({ type: "point", selected: true })]);
    expect((ctx as any).arc).toHaveBeenCalledWith(10, 20, 6, 0, Math.PI * 2);
  });

  it("draws a line annotation between two points", () => {
    const annotation = makeAnnotation({
      type: "line",
      points: [{ x: 0, y: 0 }, { x: 100, y: 50 }],
    });
    drawAnnotations(ctx, [annotation]);
    expect((ctx as any).moveTo).toHaveBeenCalledWith(0, 0);
    expect((ctx as any).lineTo).toHaveBeenCalledWith(100, 50);
    expect((ctx as any).stroke).toHaveBeenCalled();
  });

  it("skips drawing a line with fewer than 2 points", () => {
    drawAnnotations(ctx, [makeAnnotation({ type: "line", points: [{ x: 0, y: 0 }] })]);
    expect((ctx as any).moveTo).not.toHaveBeenCalled();
  });

  it("draws a frame (closed polygon) annotation", () => {
    const annotation = makeAnnotation({
      type: "frame",
      points: [
        { x: 10, y: 20 },
        { x: 110, y: 20 },
        { x: 110, y: 120 },
        { x: 10, y: 120 },
      ],
    });
    drawAnnotations(ctx, [annotation]);
    expect((ctx as any).moveTo).toHaveBeenCalledWith(10, 20);
    expect((ctx as any).lineTo).toHaveBeenCalledTimes(3);
    expect((ctx as any).closePath).toHaveBeenCalled();
    expect((ctx as any).stroke).toHaveBeenCalled();
  });

  it("skips drawing a frame with fewer than 3 points", () => {
    drawAnnotations(ctx, [makeAnnotation({ type: "frame", points: [{ x: 0, y: 0 }, { x: 50, y: 50 }] })]);
    expect((ctx as any).moveTo).not.toHaveBeenCalled();
  });

  it("draws an area (filled closed polygon) annotation", () => {
    const annotation = makeAnnotation({
      type: "area",
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 },
        { x: 0, y: 50 },
      ],
    });
    drawAnnotations(ctx, [annotation]);
    expect((ctx as any).moveTo).toHaveBeenCalledWith(0, 0);
    expect((ctx as any).closePath).toHaveBeenCalled();
    expect((ctx as any).fill).toHaveBeenCalled();
    expect((ctx as any).stroke).toHaveBeenCalled();
  });

  it("skips drawing an area with fewer than 3 points", () => {
    drawAnnotations(ctx, [makeAnnotation({ type: "area", points: [{ x: 0, y: 0 }, { x: 50, y: 50 }] })]);
    expect((ctx as any).moveTo).not.toHaveBeenCalled();
  });

  it("draws a freehand annotation through all points", () => {
    const annotation = makeAnnotation({
      type: "freehand",
      points: [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 5 }],
    });
    drawAnnotations(ctx, [annotation]);
    expect((ctx as any).moveTo).toHaveBeenCalledWith(0, 0);
    expect((ctx as any).lineTo).toHaveBeenCalledWith(10, 10);
    expect((ctx as any).lineTo).toHaveBeenCalledWith(20, 5);
    expect((ctx as any).stroke).toHaveBeenCalled();
  });

  it("skips freehand drawing with fewer than 2 points", () => {
    drawAnnotations(ctx, [makeAnnotation({ type: "freehand", points: [{ x: 0, y: 0 }] })]);
    expect((ctx as any).moveTo).not.toHaveBeenCalled();
  });

  it("applies scale factor to all coordinates", () => {
    const annotation = makeAnnotation({
      type: "point",
      points: [{ x: 10, y: 20 }],
    });
    drawAnnotations(ctx, [annotation], 2);
    expect((ctx as any).arc).toHaveBeenCalledWith(20, 40, 4, 0, Math.PI * 2);
  });

  it("draws multiple annotations in sequence", () => {
    const annotations = [
      makeAnnotation({ id: "1", type: "point" }),
      makeAnnotation({ id: "2", type: "point", color: "#0000FF" }),
    ];
    drawAnnotations(ctx, annotations);
    expect((ctx as any).arc).toHaveBeenCalledTimes(2);
  });
});

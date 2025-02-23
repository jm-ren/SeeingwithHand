import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Undo2, ZoomIn, ZoomOut, Move } from "lucide-react";

type Tool =
  | "point"
  | "line"
  | "frame"
  | "area"
  | "freehand"
  | "select"
  | "group";

interface Point {
  x: number;
  y: number;
}

interface Group {
  id: string;
  memberIds: string[];
  timestamp: number;
}

interface Annotation {
  id: string;
  type: Tool;
  points: Point[];
  color: string;
  timestamp: number;
  selected?: boolean;
  groupId?: string;
}

interface AnnotationCanvasProps {
  imageUrl?: string;
  onAnnotationChange?: (annotations: Annotation[]) => void;
  onSelectionChange?: (selectedCount: number) => void;
  initialAnnotations?: Annotation[];
  selectedTool?: Tool;
}

const AnnotationCanvas = ({
  imageUrl = "https://images2.dwell.com/photos/6133553759298379776/6297915443342360576/original.jpg?auto=format&q=35&w=1600",
  onAnnotationChange = () => {},
  onSelectionChange = () => {},
  initialAnnotations = [],
  selectedTool = "point",
}: AnnotationCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Point[]>([]);
  const [annotations, setAnnotations] =
    useState<Annotation[]>(initialAnnotations);
  const [groups, setGroups] = useState<Group[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Initialize and load image
  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      imageRef.current = image;
      setImageDimensions({ width: image.width, height: image.height });
      setImageLoaded(true);
    };

    image.onerror = (error) => {
      console.error("Error loading image:", error);
    };

    image.src = imageUrl;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [imageUrl]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (!canvas || !image || !imageDimensions) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(position.x, position.y);
      ctx.scale(scale, scale);

      // Calculate image dimensions
      const containerWidth = canvas.width;
      const containerHeight = canvas.height;
      const imageAspectRatio = imageDimensions.width / imageDimensions.height;
      const containerAspectRatio = containerWidth / containerHeight;

      let drawWidth, drawHeight;
      if (containerAspectRatio > imageAspectRatio) {
        drawHeight = containerHeight;
        drawWidth = drawHeight * imageAspectRatio;
      } else {
        drawWidth = containerWidth;
        drawHeight = drawWidth / imageAspectRatio;
      }

      // Center the image
      const x = (containerWidth - drawWidth) / 2;
      const y = (containerHeight - drawHeight) / 2;

      // Draw image
      ctx.drawImage(image, x, y, drawWidth, drawHeight);

      // Draw annotations
      drawAnnotations(ctx);

      ctx.restore();
    } catch (error) {
      console.error("Error in drawCanvas:", error);
    }
  }, [scale, position, annotations, currentAnnotation, imageDimensions]);

  // Redraw canvas when dependencies change
  useEffect(() => {
    if (imageLoaded && imageDimensions) {
      drawCanvas();
    }
  }, [drawCanvas, imageLoaded, imageDimensions]);

  const handleGroupCreation = useCallback(() => {
    const selectedAnnotations = annotations.filter((a) => a.selected);
    if (selectedAnnotations.length < 2) return;

    const groupId = `group-${Date.now()}`;
    const newGroup: Group = {
      id: groupId,
      memberIds: selectedAnnotations.map((a) => a.id),
      timestamp: Date.now(),
    };

    setGroups((prev) => [...prev, newGroup]);
    setAnnotations((prev) =>
      prev.map((a) => ({
        ...a,
        groupId: a.selected ? groupId : a.groupId,
      })),
    );
  }, [annotations]);

  // Update annotations when initialAnnotations changes
  useEffect(() => {
    setAnnotations(initialAnnotations);
  }, [initialAnnotations]);

  const getCanvasPoint = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: ((e.clientX - rect.left) * scaleX - position.x) / scale,
      y: ((e.clientY - rect.top) * scaleY - position.y) / scale,
    };
  };

  const drawAnnotations = (ctx: CanvasRenderingContext2D) => {
    try {
      // Draw group backgrounds first
      groups.forEach((group) => {
        const groupAnnotations = annotations.filter(
          (a) => a.groupId === group.id,
        );
        if (groupAnnotations.length === 0) return;

        // Calculate group bounds
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        groupAnnotations.forEach((annotation) => {
          annotation.points.forEach((point) => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
          });
        });

        // Draw group background with padding
        ctx.fillStyle = "rgba(200, 200, 255, 0.2)";
        ctx.fillRect(minX - 10, minY - 10, maxX - minX + 20, maxY - minY + 20);

        // Draw group border
        ctx.strokeStyle = "rgba(100, 100, 255, 0.5)";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          minX - 10,
          minY - 10,
          maxX - minX + 20,
          maxY - minY + 20,
        );
      });

      // Draw annotations
      annotations.forEach((annotation) => {
        ctx.beginPath();
        ctx.strokeStyle = annotation.selected
          ? "rgba(0, 0, 255, 0.5)"
          : "rgba(0, 0, 0, 0.5)";
        ctx.lineWidth = annotation.selected ? 3 : 2;

        switch (annotation.type) {
          case "point":
            if (annotation.points[0]) {
              // Draw invisible larger hit area
              ctx.beginPath();
              ctx.arc(
                annotation.points[0].x,
                annotation.points[0].y,
                15,
                0,
                Math.PI * 2,
              );
              ctx.fillStyle = "rgba(0, 0, 0, 0)";
              ctx.fill();

              // Draw visible dot
              ctx.beginPath();
              ctx.arc(
                annotation.points[0].x,
                annotation.points[0].y,
                5,
                0,
                Math.PI * 2,
              );
            }
            break;
          case "line":
            if (annotation.points[0] && annotation.points[1]) {
              ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
              ctx.lineTo(annotation.points[1].x, annotation.points[1].y);
            }
            break;
          case "frame":
            if (annotation.points[0] && annotation.points[1]) {
              const width = annotation.points[1].x - annotation.points[0].x;
              const height = annotation.points[1].y - annotation.points[0].y;
              ctx.strokeRect(
                annotation.points[0].x,
                annotation.points[0].y,
                width,
                height,
              );
            }
            break;
          case "area":
            if (annotation.points[0] && annotation.points[1]) {
              const width = annotation.points[1].x - annotation.points[0].x;
              const height = annotation.points[1].y - annotation.points[0].y;
              ctx.fillStyle = annotation.selected
                ? "rgba(0, 0, 255, 0.1)"
                : "rgba(0, 0, 0, 0.1)";
              ctx.fillRect(
                annotation.points[0].x,
                annotation.points[0].y,
                width,
                height,
              );
              ctx.strokeRect(
                annotation.points[0].x,
                annotation.points[0].y,
                width,
                height,
              );
            }
            break;
          case "freehand":
            if (annotation.points.length > 0) {
              ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
              annotation.points.forEach((point) => {
                ctx.lineTo(point.x, point.y);
              });
            }
            break;
        }
        ctx.stroke();
      });

      // Draw current annotation
      if (currentAnnotation.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
        ctx.lineWidth = 2;

        switch (selectedTool) {
          case "point":
            ctx.arc(
              currentAnnotation[0].x,
              currentAnnotation[0].y,
              5,
              0,
              Math.PI * 2,
            );
            break;
          case "line":
            ctx.moveTo(currentAnnotation[0].x, currentAnnotation[0].y);
            if (currentAnnotation[1]) {
              ctx.lineTo(currentAnnotation[1].x, currentAnnotation[1].y);
            }
            break;
          case "frame":
          case "area":
            if (currentAnnotation[1]) {
              const width = currentAnnotation[1].x - currentAnnotation[0].x;
              const height = currentAnnotation[1].y - currentAnnotation[0].y;
              if (selectedTool === "area") {
                ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
                ctx.fillRect(
                  currentAnnotation[0].x,
                  currentAnnotation[0].y,
                  width,
                  height,
                );
              }
              ctx.strokeRect(
                currentAnnotation[0].x,
                currentAnnotation[0].y,
                width,
                height,
              );
            }
            break;
          case "freehand":
            ctx.moveTo(currentAnnotation[0].x, currentAnnotation[0].y);
            currentAnnotation.forEach((point) => {
              ctx.lineTo(point.x, point.y);
            });
            break;
        }
        ctx.stroke();
      }
    } catch (error) {
      console.error("Error drawing annotations:", error);
    }
  };

  // Rest of your component implementation...
  // (To be continued in next artifact due to length)
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev / 1.2, 0.1));
  };

  const isPointInPath = (point: Point, annotation: Annotation): boolean => {
    const tolerance = 15;
    switch (annotation.type) {
      case "point":
        if (annotation.points[0]) {
          const dx = point.x - annotation.points[0].x;
          const dy = point.y - annotation.points[0].y;
          return Math.sqrt(dx * dx + dy * dy) <= tolerance;
        }
        break;
      case "line":
        if (annotation.points[0] && annotation.points[1]) {
          const x1 = annotation.points[0].x;
          const y1 = annotation.points[0].y;
          const x2 = annotation.points[1].x;
          const y2 = annotation.points[1].y;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const length = Math.sqrt(dx * dx + dy * dy);
          if (length === 0) return false;
          const dot =
            ((point.x - x1) * dx + (point.y - y1) * dy) / (length * length);
          const closestX = x1 + dot * dx;
          const closestY = y1 + dot * dy;
          const distance = Math.sqrt(
            Math.pow(point.x - closestX, 2) + Math.pow(point.y - closestY, 2),
          );
          return distance <= tolerance && dot >= 0 && dot <= 1;
        }
        break;
      case "frame":
      case "area":
        if (annotation.points[0] && annotation.points[1]) {
          const x = Math.min(annotation.points[0].x, annotation.points[1].x);
          const y = Math.min(annotation.points[0].y, annotation.points[1].y);
          const width = Math.abs(
            annotation.points[1].x - annotation.points[0].x,
          );
          const height = Math.abs(
            annotation.points[1].y - annotation.points[0].y,
          );
          return (
            point.x >= x - tolerance &&
            point.x <= x + width + tolerance &&
            point.y >= y - tolerance &&
            point.y <= y + height + tolerance
          );
        }
        break;
      case "freehand":
        return annotation.points.some((pathPoint, i) => {
          if (i === 0) return false;
          const prevPoint = annotation.points[i - 1];
          const dx = pathPoint.x - prevPoint.x;
          const dy = pathPoint.y - prevPoint.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          if (length === 0) return false;
          const dot =
            ((point.x - prevPoint.x) * dx + (point.y - prevPoint.y) * dy) /
            (length * length);
          const closestX = prevPoint.x + dot * dx;
          const closestY = prevPoint.y + dot * dy;
          const distance = Math.sqrt(
            Math.pow(point.x - closestX, 2) + Math.pow(point.y - closestY, 2),
          );
          return distance <= tolerance && dot >= 0 && dot <= 1;
        });
    }
    return false;
  };

  useEffect(() => {
    const selectedCount = annotations.filter((a) => a.selected).length;
    onSelectionChange(selectedCount);
    onAnnotationChange(annotations);
  }, [annotations, onSelectionChange, onAnnotationChange]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "g") {
        handleGroupCreation();
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, [handleGroupCreation]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (selectedTool === "group") {
      handleGroupCreation();
      return;
    }

    if (selectedTool === "select") {
      const point = getCanvasPoint(e);
      let clickedAnnotation = false;

      setAnnotations(
        annotations.map((annotation) => {
          if (!clickedAnnotation && isPointInPath(point, annotation)) {
            clickedAnnotation = true;
            return { ...annotation, selected: !annotation.selected };
          }
          return {
            ...annotation,
            selected: e.shiftKey ? annotation.selected : false,
          };
        }),
      );
      return;
    }

    if (e.button === 1) {
      setIsPanning(true);
    } else if (e.button === 0) {
      setIsDrawing(true);
      const point = getCanvasPoint(e);
      setCurrentAnnotation([point]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPosition((prev) => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
      }));
    } else if (isDrawing) {
      const point = getCanvasPoint(e);
      if (selectedTool === "freehand") {
        setCurrentAnnotation((prev) => [...prev, point]);
      } else if (["line", "frame", "area"].includes(selectedTool)) {
        setCurrentAnnotation([currentAnnotation[0], point]);
      }
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (isDrawing) {
      setIsDrawing(false);
      if (currentAnnotation.length > 0) {
        if (["line", "frame", "area"].includes(selectedTool)) {
          if (currentAnnotation.length < 2) {
            setCurrentAnnotation([]);
            return;
          }
          const dx = currentAnnotation[1].x - currentAnnotation[0].x;
          const dy = currentAnnotation[1].y - currentAnnotation[0].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 5) {
            setCurrentAnnotation([]);
            return;
          }
        }

        const newAnnotation: Annotation = {
          id: `annotation-${Date.now()}`,
          type: selectedTool,
          points: currentAnnotation,
          color: "#000000",
          timestamp: Date.now(),
        };

        setAnnotations((prev) => [...prev, newAnnotation]);
        onAnnotationChange([...annotations, newAnnotation]);
        setCurrentAnnotation([]);
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-background overflow-hidden">
      {/* Canvas Controls */}
      <div className="absolute top-4 right-4 flex gap-2 bg-background/80 p-2 rounded-lg backdrop-blur-sm">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (annotations.length > 0) {
                    const newAnnotations = annotations.slice(0, -1);
                    setAnnotations(newAnnotations);
                    onAnnotationChange(newAnnotations);
                  }
                }}
                className="h-8 w-8"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomIn}
                className="h-8 w-8"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In (Ctrl++)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleZoomOut}
                className="h-8 w-8"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out (Ctrl+-)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`h-8 w-8 ${isPanning ? "bg-accent" : ""}`}
              >
                <Move className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pan (Middle Mouse Button)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        width={1600}
        height={1067}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};

export default AnnotationCanvas;

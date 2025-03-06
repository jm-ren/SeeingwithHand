import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Undo2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

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
  onToolChange?: (tool: Tool) => void;
}

const AnnotationCanvas = ({
  imageUrl = "https://images2.dwell.com/photos/6133553759298379776/6297915443342360576/original.jpg?auto=format&q=35&w=1600",
  onAnnotationChange = () => {},
  onSelectionChange = () => {},
  initialAnnotations = [],
  selectedTool = "point",
  onToolChange = () => {},
}: AnnotationCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
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
  const [imageScaling, setImageScaling] = useState<{
    width: number;
    height: number;
    x: number;
    y: number;
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

  // Resize canvas to fit container
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !container || !imageRef.current || !imageDimensions) return;
    
    // Set canvas dimensions to match container
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Calculate proper scaling to maintain aspect ratio
    const containerWidth = canvas.width;
    const containerHeight = canvas.height;
    const imageAspectRatio = imageDimensions.width / imageDimensions.height;
    const containerAspectRatio = containerWidth / containerHeight;
    
    // This ensures the image is centered and properly scaled
    let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
    
    if (containerAspectRatio > imageAspectRatio) {
      // Container is wider than image aspect ratio
      drawHeight = containerHeight;
      drawWidth = drawHeight * imageAspectRatio;
      offsetX = (containerWidth - drawWidth) / 2;
    } else {
      // Container is taller than image aspect ratio
      drawWidth = containerWidth;
      drawHeight = drawWidth / imageAspectRatio;
      offsetY = (containerHeight - drawHeight) / 2;
    }
    
    // Store these values for drawing and coordinate calculations
    setImageScaling({
      width: drawWidth,
      height: drawHeight,
      x: offsetX,
      y: offsetY
    });
    
    drawCanvas();
  }, [imageDimensions]);

  // Set up resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(container);

    // Initial resize
    resizeCanvas();

    return () => {
      observer.disconnect();
    };
  }, [resizeCanvas]);

  const drawAnnotations = useCallback((ctx: CanvasRenderingContext2D) => {
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
      console.error("Error in drawAnnotations:", error);
    }
  }, [annotations, currentAnnotation, groups, selectedTool]);

  // Function to draw the entire canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (!canvas || !image || !imageDimensions) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (imageScaling) {
        // Draw the image with proper scaling and centering
        ctx.drawImage(
          image, 
          imageScaling.x, 
          imageScaling.y, 
          imageScaling.width, 
          imageScaling.height
        );
      } else {
        // Fallback to filling the canvas if scaling not yet calculated
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      }
      
      // Draw all annotations
      drawAnnotations(ctx);
    } catch (error) {
      console.error("Error drawing canvas:", error);
    }
  }, [imageScaling, imageDimensions, drawAnnotations]);

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
    if (!canvas || !imageDimensions) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    // Calculate relative position within canvas
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    // Convert to canvas coordinate system
    // No need to adjust for scale or position since we removed those
    return {
      x: canvasX,
      y: canvasY
    };
  };

  // Add subtle animation to newly created annotations
  useEffect(() => {
    if (annotations.length === 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Get the last added annotation
    const lastAnnotation = annotations[annotations.length - 1];
    
    // Skip if this is just initialization
    if (annotations.length === initialAnnotations.length) return;
    
    // Add a subtle animation effect for new annotations
    let opacity = 0;
    let fadeIn = true;
    
    const animate = () => {
      if (!canvas || !ctx) return;
      
      // Draw everything
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw image
      if (imageRef.current) {
        try {
          ctx.drawImage(
            imageRef.current,
            0,
            0,
            canvas.width,
            canvas.height
          );
        } catch (error) {
          console.error("Error drawing image:", error);
        }
      }
      
      // Draw all annotations except the last one
      const tempAnnotations = [...annotations.slice(0, -1)];
      drawAnnotationsWithoutLast(ctx, tempAnnotations);
      
      // Draw the last annotation with animation
      if (lastAnnotation) {
        ctx.save();
        ctx.globalAlpha = fadeIn ? opacity : 1;
        drawSingleAnnotation(ctx, lastAnnotation);
        ctx.restore();
      }
      
      // Update animation
      if (fadeIn) {
        opacity += 0.1;
        if (opacity >= 1) {
          opacity = 1;
          fadeIn = false;
          drawAnnotations(ctx);
          return;
        }
        requestAnimationFrame(animate);
      }
    };
    
    // Start animation
    requestAnimationFrame(animate);
    
  }, [annotations.length]);
  
  // Helper function to draw all annotations except the last one
  const drawAnnotationsWithoutLast = useCallback(
    (ctx: CanvasRenderingContext2D, annotations: Annotation[]) => {
      // Draw group backgrounds first
      groups.forEach((group) => {
        const groupAnnotations = annotations.filter(
          (a) => a.groupId === group.id,
        );
        if (groupAnnotations.length === 0) return;
        
        // Calculate and draw group bounds
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
      
      // Draw all annotations
      annotations.forEach((annotation) => {
        drawSingleAnnotation(ctx, annotation);
      });
    },
    [groups]
  );
  
  // Helper function to draw a single annotation
  const drawSingleAnnotation = useCallback(
    (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
      ctx.strokeStyle = annotation.selected
        ? "#FFC107" // Highlight color for selected items
        : annotation.color;
      ctx.lineWidth = 2;
      ctx.fillStyle = annotation.color;
      
      // Draw based on type
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
    },
    []
  );

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

  // Add keyup listener to clear selections when Shift is released
  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      // Check if the released key was Shift
      if (e.key === 'Shift') {
        // Clear all selections when Shift key is released
        const hasSelectedAnnotations = annotations.some(a => a.selected);
        if (hasSelectedAnnotations) {
          setAnnotations(annotations.map(a => ({ ...a, selected: false })));
        }
      }
    };

    window.addEventListener("keyup", handleKeyUp);
    return () => window.removeEventListener("keyup", handleKeyUp);
  }, [annotations]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent triggering shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Add tool selection keyboard shortcuts
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
            onToolChange("select");
            break;
          case '`':
            onToolChange("freehand");
            break;
          case ' ': // Space key
            e.preventDefault(); // Prevent page scrolling
            handleGroupCreation();
            break;
          case "p":
            onToolChange("point");
            break;
          case "l":
            onToolChange("line");
            break;
          case "r":
            onToolChange("frame");
            break;
          case "a":
            onToolChange("area");
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress); // Changed from keypress to keydown to capture space key
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleGroupCreation, onToolChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const point = getCanvasPoint(e);
    
    // Only enable selection when the Shift key is pressed or select tool is active
    if (e.shiftKey || selectedTool === "select") {
      // Check if the user clicked on an annotation
      let clickedAnnotation = false;
      const updatedAnnotations = annotations.map((annotation) => {
        // Check if this annotation was clicked
        if (!clickedAnnotation && isPointInPath(point, annotation)) {
          clickedAnnotation = true;
          // Toggle selection state
          return { ...annotation, selected: !annotation.selected };
        }
        
        // When using Shift, keep existing selections, otherwise clear them
        return {
          ...annotation,
          selected: e.shiftKey ? annotation.selected : false
        };
      });
      
      // If an annotation was clicked, update annotations and exit
      if (clickedAnnotation) {
        setAnnotations(updatedAnnotations);
        return;
      }
    }
    
    // Clear all selections when clicking on empty space without Shift key
    const hasSelectedAnnotations = annotations.some(a => a.selected);
    if (!e.shiftKey && hasSelectedAnnotations) {
      setAnnotations(annotations.map(a => ({ ...a, selected: false })));
    }
    
    // Handle group creation
    if (selectedTool === "group") {
      handleGroupCreation();
      return;
    }
    
    // If no selection was made (or shift wasn't pressed), proceed with drawing
    if (e.button === 0 && selectedTool !== "select") {
      setIsDrawing(true);
      setCurrentAnnotation([point]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawing) {
      const point = getCanvasPoint(e);
      if (selectedTool === "freehand") {
        setCurrentAnnotation((prev) => [...prev, point]);
      } else if (["line", "frame", "area"].includes(selectedTool)) {
        setCurrentAnnotation([currentAnnotation[0], point]);
      }
    }
  };

  const handleMouseUp = () => {
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
    <div 
      ref={containerRef} 
      className="relative w-full h-full overflow-hidden"
      style={{ background: '#FBFAF8' }}
    >
      {/* Canvas Controls */}
      <div 
        className="absolute top-4 right-4 flex gap-2 p-2 rounded-lg z-10"
        style={{
          animation: 'slideDown 0.3s ease-out forwards',
          opacity: 0,
          transform: 'translateY(-20px)'
        }}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="transition-transform hover:scale-105 active:scale-95">
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
              </div>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain"
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Image is loaded programmatically in useEffect */}

      {/* Drawing feedback indicator */}
      {isDrawing && (
        <div 
          className="absolute bottom-4 left-4 bg-primary text-primary-foreground rounded-full px-3 py-1 text-sm"
          style={{
            animation: 'fadeIn 0.3s ease-out forwards',
            opacity: 0
          }}
        >
          Drawing {selectedTool}...
        </div>
      )}
    </div>
  );
};

export default AnnotationCanvas;

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Undo2 } from "lucide-react";
import { useAnnotations } from "../context/AnnotationContext";
import { useSession } from "../context/SessionContext";
import { Point, Annotation, Tool, Group } from "../types/annotations";

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
  // Use contexts
  const { 
    annotations, 
    setAnnotations, 
    addAnnotation, 
    updateAnnotation, 
    deleteAnnotation,
    selectAnnotation,
    deselectAll,
    groups,
    createGroup,
    selectedCount,
    selectedAnnotations
  } = useAnnotations();
  
  const { isSessionActive, recordInteractionEvent } = useSession();
  
  // Local state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Point[]>([]);
  const [isPolygonMode, setIsPolygonMode] = useState(false);
  const [isCreatingPolygon, setIsCreatingPolygon] = useState(false);
  const [tempMousePos, setTempMousePos] = useState<Point | null>(null);
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
  const [previousTool, setPreviousTool] = useState<Tool | null>(null);
  const [isShiftKeyDown, setIsShiftKeyDown] = useState(false);
  
  // --- V2 Tracing State ---
  const [pointerDown, setPointerDown] = useState(false);
  const [pointerStart, setPointerStart] = useState<{ point: Point; time: number } | null>(null);
  const [currentTrace, setCurrentTrace] = useState<Point[]>([]);
  const [traceType, setTraceType] = useState<"none" | "point" | "freehand" | "hover">("none");
  const [hoverTrace, setHoverTrace] = useState<Point[]>([]);
  const dwellTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [dwellRadius, setDwellRadius] = useState(5); // For growing point

  // --- V2 Tracing Parameters ---
  const DWELL_TIME = 400; // ms to trigger dwell/point
  const MOVE_THRESHOLD = 8; // px to switch to freehand
  const HOVER_FADE_TIME = 1200; // ms for hover trace to fade

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

  // Check if current tool uses polygon mode
  useEffect(() => {
    const polygonTools = ["frame", "area"];
    const wasPolygonMode = isPolygonMode;
    setIsPolygonMode(polygonTools.includes(selectedTool));
    
    // If switching away from a polygon tool, clear the current annotation
    if (!polygonTools.includes(selectedTool) && isCreatingPolygon) {
      setIsCreatingPolygon(false);
      setCurrentAnnotation([]);
      setTempMousePos(null);
    }
    
    // If switching to a polygon tool from a non-polygon tool,
    // make sure we fully reset any leftover state
    if (polygonTools.includes(selectedTool) && !wasPolygonMode) {
      setIsCreatingPolygon(false);
      setCurrentAnnotation([]);
      setTempMousePos(null);
    }
  }, [selectedTool, isCreatingPolygon, isPolygonMode]);

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

  // Helper function to check if a point is near another point
  const isPointNearPoint = (point1: Point, point2: Point, threshold: number = 15): boolean => {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy) <= threshold;
  };

  // Helper function to draw a polygon
  const drawPolygon = (
    ctx: CanvasRenderingContext2D, 
    points: Point[], 
    isFilled: boolean = false, 
    fillColor: string = "rgba(0, 0, 0, 0.1)",
    strokeColor: string = "rgba(0, 0, 0, 0.5)",
    lineWidth: number = 2,
    isPreviewMode: boolean = false
  ) => {
    if (points.length < 1) return;
    
    // Always draw all vertices, not just for the current polygon
    // Draw all polygon points - this ensures they're always visible
    for (let i = 0; i < points.length; i++) {
      const isFirstPoint = i === 0;
      const pointSize = isFirstPoint ? 6 : 4;
      const pointColor = isFirstPoint ? 'rgba(221, 70, 39, 0.7)' : 'rgba(0, 0, 0, 0.5)';
      
      ctx.fillStyle = pointColor;
      ctx.beginPath();
      ctx.arc(points[i].x, points[i].y, pointSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Only proceed to drawing lines if we have at least 2 points
    if (points.length < 2) return;
    
    // Draw lines between points - this is the critical part for existing polygons
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    // Draw all connection lines between existing points
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    // Only add the preview line and closing logic for the current polygon being created
    if (isPreviewMode && isCreatingPolygon && tempMousePos && points === currentAnnotation) {
      // Draw from the last point to the current mouse position
      ctx.lineTo(tempMousePos.x, tempMousePos.y);
      
      // Only close the path preview if near the first point
      if (points.length > 2 && isPointNearPoint(tempMousePos, points[0])) {
        ctx.closePath();
      }
    }
    // Close the path if we have at least 3 points or we're in fill mode
    else if (points.length >= 3 || isFilled) {
      ctx.closePath();
    }
    
    // Fill the polygon if needed
    if (isFilled) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    
    // Stroke the outline
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  };

  const drawAnnotations = useCallback((ctx: CanvasRenderingContext2D) => {
    try {
      // Draw group backgrounds first
      groups.forEach((group) => {
        const groupAnnotations = annotations.filter(
          (a) => a.groupIds?.includes(group.id),
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

      // Draw all completed annotations first - these should be completely independent
      // from any polygon currently being created
      annotations.forEach((annotation) => {
        // Determine if this annotation is selected based on selectedAnnotations
        const isSelected = selectedAnnotations.includes(annotation.id);
        const strokeColor = isSelected ? "rgba(0, 0, 255, 0.5)" : "rgba(0, 0, 0, 0.5)";
        const lineWidth = isSelected ? 3 : 2;
        const fillColor = isSelected ? "rgba(0, 0, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";

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
              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = lineWidth;
              ctx.stroke();
            }
            break;
          case "line":
            if (annotation.points[0] && annotation.points[1]) {
              ctx.beginPath();
              ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
              ctx.lineTo(annotation.points[1].x, annotation.points[1].y);
              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = lineWidth;
              ctx.stroke();
            }
            break;
          case "frame":
            // Draw as polygon - always draw completed annotation polygons with isPreviewMode=false
            if (annotation.points.length >= 3) {
              drawPolygon(ctx, annotation.points, false, fillColor, strokeColor, lineWidth, false);
            } 
            // For backward compatibility with old rectangle annotations
            else if (annotation.points.length === 2) {
              ctx.beginPath();
              const width = annotation.points[1].x - annotation.points[0].x;
              const height = annotation.points[1].y - annotation.points[0].y;
              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = lineWidth;
              ctx.strokeRect(
                annotation.points[0].x,
                annotation.points[0].y,
                width,
                height
              );
            }
            break;
          case "area":
            // Draw as filled polygon - always draw completed annotation polygons with isPreviewMode=false
            if (annotation.points.length >= 3) {
              drawPolygon(ctx, annotation.points, true, fillColor, strokeColor, lineWidth, false);
            }
            // For backward compatibility with old rectangle annotations
            else if (annotation.points.length === 2) {
              ctx.beginPath();
              const width = annotation.points[1].x - annotation.points[0].x;
              const height = annotation.points[1].y - annotation.points[0].y;
              ctx.fillStyle = fillColor;
              ctx.fillRect(
                annotation.points[0].x,
                annotation.points[0].y,
                width,
                height
              );
              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = lineWidth;
              ctx.strokeRect(
                annotation.points[0].x,
                annotation.points[0].y,
                width,
                height
              );
            }
            break;
          case "freehand":
            if (annotation.points.length > 0) {
              ctx.beginPath();
              ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
              annotation.points.forEach((point) => {
                ctx.lineTo(point.x, point.y);
              });
              ctx.strokeStyle = strokeColor;
              ctx.lineWidth = lineWidth;
              ctx.stroke();
            }
            break;
        }
      });

      // Draw current annotation - this needs to be drawn last to appear on top
      if (currentAnnotation.length > 0) {
        switch (selectedTool) {
          case "point":
            if (currentAnnotation[0]) {
              ctx.beginPath();
              ctx.arc(
                currentAnnotation[0].x,
                currentAnnotation[0].y,
                5,
                0,
                Math.PI * 2
              );
              ctx.strokeStyle = "rgba(221, 70, 39, 0.5)";
              ctx.lineWidth = 2;
              ctx.stroke();
            }
            break;
          case "line":
            if (currentAnnotation[0] && tempMousePos && isDrawing) {
              ctx.beginPath();
              ctx.moveTo(currentAnnotation[0].x, currentAnnotation[0].y);
              ctx.lineTo(tempMousePos.x, tempMousePos.y);
              ctx.strokeStyle = "rgba(221, 70, 39, 0.5)";
              ctx.lineWidth = 2;
              ctx.stroke();
            } else if (currentAnnotation[0] && currentAnnotation[1]) {
              ctx.beginPath();
              ctx.moveTo(currentAnnotation[0].x, currentAnnotation[0].y);
              ctx.lineTo(currentAnnotation[1].x, currentAnnotation[1].y);
              ctx.strokeStyle = "rgba(221, 70, 39, 0.5)";
              ctx.lineWidth = 2;
              ctx.stroke();
            }
            break;
          case "frame":
            // Draw as polygon in creation mode - Use isPreviewMode=true for the current polygon being created
            if (isCreatingPolygon) {
              // Make sure to fully emphasize the current polygon
              drawPolygon(
                ctx, 
                currentAnnotation, 
                false, 
                "rgba(0, 0, 0, 0.1)", 
                "rgba(221, 70, 39, 0.5)", 
                2,
                true
              );
              
              // Draw close indicator when near the starting point
              if (currentAnnotation.length > 2 && tempMousePos && 
                  isPointNearPoint(tempMousePos, currentAnnotation[0])) {
                ctx.beginPath();
                ctx.arc(currentAnnotation[0].x, currentAnnotation[0].y, 10, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
                ctx.lineWidth = 2;
                ctx.stroke();
              }
            } 
            // For rectangle mode (backward compatibility)
            else if (currentAnnotation[0] && currentAnnotation[1]) {
              const width = currentAnnotation[1].x - currentAnnotation[0].x;
              const height = currentAnnotation[1].y - currentAnnotation[0].y;
              ctx.strokeStyle = "rgba(221, 70, 39, 0.5)";
              ctx.lineWidth = 2;
              ctx.strokeRect(
                currentAnnotation[0].x,
                currentAnnotation[0].y,
                width,
                height
              );
            }
            break;
          case "area":
            // Draw as filled polygon in creation mode - Use isPreviewMode=true for the current polygon being created
            if (isCreatingPolygon) {
              // Make sure to fully emphasize the current polygon
              drawPolygon(
                ctx, 
                currentAnnotation, 
                true, 
                "rgba(221, 70, 39, 0.1)", 
                "rgba(221, 70, 39, 0.5)", 
                2,
                true
              );
              
              // Draw close indicator when near the starting point
              if (currentAnnotation.length > 2 && tempMousePos && 
                  isPointNearPoint(tempMousePos, currentAnnotation[0])) {
                ctx.beginPath();
                ctx.arc(currentAnnotation[0].x, currentAnnotation[0].y, 10, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
                ctx.lineWidth = 2;
                ctx.stroke();
              }
            } 
            // For rectangle mode (backward compatibility)
            else if (currentAnnotation[0] && currentAnnotation[1]) {
              const width = currentAnnotation[1].x - currentAnnotation[0].x;
              const height = currentAnnotation[1].y - currentAnnotation[0].y;
              ctx.fillStyle = "rgba(221, 70, 39, 0.1)";
              ctx.fillRect(
                currentAnnotation[0].x,
                currentAnnotation[0].y,
                width,
                height
              );
              ctx.strokeStyle = "rgba(221, 70, 39, 0.5)";
              ctx.lineWidth = 2;
              ctx.strokeRect(
                currentAnnotation[0].x,
                currentAnnotation[0].y,
                width,
                height
              );
            }
            break;
          case "freehand":
            if (currentAnnotation.length > 0) {
              ctx.beginPath();
              ctx.moveTo(currentAnnotation[0].x, currentAnnotation[0].y);
              currentAnnotation.forEach((point) => {
                ctx.lineTo(point.x, point.y);
              });
              ctx.strokeStyle = "rgba(221, 70, 39, 0.5)";
              ctx.lineWidth = 2;
              ctx.stroke();
            }
            break;
        }
      }
    } catch (error) {
      console.error("Error drawing annotations:", error);
    }
  }, [annotations, currentAnnotation, groups, selectedTool, isCreatingPolygon, tempMousePos, isDrawing, selectedAnnotations]);

  // --- V2 Drawing Logic ---
  const drawV2Trace = useCallback((ctx: CanvasRenderingContext2D) => {
    // Draw growing point (dwell)
    if (traceType === "point" && currentTrace.length > 0) {
      ctx.beginPath();
      ctx.arc(currentTrace[0].x, currentTrace[0].y, dwellRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(221, 70, 39, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "rgba(221, 70, 39, 0.15)";
      ctx.fill();
    }
    // Draw freehand path as you draw
    if (traceType === "freehand" && currentTrace.length > 1) {
      ctx.beginPath();
      ctx.moveTo(currentTrace[0].x, currentTrace[0].y);
      for (let i = 1; i < currentTrace.length; i++) {
        ctx.lineTo(currentTrace[i].x, currentTrace[i].y);
      }
      ctx.strokeStyle = "rgba(221, 70, 39, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Draw hover trace (faint, fading)
    if (hoverTrace.length > 1) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.moveTo(hoverTrace[0].x, hoverTrace[0].y);
      for (let i = 1; i < hoverTrace.length; i++) {
        ctx.lineTo(hoverTrace[i].x, hoverTrace[i].y);
      }
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }, [traceType, currentTrace, dwellRadius, hoverTrace]);

  // Patch drawCanvas to call drawV2Trace
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !imageRef.current || !imageScaling) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      imageRef.current,
      imageScaling.x,
      imageScaling.y,
      imageScaling.width,
      imageScaling.height,
    );
    drawAnnotations(ctx); // Draw legacy/committed annotations
    drawV2Trace(ctx);     // Draw V2 live trace/hover
  }, [drawAnnotations, imageScaling, drawV2Trace]);

  // Redraw on V2 tracing state changes
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, dwellRadius, currentTrace, hoverTrace, traceType]);

  // Update canvas when annotations change
  useEffect(() => {
    drawCanvas();
    
    // Notify parent component of changes
    onAnnotationChange(annotations);
    onSelectionChange(selectedCount);
  }, [annotations, drawCanvas, onAnnotationChange, onSelectionChange, selectedCount, tempMousePos]);

  // Sync selectedAnnotations with annotation objects
  useEffect(() => {
    console.log("Selected annotations changed:", selectedAnnotations);
    // This effect triggers re-render when selections change
    drawCanvas();
  }, [selectedAnnotations, drawCanvas]);

  // Debugging output for selection state
  useEffect(() => {
    console.log("Current selection state:", {
      selectedAnnotations,
      selectedCount,
      annotations: annotations.map(a => ({id: a.id, selected: selectedAnnotations.includes(a.id)}))
    });
  }, [selectedAnnotations, selectedCount, annotations]);

  // Handle group creation
  const handleCreateGroup = useCallback(() => {
    console.log("Creating group with selectedAnnotations:", selectedAnnotations);
    
    // Use the selectedAnnotations array directly - this is crucial!
    const selectedAnnotationIds = selectedAnnotations;
    
    if (selectedAnnotationIds.length >= 2) {
      console.log("Creating group with IDs:", selectedAnnotationIds);
      createGroup(selectedAnnotationIds);
      
      // Record interaction event only if session is active
      if (isSessionActive) {
        recordInteractionEvent('group_create', {
          data: {
            groupSize: selectedAnnotationIds.length,
            annotationIds: selectedAnnotationIds
          }
        });
      }
    } else {
      console.log("Not enough selections to create a group");
    }
  }, [selectedAnnotations, createGroup, recordInteractionEvent, isSessionActive]);

  // Find annotation at a specific point
  const findAnnotationAtPoint = useCallback((point: Point): Annotation | null => {
    // Search in reverse order (top to bottom in z-index)
    for (let i = annotations.length - 1; i >= 0; i--) {
      const annotation = annotations[i];
      
      switch (annotation.type) {
        case "point":
          if (
            annotation.points[0] &&
            Math.hypot(
              annotation.points[0].x - point.x,
              annotation.points[0].y - point.y,
            ) <= 15
          ) {
            return annotation;
          }
          break;
        case "line":
          if (
            annotation.points[0] &&
            annotation.points[1] &&
            isPointNearLine(
              point,
              annotation.points[0],
              annotation.points[1],
              10,
            )
          ) {
            return annotation;
          }
          break;
        case "frame":
        case "area":
          // For polygon shapes (3+ points)
          if (annotation.points.length >= 3) {
            if (isPointInPolygon(point, annotation.points, 5)) {
              return annotation;
            }
          }
          // For legacy rectangle shapes (2 points)
          else if (
            annotation.points[0] &&
            annotation.points[1] &&
            isPointInRect(point, annotation.points[0], annotation.points[1], 5)
          ) {
            return annotation;
          }
          break;
        case "freehand":
          if (isPointNearPolyline(point, annotation.points, 10)) {
            return annotation;
          }
          break;
      }
    }
    
    return null;
  }, [annotations]);

  // Update keydown event listeners for shift+select and shift+space behavior
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cancel polygon creation with Escape key
      if (e.key === 'Escape' && isCreatingPolygon) {
        setIsCreatingPolygon(false);
        setCurrentAnnotation([]);
        setTempMousePos(null);
      }
      
      // Shift key handling - TEMPORARILY SWITCH TO SELECT TOOL
      if (e.key === 'Shift' && !isShiftKeyDown) {
        // Store the current tool before switching to select
        if (selectedTool !== 'select') {
          setPreviousTool(selectedTool);
          // Temporarily switch to select tool
          onToolChange('select');
        }
        setIsShiftKeyDown(true);
        console.log("Shift pressed - switching to select tool, previous tool:", selectedTool);
      }
      
      // Space key handling - GROUP SELECTED OBJECTS WHILE SHIFT IS HELD
      if (e.key === ' ' && isShiftKeyDown && selectedCount >= 2) {
        handleCreateGroup();
        console.log("Shift+Space pressed - grouping objects");
        e.preventDefault(); // Prevent scrolling from spacebar
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      // When shift key is released, switch back to the previous tool
      if (e.key === 'Shift') {
        if (previousTool) {
          // Switch back to previous tool
          onToolChange(previousTool);
          console.log("Shift released - switching back to:", previousTool);
          setPreviousTool(null);
          
          // Clear all selections when shift is released
          deselectAll();
          console.log("Shift released - clearing all selections");
        }
        setIsShiftKeyDown(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isCreatingPolygon, handleCreateGroup, selectedCount, isShiftKeyDown, selectedTool, previousTool, onToolChange, deselectAll]);

  // --- V2 Pointer Event Handlers ---
  const handlePointerDownV2 = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!imageScaling) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (
      x < imageScaling.x ||
      y < imageScaling.y ||
      x > imageScaling.x + imageScaling.width ||
      y > imageScaling.y + imageScaling.height
    ) {
      return;
    }
    const now = Date.now();
    setPointerDown(true);
    setPointerStart({ point: { x, y }, time: now });
    setCurrentTrace([{ x, y }]);
    setTraceType("point");
    setDwellRadius(5);
    // Start dwell timer
    dwellTimerRef.current = setInterval(() => {
      setDwellRadius((r) => Math.min(r + 1, 30));
    }, 30);
  }, [imageScaling]);

  const handlePointerMoveV2 = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (pointerDown && pointerStart) {
      const dx = x - pointerStart.point.x;
      const dy = y - pointerStart.point.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (traceType === "point" && dist > MOVE_THRESHOLD) {
        // Switch to freehand
        setTraceType("freehand");
        if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);
      }
      setCurrentTrace((prev) => [...prev, { x, y }]);
    } else if (!pointerDown) {
      // Hover trace
      setHoverTrace((prev) => [...prev, { x, y }]);
      // Start fade timer
      setTimeout(() => setHoverTrace([]), HOVER_FADE_TIME);
    }
  }, [pointerDown, pointerStart, traceType]);

  const handlePointerUpV2 = useCallback(() => {
    if (!pointerDown) return;
    if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);
    if (traceType === "point" && currentTrace.length > 0) {
      // Classify as dwell or tap
      const duration = Date.now() - (pointerStart?.time || 0);
      const gesture = duration > DWELL_TIME ? "dwell" : "tap";
      // Add annotation as point
      addAnnotation({
        type: "point",
        points: [currentTrace[0]],
        color: "black",
        selected: false,
        gestureType: gesture,
        duration,
      });
    } else if (traceType === "freehand" && currentTrace.length > 1) {
      // Classify freehand gesture
      const gesture = classifyFreehandGesture(currentTrace, pointerStart?.time || 0);
      addAnnotation({
        type: "freehand",
        points: currentTrace,
        color: "black",
        selected: false,
        gestureType: gesture.type,
        ...gesture.metrics,
      });
    }
    setPointerDown(false);
    setPointerStart(null);
    setCurrentTrace([]);
    setTraceType("none");
    setDwellRadius(5);
  }, [pointerDown, traceType, currentTrace, pointerStart, addAnnotation]);

  const handlePointerLeaveV2 = useCallback(() => {
    if (pointerDown) handlePointerUpV2();
    setHoverTrace([]);
  }, [pointerDown, handlePointerUpV2]);

  // --- Gesture Classification Helper ---
  function classifyFreehandGesture(trace: Point[], startTime: number) {
    // Calculate metrics: duration, speed, bounding box, straightness, direction changes
    const endTime = Date.now();
    const duration = endTime - startTime;
    let length = 0;
    let directionChanges = 0;
    let prevAngle = null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 1; i < trace.length; i++) {
      const dx = trace[i].x - trace[i - 1].x;
      const dy = trace[i].y - trace[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
      minX = Math.min(minX, trace[i].x);
      minY = Math.min(minY, trace[i].y);
      maxX = Math.max(maxX, trace[i].x);
      maxY = Math.max(maxY, trace[i].y);
      const angle = Math.atan2(dy, dx);
      if (prevAngle !== null && Math.abs(angle - prevAngle) > 0.5) directionChanges++;
      prevAngle = angle;
    }
    const boundingBox = Math.max(maxX - minX, maxY - minY);
    const straightness = length / (Math.sqrt(Math.pow(trace[trace.length - 1].x - trace[0].x, 2) + Math.pow(trace[trace.length - 1].y - trace[0].y, 2)) || 1);
    const avgSpeed = length / (duration || 1);
    // Heuristic classification
    if (straightness < 1.2 && avgSpeed > 0.5) return { type: "scan", metrics: { duration, length, boundingBox, directionChanges } };
    if (directionChanges > 10 && boundingBox < 40) return { type: "scribble", metrics: { duration, length, boundingBox, directionChanges } };
    if (boundingBox > 100 && directionChanges > 5) return { type: "explore", metrics: { duration, length, boundingBox, directionChanges } };
    if (directionChanges > 3) return { type: "meander", metrics: { duration, length, boundingBox, directionChanges } };
    return { type: "freehand", metrics: { duration, length, boundingBox, directionChanges } };
  }

  // Handle mouse events - make selection use multi-select when shift is held
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageScaling) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if we're in the image bounds
    if (
      x < imageScaling.x ||
      y < imageScaling.y ||
      x > imageScaling.x + imageScaling.width ||
      y > imageScaling.y + imageScaling.height
    ) {
      return;
    }
    
    const currentPoint = { x, y };
    
    // Handle select tool behavior - either from actual select tool or shift key
    if (selectedTool === "select") {
      console.log("Select tool active, shift key:", isShiftKeyDown);
      const clickedAnnotation = findAnnotationAtPoint(currentPoint);
      
      if (clickedAnnotation) {
        // Always use multi-select when shift key is down
        console.log("Selecting annotation:", clickedAnnotation.id, "With multi-select:", isShiftKeyDown);
        selectAnnotation(clickedAnnotation.id, isShiftKeyDown);
        
        // Record interaction event only if session is active
        if (isSessionActive) {
          recordInteractionEvent('annotation_select', {
            relatedAnnotationId: clickedAnnotation.id,
            position: currentPoint
          });
        }
      } else if (!isShiftKeyDown) {
        // Only deselect all if shift is not pressed
        console.log("Deselecting all (shift not pressed)");
        deselectAll();
      }
    } else if (selectedTool === "group") {
      console.log("Group tool used");
      if (selectedCount >= 2) {
        handleCreateGroup();
      }
      // Switch back to select tool after grouping
      onToolChange("select");
    } else if (isPolygonMode) {
      // Handle polygon creation modes for frame and area tools
      
      // If already creating a polygon, check if clicking near the starting point
      if (isCreatingPolygon && currentAnnotation.length > 2) {
        if (isPointNearPoint(currentPoint, currentAnnotation[0])) {
          // Close the polygon and add it to annotations
          const newAnnotation: Omit<Annotation, 'id' | 'timestamp'> = {
            type: selectedTool,
            points: [...currentAnnotation], // Close the polygon
            color: "black",
            selected: false
          };
          
          // Add the annotation
          addAnnotation(newAnnotation);
          
          // Record interaction event only if session is active
          if (isSessionActive) {
            recordInteractionEvent('annotation_create', {
              position: currentAnnotation[0],
              toolType: selectedTool
            });
          }
          
          // Reset polygon creation state completely
          setIsCreatingPolygon(false);
          setCurrentAnnotation([]);
          setTempMousePos(null);
          return; // Important to return here to prevent adding another point
        } else {
          // Add the point to the current polygon
          setCurrentAnnotation(prev => [...prev, currentPoint]);
        }
      } 
      // If polygon tool is active but we're not creating a polygon, 
      // this means either we're starting for the first time or 
      // we finished a previous polygon and need to start a new one
      else if (!isCreatingPolygon) {
        // Make sure all previous polygon state is completely reset
        setIsCreatingPolygon(true);
        setCurrentAnnotation([currentPoint]);
        // Reset any temporary states that might be left over
        setTempMousePos(null);
      } 
      // Add point to existing polygon
      else {
        setCurrentAnnotation(prev => [...prev, currentPoint]);
      }
    } else {
      // Handle other tools (point, line, freehand)
      
      // Clear any previous state completely to prevent unwanted connections
      setTempMousePos(null);
      setCurrentAnnotation([]);
      
      // Now start the new drawing action
      setIsDrawing(true);
      setCurrentAnnotation([currentPoint]);
    }
  }, [imageScaling, selectedTool, isCreatingPolygon, currentAnnotation, addAnnotation, recordInteractionEvent, selectAnnotation, deselectAll, isPolygonMode, isSessionActive, findAnnotationAtPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageScaling) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Only update temp mouse position if actively drawing or creating a polygon
    // This prevents "ghost lines" from appearing when not actively creating an annotation
    if (isDrawing || isCreatingPolygon) {
      setTempMousePos({ x, y });
    } else if (isPolygonMode) {
      // For polygon tools, we only need the temp mouse position when hovering near the first point
      // to show the close indicator or when actively adding points
      if (currentAnnotation.length > 0) {
        setTempMousePos({ x, y });
      }
    } else {
      // For other tools, update temp mouse pos only when drawing something
      if (isDrawing) {
        setTempMousePos({ x, y });
      } else {
        // Explicitly set to null when not drawing to prevent connections
        setTempMousePos(null);
      }
    }
    
    // If not in drawing mode or creating a polygon, just return
    if (!isDrawing && !isCreatingPolygon) return;
    
    // Update current annotation based on tool
    switch (selectedTool) {
      case "point":
        setCurrentAnnotation([{ x, y }]);
        break;
      case "line":
        if (currentAnnotation.length > 0) {
          setCurrentAnnotation([currentAnnotation[0], { x, y }]);
        }
        break;
      case "frame":
      case "area":
        if (!isCreatingPolygon && currentAnnotation.length > 0) {
          // For backward compatibility with rectangle mode
          setCurrentAnnotation([currentAnnotation[0], { x, y }]);
        }
        // In polygon mode, tempMousePos is used for preview, but we don't update currentAnnotation
        break;
      case "freehand":
        setCurrentAnnotation([...currentAnnotation, { x, y }]);
        break;
    }
    
    drawCanvas();
  }, [isDrawing, isCreatingPolygon, imageScaling, selectedTool, currentAnnotation, drawCanvas, isPolygonMode]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !imageScaling || currentAnnotation.length === 0 || isCreatingPolygon) {
      setIsDrawing(false);
      return;
    }
    
    // Finalize the annotation for non-polygon tools
    if (!isPolygonMode) {
      const newAnnotation: Omit<Annotation, 'id' | 'timestamp'> = {
        type: selectedTool,
        points: [...currentAnnotation],
        color: "black",
        selected: false
      };
      
      // Add the annotation
      addAnnotation(newAnnotation);
      
      // Record interaction event only if session is active
      if (isSessionActive) {
        recordInteractionEvent('annotation_create', {
          position: currentAnnotation[0],
          toolType: selectedTool
        });
      }
    }
    
    // Reset drawing state for non-polygon tools
    setIsDrawing(false);
    setCurrentAnnotation([]);
    setTempMousePos(null); // Important to clear this to prevent unwanted connections
  }, [isDrawing, imageScaling, currentAnnotation, isCreatingPolygon, isPolygonMode, selectedTool, addAnnotation, recordInteractionEvent, isSessionActive]);

  const handleMouseLeave = useCallback(() => {
    // Only keep temp mouse position if actively drawing a polygon
    if (!isCreatingPolygon) {
      setTempMousePos(null);
    }
    
    if (isDrawing && !isCreatingPolygon) {
      handleMouseUp();
    }
  }, [isDrawing, isCreatingPolygon, handleMouseUp]);
  
  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // We're removing the polygon closing functionality from double-click
    // Double-click now has no specific behavior for polygons
  }, []);

  // Helper function to check if a point is near a line
  const isPointNearLine = (
    point: Point,
    lineStart: Point,
    lineEnd: Point,
    threshold: number,
  ): boolean => {
    const lineLength = Math.hypot(
      lineEnd.x - lineStart.x,
      lineEnd.y - lineStart.y,
    );
    
    if (lineLength === 0) return false;
    
    const distance =
      Math.abs(
        (lineEnd.y - lineStart.y) * point.x -
          (lineEnd.x - lineStart.x) * point.y +
          lineEnd.x * lineStart.y -
          lineEnd.y * lineStart.x,
      ) / lineLength;
    
    // Check if point is within the bounding box of the line
    const dotProduct =
      ((point.x - lineStart.x) * (lineEnd.x - lineStart.x) +
        (point.y - lineStart.y) * (lineEnd.y - lineStart.y)) /
      (lineLength * lineLength);
    
    return distance <= threshold && dotProduct >= 0 && dotProduct <= 1;
  };

  // Helper function to check if a point is in a rectangle
  const isPointInRect = (
    point: Point,
    rectStart: Point,
    rectEnd: Point,
    padding: number = 0,
  ): boolean => {
    const minX = Math.min(rectStart.x, rectEnd.x) - padding;
    const maxX = Math.max(rectStart.x, rectEnd.x) + padding;
    const minY = Math.min(rectStart.y, rectEnd.y) - padding;
    const maxY = Math.max(rectStart.y, rectEnd.y) + padding;
    
    return (
      point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
    );
  };

  // Helper function to check if a point is near a polyline
  const isPointNearPolyline = (
    point: Point,
    polyline: Point[],
    threshold: number,
  ): boolean => {
    if (polyline.length < 2) return false;
    
    for (let i = 0; i < polyline.length - 1; i++) {
      if (isPointNearLine(point, polyline[i], polyline[i + 1], threshold)) {
        return true;
      }
    }
    
    return false;
  };
  
  // Helper function to check if a point is inside a polygon
  const isPointInPolygon = (
    point: Point,
    polygon: Point[],
    padding: number = 0
  ): boolean => {
    // First check if the point is near any edge of the polygon
    if (padding > 0) {
      // Check perimeter
      for (let i = 0; i < polygon.length; i++) {
        const j = (i + 1) % polygon.length;
        if (isPointNearLine(point, polygon[i], polygon[j], padding)) {
          return true;
        }
      }
    }
    
    // Then use ray casting algorithm to check if point is inside polygon
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const intersect = 
        ((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
        (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / 
                   (polygon[j].y - polygon[i].y) + polygon[i].x);
      if (intersect) inside = !inside;
    }
    
    return inside;
  };

  // Handle undo
  const handleUndo = useCallback(() => {
    if (isCreatingPolygon && currentAnnotation.length > 1) {
      // Remove the last point from the polygon being created
      setCurrentAnnotation(prev => prev.slice(0, -1));
      return;
    }
    
    if (annotations.length === 0) return;
    
    // Remove the last annotation
    const lastAnnotation = annotations[annotations.length - 1];
    deleteAnnotation(lastAnnotation.id);
    
    // Record interaction event only if session is active
    if (isSessionActive) {
      recordInteractionEvent('annotation_delete', {
        relatedAnnotationId: lastAnnotation.id
      });
    }
  }, [annotations, deleteAnnotation, recordInteractionEvent, isCreatingPolygon, currentAnnotation, isSessionActive]);

  // Sync with parent component's tool state
  useEffect(() => {
    setIsPolygonMode(selectedTool === "frame" || selectedTool === "area");
  }, [selectedTool]);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange(selectedCount);
  }, [selectedCount, onSelectionChange]);

  // When tool changes externally, update any related state
  useEffect(() => {
    // If switching away from polygon tools, reset polygon creation state
    if (isCreatingPolygon && !(selectedTool === "frame" || selectedTool === "area")) {
      setIsCreatingPolygon(false);
      setCurrentAnnotation([]);
      setTempMousePos(null);
    }
    
    // Log tool changes for debugging
    console.log("Tool changed to:", selectedTool);
  }, [selectedTool, isCreatingPolygon]);

  // Group tool handler - ensure it works when the tool is selected
  useEffect(() => {
    if (selectedTool === "group" && selectedCount >= 2) {
      console.log("Group tool activated with selections:", selectedCount);
      handleCreateGroup();
      // After grouping, switch back to select tool
      onToolChange("select");
    }
  }, [selectedTool, selectedCount, handleCreateGroup, onToolChange]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ cursor: selectedTool === "select" || isShiftKeyDown ? "default" : "crosshair" }}
    >
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDownV2}
        onPointerMove={handlePointerMoveV2}
        onPointerUp={handlePointerUpV2}
        onPointerLeave={handlePointerLeaveV2}
      />
      
      {/* Undo button */}
      <div className="absolute top-4 right-4 z-10">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleUndo}
                disabled={annotations.length === 0 && !isCreatingPolygon}
                className="bg-transparent backdrop-blur-none border-none shadow-none hover:bg-white/10"
              >
                <Undo2 className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {isCreatingPolygon && currentAnnotation.length > 1 
                  ? "Undo Last Point" 
                  : "Undo Last Annotation"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default AnnotationCanvas;

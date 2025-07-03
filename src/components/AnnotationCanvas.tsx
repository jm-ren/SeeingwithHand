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

  // --- Hover Trace Finalization ---
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- V2 Drawing Logic ---
  const [hoverFadeAlpha, setHoverFadeAlpha] = useState(0.18); // Initial alpha for hover trace
  const [isHoverFading, setIsHoverFading] = useState(false);

  // On inactivity, start fading instead of clearing immediately
  const handleHoverInactivity = useCallback(() => {
    setIsHoverFading(true);
  }, []);

  // Animate hover trace fading
  useEffect(() => {
    if (hoverTrace.length > 1 && !isHoverFading) {
      setHoverFadeAlpha(0.18); // Reset alpha when new hover trace starts
      return;
    }
    if (isHoverFading && hoverTrace.length > 1) {
      let fade = hoverFadeAlpha;
      const fadeStep = 0.02;
      const fadeInterval = setInterval(() => {
        fade -= fadeStep;
        setHoverFadeAlpha(Math.max(0, fade));
        if (fade <= 0) {
          clearInterval(fadeInterval);
          setIsHoverFading(false);
          setHoverTrace([]);
        }
      }, 16); // ~60fps
      return () => clearInterval(fadeInterval);
    }
  }, [hoverTrace, isHoverFading]);

  // Helper to finalize and store a hover trace
  const finalizeHoverTrace = useCallback(() => {
    if (hoverTrace.length > 5) { // Only store meaningful traces
      const startTime = Date.now() - hoverTrace.length * 16; // Approximate duration
      const gesture = classifyFreehandGesture(hoverTrace, startTime, true);
      addAnnotation({
        type: "hover",
        points: hoverTrace,
        color: "black",
        selected: false,
        gestureType: `hover-${gesture.type}`,
        ...gesture.metrics,
      });
    }
    setHoverTrace([]);
  }, [hoverTrace, addAnnotation]);

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
    // Draw hover trace (faint, beautifully fading)
    if (hoverTrace.length > 1 && hoverFadeAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = hoverFadeAlpha;
      ctx.beginPath();
      ctx.moveTo(hoverTrace[0].x, hoverTrace[0].y);
      for (let i = 1; i < hoverTrace.length; i++) {
        ctx.lineTo(hoverTrace[i].x, hoverTrace[i].y);
      }
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#222";
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.restore();
    }
  }, [traceType, currentTrace, dwellRadius, hoverTrace, hoverFadeAlpha]);

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
    e.preventDefault();
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    finalizeHoverTrace();
    setIsHoverFading(false);
    setHoverFadeAlpha(0.18);
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
    dwellTimerRef.current = setInterval(() => {
      setDwellRadius((r) => Math.min(r + 1, 30));
    }, 30);
  }, [imageScaling, finalizeHoverTrace]);

  const handlePointerMoveV2 = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (pointerDown && pointerStart) {
      const dx = x - pointerStart.point.x;
      const dy = y - pointerStart.point.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (traceType === "point" && dist > MOVE_THRESHOLD) {
        setTraceType("freehand");
        if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);
      }
      setCurrentTrace((prev) => [...prev, { x, y }]);
    } else if (!pointerDown) {
      setHoverTrace((prev) => [...prev, { x, y }]);
      setIsHoverFading(false);
      setHoverFadeAlpha(0.18);
      // Reset hover inactivity timer
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => {
        finalizeHoverTrace();
        handleHoverInactivity();
      }, HOVER_FADE_TIME);
    }
  }, [pointerDown, pointerStart, traceType, finalizeHoverTrace, handleHoverInactivity]);

  const handlePointerUpV2 = useCallback((e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e) e.preventDefault();
    if (!pointerDown) return;
    if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);
    if (traceType === "point" && currentTrace.length > 0) {
      // Classify as dwell or tap
      const duration = Date.now() - (pointerStart?.time || 0);
      const gesture = duration > DWELL_TIME ? "dwell" : "tap";
      // Add annotation as point, let context generate timestamp
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
      const gesture = classifyFreehandGesture(currentTrace, pointerStart?.time || 0, false);
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

  const handlePointerLeaveV2 = useCallback((e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e) e.preventDefault();
    if (pointerDown) handlePointerUpV2();
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    finalizeHoverTrace();
    setIsHoverFading(false);
    setHoverFadeAlpha(0.18);
    setHoverTrace([]);
  }, [pointerDown, handlePointerUpV2, finalizeHoverTrace]);

  // --- Gesture Classification Helper ---
  function classifyFreehandGesture(trace: Point[], startTime: number, isHover = false) {
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

    // --- Freehand gesture classification ---
    if (!isHover) {
      // Framing: forms a moderate closed shape (polygon-like, moderate area, moderate direction changes)
      if (trace.length > 10 && boundingBox > 40 && boundingBox < 200 && directionChanges > 5 && straightness < 2) {
        return { type: "framing", metrics: { duration, length, boundingBox, directionChanges } };
      }
      // Focal point: tight, dense, many direction changes, small area
      if (boundingBox < 40 && directionChanges > 8) {
        return { type: "focal point", metrics: { duration, length, boundingBox, directionChanges } };
      }
      // Area: large, complex, covers a big region
      if (boundingBox >= 200 && directionChanges > 5) {
        return { type: "area", metrics: { duration, length, boundingBox, directionChanges } };
      }
      // Curve: smooth, not many direction changes, moderate area
      if (directionChanges <= 5 && boundingBox > 40 && straightness < 2.5) {
        return { type: "curve", metrics: { duration, length, boundingBox, directionChanges } };
      }
      // Fallback: unclassified
      return { type: "unclassified", metrics: { duration, length, boundingBox, directionChanges } };
    }

    // --- Hover gesture classification ---
    // Use existing logic, but fallback to 'meander'
    if (straightness < 1.2 && avgSpeed > 0.5) return { type: "scan", metrics: { duration, length, boundingBox, directionChanges } };
    if (directionChanges > 10 && boundingBox < 40) return { type: "scribble", metrics: { duration, length, boundingBox, directionChanges } };
    if (boundingBox > 100 && directionChanges > 5) return { type: "explore", metrics: { duration, length, boundingBox, directionChanges } };
    if (directionChanges > 3) return { type: "meander", metrics: { duration, length, boundingBox, directionChanges } };
    return { type: "meander", metrics: { duration, length, boundingBox, directionChanges } };
  }

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
        style={{ touchAction: "none", userSelect: "none" }}
        onPointerDown={handlePointerDownV2}
        onPointerMove={handlePointerMoveV2}
        onPointerUp={handlePointerUpV2}
        onPointerLeave={handlePointerLeaveV2}
        onCopy={e => e.preventDefault()}
        onCut={e => e.preventDefault()}
        onPaste={e => e.preventDefault()}
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

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Undo2 } from "lucide-react";
import { useApplication } from "../context/ApplicationContext";
import { Point, Annotation, Tool } from "../types/annotations";
import { appSettings } from "../config/appConfig";
import { CanvasRenderer, CanvasConfig, DrawingState } from "../lib/CanvasRenderer";
import { InputHandler, InputHandlerConfig } from "../lib/InputHandler";
import ErrorBoundary from "./ErrorBoundary";

interface AnnotationCanvasProps {
  imageUrl?: string;
  onAnnotationChange?: (annotations: Annotation[]) => void;
  onSelectionChange?: (selectedCount: number) => void;
  initialAnnotations?: Annotation[];
  selectedTool?: Tool;
  onToolChange?: (tool: Tool) => void;
}

const AnnotationCanvasRefactored: React.FC<AnnotationCanvasProps> = ({
  imageUrl = "https://images2.dwell.com/photos/6133553759298379776/6297915443342360576/original.jpg?auto=format&q=35&w=1600",
  onAnnotationChange = () => {},
  onSelectionChange = () => {},
  initialAnnotations = [],
  selectedTool = "point",
  onToolChange = () => {},
}) => {
  // Application state
  const {
    annotations,
    selectedAnnotations,
    selectedColor,
    selectedCount,
    isSessionActive,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    selectAnnotation,
    deselectAll,
    createGroup,
    recordInteractionEvent,
    setSelectedTool,
  } = useApplication();

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const inputHandlerRef = useRef<InputHandler | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Local state
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [imageScaling, setImageScaling] = useState<{ width: number; height: number; x: number; y: number } | null>(null);
  const [isPolygonMode, setIsPolygonMode] = useState(false);
  const [isCreatingPolygon, setIsCreatingPolygon] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Point[]>([]);
  const [tempMousePos, setTempMousePos] = useState<Point | null>(null);
  const [previousTool, setPreviousTool] = useState<Tool | null>(null);
  const [isShiftKeyDown, setIsShiftKeyDown] = useState(false);

  // Drawing state
  const [drawingState, setDrawingState] = useState<DrawingState>({
    currentTrace: [],
    traceType: 'none',
    dwellRadius: 5,
    hoverTrace: [],
    hoverFadeAlpha: 0.08,
    currentAnnotation: [],
    tempMousePos: null,
    isCreatingPolygon: false,
  });

  // Memoized configurations
  const canvasConfig = useMemo<CanvasConfig>(() => ({
    width: canvasRef.current?.width || 800,
    height: canvasRef.current?.height || 600,
    imageScaling,
    selectedColor,
    selectedAnnotations,
  }), [imageScaling, selectedColor, selectedAnnotations]);

  const inputConfig = useMemo<InputHandlerConfig>(() => ({
    selectedTool,
    isPolygonMode,
    isCreatingPolygon,
    isShiftKeyDown,
    dwellTime: 400,
    moveThreshold: 8,
    hoverFadeTime: 1200,
  }), [selectedTool, isPolygonMode, isCreatingPolygon, isShiftKeyDown]);

  // Initialize image
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

  // Initialize canvas renderer
  useEffect(() => {
    if (!canvasRef.current || !imageLoaded) return;

    try {
      rendererRef.current = new CanvasRenderer(canvasRef.current, canvasConfig);
      if (imageRef.current) {
        rendererRef.current.setImage(imageRef.current);
      }
    } catch (error) {
      console.error("Failed to initialize canvas renderer:", error);
    }

    return () => {
      rendererRef.current = null;
    };
  }, [canvasConfig, imageLoaded]);

  // Initialize input handler
  useEffect(() => {
    if (!canvasRef.current || !rendererRef.current) return;

    try {
      inputHandlerRef.current = new InputHandler(canvasRef.current, rendererRef.current, inputConfig);
      setupInputEventHandlers();
    } catch (error) {
      console.error("Failed to initialize input handler:", error);
    }

    return () => {
      if (inputHandlerRef.current) {
        inputHandlerRef.current.destroy();
        inputHandlerRef.current = null;
      }
    };
  }, [inputConfig]);

  // Setup input event handlers
  const setupInputEventHandlers = useCallback(() => {
    if (!inputHandlerRef.current) return;

    const handler = inputHandlerRef.current;

    // Point tool handlers
    handler.on('tap', ({ point }) => {
      if (selectedTool === 'point' && point) {
        addAnnotation({
          type: 'point',
          points: [point],
          color: selectedColor,
          gestureType: 'tap',
          duration: 0,
        });
      }
    });

    handler.on('dwell', ({ point }) => {
      if (selectedTool === 'point' && point) {
        addAnnotation({
          type: 'point',
          points: [point],
          color: selectedColor,
          gestureType: 'dwell',
          duration: 400,
        });
      }
    });

    // Freehand tool handlers
    handler.on('freehand-start', ({ point }) => {
      if (selectedTool === 'freehand' && point) {
        setDrawingState(prev => ({
          ...prev,
          currentTrace: [point],
          traceType: 'freehand',
        }));
      }
    });

    handler.on('pointermove', ({ point }) => {
      if (!point) return;

      if (drawingState.traceType === 'freehand') {
        setDrawingState(prev => ({
          ...prev,
          currentTrace: [...prev.currentTrace, point],
        }));
      }

      // Update temp mouse position for polygon mode
      if (isCreatingPolygon) {
        setTempMousePos(point);
      }
    });

    handler.on('pointerup', ({ point }) => {
      if (drawingState.traceType === 'freehand' && drawingState.currentTrace.length > 1) {
        const gesture = classifyFreehandGesture(drawingState.currentTrace);
        addAnnotation({
          type: 'freehand',
          points: drawingState.currentTrace,
          color: selectedColor,
          gestureType: gesture.type,
          ...gesture.metrics,
        });

        setDrawingState(prev => ({
          ...prev,
          currentTrace: [],
          traceType: 'none',
        }));
      }

      // Handle polygon clicks
      if ((selectedTool === 'frame' || selectedTool === 'area') && point) {
        handlePolygonClick(point);
      }

      // Handle selection
      if (selectedTool === 'select' && point) {
        handleSelectionClick(point);
      }
    });

    // Hover handlers
    handler.on('hover-move', ({ point }) => {
      if (point && !handler.isDrawing()) {
        setDrawingState(prev => ({
          ...prev,
          hoverTrace: [...prev.hoverTrace, point],
          hoverFadeAlpha: 0.08,
        }));
      }
    });

    handler.on('hover-end', () => {
      if (drawingState.hoverTrace.length > 5) {
        const gesture = classifyFreehandGesture(drawingState.hoverTrace, true);
        addAnnotation({
          type: 'hover',
          points: drawingState.hoverTrace,
          color: selectedColor,
          gestureType: `hover-${gesture.type}`,
          ...gesture.metrics,
        });
      }
      setDrawingState(prev => ({
        ...prev,
        hoverTrace: [],
        hoverFadeAlpha: 0,
      }));
    });

    // Keyboard handlers
    handler.on('escape', () => {
      if (isCreatingPolygon) {
        setIsCreatingPolygon(false);
        setCurrentAnnotation([]);
        setTempMousePos(null);
      }
    });

    handler.on('shift-down', () => {
      if (selectedTool !== 'select') {
        setPreviousTool(selectedTool);
        setSelectedTool('select');
      }
      setIsShiftKeyDown(true);
    });

    handler.on('shift-up', () => {
      if (previousTool) {
        setSelectedTool(previousTool);
        setPreviousTool(null);
        deselectAll();
      }
      setIsShiftKeyDown(false);
    });

    handler.on('shift-space', () => {
      if (selectedCount >= 2) {
        createGroup(selectedAnnotations);
      }
    });

  }, [
    selectedTool,
    selectedColor,
    drawingState,
    isCreatingPolygon,
    selectedCount,
    selectedAnnotations,
    previousTool,
    addAnnotation,
    setSelectedTool,
    deselectAll,
    createGroup,
  ]);

  // Handle polygon creation
  const handlePolygonClick = useCallback((point: Point) => {
    if (!isCreatingPolygon) {
      setIsCreatingPolygon(true);
      setCurrentAnnotation([point]);
      return;
    }

    // Check if clicking on the first point to close polygon
    if (currentAnnotation.length >= 3) {
      const firstPoint = currentAnnotation[0];
      const distance = Math.hypot(point.x - firstPoint.x, point.y - firstPoint.y);
      
      if (distance <= 10) {
        // Close polygon
        addAnnotation({
          type: selectedTool as 'frame' | 'area',
          points: currentAnnotation,
          color: selectedColor,
        });
        
        setIsCreatingPolygon(false);
        setCurrentAnnotation([]);
        setTempMousePos(null);
        return;
      }
    }

    // Add point to polygon
    setCurrentAnnotation(prev => [...prev, point]);
  }, [isCreatingPolygon, currentAnnotation, selectedTool, selectedColor, addAnnotation]);

  // Handle selection clicks
  const handleSelectionClick = useCallback((point: Point) => {
    if (!rendererRef.current) return;

    const clickedAnnotation = annotations.find(annotation =>
      rendererRef.current!.isPointInAnnotation(point, annotation)
    );

    if (clickedAnnotation) {
      selectAnnotation(clickedAnnotation.id, isShiftKeyDown);
    } else if (!isShiftKeyDown) {
      deselectAll();
    }
  }, [annotations, selectAnnotation, deselectAll, isShiftKeyDown]);

  // Gesture classification
  const classifyFreehandGesture = useCallback((trace: Point[], isHover = false) => {
    if (trace.length < 2) {
      return { type: 'point', metrics: { duration: 0, length: 0, boundingBox: 0, directionChanges: 0 } };
    }

    // Calculate metrics
    let length = 0;
    let directionChanges = 0;
    let minX = trace[0].x, maxX = trace[0].x;
    let minY = trace[0].y, maxY = trace[0].y;

    for (let i = 1; i < trace.length; i++) {
      const dx = trace[i].x - trace[i - 1].x;
      const dy = trace[i].y - trace[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);

      minX = Math.min(minX, trace[i].x);
      maxX = Math.max(maxX, trace[i].x);
      minY = Math.min(minY, trace[i].y);
      maxY = Math.max(maxY, trace[i].y);

      // Count direction changes
      if (i > 1) {
        const prevDx = trace[i - 1].x - trace[i - 2].x;
        const prevDy = trace[i - 1].y - trace[i - 2].y;
        const angle = Math.atan2(dy, dx) - Math.atan2(prevDy, prevDx);
        if (Math.abs(angle) > Math.PI / 4) {
          directionChanges++;
        }
      }
    }

    const boundingBox = Math.max(maxX - minX, maxY - minY);
    const duration = trace.length * 16; // Approximate duration
    const straightness = length / boundingBox;

    if (isHover) {
      if (straightness < 1.2) return { type: 'scan', metrics: { duration, length, boundingBox, directionChanges } };
      if (directionChanges > 10 && boundingBox < 40) return { type: 'scribble', metrics: { duration, length, boundingBox, directionChanges } };
      if (boundingBox > 100 && directionChanges > 5) return { type: 'explore', metrics: { duration, length, boundingBox, directionChanges } };
      return { type: 'meander', metrics: { duration, length, boundingBox, directionChanges } };
    }

    // Freehand gesture classification
    if (trace.length > 10 && boundingBox > 40 && boundingBox < 200 && directionChanges > 5 && straightness < 2) {
      return { type: 'framing', metrics: { duration, length, boundingBox, directionChanges } };
    }
    if (boundingBox < 40 && directionChanges > 8) {
      return { type: 'focal point', metrics: { duration, length, boundingBox, directionChanges } };
    }
    if (boundingBox >= 200 && directionChanges > 5) {
      return { type: 'area', metrics: { duration, length, boundingBox, directionChanges } };
    }
    if (directionChanges <= 5 && boundingBox > 40 && straightness < 2.5) {
      return { type: 'curve', metrics: { duration, length, boundingBox, directionChanges } };
    }
    
    return { type: 'unclassified', metrics: { duration, length, boundingBox, directionChanges } };
  }, []);

  // Handle undo
  const handleUndo = useCallback(() => {
    if (isCreatingPolygon && currentAnnotation.length > 1) {
      setCurrentAnnotation(prev => prev.slice(0, -1));
      return;
    }

    if (annotations.length === 0) return;

    const lastAnnotation = annotations[annotations.length - 1];
    deleteAnnotation(lastAnnotation.id);

    if (isSessionActive) {
      recordInteractionEvent('annotation_delete', {
        relatedAnnotationId: lastAnnotation.id,
      });
    }
  }, [annotations, deleteAnnotation, recordInteractionEvent, isCreatingPolygon, currentAnnotation, isSessionActive]);

  // Update canvas scaling when container size changes
  useEffect(() => {
    if (!containerRef.current || !imageDimensions) return;

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });

    resizeObserver.observe(containerRef.current);
    updateCanvasSize();

    return () => {
      resizeObserver.disconnect();
    };
  }, [imageDimensions]);

  const updateCanvasSize = useCallback(() => {
    if (!containerRef.current || !canvasRef.current || !imageDimensions) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    canvas.width = containerWidth;
    canvas.height = containerHeight;

    // Calculate image scaling
    const imageAspectRatio = imageDimensions.width / imageDimensions.height;
    const containerAspectRatio = containerWidth / containerHeight;

    let scaledWidth, scaledHeight, offsetX, offsetY;

    if (imageAspectRatio > containerAspectRatio) {
      scaledWidth = containerWidth;
      scaledHeight = containerWidth / imageAspectRatio;
      offsetX = 0;
      offsetY = (containerHeight - scaledHeight) / 2;
    } else {
      scaledWidth = containerHeight * imageAspectRatio;
      scaledHeight = containerHeight;
      offsetX = (containerWidth - scaledWidth) / 2;
      offsetY = 0;
    }

    setImageScaling({
      width: scaledWidth,
      height: scaledHeight,
      x: offsetX,
      y: offsetY,
    });
  }, [imageDimensions]);

  // Update renderer configuration
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateConfig(canvasConfig);
    }
  }, [canvasConfig]);

  // Update input handler configuration
  useEffect(() => {
    if (inputHandlerRef.current) {
      inputHandlerRef.current.updateConfig(inputConfig);
    }
  }, [inputConfig]);

  // Update polygon mode based on selected tool
  useEffect(() => {
    const polygonTools = ['frame', 'area'];
    setIsPolygonMode(polygonTools.includes(selectedTool));
    
    if (!polygonTools.includes(selectedTool) && isCreatingPolygon) {
      setIsCreatingPolygon(false);
      setCurrentAnnotation([]);
      setTempMousePos(null);
    }
  }, [selectedTool, isCreatingPolygon]);

  // Update drawing state
  useEffect(() => {
    setDrawingState(prev => ({
      ...prev,
      currentAnnotation,
      tempMousePos,
      isCreatingPolygon,
    }));
  }, [currentAnnotation, tempMousePos, isCreatingPolygon]);

  // Render canvas
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.render(annotations, drawingState);
    }
  }, [annotations, drawingState]);

  // Notify parent of changes
  useEffect(() => {
    onAnnotationChange(annotations);
    onSelectionChange(selectedCount);
  }, [annotations, selectedCount, onAnnotationChange, onSelectionChange]);

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

// Wrap with error boundary
const AnnotationCanvasWithErrorBoundary: React.FC<AnnotationCanvasProps> = (props) => (
  <ErrorBoundary context="Annotation Canvas">
    <AnnotationCanvasRefactored {...props} />
  </ErrorBoundary>
);

export default AnnotationCanvasWithErrorBoundary; 
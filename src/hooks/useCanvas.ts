import { useRef, useState, useEffect, useCallback } from 'react';
import { Point, Annotation, Tool } from '../types/annotations';
import { drawAnnotations } from '../lib/imageProcessing';
import { appSettings } from '../config/appConfig';
import { useAnnotations } from '../context/AnnotationContext';

interface UseCanvasOptions {
  imageUrl?: string;
  annotations?: Annotation[];
  selectedTool?: Tool;
  onAnnotationCreate?: (annotation: Omit<Annotation, 'id' | 'timestamp'>) => void;
  onAnnotationUpdate?: (id: string, updates: Partial<Annotation>) => void;
}

export function useCanvas({
  imageUrl = appSettings.canvas.defaultImageUrl,
  annotations = [],
  selectedTool = 'freehand',
  onAnnotationCreate,
  onAnnotationUpdate,
}: UseCanvasOptions = {}) {
  const { selectedColor } = useAnnotations();

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // State
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [canvasScale, setCanvasScale] = useState<{
    width: number;
    height: number;
    x: number;
    y: number;
  } | null>(null);

  // Load image
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

  // Resize handler
  const handleResize = useCallback(() => {
    if (!canvasRef.current || !containerRef.current || !imageDimensions) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    // Set canvas size to match container
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Calculate scaling to fit image in canvas
    const containerRatio = container.clientWidth / container.clientHeight;
    const imageRatio = imageDimensions.width / imageDimensions.height;
    
    let scaledWidth, scaledHeight, offsetX, offsetY;
    
    if (containerRatio > imageRatio) {
      // Container is wider than image
      scaledHeight = container.clientHeight;
      scaledWidth = imageDimensions.width * (scaledHeight / imageDimensions.height);
      offsetX = (container.clientWidth - scaledWidth) / 2;
      offsetY = 0;
    } else {
      // Container is taller than image
      scaledWidth = container.clientWidth;
      scaledHeight = imageDimensions.height * (scaledWidth / imageDimensions.width);
      offsetX = 0;
      offsetY = (container.clientHeight - scaledHeight) / 2;
    }
    
    setCanvasScale({
      width: scaledWidth,
      height: scaledHeight,
      x: offsetX,
      y: offsetY,
    });
    
    // Redraw canvas
    drawCanvas();
  }, [imageDimensions]);

  // Set up resize listener
  useEffect(() => {
    if (imageLoaded) {
      handleResize();
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [imageLoaded, handleResize]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !imageRef.current || !canvasScale) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    ctx.drawImage(
      imageRef.current,
      canvasScale.x,
      canvasScale.y,
      canvasScale.width,
      canvasScale.height
    );
    
    // Draw annotations
    drawAnnotations(ctx, annotations, 1);
    
    // Draw current annotation in progress
    if (currentPoints.length > 0) {
      ctx.strokeStyle = selectedColor;
      ctx.fillStyle = selectedColor;
      ctx.lineWidth = appSettings.canvas.lineWidth;
      
      switch (selectedTool) {
        case 'point':
          if (currentPoints.length === 1) {
            ctx.beginPath();
            ctx.arc(
              currentPoints[0].x,
              currentPoints[0].y,
              appSettings.canvas.pointRadius,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
          break;
          
        case 'line':
          if (currentPoints.length === 2) {
            ctx.beginPath();
            ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
            ctx.lineTo(currentPoints[1].x, currentPoints[1].y);
            ctx.stroke();
          }
          break;
          
        case 'frame':
        case 'area':
          if (currentPoints.length === 2) {
            const width = currentPoints[1].x - currentPoints[0].x;
            const height = currentPoints[1].y - currentPoints[0].y;
            
            if (selectedTool === 'area') {
              ctx.globalAlpha = 0.3;
              ctx.fillRect(currentPoints[0].x, currentPoints[0].y, width, height);
              ctx.globalAlpha = 1;
            }
            
            ctx.strokeRect(currentPoints[0].x, currentPoints[0].y, width, height);
          }
          break;
          
        case 'freehand':
          if (currentPoints.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
            
            for (let i = 1; i < currentPoints.length; i++) {
              ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
            }
            
            ctx.stroke();
          }
          break;
          
        default:
          break;
      }
    }
  }, [annotations, currentPoints, selectedTool, canvasScale, selectedColor]);

  // Update canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Convert screen coordinates to canvas coordinates
  const getCanvasCoordinates = useCallback(
    (clientX: number, clientY: number): Point | null => {
      if (!canvasRef.current || !canvasScale) return null;
      
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      
      return { x, y };
    },
    [canvasScale]
  );

  // Handle mouse down
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const point = getCanvasCoordinates(event.clientX, event.clientY);
      if (!point) return;
      
      setIsDrawing(true);
      setCurrentPoints([point]);
      
      if (selectedTool === 'point') {
        // For point tool, create annotation immediately
        if (onAnnotationCreate) {
          onAnnotationCreate({
            type: 'point',
            points: [point],
            color: selectedColor,
          });
        }
        setIsDrawing(false);
        setCurrentPoints([]);
      }
    },
    [getCanvasCoordinates, selectedTool, onAnnotationCreate, selectedColor]
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      
      const point = getCanvasCoordinates(event.clientX, event.clientY);
      if (!point) return;
      
      switch (selectedTool) {
        case 'line':
        case 'frame':
        case 'area':
          // For these tools, we only need start and end points
          setCurrentPoints((prev) => [prev[0], point]);
          break;
          
        case 'freehand':
          // For freehand, we collect all points
          setCurrentPoints((prev) => [...prev, point]);
          break;
          
        default:
          break;
      }
    },
    [isDrawing, getCanvasCoordinates, selectedTool]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;
    
    // Create annotation based on current points
    if (currentPoints.length > 0 && onAnnotationCreate) {
      onAnnotationCreate({
        type: selectedTool,
        points: currentPoints,
        color: selectedColor,
      });
    }
    
    setIsDrawing(false);
    setCurrentPoints([]);
  }, [isDrawing, currentPoints, selectedTool, onAnnotationCreate, selectedColor]);

  // Handle mouse out
  const handleMouseOut = useCallback(() => {
    if (isDrawing && selectedTool !== 'freehand') {
      setIsDrawing(false);
      setCurrentPoints([]);
    }
  }, [isDrawing, selectedTool]);

  return {
    canvasRef,
    containerRef,
    isDrawing,
    imageLoaded,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseOut,
    drawCanvas,
  };
} 
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from "./ui/button";
import SimpleSlider from "./SimpleSlider";
import { Play, Pause, RotateCcw, Eye, RefreshCw } from "lucide-react";
import { Annotation, Tool } from "../types/annotations";
import './EyeVisualization.css';

// Data structure for the visualization
interface VisualizationEvent {
  id: string;
  timestamp: number;
  type: Tool;
  perimeter: number;
}

interface VisualizationData {
  sessionDuration: number; // in seconds
  events: VisualizationEvent[];
}

interface EyeVisualizationProps {
  annotations: Annotation[];
  className?: string;
  autoPlay?: boolean;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onReset?: () => void;
  progress?: number;
  onProgressChange?: (value: number) => void;
  isStatic?: boolean;
  onStaticChange?: (value: boolean) => void;
  onAutoPlayComplete?: () => void;
  playbackSpeed?: number;
}

// Constants for visualization
const TOOL_COLORS = {
  point: "#D24237", // new red for point/dot
  line: "#EAB22B",  // new yellow/gold for line
  frame: "#889DF0", // new blue for frame
  area: "#1E6287",  // new teal for area
  freehand: "#10191B", // new dark color for freehand
  select: "#999999", // grey
  group: "#666666",  // darker grey
};

// Function to calculate perimeter of an annotation
const calculatePerimeter = (annotation: Annotation): number => {
  const { type, points } = annotation;
  
  if (points.length === 0 && type !== 'point' && type !== 'group') return 0;
  
  switch (type) {
    case "point":
      return 5; // Fixed size for point
      
    case "line":
      if (points.length < 2) return 0;
      
      // Distance between start and end points
      const dx = points[1].x - points[0].x;
      const dy = points[1].y - points[0].y;
      return Math.sqrt(dx * dx + dy * dy);
      
    case "frame":
    case "area":
      if (points.length < 3) return 0;
      
      // Sum of all sides in the polygon
      let perimeter = 0;
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        perimeter += Math.sqrt(dx * dx + dy * dy);
      }
      return perimeter;
      
    case "freehand":
      if (points.length < 2) return 0;
      
      // Sum of line segments in the freehand path
      let length = 0;
      for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i - 1].x;
        const dy = points[i].y - points[i - 1].y;
        length += Math.sqrt(dx * dx + dy * dy);
      }
      return length;
      
    case "group":
      return 5; // Fixed size for group like point
      
    case "select":
    default:
      return 0; // Ignore select tool
  }
};

// Process annotations into visualization data
const processAnnotationsForVisualization = (annotations: Annotation[]): VisualizationData => {
  if (!annotations || annotations.length === 0) {
    console.log("EyeVisualization: No annotations to process");
    return {
      sessionDuration: 0,
      events: []
    };
  }

  // Sort annotations by timestamp
  const sortedAnnotations = [...annotations].sort((a, b) => a.timestamp - b.timestamp);
  
  // Filter out select tool and calculate perimeter
  const events = sortedAnnotations
    .filter(ann => ann.type !== 'select')
    .map(ann => ({
      id: ann.id,
      timestamp: ann.timestamp,
      type: ann.type,
      perimeter: calculatePerimeter(ann)
    }));
  
  // Calculate session duration in seconds
  const startTime = sortedAnnotations[0].timestamp;
  const endTime = sortedAnnotations[sortedAnnotations.length - 1].timestamp;
  const sessionDuration = (endTime - startTime) / 1000 || 1; // Ensure non-zero duration
  
  return {
    sessionDuration,
    events
  };
};

interface AnnotationStripeProps {
  event: VisualizationEvent;
  startTime: number;
  sessionDuration: number;
  maxPerimeter: number;
  visible: boolean;
  index: number;
  totalEvents: number;
}

const AnnotationStripe: React.FC<AnnotationStripeProps> = ({ 
  event, 
  startTime,
  sessionDuration,
  maxPerimeter,
  visible,
  index,
  totalEvents
}) => {
  // Calculate position based on timestamp relative to session duration
  const relativeTime = (event.timestamp - startTime) / 1000; // Time elapsed since start in seconds
  const timePosition = sessionDuration > 0 ? relativeTime / sessionDuration : 0; // Position from 0 to 1
  const angle = timePosition * 360;
  
  // Calculate position and dimensions of the stripe
  const centerX = 200; // Center X of the container (400/2)
  const centerY = 170; // Center Y of the container (340/2) 
  const irisRadius = 94.5; // Updated to match new iris size (189/2)
  const pupilRadius = 31.5; // Updated to match new pupil size (63/2)
  
  // Calculate the stripe height (from pupil edge to iris edge)
  const height = irisRadius - pupilRadius;
  
  // Calculate the start and end positions
  const radians = (angle - 90) * Math.PI / 180;
  
  // Position stripe so it starts exactly at pupil edge and goes to iris edge
  const stripeX = centerX + (pupilRadius + height/2) * Math.cos(radians);
  const stripeY = centerY + (pupilRadius + height/2) * Math.sin(radians);
  
  // Scale width based on perimeter (min 3, max 15 degrees)
  const width = 3 + (event.perimeter / maxPerimeter) * 15;
  
  return (
    <div 
      className="annotation-stripe"
      style={{
        backgroundColor: TOOL_COLORS[event.type],
        width: `${width}px`,
        height: `${height}px`,
        left: `${stripeX}px`,
        top: `${stripeY}px`,
        transform: `translate(-50%, -50%) rotate(${angle}deg)`,
        opacity: visible ? 0.85 : 0,
        transition: 'opacity 0.2s ease-in-out'
      }}
    />
  );
};

export const EyeVisualization: React.FC<EyeVisualizationProps> = ({
  annotations, 
  className = "",
  autoPlay = false,
  isPlaying = false,
  onPlayPause = () => {},
  onReset = () => {},
  progress = 0,
  onProgressChange = () => {},
  isStatic = false,
  onStaticChange = () => {},
  onAutoPlayComplete = () => {},
  playbackSpeed = 16, // Default to 16x if not provided
}) => {
  const [visualizationData, setVisualizationData] = useState<VisualizationData>({ sessionDuration: 0, events: [] });
  
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const startAnimation = useCallback(() => {
    lastTimeRef.current = 0; // Reset timer when starting animation
    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
        // Skip the first frame delta calculation after reset
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      
      // Calculate progress based on session duration and playback speed prop
      const progressDelta = (deltaTime / 1000) * (playbackSpeed / visualizationData.sessionDuration);
      const newProgress = Math.min(progress + progressDelta, 1);
      
      onProgressChange(newProgress);
      
      if (newProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
  }, [playbackSpeed, visualizationData.sessionDuration, onProgressChange, progress]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
  }, []);

  useEffect(() => {
    setVisualizationData(processAnnotationsForVisualization(annotations));
  }, [annotations]);

  useEffect(() => {
    if (isPlaying) {
      startAnimation();
    } else {
      stopAnimation();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, startAnimation, stopAnimation]);

  useEffect(() => {
    if (autoPlay && visualizationData.events.length > 0) {
      onPlayPause();
    }
  }, [autoPlay, visualizationData.events.length, onPlayPause]);
  
  // Calculate pupil size based on session duration
  const calculatePupilSize = useCallback((): { width: number, height: number } => {
    // <1 minute = 15% of iris width/height
    // >5 minutes = 50% of iris width/height
    const duration = visualizationData.sessionDuration;
    const minSize = 0.15;
    const maxSize = 0.5;
    
    // Convert duration to minutes
    const durationInMinutes = duration / 60;
    
    let sizeFactor;
    if (durationInMinutes <= 1) {
      sizeFactor = minSize;
    } else if (durationInMinutes >= 5) {
      sizeFactor = maxSize;
    } else {
      // Linear interpolation
      sizeFactor = minSize + (maxSize - minSize) * (durationInMinutes - 1) / 4;
    }
    
    // Base iris dimensions
    const irisWidth = 160; // Updated to match actual iris SVG width
    const irisHeight = 160; // Updated to match actual iris SVG height
    
    return {
      width: irisWidth * sizeFactor,
      height: irisHeight * sizeFactor
    };
  }, [visualizationData.sessionDuration]);
  
  // Handle reset
  const handleReset = useCallback(() => {
    stopAnimation();
    onProgressChange(0);
    onReset();
  }, [stopAnimation, onProgressChange, onReset]);

  const handlePlayPause = useCallback(() => {
    if (progress >= 1) {
      onProgressChange(0);
    }
    onPlayPause();
  }, [progress, onProgressChange, onPlayPause]);
  
  // Handle toggle between animated and static
  const toggleMode = useCallback(() => {
    onStaticChange(!isStatic);
    onPlayPause();
    
    if (!isStatic) {
      onProgressChange(1);
    }
  }, [isStatic, onStaticChange, onPlayPause, onProgressChange]);
  
  // Calculate current time based on progress
  const currentTime = visualizationData.events.length > 0
    ? visualizationData.events[0].timestamp + (visualizationData.sessionDuration * 1000 * progress)
    : 0;
  
  // Find maximum perimeter for scaling
  const maxPerimeter = Math.max(
    ...visualizationData.events.map(e => e.perimeter),
    10 // Minimum to prevent division by zero
  );
  
  // Calculate pupil dimensions
  const pupilDimensions = calculatePupilSize();
  
  return (
    <div className={`eye-modal ${className}`}>
      <div className="eye-container">
        <div className="eye-outline">
          <div className="iris-frame" />
          <div 
            className="pupil-frame"
            style={calculatePupilSize()}
          />
          {visualizationData.events.map((event, index) => (
            <AnnotationStripe
              key={event.id}
              event={event}
              startTime={visualizationData.events[0]?.timestamp || 0}
              sessionDuration={visualizationData.sessionDuration}
              maxPerimeter={Math.max(...visualizationData.events.map(e => e.perimeter))}
              visible={isStatic || (event.timestamp - (visualizationData.events[0]?.timestamp || 0)) / 1000 <= progress * visualizationData.sessionDuration}
              index={index}
              totalEvents={visualizationData.events.length}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default EyeVisualization; 
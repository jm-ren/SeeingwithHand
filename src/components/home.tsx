import React, { useCallback, useEffect, useState } from "react";
import AnnotationCanvas from "./AnnotationCanvas";
import ToolboxPanel from "./ToolboxPanel";
import SessionControls from "./SessionControls";
import Traceboard from "./Traceboard";
import { useApplication } from "../context/ApplicationContext";
import { Annotation, Tool } from "../types/annotations";
import { processTracesForDisplay } from "../lib/utils";
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { appSettings } from "../config/appConfig";

interface Point {
  x: number;
  y: number;
}

interface TraceItem {
  id: string;
  timestamp: string;
  type: "point" | "line" | "frame" | "area" | "freehand" | "group" | "select" | "hover";
  coordinates: string;
  groupId?: string;
  numericTimestamp?: number;
  gestureType?: string;
  duration?: number;
}

// Map imageId to image file path
const imageMap: Record<string, string> = {
  img1: '/images/image 002_agnes martin.png',
  img2: '/images/image 001_villa savoye.png',
  img3: '/images/image 003_morandi_landscape_cottage.png',
  img4: '/images/image 004_brancusi studio.png',
};

interface HomeProps {
  imageId?: string;
  sessionId?: string;
  onSessionEnd?: (summary: { sessionName: string; imageUrl: string; audioUrl?: string }) => void;
}

const sessionNameCounter: Record<string, number> = {};

const Home: React.FC<HomeProps> = ({ imageId, sessionId, onSessionEnd }) => {
  // Determine image URL based on imageId
  const imageUrl = imageId && imageMap[imageId]
    ? imageMap[imageId]
    : "https://images2.dwell.com/photos/6133553759298379776/6297915443342360576/original.jpg?auto=format&q=35&w=1600";
  
  // Debug logging
  console.log('[Home] imageId:', imageId);
  console.log('[Home] imageUrl:', imageUrl);
  console.log('[Home] imageMap:', imageMap);

  // State management
  const [selectedCount, setSelectedCount] = useState(0);
  const [visualizationCanvas, setVisualizationCanvas] =
    useState<HTMLCanvasElement | null>(null);
    
  // Use contexts - get countdown and session state from context
  const { 
    isSessionActive, 
    countdown, 
    showCountdown, 
    resetSession, 
    annotations, 
    selectedTool, 
    setSelectedTool, 
    selectedCount: contextSelectedCount, 
    selectedColor 
  } = useApplication();
  const audio = useAudioRecorder();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionName, setCurrentSessionName] = useState<string | null>(null);
  const [waitingForAudio, setWaitingForAudio] = useState(false);

  // Generate session name/id on session start
  useEffect(() => {
    if (isSessionActive && !currentSessionId && imageId) {
      // Increment local counter for this image
      if (!sessionNameCounter[imageId]) sessionNameCounter[imageId] = 1;
      else sessionNameCounter[imageId]++;
      const sessionNum = sessionNameCounter[imageId];
      const sessionName = `session ${String(sessionNum).padStart(4, '0')}`;
      const sessionIdGenerated = `${imageId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      setCurrentSessionName(sessionName);
      setCurrentSessionId(sessionIdGenerated);
    }
    if (!isSessionActive) {
      setCurrentSessionId(null);
      setCurrentSessionName(null);
    }
  }, [isSessionActive, imageId, currentSessionId]);

  // Initialize visualization canvas
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.id = "visualizationCanvas";
    canvas.width = 1600;
    canvas.height = 1067;
    setVisualizationCanvas(canvas);
  }, []);

  const handleToolSelect = useCallback((tool: Tool) => {
    setSelectedTool(tool);
  }, []);

  const handleReset = useCallback(() => {
    // Call the resetSession from AnnotationContext to clear everything
    resetSession();
    console.log("Canvas and timeline have been reset");
  }, [resetSession]);

  const handleAnnotationChange = useCallback((newAnnotations: Annotation[]) => {
    // This is now handled by AnnotationContext
  }, []);

  const processTracesForDisplay = useCallback((): TraceItem[] => {
    const annotationTraces = annotations.map((annotation) => ({
      id: annotation.timestamp.toString(),
      timestamp: new Date(annotation.timestamp).toLocaleTimeString(),
      type: annotation.type,
      coordinates: annotation.points
        .map((p) => `(${Math.round(p.x)},${Math.round(p.y)})`)
        .join(", "),
      groupId: annotation.groupIds?.[0],
      numericTimestamp: annotation.timestamp
    }));

    // Create a set to track unique groupIds that we've processed
    const processedGroupIds = new Set<string>();
    const groupTraces: TraceItem[] = [];

    // Process all annotations to find all groups
    annotations.forEach(annotation => {
      if (annotation.groupIds && annotation.groupIds.length > 0) {
        // For each group this annotation belongs to
        annotation.groupIds.forEach(groupId => {
          // Only process each group once
          if (!processedGroupIds.has(groupId)) {
            processedGroupIds.add(groupId);
            
            const groupTimestamp = parseInt(groupId.split("-")[1] || "0");
            groupTraces.push({
              id: `group-${groupId}`,
              timestamp: new Date(groupTimestamp).toLocaleTimeString(),
              type: "group" as const,
              coordinates: "Group created",
              groupId: groupId,
              numericTimestamp: groupTimestamp
            });
          }
        });
      }
    });

    return [...annotationTraces, ...groupTraces].sort(
      (a, b) => (a.numericTimestamp || 0) - (b.numericTimestamp || 0)
    );
  }, [annotations]);

  const handleTransform = useCallback(() => {
    if (!visualizationCanvas || annotations.length === 0) {
      console.log("Canvas not ready or no annotations to transform");
      return;
    }

    const ctx = visualizationCanvas.getContext("2d");
    if (!ctx) {
      console.error("Failed to get canvas context");
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      ctx.clearRect(0, 0, visualizationCanvas.width, visualizationCanvas.height);
      ctx.drawImage(image, 0, 0, visualizationCanvas.width, visualizationCanvas.height);

      // Set drawing properties using selected color
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = appSettings.canvas.lineWidth;
      ctx.fillStyle = selectedColor;

      // Draw annotations
      annotations.forEach((annotation) => {
        switch (annotation.type) {
          case "point":
            if (annotation.points[0]) {
              ctx.beginPath();
              ctx.arc(
                annotation.points[0].x,
                annotation.points[0].y,
                appSettings.canvas.pointRadius,
                0,
                Math.PI * 2
              );
              ctx.stroke();
            }
            break;
          case "line":
            if (annotation.points[0] && annotation.points[1]) {
              ctx.beginPath();
              ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
              ctx.lineTo(annotation.points[1].x, annotation.points[1].y);
              ctx.stroke();
            }
            break;
          case "frame":
            if (annotation.points.length >= 3) {
              ctx.beginPath();
              ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
              annotation.points.forEach((point) => {
                ctx.lineTo(point.x, point.y);
              });
              ctx.closePath();
              ctx.stroke();
            } else if (annotation.points[0] && annotation.points[1]) {
              const width = annotation.points[1].x - annotation.points[0].x;
              const height = annotation.points[1].y - annotation.points[0].y;
              ctx.strokeRect(
                annotation.points[0].x,
                annotation.points[0].y,
                width,
                height
              );
            }
            break;
          case "area":
            if (annotation.points.length >= 3) {
              ctx.beginPath();
              ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
              annotation.points.forEach((point) => {
                ctx.lineTo(point.x, point.y);
              });
              ctx.closePath();
              ctx.fillStyle = `${selectedColor}33`; // 20% opacity for fill
              ctx.fill();
              ctx.stroke();
            } else if (annotation.points[0] && annotation.points[1]) {
              const width = annotation.points[1].x - annotation.points[0].x;
              const height = annotation.points[1].y - annotation.points[0].y;
              ctx.fillStyle = `${selectedColor}33`; // 20% opacity for fill
              ctx.fillRect(
                annotation.points[0].x,
                annotation.points[0].y,
                width,
                height
              );
              ctx.strokeRect(
                annotation.points[0].x,
                annotation.points[0].y,
                width,
                height
              );
            }
            break;
          case "freehand":
            if (annotation.points.length > 1) {
              ctx.beginPath();
              ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
              annotation.points.forEach((point) => {
                ctx.lineTo(point.x, point.y);
              });
              ctx.stroke();
            }
            break;
        }
      });

      console.log("Canvas transformed with annotations");
      // The original code had onImageAnalysis here, but it's not defined in the new_code.
      // Assuming it's meant to be passed as a prop or removed if not needed.
      // For now, commenting out the call to avoid errors.
      // if (onImageAnalysis) {
      //   onImageAnalysis(visualizationCanvas.toDataURL());
      // }
    };

    image.onerror = (error) => {
      console.error("Error loading image for transform:", error);
    };

    image.src = imageUrl;
  }, [visualizationCanvas, annotations, imageUrl, selectedColor]); // Added imageUrl to dependency array

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#FBFAF8' }}>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Toolbox Panel */}
        <div className="absolute top-4 left-4 z-10">
          <ToolboxPanel
            selectedTool={selectedTool}
            onToolSelect={handleToolSelect}
            selectedCount={selectedCount}
          />
        </div>

        <div className="flex-1 overflow-hidden">
          <AnnotationCanvas
            imageUrl={imageUrl}
            selectedTool={selectedTool}
            onAnnotationChange={handleAnnotationChange}
            onSelectionChange={setSelectedCount}
            onToolChange={handleToolSelect}
          />
        </div>
        <SessionControls
          onReset={handleReset}
          countdown={countdown}
          showCountdown={showCountdown}
          onTransform={handleTransform}
          disabled={false}
          onSessionEnd={onSessionEnd}
          sessionName={currentSessionName}
          imageUrl={imageUrl}
          audioRecorder={audio}
        />
      </div>
      <Traceboard />
    </div>
  );
};

export default Home;

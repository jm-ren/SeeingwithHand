import React, { useCallback, useEffect, useState } from "react";
import AnnotationCanvas from "./AnnotationCanvas";
import ToolboxPanel from "./ToolboxPanel";
import SessionControls from "./SessionControls";
import Traceboard from "./Traceboard";
import { useSession } from "../context/SessionContext";
import { useAnnotations } from "../context/AnnotationContext";
import { Annotation } from "../types/annotations";
import { processTracesForDisplay } from "../lib/utils";

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

interface TraceItem {
  id: string;
  timestamp: string;
  type: "point" | "line" | "frame" | "area" | "freehand" | "group" | "select";
  coordinates: string;
  groupId?: string;
  numericTimestamp?: number;
}

const Home = () => {
  // State management
  const [selectedTool, setSelectedTool] = useState<Tool>("point");
  const [selectedCount, setSelectedCount] = useState(0);
  const [visualizationCanvas, setVisualizationCanvas] =
    useState<HTMLCanvasElement | null>(null);
    
  // Use contexts - get countdown and session state from context
  const { isSessionActive, countdown, showCountdown } = useSession();
  const { resetSession, annotations } = useAnnotations();

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
              type: "group",
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
    if (!visualizationCanvas) {
      console.error("Visualization canvas not initialized");
      return;
    }

    const ctx = visualizationCanvas.getContext("2d");
    if (!ctx) {
      console.error("Could not get visualization canvas context");
      return;
    }

    // Clear the canvas
    ctx.clearRect(0, 0, visualizationCanvas.width, visualizationCanvas.height);

    // Load the image
    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      try {
        // Draw the image
        ctx.drawImage(image, 0, 0, visualizationCanvas.width, visualizationCanvas.height);

        // Draw annotations
        annotations.forEach((annotation) => {
          ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
          ctx.lineWidth = 2;

          switch (annotation.type) {
            case "point":
              if (annotation.points[0]) {
                ctx.beginPath();
                ctx.arc(
                  annotation.points[0].x,
                  annotation.points[0].y,
                  5,
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
                ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
                ctx.fill();
                ctx.stroke();
              } else if (annotation.points[0] && annotation.points[1]) {
                const width = annotation.points[1].x - annotation.points[0].x;
                const height = annotation.points[1].y - annotation.points[0].y;
                ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
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
              if (annotation.points.length > 0) {
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

        // Create a blob from the canvas and trigger download
        visualizationCanvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "visualization.png";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        });
      } catch (error) {
        console.error("Error creating visualization:", error);
      }
    };

    image.onerror = () => {
      console.error("Error loading image for visualization");
    };

    image.src =
      "https://images2.dwell.com/photos/6133553759298379776/6297915443342360576/original.jpg?auto=format&q=35&w=1600";
  }, [annotations, visualizationCanvas]);

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#FBFAF8' }}>
      {/* Main Content Area with Absolute Positioned Toolbox */}
      <div className="flex-1 flex flex-col relative">
        {/* Toolbox Panel - Absolute Positioned */}
        <div className="absolute top-4 left-4 z-10">
          <ToolboxPanel
            selectedTool={selectedTool}
            onToolSelect={handleToolSelect}
            selectedCount={selectedCount}
          />
        </div>

        <div className="flex-1 overflow-hidden">
          <AnnotationCanvas
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
        />
      </div>
      <Traceboard />
    </div>
  );
};

export default Home;

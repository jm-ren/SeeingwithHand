import React, { useCallback, useEffect, useState } from "react";
import AnnotationCanvas from "./AnnotationCanvas";
import ToolboxPanel from "./ToolboxPanel";
import SessionControls from "./SessionControls";
import Traceboard from "./Traceboard";

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

interface Annotation {
  id: string;
  type: Tool;
  points: Point[];
  color: string;
  timestamp: number;
  groupId?: string;
}

interface TraceItem {
  id: string;
  timestamp: string;
  type: Tool | "group";
  coordinates: string;
  groupId?: string;
}

const Home = () => {
  // State management
  const [selectedTool, setSelectedTool] = useState<Tool>("point");
  const [selectedCount, setSelectedCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [countdown, setCountdown] = useState(10);
  const [showCountdown, setShowCountdown] = useState(true);
  const [visualizationCanvas, setVisualizationCanvas] =
    useState<HTMLCanvasElement | null>(null);

  // Countdown effect
  useEffect(() => {
    if (showCountdown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showCountdown && countdown === 0) {
      setShowCountdown(false);
      handleSessionStart();
    }
  }, [countdown, showCountdown]);

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

  const handleSessionStart = useCallback(() => {
    setIsRecording(true);
  }, []);

  const handleSessionStop = useCallback(() => {
    setIsRecording(false);
  }, []);

  const handleReset = useCallback(() => {
    setAnnotations([]);
    setIsRecording(false);
    setCountdown(10);
    setShowCountdown(true);
  }, []);

  const handleAnnotationChange = useCallback((newAnnotations: Annotation[]) => {
    setAnnotations(newAnnotations);
  }, []);

  const processTracesForDisplay = useCallback((): TraceItem[] => {
    const annotationTraces = annotations.map((annotation) => ({
      id: annotation.timestamp.toString(),
      timestamp: new Date(annotation.timestamp).toLocaleTimeString(),
      type: annotation.type,
      coordinates: annotation.points
        .map((p) => `(${Math.round(p.x)},${Math.round(p.y)})`)
        .join(", "),
      groupId: annotation.groupId,
    }));

    const groupTraces = annotations
      .filter((a) => a.groupId)
      .reduce((groups: TraceItem[], annotation) => {
        const groupExists = groups.some(
          (g) => g.id === `group-${annotation.groupId}`,
        );
        if (!groupExists) {
          groups.push({
            id: `group-${annotation.groupId}`,
            timestamp: new Date(
              parseInt(annotation.groupId?.split("-")[1] || "0"),
            ).toLocaleTimeString(),
            type: "group",
            coordinates: "Group created",
            groupId: annotation.groupId,
          });
        }
        return groups;
      }, []);

    return [...annotationTraces, ...groupTraces].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [annotations]);

  const handleTransform = useCallback(() => {
    if (!visualizationCanvas) {
      console.error("Visualization canvas not initialized");
      return;
    }

    const ctx = visualizationCanvas.getContext("2d");
    if (!ctx) {
      console.error("Could not get canvas context");
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      try {
        // Clear canvas
        ctx.clearRect(
          0,
          0,
          visualizationCanvas.width,
          visualizationCanvas.height,
        );

        // Draw image with proper scaling
        ctx.drawImage(
          image,
          0,
          0,
          visualizationCanvas.width,
          visualizationCanvas.height,
        );

        // Add semi-transparent overlay
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fillRect(
          0,
          0,
          visualizationCanvas.width,
          visualizationCanvas.height,
        );

        // Draw heatmap
        annotations.forEach((annotation) => {
          annotation.points.forEach((point) => {
            const x =
              (point.x / visualizationCanvas.width) * visualizationCanvas.width;
            const y =
              (point.y / visualizationCanvas.height) *
              visualizationCanvas.height;

            ctx.beginPath();
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, 50);
            gradient.addColorStop(0, "rgba(255, 0, 0, 0.3)");
            gradient.addColorStop(1, "rgba(255, 0, 0, 0)");
            ctx.fillStyle = gradient;
            ctx.arc(x, y, 50, 0, Math.PI * 2);
            ctx.fill();
          });
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
    <div className="flex h-screen w-screen bg-background overflow-hidden">
      {/* Toolbox Panel */}
      <div className="p-4">
        <ToolboxPanel
          selectedTool={selectedTool}
          onToolSelect={handleToolSelect}
          selectedCount={selectedCount}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative">
        <div className="flex-1 overflow-hidden">
          <AnnotationCanvas
            selectedTool={selectedTool}
            onAnnotationChange={handleAnnotationChange}
            onSelectionChange={setSelectedCount}
            initialAnnotations={annotations}
          />
        </div>
        <SessionControls
          isRecording={isRecording}
          onStart={handleSessionStart}
          onStop={handleSessionStop}
          onReset={handleReset}
          countdown={countdown}
          showCountdown={showCountdown}
          onTransform={handleTransform}
        />
      </div>

      {/* Traceboard */}
      <Traceboard
        countdown={countdown}
        showCountdown={showCountdown}
        traces={processTracesForDisplay()}
      />
    </div>
  );
};

export default Home;

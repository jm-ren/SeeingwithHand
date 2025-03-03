import React from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Clock, DotSquare, PenLine, Square, Pencil, Group } from "lucide-react";

interface TraceItem {
  id: string;
  timestamp: string;
  type: "point" | "line" | "frame" | "area" | "freehand" | "group";
  coordinates: string;
  groupId?: string;
}

interface TraceboardProps {
  traces?: TraceItem[];
  countdown?: number;
  showCountdown?: boolean;
}

const defaultTraces: TraceItem[] = [
  {
    id: "1",
    timestamp: "10:30:15",
    type: "point",
    coordinates: "x: 100, y: 200",
  },
  {
    id: "2",
    timestamp: "10:30:20",
    type: "line",
    coordinates: "start(100,200), end(300,400)",
  },
  {
    id: "3",
    timestamp: "10:30:25",
    type: "frame",
    coordinates: "top-left(50,50), bottom-right(150,150)",
  },
  {
    id: "4",
    timestamp: "10:30:30",
    type: "group",
    coordinates: "Group created",
    groupId: "group-1234567890",
  },
];

const getToolIcon = (type: TraceItem["type"]) => {
  switch (type) {
    case "point":
      return <DotSquare className="h-4 w-4" />;
    case "line":
      return <PenLine className="h-4 w-4" />;
    case "frame":
      return <Square className="h-4 w-4" />;
    case "area":
      return (
        <div className="relative">
          <div
            className="absolute inset-0 rounded-sm"
            style={{
              background: `repeating-linear-gradient(
                45deg,
                rgba(0, 0, 0, 0.5),
                rgba(0, 0, 0, 0.5) 1px,
                transparent 1px,
                transparent 4px
              )`,
            }}
          />
          <Square className="h-4 w-4 text-black/50" />
        </div>
      );
    case "freehand":
      return <Pencil className="h-4 w-4" />;
    case "group":
      return <Group className="h-4 w-4" />;
    default:
      return <Pencil className="h-4 w-4" />;
  }
};

const Traceboard = ({
  traces = defaultTraces,
  countdown = 0,
  showCountdown = false,
}: TraceboardProps) => {
  // Helper function to generate a short group ID
  const getShortGroupId = (groupId: string): string => {
    if (!groupId) return "";
    
    // Extract the timestamp part after "group-"
    const timestampPart = groupId.split("-")[1] || "";
    
    // Create a short ID using the last 5 characters of the timestamp
    // This ensures IDs are unique but compact
    return timestampPart.slice(-5);
  };

  return (
    <div className="w-96 h-full bg-background border-l flex flex-col">
      <div className="p-4 border-b flex-shrink-0">
        <h2 className="text-lg font-semibold">Interaction Timeline</h2>
        <p className="text-sm text-muted-foreground">
          {showCountdown ? (
            <span className="font-medium text-primary">
              Starting in {countdown}...
            </span>
          ) : (
            "Chronological record of annotations"
          )}
        </p>
      </div>

      <ScrollArea className="flex-1 pb-[70px]">
        <div className="p-4 space-y-4">
          {traces.map((trace, index) => (
            <React.Fragment key={trace.id}>
              {index > 0 && <Separator className="my-4" />}
              <div 
                className="transform-gpu" 
                style={{ 
                  animation: `smoothFadeIn 500ms ${index * 60}ms forwards ease-out`,
                  opacity: 0,
                  transform: 'translateY(20px)',
                  willChange: 'transform, opacity'
                }}
              >
                <Card className="p-4 transition-transform duration-300 hover:translate-y-[-2px] hover:shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getToolIcon(trace.type)}
                      <Badge variant="secondary">{trace.type}</Badge>
                      {trace.groupId && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          G:{getShortGroupId(trace.groupId)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{trace.timestamp}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground break-words">
                    {trace.coordinates}
                  </p>
                </Card>
              </div>
            </React.Fragment>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default Traceboard;

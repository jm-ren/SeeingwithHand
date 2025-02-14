import React from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Clock, Mouse, Pencil } from "lucide-react";

interface TraceItem {
  id: string;
  timestamp: string;
  type: "point" | "line" | "frame" | "area" | "freehand";
  coordinates: string;
}

interface TraceboardProps {
  traces?: TraceItem[];
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
];

const getToolIcon = (type: TraceItem["type"]) => {
  switch (type) {
    case "point":
      return <Mouse className="h-4 w-4" />;
    case "line":
    case "frame":
    case "area":
      return <Pencil className="h-4 w-4" />;
    case "freehand":
      return <Pencil className="h-4 w-4" />;
    default:
      return <Pencil className="h-4 w-4" />;
  }
};

const Traceboard = ({ traces = defaultTraces }: TraceboardProps) => {
  return (
    <div className="w-80 h-full bg-background border-l">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Interaction Timeline</h2>
        <p className="text-sm text-muted-foreground">
          Chronological record of annotations
        </p>
      </div>

      <ScrollArea className="h-[calc(100%-5rem)]">
        <div className="p-4">
          {traces.map((trace, index) => (
            <React.Fragment key={trace.id}>
              {index > 0 && <Separator className="my-4" />}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getToolIcon(trace.type)}
                    <Badge variant="secondary">{trace.type}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{trace.timestamp}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {trace.coordinates}
                </p>
              </Card>
            </React.Fragment>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default Traceboard;

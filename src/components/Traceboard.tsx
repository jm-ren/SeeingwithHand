import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Clock, DotSquare, PenLine, Square, Pencil, Group, ArrowDown } from "lucide-react";

interface TraceItem {
  id: string;
  timestamp: string;
  type: "point" | "line" | "frame" | "area" | "freehand" | "group" | "select";
  coordinates: string;
  groupId?: string;
  numericTimestamp?: number;
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
    case "select":
      return <div className="h-4 w-4 border border-current rounded-sm p-0.5 flex items-center justify-center">
        <div className="w-full h-full bg-primary-foreground rounded-sm"></div>
      </div>;
    default:
      return <Pencil className="h-4 w-4" />;
  }
};

const Traceboard = ({
  traces = defaultTraces,
  countdown = 0,
  showCountdown = false,
}: TraceboardProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const previousTracesLength = useRef(traces.length);
  const isNearBottom = useRef(true);
  
  // Helper function to generate a short group ID
  const getShortGroupId = (groupId: string): string => {
    if (!groupId) return "";
    
    // Extract the timestamp part after "group-"
    const timestampPart = groupId.split("-")[1] || "";
    
    // Create a short ID using the last 5 characters of the timestamp
    // This ensures IDs are unique but compact
    return timestampPart.slice(-5);
  };
  
  // Scroll to the bottom of the timeline
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };
  
  // Check if scroll is near bottom
  const checkIfNearBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const threshold = 50; // Consider "near bottom" if within 50px of bottom
        return scrollTop >= scrollHeight - clientHeight - threshold;
      }
    }
    return true; // Default to true if we can't determine
  };
  
  // Handle scroll events to show/hide the scroll button
  const handleScroll = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const threshold = 20;
        const nearBottom = scrollTop >= scrollHeight - clientHeight - threshold;
        
        setShowScrollButton(!nearBottom);
        isNearBottom.current = nearBottom;
      }
    }
  };
  
  // Set up scroll event listener
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);
  
  // More reliable auto-scroll using useLayoutEffect and checking if new traces were added
  useEffect(() => {
    // If there are new traces added
    if (traces.length > previousTracesLength.current) {
      // Use a sequence of timers to make sure we scroll after DOM updates
      const timerOne = setTimeout(() => {
        requestAnimationFrame(() => {
          // Only auto-scroll if we were already at the bottom (or near it)
          if (isNearBottom.current) {
            const timerTwo = setTimeout(() => {
              scrollToBottom();
            }, 50); // Small delay to ensure rendering completes
            return () => clearTimeout(timerTwo);
          }
        });
      }, 10);
      return () => clearTimeout(timerOne);
    }
    
    // Always update the reference count
    previousTracesLength.current = traces.length;
  }, [traces.length]);
  
  // Initial scroll to bottom when component mounts
  useEffect(() => {
    if (traces.length > 0) {
      // Initial delay to let the component fully render
      const timer = setTimeout(() => {
        scrollToBottom();
        isNearBottom.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="w-96 h-full bg-background border-l flex flex-col relative">
      <style>
        {`
          @keyframes slideInUp {
            0% {
              opacity: 0.6;
              transform: translateY(15px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes slowDrift {
            0% {
              transform: translateY(0);
            }
            100% {
              transform: translateY(-2px);
            }
          }

          .animate-slide-in {
            animation: 
              slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards,
              slowDrift 4s ease-in-out infinite alternate;
            will-change: transform, opacity;
            opacity: 0.6;
          }

          .time-gap {
            position: relative;
          }

          .time-gap::before {
            content: '';
            position: absolute;
            left: 24px;
            top: -12px;
            bottom: -12px;
            width: 1px;
            background: linear-gradient(
              to bottom,
              transparent,
              var(--border) 20%,
              var(--border) 80%,
              transparent
            );
            opacity: 0.5;
          }
        `}
      </style>

      <div className="p-4 border-b flex-shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Interaction Timeline</h2>
        </div>
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

      <ScrollArea ref={scrollAreaRef} className="flex-1 pb-[70px]">
        <div className="p-4">
          {traces.map((trace, index) => {
            // Calculate time gap from previous trace
            const timeGap = index > 0 
              ? (trace.numericTimestamp || 0) - (traces[index - 1].numericTimestamp || 0)
              : 0;
            
            // Convert time gap to pixels (e.g., 1 second = 2px, with a min and max)
            const gapHeight = Math.min(Math.max(timeGap / 1000 * 2, 12), 100);

            return (
              <div key={trace.id} style={{ marginBottom: index < traces.length - 1 ? gapHeight : 0 }}>
                <Card 
                  className="p-3 transition-all hover:translate-y-[-2px] hover:shadow-md animate-slide-in"
                  style={{
                    animationDelay: `${Math.min(index * 60, 400)}ms`
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div className="bg-muted p-1.5 rounded">
                      {getToolIcon(trace.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs font-medium">
                          {trace.type.charAt(0).toUpperCase() + trace.type.slice(1)}
                          {trace.groupId && (
                            <span className="ml-1 text-muted-foreground">
                              #{getShortGroupId(trace.groupId)}
                            </span>
                          )}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {trace.timestamp}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{trace.coordinates}</p>
                    </div>
                  </div>
                </Card>
                {index < traces.length - 1 && timeGap > 1000 && (
                  <div className="time-gap" style={{ height: gapHeight }}>
                    {timeGap > 5000 && (
                      <span className="absolute left-8 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {Math.round(timeGap / 1000)}s
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Jump to Latest button - only show when not at bottom */}
      {showScrollButton && (
        <Button
          className="absolute bottom-4 right-4 shadow-md flex items-center gap-1"
          size="sm"
          onClick={scrollToBottom}
        >
          <ArrowDown className="h-4 w-4" />
          Jump to Latest
        </Button>
      )}
    </div>
  );
};

export default Traceboard;

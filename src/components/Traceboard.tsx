import React, { useEffect, useRef, useState, useLayoutEffect, useCallback } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Clock, DotSquare, PenLine, Square, Pencil, Group, ArrowDown } from "lucide-react";
import { useAnnotations } from "../context/AnnotationContext";

interface TraceItem {
  id: string;
  timestamp: string;
  type: "point" | "line" | "frame" | "area" | "freehand" | "group" | "select";
  coordinates: string;
  groupId?: string;
  numericTimestamp?: number;
}

interface TraceboardProps {
  countdown?: number;
  showCountdown?: boolean;
}

const defaultTraces: TraceItem[] = [];

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

// Helper function to format freehand traces
const formatFreehandTrace = (coordinates: string) => {
  if (coordinates.length > 30) {
    return `${coordinates.substring(0, 27)}...`;
  }
  return coordinates;
};

const Traceboard = ({
  countdown = 0,
  showCountdown = false,
}: TraceboardProps) => {
  // Get annotations from context
  const { annotations, groups } = useAnnotations();
  const [traces, setTraces] = useState<TraceItem[]>(defaultTraces);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const previousTracesLength = useRef(traces.length);
  const isNearBottom = useRef(true);
  
  // Process traces for display
  const processTracesForDisplay = useCallback((): TraceItem[] => {
    const annotationTraces = annotations.map((annotation) => ({
      id: annotation.timestamp.toString(),
      timestamp: new Date(annotation.timestamp).toLocaleTimeString(),
      type: annotation.type,
      coordinates: annotation.points
        .map((p) => `(${Math.round(p.x)},${Math.round(p.y)})`)
        .join(", "),
      groupId: annotation.groupId,
      numericTimestamp: annotation.timestamp
    }));

    const groupTraces = annotations
      .filter((a) => a.groupId)
      .reduce((result: TraceItem[], annotation) => {
        const groupExists = result.some(
          (g) => g.id === `group-${annotation.groupId}`,
        );
        if (!groupExists && annotation.groupId) {
          const groupTimestamp = parseInt(annotation.groupId?.split("-")[1] || "0");
          result.push({
            id: `group-${annotation.groupId}`,
            timestamp: new Date(groupTimestamp).toLocaleTimeString(),
            type: "group",
            coordinates: "Group created",
            groupId: annotation.groupId,
            numericTimestamp: groupTimestamp
          });
        }
        return result;
      }, []);

    return [...annotationTraces, ...groupTraces].sort(
      (a, b) => (a.numericTimestamp || 0) - (b.numericTimestamp || 0)
    );
  }, [annotations]);
  
  // Update traces when annotations change
  useEffect(() => {
    const processedTraces = processTracesForDisplay();
    setTraces(processedTraces);
    console.log("Traces updated from annotations:", processedTraces.length);
  }, [annotations, groups, processTracesForDisplay]);
  
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
            }, 600); // Match the animation duration
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
    <div className="h-full border-l flex flex-col relative" style={{ 
      background: '#FBFAF8',
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontWeight: 300,
      width: 'calc(24rem * 0.92)' // 24rem (w-96) * 0.92 (8% narrower)
    }}>
      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes continuousDrift {
            0% {
              transform: translateY(0);
            }
            100% {
              transform: translateY(-2000px);
            }
          }

          .animate-slide-in {
            opacity: 0;
            animation: 
              fadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards,
              continuousDrift 300s linear;
            will-change: transform, opacity;
            transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            letter-spacing: -0.01em;
            font-weight: 300;
          }

          /* Add transition to the trace container */
          [data-trace-container] {
            min-height: 88px; /* Fixed minimum height to prevent layout shifts */
            transform-origin: center bottom;
            transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          }

          /* Add transition to the scroll container */
          [data-radix-scroll-area-viewport] {
            transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1) !important;
            scroll-behavior: smooth;
            overflow-anchor: auto; /* Better scroll anchoring */
          }

          /* Smooth container transitions */
          .traces-container {
            transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            transform-style: preserve-3d;
            will-change: transform;
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
            transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .time-gap-text {
            opacity: 0.7;
            transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1);
            font-variant-numeric: tabular-nums;
          }

          .time-gap:hover .time-gap-text {
            opacity: 1;
          }
        `}
      </style>

      <div className="p-4 border-b flex-shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', fontWeight: 500, letterSpacing: '-0.02em' }}>Interaction Timeline</h2>
        </div>
        <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', fontWeight: 330, letterSpacing: '-0.01em', marginTop: '2px' }}>
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
        <div className="p-4 traces-container">
          {traces.map((trace, index) => {
            const timeGap = index > 0 
              ? Math.max(0, (trace.numericTimestamp || 0) - (traces[index - 1].numericTimestamp || 0))
              : 0;
            
            const gapHeight = Math.min(Math.max(timeGap / 1000 * 2, 16), 100);
            const animationDelay = `${Math.min(index * 100, 800)}ms`;

            const formatTimeGap = (ms: number) => {
              if (ms < 1000) return `${ms}ms`;
              const seconds = Math.round(ms / 100) / 10;
              return `${seconds}s`;
            };

            return (
              <div 
                key={trace.id} 
                data-trace-container
                style={{ 
                  marginBottom: index < traces.length - 1 ? gapHeight : 0,
                  animationDelay
                }}
              >
                <Card 
                  className="p-4 transition-all hover:translate-y-[-2px] hover:shadow-md animate-slide-in"
                  style={{
                    animationDelay,
                    height: '100%'
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="bg-muted p-1.5 rounded">
                      {getToolIcon(trace.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <Badge variant="outline" className="text-xs" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', letterSpacing: '-0.01em', fontWeight: 400 }}>
                          {trace.type.charAt(0).toUpperCase() + trace.type.slice(1)}
                          {trace.groupId && (
                            <span className="ml-1 text-muted-foreground" style={{ fontWeight: 300 }}>
                              #{getShortGroupId(trace.groupId)}
                            </span>
                          )}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', letterSpacing: '-0.01em', fontWeight: 300 }}>
                          <Clock className="h-3 w-3" />
                          {trace.timestamp}
                        </span>
                      </div>
                      <p className="text-xs mt-1 text-muted-foreground" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', letterSpacing: '-0.01em', fontWeight: 300 }}>
                        {trace.type === 'freehand' 
                          ? formatFreehandTrace(trace.coordinates)
                          : trace.coordinates}
                      </p>
                    </div>
                  </div>
                </Card>
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

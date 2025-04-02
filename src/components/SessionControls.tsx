import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { PlayCircle, StopCircle, LineChart, RotateCcw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { useSession } from "../context/SessionContext";

interface SessionControlsProps {
  onTransform?: () => void;
  onReset?: () => void;
  disabled?: boolean;
  countdown?: number;
  showCountdown?: boolean;
}

const SessionControls = ({
  onTransform = () => {},
  onReset = () => {},
  disabled = false,
  countdown = 0,
  showCountdown = false,
}: SessionControlsProps) => {
  const [showVisualization, setShowVisualization] = useState(false);
  const { isSessionActive, startSession, endSession } = useSession();

  const handleStartStop = () => {
    if (isSessionActive) {
      endSession();
    } else {
      startSession();
    }
  };

  return (
    <div 
      className="transform-gpu will-change-transform w-full" 
      style={{ 
        animation: 'smoothSlideUp 600ms ease-out forwards',
        opacity: 0,
        transform: 'translateY(50px)',
        fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif'
      }}
    >
      <Card className="w-full h-[60px] bg-[#FBFAF8] flex items-center justify-between px-6 fixed bottom-0 left-0 shadow-sm rounded-none border-0" style={{ 
        borderTop: '1px solid #E5E7EB',
        borderRight: 'none',
        borderBottom: 'none',
        borderLeft: 'none'
      }}>
        <div className="flex items-center gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="transform-gpu transition-transform duration-150 hover:translate-y-[-2px] active:translate-y-[1px]">
                  <Button
                    variant={isSessionActive ? "outline" : "ghost"}
                    size="sm"
                    onClick={handleStartStop}
                    disabled={disabled}
                    className="w-[28px] h-[28px] p-[4.4px]"
                    style={{
                      backgroundColor: isSessionActive ? '#DD4627' : 'transparent',
                      color: isSessionActive ? 'white' : 'inherit',
                      borderColor: isSessionActive ? '#DD4627' : undefined
                    }}
                  >
                    {isSessionActive ? (
                      <StopCircle className="h-[17px] w-[17px]" />
                    ) : (
                      <PlayCircle className="h-[17px] w-[17px]" />
                    )}
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', fontWeight: 300, letterSpacing: '-0.01em' }}>
                <p>{isSessionActive ? "Stop Recording" : "Start Recording"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="transform-gpu transition-transform duration-150 hover:translate-y-[-2px] active:translate-y-[1px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReset}
                    disabled={disabled}
                    className="w-[28px] h-[28px] p-[4.4px]"
                  >
                    <RotateCcw className="h-[17px] w-[17px]" />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', fontWeight: 300, letterSpacing: '-0.01em' }}>
                <p>Reset Canvas</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Dialog open={showVisualization} onOpenChange={setShowVisualization}>
            <DialogTrigger asChild>
              <div className="transform-gpu transition-transform duration-150 hover:translate-y-[-2px] active:translate-y-[1px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowVisualization(true);
                    onTransform();
                  }}
                  disabled={disabled}
                  className="w-[28px] h-[28px] p-[4.4px]"
                >
                  <LineChart className="h-[17px] w-[17px]" />
                </Button>
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', fontWeight: 500, letterSpacing: '-0.02em' }}>Interaction Pattern Visualization</DialogTitle>
              </DialogHeader>
              <canvas
                id="visualizationCanvas"
                className="h-[400px] w-full bg-muted rounded-lg"
                width={600}
                height={400}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif', fontWeight: 330, letterSpacing: '-0.01em' }}>
            {isSessionActive 
              ? "Recording in progress..." 
              : showCountdown && countdown > 0
                ? `Starting in ${countdown}...`
                : "Ready to record"
            }
          </span>
        </div>
      </Card>
    </div>
  );
};

export default SessionControls;

import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { PlayCircle, StopCircle, LineChart, RotateCcw, Pause, FastForward } from "lucide-react";
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
import { useAnnotations } from "../context/AnnotationContext";
import EyeVisualization from "./EyeVisualization";
import Legend from "./Legend";

interface SessionControlsProps {
  onTransform?: () => void;
  onReset?: () => void;
  disabled?: boolean;
  countdown?: number;
  showCountdown?: boolean;
}

const availableSpeeds = [1, 2, 4, 8];

const SessionControls = ({
  onTransform = () => {},
  onReset = () => {},
  disabled = false,
  countdown = 0,
  showCountdown = false,
}: SessionControlsProps) => {
  const [showVisualization, setShowVisualization] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visualizationProgress, setVisualizationProgress] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(availableSpeeds.indexOf(4)); // Start at 4x speed index
  const { isSessionActive, startSession, endSession } = useSession();
  const { annotations } = useAnnotations();

  const currentSpeed = availableSpeeds[speedIndex];

  const handleStartStop = () => {
    if (isSessionActive) {
      endSession();
    } else {
      startSession();
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Renamed from handleVisualizationReset to handleRestartAnimation
  const handleRestartAnimation = () => {
    setVisualizationProgress(0);
    setIsPlaying(true);
  };

  // Handle speed change
  const handleSpeedUp = () => {
    setSpeedIndex((prevIndex) => (prevIndex + 1) % availableSpeeds.length);
  };

  // Handle visualization completion
  useEffect(() => {
    if (visualizationProgress >= 1) {
      setIsPlaying(false);
    }
  }, [visualizationProgress]);

  // Auto-play on modal open
  useEffect(() => {
    if (showVisualization) {
      setVisualizationProgress(0);
      setIsPlaying(true);
    }
  }, [showVisualization]);

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
        <div className="flex items-center gap-6">
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
                  onClick={onTransform}
                  disabled={disabled}
                  className="w-[28px] h-[28px] p-[4.4px]"
                >
                  <LineChart className="h-[17px] w-[17px]" />
                </Button>
              </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] h-[700px] p-0 bg-white border-0 overflow-hidden relative fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-full h-full flex flex-col items-center">
                {annotations.length > 0 ? (
                  <>
                    <div className="flex-grow w-full flex items-center justify-center">
                      <EyeVisualization 
                        annotations={annotations} 
                        className="h-full w-full"
                        isPlaying={isPlaying}
                        onPlayPause={handlePlayPause}
                        onReset={handleRestartAnimation}
                        progress={visualizationProgress}
                        onProgressChange={setVisualizationProgress}
                        playbackSpeed={currentSpeed}
                      />
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full h-[6px] bg-[#FBFAF8]">
                      <div 
                        className="h-full bg-[#B0B7B9] transition-all duration-300 ease-linear"
                        style={{ width: `${visualizationProgress * 100}%` }}
                      />
                    </div>

                    {/* Legend */}
                    <div className="w-full flex justify-center mb-16">
                      <Legend />
                    </div>

                    {/* Controls */}
                    <div className="w-full border-t border-[#E5E7EB]">
                      <div className="grid grid-cols-2 divide-x divide-[#E5E7EB]">
                        <button 
                          className="flex items-center justify-center py-6 hover:bg-gray-50 transition-colors"
                          onClick={handleRestartAnimation}
                        >
                          <RotateCcw className="h-6 w-6" />
                        </button>
                        <button 
                          className="flex items-center justify-center gap-2 py-6 hover:bg-gray-50 transition-colors"
                          onClick={handleSpeedUp}
                        >
                          <FastForward className="h-6 w-6" />
                          <span className="text-sm font-medium">{currentSpeed}x</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                    No annotations available to visualize
                  </div>
                )}
              </div>
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

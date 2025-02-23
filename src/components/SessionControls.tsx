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

interface SessionControlsProps {
  onStart?: () => void;
  onStop?: () => void;
  onTransform?: () => void;
  onReset?: () => void;
  isRecording?: boolean;
  disabled?: boolean;
  countdown?: number;
  showCountdown?: boolean;
}

const SessionControls = ({
  onStart = () => {},
  onStop = () => {},
  onTransform = () => {},
  onReset = () => {},
  isRecording = false,
  disabled = false,
  countdown = 0,
  showCountdown = false,
}: SessionControlsProps) => {
  const [showVisualization, setShowVisualization] = useState(false);

  return (
    <Card className="w-full h-[60px] bg-background border-t flex items-center justify-between px-4 fixed bottom-0 left-0">
      <div className="flex items-center gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isRecording ? "destructive" : "default"}
                size="icon"
                onClick={isRecording ? onStop : onStart}
                disabled={disabled}
              >
                {isRecording ? (
                  <StopCircle className="h-5 w-5" />
                ) : (
                  <PlayCircle className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isRecording ? "Stop Recording" : "Start Recording"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onReset}
                disabled={disabled}
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reset Canvas</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Dialog open={showVisualization} onOpenChange={setShowVisualization}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setShowVisualization(true);
                onTransform();
              }}
              disabled={disabled}
            >
              <LineChart className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Interaction Pattern Visualization</DialogTitle>
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
        <span className="text-sm text-muted-foreground">
          {isRecording ? "Recording in progress..." : "Ready to record"}
        </span>
      </div>
    </Card>
  );
};

export default SessionControls;

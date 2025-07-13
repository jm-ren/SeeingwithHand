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
import { useApplication } from "../context/ApplicationContext";
import EyeVisualization from "./EyeVisualization";
import Legend from "./Legend";
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { Mic, MicOff } from "lucide-react";
import ColorPalette from "./ColorPalette";

interface SessionControlsProps {
  onTransform?: () => void;
  onReset?: () => void;
  disabled?: boolean;
  countdown?: number;
  showCountdown?: boolean;
  onSessionEnd?: (summary: { sessionName: string; imageUrl: string; audioUrl?: string }) => void;
  sessionName?: string;
  imageUrl?: string;
  audioRecorder?: ReturnType<typeof useAudioRecorder>;
}

const baseSpeedMultiplier = 16;
const relativeSpeeds = [1, 2, 4, 8];

const SessionControls = ({
  onTransform = () => {},
  onReset = () => {},
  disabled = false,
  countdown = 0,
  showCountdown = false,
  onSessionEnd,
  sessionName,
  imageUrl,
  audioRecorder,
}: SessionControlsProps) => {
  const [showVisualization, setShowVisualization] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [visualizationProgress, setVisualizationProgress] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0); // Start at index 0 (1x relative, which is 16x absolute)
  const [audioEnabled, setAudioEnabled] = useState(true); // Audio recording enabled by default
  const { isSessionActive, startSession, endSession, recordInteractionEvent, annotations } = useApplication();
  const audio = audioRecorder || useAudioRecorder();

  const relativeSpeed = relativeSpeeds[speedIndex];
  const currentAbsoluteSpeed = relativeSpeed * baseSpeedMultiplier;

  const handleStartStop = () => {
    if (isSessionActive) {
      endSession();
      if (audio.isRecording) audio.stop();
      console.log('[SessionControls] Attempting to call onSessionEnd:', { sessionName, imageUrl, audioUrl: audio.audioUrl });
      if (onSessionEnd && sessionName && imageUrl) {
        onSessionEnd({
          sessionName,
          imageUrl,
          audioUrl: audio.audioUrl || undefined,
        });
      } else {
        console.warn('[SessionControls] onSessionEnd not called. Missing:', { onSessionEnd, sessionName, imageUrl });
      }
    } else {
      startSession();
      // Automatically start audio recording if enabled
      if (audioEnabled && !audio.isRecording) {
        audio.start();
      }
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
    setSpeedIndex((prevIndex) => (prevIndex + 1) % relativeSpeeds.length);
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

  // Sync audio recording with session state
  useEffect(() => {
    if (isSessionActive && audioEnabled && !audio.isRecording) {
      // Session started and audio is enabled but not recording - start audio
      audio.start();
    } else if (!isSessionActive && audio.isRecording) {
      // Session stopped but audio is still recording - stop audio
      audio.stop();
    }
  }, [isSessionActive, audioEnabled, audio.isRecording, audio]);

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
      <div className="w-full h-[60px] bg-[#FBFAF8] flex items-center justify-between px-6 fixed bottom-0 left-0 border-0" style={{ 
        borderTop: '1px solid #666666',
        borderRight: 'none',
        borderBottom: 'none',
        borderLeft: 'none',
        boxShadow: 'none'
      }}>
        <div className="flex items-center gap-6">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="transform-gpu transition-transform duration-150 hover:translate-y-[-2px] active:translate-y-[1px]">
                  <button
                    onClick={handleStartStop}
                    disabled={disabled}
                    className="flex items-center gap-2 h-[40px] px-6 border transition-colors"
                    style={{
                      backgroundColor: isSessionActive ? '#333333' : '#F5F5F5',
                      color: isSessionActive ? '#FFFFFF' : '#333333',
                      border: '1px solid #666666',
                      borderRadius: '0',
                      fontFamily: 'Azeret Mono, monospace',
                      fontWeight: 400,
                      fontSize: '14px',
                      letterSpacing: '0.5px'
                    }}
                  >
                    <div className="w-[20px] h-[20px] flex items-center justify-center">
                      {isSessionActive ? (
                        <StopCircle className="h-[16px] w-[16px]" />
                      ) : (
                        <PlayCircle className="h-[16px] w-[16px]" />
                      )}
                    </div>
                    <span>
                      {isSessionActive ? "stop" : "start"}
                    </span>
                  </button>
                </div>
              </TooltipTrigger>
                              <TooltipContent style={{ 
                  fontFamily: 'Azeret Mono, monospace', 
                  fontWeight: 400, 
                  letterSpacing: '0.5px',
                  backgroundColor: '#F5F5F5',
                  color: '#333333',
                  border: '1px solid #666666',
                  borderRadius: '0'
                }}>
                  <p>{isSessionActive ? "stop session" : "start session"}</p>
                </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="transform-gpu transition-transform duration-150 hover:translate-y-[-2px] active:translate-y-[1px]">
                  <button
                    onClick={() => {
                      const newAudioEnabled = !audioEnabled;
                      setAudioEnabled(newAudioEnabled);
                      
                      // If we're disabling audio and currently recording, stop it
                      if (!newAudioEnabled && audio.isRecording) {
                        audio.stop();
                      }
                      // If we're enabling audio and session is active but not recording, start it
                      else if (newAudioEnabled && isSessionActive && !audio.isRecording) {
                        audio.start();
                      }
                    }}
                    disabled={disabled}
                    className="flex items-center gap-2 h-[40px] px-6 border transition-colors"
                    style={{
                      backgroundColor: audioEnabled ? '#333333' : '#F5F5F5',
                      color: audioEnabled ? '#FFFFFF' : '#333333',
                      border: '1px solid #666666',
                      borderRadius: '0',
                      fontFamily: 'Azeret Mono, monospace',
                      fontWeight: 400,
                      fontSize: '14px',
                      letterSpacing: '0.5px'
                    }}
                  >
                    <div className="w-[20px] h-[20px] flex items-center justify-center">
                      {audioEnabled ? (
                        <Mic className="h-[16px] w-[16px]" />
                      ) : (
                        <MicOff className="h-[16px] w-[16px]" />
                      )}
                    </div>
                    <span>
                      {audioEnabled ? "audio" : "mute"}
                    </span>
                    {audioEnabled && audio.isRecording && (
                      <div className="w-2 h-2 bg-white animate-pulse" />
                    )}
                  </button>
                </div>
              </TooltipTrigger>
                              <TooltipContent style={{ 
                  fontFamily: 'Azeret Mono, monospace', 
                  fontWeight: 400, 
                  letterSpacing: '0.5px',
                  backgroundColor: '#F5F5F5',
                  color: '#333333',
                  border: '1px solid #666666',
                  borderRadius: '0'
                }}>
                  <p>{audioEnabled ? "audio enabled" : "audio disabled"}</p>
                </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Dialog open={showVisualization} onOpenChange={setShowVisualization}>
            <DialogTrigger asChild>
              <div className="transform-gpu transition-transform duration-150 hover:translate-y-[-2px] active:translate-y-[1px]">
                <button
                  onClick={onTransform}
                  disabled={disabled}
                  className="flex items-center gap-2 h-[40px] px-6 border transition-colors"
                  style={{
                    backgroundColor: '#F5F5F5',
                    color: '#333333',
                    border: '1px solid #666666',
                    borderRadius: '0',
                    fontFamily: 'Azeret Mono, monospace',
                    fontWeight: 400,
                    fontSize: '14px',
                    letterSpacing: '0.5px'
                  }}
                >
                  <div className="w-[20px] h-[20px] flex items-center justify-center">
                    <LineChart className="h-[16px] w-[16px]" />
                  </div>
                  <span>
                    visualize
                  </span>
                </button>
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
                        playbackSpeed={currentAbsoluteSpeed}
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button 
                                className="flex items-center justify-center py-6 hover:bg-gray-50 transition-colors"
                                onClick={handleRestartAnimation}
                              >
                                <RotateCcw className="h-6 w-6" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Restart Animation</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                           <Tooltip>
                            <TooltipTrigger asChild>
                              <button 
                                className="flex items-center justify-center gap-2 py-6 hover:bg-gray-50 transition-colors"
                                onClick={handleSpeedUp}
                              >
                                <FastForward className="h-6 w-6" />
                                <span className="text-sm font-medium">{relativeSpeed}x</span>
                              </button>
                             </TooltipTrigger>
                            <TooltipContent>
                              <p>Cycle Speed ({relativeSpeeds.map(s => `${s * baseSpeedMultiplier}x`).join(', ')})</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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

        <div className="flex items-center gap-6">
          <ColorPalette />
          <span className="text-xs" style={{ 
            fontFamily: 'Azeret Mono, monospace', 
            fontWeight: 400, 
            letterSpacing: '0.5px',
            color: '#333333'
          }}>
            {isSessionActive 
              ? "recording" 
              : showCountdown && countdown > 0
                ? `start ${countdown}`
                : "ready"
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default SessionControls;

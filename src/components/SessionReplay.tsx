import React, { useState, useEffect, useRef } from 'react';
import { Annotation, Group } from '../types/annotations';
import EyeVisualization from './EyeVisualization';
import Legend from './Legend';
import { createCoordinateTransform } from '../lib/utils';
import {
  sortAnnotationsByTime,
  computeReplayBaseTime,
  computeTotalDuration,
  getAnnotationsAtTime,
  drawProgressiveAnnotation,
} from '../lib/replayUtils';

interface SessionReplayProps {
  annotations: Annotation[];
  groups: Group[];
  imageUrl: string;
  sessionName: string;
  sessionDate?: string;
  sessionDuration?: string;
  sessionStartTime?: number;
  onClose?: () => void;
}

const SessionReplay: React.FC<SessionReplayProps> = ({
  annotations,
  groups,
  imageUrl,
  sessionName,
  sessionDate,
  sessionDuration,
  sessionStartTime,
  onClose,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Sort annotations by timestamp so replay always reflects drawing order
  const sortedAnnotations = React.useMemo(
    () => sortAnnotationsByTime(annotations),
    [annotations]
  );

  // Anchor the timeline to the true session start (or first stroke if unavailable)
  const replayBaseTime = computeReplayBaseTime(sortedAnnotations, sessionStartTime);

  // Total duration spans from session start to last stroke
  const totalDuration = computeTotalDuration(sortedAnnotations, replayBaseTime);

  // Filter annotations up to current time
  const currentAnnotations = getAnnotationsAtTime(sortedAnnotations, replayBaseTime, currentTime);


  // Progressive annotation drawing
  const drawProgressiveAnnotations = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const image = imageRef.current;
    
    if (!canvas || !ctx || !image || !image.complete) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    
    // Calculate how the image is positioned within its container (object-fit: contain)
    const imageAspectRatio = image.naturalWidth / image.naturalHeight;
    const containerAspectRatio = containerRect.width / containerRect.height;
    
    let renderedImageWidth, renderedImageHeight, imageOffsetX, imageOffsetY;
    
    if (imageAspectRatio > containerAspectRatio) {
      // Image is wider - constrained by container width
      renderedImageWidth = containerRect.width;
      renderedImageHeight = containerRect.width / imageAspectRatio;
      imageOffsetX = 0;
      imageOffsetY = (containerRect.height - renderedImageHeight) / 2;
    } else {
      // Image is taller - constrained by container height  
      renderedImageWidth = containerRect.height * imageAspectRatio;
      renderedImageHeight = containerRect.height;
      imageOffsetX = (containerRect.width - renderedImageWidth) / 2;
      imageOffsetY = 0;
    }

    // Recording dimensions and position (from debug output)
    const recordingCanvasWidth = 1652;
    const recordingCanvasHeight = 1095.13;
    const recordingImageOffsetX = 0;
    const recordingImageOffsetY = 128.43; // The image was offset during recording
    
    // Create coordinate transformer that converts from recording space to actual image space
    const convertPoint = (point: { x: number; y: number }) => {
      // First, convert from canvas coordinates to image coordinates during recording
      const recordingImageX = point.x - recordingImageOffsetX;
      const recordingImageY = point.y - recordingImageOffsetY;
      
      // Then scale from recording image size to current rendered image size
      const scaleX = renderedImageWidth / recordingCanvasWidth;
      const scaleY = renderedImageHeight / recordingCanvasHeight;
      
      // Finally, add the current image offset
      return {
        x: (recordingImageX * scaleX) + imageOffsetX,
        y: (recordingImageY * scaleY) + imageOffsetY
      };
    };

    // DEBUG: Log coordinate transformation details
    console.log('🎯 SessionReplay Coordinate Transformation:', {
      container: { width: containerRect.width, height: containerRect.height },
      renderedImage: { width: renderedImageWidth, height: renderedImageHeight },
      imageOffset: { x: imageOffsetX, y: imageOffsetY },
      recordingCanvas: { width: recordingCanvasWidth, height: recordingCanvasHeight },
      scales: { 
        scaleX: (renderedImageWidth / recordingCanvasWidth).toFixed(4), 
        scaleY: (renderedImageHeight / recordingCanvasHeight).toFixed(4) 
      }
    });
    
    // Draw each annotation progressively
    currentAnnotations.forEach((annotation) => {
      const annotationStartTime = annotation.timestamp - replayBaseTime;
      const timeSinceStart = currentTime - annotationStartTime;
      drawProgressiveAnnotation(ctx, annotation, timeSinceStart, convertPoint);
    });
  };

  // Update canvas size when container size changes
  const updateCanvasSize = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const containerRect = container.getBoundingClientRect();
    
    // Set canvas dimensions to match container
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;
    
    // Position canvas to overlay the image perfectly
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '10';
    canvas.style.pointerEvents = 'none';
    
    drawProgressiveAnnotations();
  };

  // Animation controls
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const restart = () => {
    setCurrentTime(0);
    setProgress(0);
    setIsPlaying(false);
  };

  const changeSpeed = () => {
    const speeds = [0.5, 1, 2, 4];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
  };

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + (100 * playbackSpeed);
          const newProgress = Math.min((newTime / totalDuration) * 100, 100);
          setProgress(newProgress);
          
          if (newProgress >= 100) {
            setIsPlaying(false);
            return totalDuration;
          }
          return newTime;
        });
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, totalDuration]);

  // Update canvas when annotations or time changes
  useEffect(() => {
    drawProgressiveAnnotations();
  }, [currentAnnotations, currentTime]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      updateCanvasSize();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle image load and initial setup
  useEffect(() => {
    // Small delay to ensure refs are set after render
    const timeout = setTimeout(() => {
      updateCanvasSize();
    }, 100);
    
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #666666',
        borderRadius: '0',
        padding: '24px',
        maxWidth: '1024px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        fontFamily: 'Azeret Mono, monospace'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              fontSize: '12px',
              fontFamily: 'Azeret Mono, monospace',
              fontWeight: 400,
              letterSpacing: '0.5px',
              color: '#666666'
            }}>
              {sessionDate && <span>{sessionDate}</span>}
              {sessionDate && sessionDuration && <span style={{ margin: '0 8px' }}>•</span>}
              {sessionDuration && <span>{sessionDuration}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              border: '1px solid #666666',
              borderRadius: '0',
              backgroundColor: '#FFFFFF',
              color: '#666666',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#666666';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.color = '#666666';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18"/>
              <path d="M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Image with Progressive Annotation Overlay */}
        <div style={{ marginBottom: '24px' }}>
          <div 
            ref={containerRef}
            style={{ 
              position: 'relative', 
              backgroundColor: '#F8F8F8', 
              borderRadius: '0',
              border: '1px solid #666666',
              overflow: 'hidden' 
            }}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt={sessionName}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '384px',
                objectFit: 'contain'
              }}
            />
            {/* Progressive annotation canvas overlay */}
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
              }}
            />
          </div>
        </div>

        {/* Eye Visualization */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            backgroundColor: '#F8F8F8', 
            borderRadius: '0',
            border: '1px solid #666666',
            padding: '24px', 
            display: 'flex', 
            justifyContent: 'center' 
          }}>
            <EyeVisualization
              annotations={currentAnnotations}
              isPlaying={isPlaying}
              progress={progress}
              playbackSpeed={playbackSpeed}
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            width: '100%', 
            backgroundColor: '#CCCCCC', 
            borderRadius: '0',
            height: '4px',
            border: '1px solid #666666'
          }}>
            <div
              style={{ 
                backgroundColor: '#333333', 
                height: '100%', 
                borderRadius: '0',
                transition: 'all 0.1s ease',
                width: `${progress}%`
              }}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="mb-6">
          <Legend />
        </div>

        {/* Animation Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
          <button
            onClick={restart}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              border: '1px solid #666666',
              borderRadius: '0',
              backgroundColor: '#FFFFFF',
              color: '#333333',
              fontFamily: 'Azeret Mono, monospace',
              fontSize: '14px',
              fontWeight: 400,
              letterSpacing: '0.5px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#666666';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.color = '#333333';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M3 21v-5h5"/>
            </svg>
            Replay
          </button>

          <button
            onClick={togglePlay}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            )}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            onClick={changeSpeed}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13,19 22,12 13,5"/>
              <polygon points="2,19 11,12 2,5"/>
            </svg>
            {playbackSpeed}x
          </button>
        </div>

        {/* Download Button */}
        <div className="flex justify-center">
          <button className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionReplay; 
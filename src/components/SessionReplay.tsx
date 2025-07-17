import React, { useState, useEffect, useRef } from 'react';
import { Annotation, Group } from '../types/annotations';
import EyeVisualization from './EyeVisualization';
import Legend from './Legend';

interface SessionReplayProps {
  annotations: Annotation[];
  groups: Group[];
  imageUrl: string;
  sessionName: string;
  sessionDate?: string;
  sessionDuration?: string;
  onClose?: () => void;
}

const SessionReplay: React.FC<SessionReplayProps> = ({
  annotations,
  groups,
  imageUrl,
  sessionName,
  sessionDate,
  sessionDuration,
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

  // Calculate total duration from annotations
  const totalDuration = annotations.length > 0 
    ? Math.max(...annotations.map(a => a.timestamp)) - Math.min(...annotations.map(a => a.timestamp))
    : 0;

  // Filter annotations up to current time
  const currentAnnotations = annotations.filter(annotation => {
    const annotationTime = annotation.timestamp - (annotations[0]?.timestamp || 0);
    return annotationTime <= currentTime;
  });

  // Log annotation summary for debugging
  useEffect(() => {
    if (annotations.length > 0) {
      console.log(`Session Replay loaded: ${annotations.length} annotations`);
    }
  }, [annotations]);

  // Progressive annotation drawing
  const drawProgressiveAnnotations = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const image = imageRef.current;
    
    if (!canvas || !ctx || !image || !image.complete) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get scaling factors between original annotation coordinates and current display
    const imageRect = image.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    
    if (!containerRect) return;
    
    // Calculate the actual displayed image size (accounting for object-fit: contain)
    const imageAspectRatio = image.naturalWidth / image.naturalHeight;
    const containerAspectRatio = containerRect.width / containerRect.height;
    
    let displayedImageWidth, displayedImageHeight;
    if (imageAspectRatio > containerAspectRatio) {
      // Image is wider - fit to width
      displayedImageWidth = containerRect.width;
      displayedImageHeight = containerRect.width / imageAspectRatio;
    } else {
      // Image is taller - fit to height  
      displayedImageHeight = Math.min(containerRect.height, 384); // maxHeight from CSS
      displayedImageWidth = displayedImageHeight * imageAspectRatio;
    }
    
    // Scale factor from original canvas to current display
    const scaleX = displayedImageWidth / image.naturalWidth;
    const scaleY = displayedImageHeight / image.naturalHeight;
    
    // Convert annotation coordinates to current canvas coordinates
    const convertPoint = (point: any) => ({
      x: point.x * scaleX,
      y: point.y * scaleY
    });
    
    // Draw each annotation progressively
    currentAnnotations.forEach((annotation) => {
      const annotationStartTime = annotation.timestamp - (annotations[0]?.timestamp || 0);
      const timeSinceStart = currentTime - annotationStartTime;

      ctx.strokeStyle = annotation.color || '#2CA800';
      ctx.fillStyle = annotation.color || '#2CA800';
      ctx.lineWidth = 2;

      switch (annotation.type) {
        case 'point':
          if (annotation.points[0]) {
            const point = convertPoint(annotation.points[0]);
            ctx.beginPath();
            ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
            ctx.fill();
          }
          break;

        case 'line':
          if (annotation.points.length >= 2) {
            const startPoint = convertPoint(annotation.points[0]);
            const endPoint = convertPoint(annotation.points[1]);
            
            // Animate line drawing based on time since annotation started
            const animationDuration = 1000; // 1 second to draw line
            const animationProgress = Math.min(timeSinceStart / animationDuration, 1);
            
            const currentEndX = startPoint.x + (endPoint.x - startPoint.x) * animationProgress;
            const currentEndY = startPoint.y + (endPoint.y - startPoint.y) * animationProgress;
            
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.lineTo(currentEndX, currentEndY);
            ctx.stroke();
          }
          break;

        case 'freehand':
          if (annotation.points.length > 1) {
            const animationDuration = 2000; // 2 seconds to draw freehand
            const animationProgress = Math.min(timeSinceStart / animationDuration, 1);
            const pointsToShow = Math.floor(annotation.points.length * animationProgress);
            
            if (pointsToShow > 0) {
              ctx.beginPath();
              const firstPoint = convertPoint(annotation.points[0]);
              ctx.moveTo(firstPoint.x, firstPoint.y);
              
              for (let i = 1; i < pointsToShow; i++) {
                const point = convertPoint(annotation.points[i]);
                ctx.lineTo(point.x, point.y);
              }
              
              // If we're partway through the last segment, draw partial line
              if (pointsToShow < annotation.points.length) {
                const lastCompletePoint = convertPoint(annotation.points[pointsToShow - 1]);
                const nextPoint = convertPoint(annotation.points[pointsToShow]);
                const segmentProgress = (annotation.points.length * animationProgress) - pointsToShow;
                
                const partialEndX = lastCompletePoint.x + (nextPoint.x - lastCompletePoint.x) * segmentProgress;
                const partialEndY = lastCompletePoint.y + (nextPoint.y - lastCompletePoint.y) * segmentProgress;
                
                ctx.lineTo(partialEndX, partialEndY);
              }
              
              ctx.stroke();
            }
          }
          break;

        case 'frame':
        case 'area':
          if (annotation.points.length >= 3) {
            // Modern polygon format - animate point by point
            const animationDuration = 1500; // 1.5 seconds to draw frame/area
            const animationProgress = Math.min(timeSinceStart / animationDuration, 1);
            const pointsToShow = Math.floor(annotation.points.length * animationProgress);
            
            if (pointsToShow > 0) {
              ctx.beginPath();
              const firstPoint = convertPoint(annotation.points[0]);
              ctx.moveTo(firstPoint.x, firstPoint.y);
              
              for (let i = 1; i < pointsToShow; i++) {
                const point = convertPoint(annotation.points[i]);
                ctx.lineTo(point.x, point.y);
              }
              
              // Close the path if animation is complete
              if (animationProgress >= 1) {
                ctx.closePath();
              }
              
              ctx.stroke();
              
              // Fill if area and animation is complete
              if (annotation.type === 'area' && animationProgress >= 1) {
                ctx.globalAlpha = 0.2;
                ctx.fill();
                ctx.globalAlpha = 1;
              }
            }
          } else if (annotation.points.length === 2) {
            // Legacy rectangle format - animate rectangle drawing
            const animationDuration = 1500; // 1.5 seconds to draw rectangle
            const animationProgress = Math.min(timeSinceStart / animationDuration, 1);
            
            if (animationProgress > 0) {
              const startPoint = convertPoint(annotation.points[0]);
              const endPoint = convertPoint(annotation.points[1]);
              console.log('Rectangle points converted:', annotation.points, '->', { startPoint, endPoint });
              
              const fullWidth = endPoint.x - startPoint.x;
              const fullHeight = endPoint.y - startPoint.y;
              
              // Animate rectangle drawing progressively
              let currentWidth = fullWidth * animationProgress;
              let currentHeight = fullHeight * animationProgress;
              
              ctx.beginPath();
              ctx.strokeRect(startPoint.x, startPoint.y, currentWidth, currentHeight);
              
              // Fill if area and animation is complete
              if (annotation.type === 'area' && animationProgress >= 1) {
                ctx.globalAlpha = 0.2;
                ctx.fillRect(startPoint.x, startPoint.y, fullWidth, fullHeight);
                ctx.globalAlpha = 1;
              }
            }
          }
          break;

        default:
          // For any other annotation types, just show as point
          if (annotation.points[0]) {
            const point = convertPoint(annotation.points[0]);
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
      }
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
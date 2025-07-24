import React, { useState, useEffect, useRef } from 'react';
import { Annotation, Group } from '../types/annotations';
import { Button } from './ui/button';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import EyeVisualization from './EyeVisualization';
import Legend from './Legend';
import AdditionalContextFolder, { AdditionalContextItem } from './AdditionalContextFolder';
import { createCoordinateTransform } from '../lib/utils';

interface AmbienceSurveyProps {
  annotations: Annotation[];
  groups: Group[];
  sessionName: string;
  imageUrl: string;
  audioUrl?: string;
  audioBlob?: Blob;
  onSubmit: (data: any) => void;
  onClose: () => void;
  onViewReplay?: () => void;
}

const AmbienceSurvey: React.FC<AmbienceSurveyProps> = ({ 
  annotations, 
  groups, 
  sessionName, 
  imageUrl, 
  audioUrl, 
  audioBlob,
  onSubmit, 
  onClose,
  onViewReplay
}) => {
  // Debug audio URL on component mount
  useEffect(() => {
    if (audioUrl || audioBlob) {
      console.log('[AmbienceSurvey] Audio source available:', {
        hasAudioUrl: !!audioUrl,
        hasAudioBlob: !!audioBlob
      });
    }
  }, [audioUrl, audioBlob, sessionName, annotations]);

  // Create local audio URL from blob if needed
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (audioBlob && !audioUrl) {
      const url = URL.createObjectURL(audioBlob);
      setLocalAudioUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (audioUrl) {
      setLocalAudioUrl(audioUrl);
    }
  }, [audioUrl, audioBlob]);

  // Use the effective audio URL (either provided URL or created from blob)
  const effectiveAudioUrl = localAudioUrl;

  // Form state
  const [formData, setFormData] = useState({
    nickname: '',
    location: '',
    weather: '',
    mood: '',
    feelings: ''
  });

  // Audio control
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Animation state
  const [animationProgress, setAnimationProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Audio sync state
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [isSeekingAudio, setIsSeekingAudio] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Debug logging useEffect
  useEffect(() => {
    if (annotations && annotations.length > 0) {
      console.log('=== AMBIENCE SURVEY COORDINATE DEBUG ===');
      console.log('Annotations count:', annotations.length);
      console.log('First annotation:', annotations[0]);
      console.log('First annotation points sample:', annotations[0].points?.slice(0, 5));
      if (annotations[0].points && annotations[0].points.length > 0) {
        console.log('First point coordinates:', annotations[0].points[0]);
        console.log('Last point coordinates:', annotations[0].points[annotations[0].points.length - 1]);
        
        // Analyze coordinate ranges to understand recording space
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        annotations.forEach(annotation => {
          annotation.points.forEach(point => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
          });
        });
        console.log('Coordinate ranges:', { minX, maxX, minY, maxY });
        console.log('Estimated recording canvas size:', { width: maxX - minX + 100, height: maxY - minY + 100 });
      }
      console.log('==========================================');
    }
  }, [annotations]);
  
  // Audio setup and loading
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !effectiveAudioUrl) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setAudioLoaded(true);
    };

    const handleTimeUpdate = () => {
      if (!isSeekingAudio) {
        setCurrentTime(audio.currentTime);
        // Sync animation progress with audio progress
        const progressPercent = (audio.currentTime / audio.duration) * 100;
        setAnimationProgress(progressPercent);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setAnimationProgress(0);
    };

    const handleCanPlay = () => {
      // Audio is ready to play
    };

    const handleError = (e: any) => {
      console.error('[AmbienceSurvey] Audio error:', e);
    };

    // Set up audio element
    audio.src = effectiveAudioUrl;
    audio.preload = 'metadata';
    
    // Add event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      // Cleanup event listeners
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [effectiveAudioUrl, isSeekingAudio]);

  // Additional context state
  const [contextItems, setContextItems] = useState<AdditionalContextItem[]>([]);

  // Auto-start animation on mount - but only if no audio is available
  useEffect(() => {
    if (!effectiveAudioUrl) {
      // Only auto-start animation if there's no audio
      // When audio is available, user should manually start playback
      setIsPlaying(true);
      setAnimationProgress(0);
    } else {
      // When audio is available, start in paused state so user can choose to play
      setIsPlaying(false);
      setAnimationProgress(0);
    }
  }, [effectiveAudioUrl]);

  // Animation loop - now synchronized with audio
  useEffect(() => {
    if (isPlaying && !effectiveAudioUrl) {
      // Fallback animation for when there's no audio
      intervalRef.current = setInterval(() => {
        setAnimationProgress(prev => {
          const increment = 1; // 1% per 100ms  
          const newProgress = Math.min(prev + increment, 100);
          
          if (newProgress >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return newProgress;
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
  }, [isPlaying, effectiveAudioUrl]);

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle additional context
  const handleAddContextItem = (item: AdditionalContextItem) => {
    setContextItems(prev => [...prev, item]);
  };

  const handleRemoveContextItem = (id: string) => {
    setContextItems(prev => prev.filter(item => item.id !== id));
  };

  // Handle animation controls
  const handlePlayPause = () => {
    const audio = audioRef.current;
    
    if (!isPlaying) {
      // Starting playback
      setIsPlaying(true);
      
      if (audio && effectiveAudioUrl && audioLoaded) {
        // Play audio
        audio.play().catch(error => {
          console.error('[AmbienceSurvey] Audio play failed:', error);
        });
      }
    } else {
      // Pausing playback
      setIsPlaying(false);
      
      if (audio && effectiveAudioUrl) {
        // Pause audio
        audio.pause();
      }
    }
  };

  const handleRestart = () => {
    const audio = audioRef.current;
    
    setAnimationProgress(0);
    setCurrentTime(0);
    setIsPlaying(false);
    
    if (audio && effectiveAudioUrl) {
      audio.currentTime = 0;
      audio.pause();
    }
  };

  const handleProgressSeek = (progressPercent: number) => {
    const audio = audioRef.current;
    
    setAnimationProgress(progressPercent);
    
    if (audio && effectiveAudioUrl && audioLoaded) {
      setIsSeekingAudio(true);
      const newTime = (progressPercent / 100) * duration;
      audio.currentTime = newTime;
      setCurrentTime(newTime);
      
      // Resume sync after a short delay
      setTimeout(() => {
        setIsSeekingAudio(false);
      }, 100);
    }
  };

  const handleSpeedToggle = () => {
    // For audio playback, we can implement playback rate control
    const audio = audioRef.current;
    if (audio && effectiveAudioUrl) {
      const currentRate = audio.playbackRate;
      const newRate = currentRate >= 2 ? 1 : currentRate + 0.5;
      audio.playbackRate = newRate;
      setPlaybackRate(newRate);
    } else {
      // Fallback for when there's no audio - just cycle through visual rates
      const newRate = playbackRate >= 2 ? 1 : playbackRate + 0.5;
      setPlaybackRate(newRate);
    }
  };

  // Progressive annotation rendering
  const renderProgressiveAnnotations = () => {
    console.log('🚀 renderProgressiveAnnotations called with:', {
      annotationsCount: annotations?.length || 0,
      animationProgress: animationProgress
    });
    
    if (!annotations || annotations.length === 0) {
      console.log('❌ No annotations available');
      return null;
    }

    // Get the image element to determine its natural dimensions and current size
    const imageElement = document.querySelector('img[alt="Session"]') as HTMLImageElement;
    console.log('🔍 Image element check:', {
      found: !!imageElement,
      complete: imageElement?.complete,
      src: imageElement?.src,
      naturalWidth: imageElement?.naturalWidth,
      naturalHeight: imageElement?.naturalHeight
    });
    
    if (!imageElement || !imageElement.complete) {
      console.log('❌ Image element not ready - returning null');
      return null;
    }

    // Get the actual rendered image dimensions and position
    const imageRect = imageElement.getBoundingClientRect();
    const containerRect = imageElement.parentElement?.getBoundingClientRect();
    
    console.log('🔍 Container check:', {
      containerFound: !!containerRect,
      imageRect: imageRect,
      containerRect: containerRect
    });
    
    if (!containerRect) {
      console.log('❌ Container element not found - returning null');
      return null;
    }

    // Calculate how the image is positioned within its container (object-fit: contain)
    const imageAspectRatio = imageElement.naturalWidth / imageElement.naturalHeight;
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
    const recordingImageOffsetX = 0; // TODO: Verify this - might need adjustment for rightward shift
    const recordingImageOffsetY = 128.43; // The image was offset during recording
    
    // Calculate what the recording image dimensions should have been
    const imageNaturalAspectRatio = imageElement.naturalWidth / imageElement.naturalHeight; // 1154/765 ≈ 1.509
    const expectedRecordingImageWidth = recordingCanvasWidth; // Assuming width-constrained
    const expectedRecordingImageHeight = recordingCanvasWidth / imageNaturalAspectRatio; // Should be ≈ 1094.8
    
    console.log('�� Recording analysis:', {
      imageNaturalSize: { width: imageElement.naturalWidth, height: imageElement.naturalHeight },
      imageAspectRatio: imageNaturalAspectRatio.toFixed(3),
      recordingCanvas: { width: recordingCanvasWidth, height: recordingCanvasHeight },
      expectedRecordingImageSize: { width: expectedRecordingImageWidth, height: expectedRecordingImageHeight.toFixed(2) },
      recordingImageOffset: { x: recordingImageOffsetX, y: recordingImageOffsetY },
      potentialHorizontalCentering: (recordingCanvasWidth - expectedRecordingImageWidth) / 2
    });
    
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
    console.log('🎯 AmbienceSurvey Coordinate Transformation:', {
      container: { width: containerRect.width, height: containerRect.height },
      renderedImage: { width: renderedImageWidth, height: renderedImageHeight },
      imageOffset: { x: imageOffsetX, y: imageOffsetY },
      recordingCanvas: { width: recordingCanvasWidth, height: recordingCanvasHeight },
      scales: { 
        scaleX: (renderedImageWidth / recordingCanvasWidth).toFixed(4), 
        scaleY: (renderedImageHeight / recordingCanvasHeight).toFixed(4) 
      }
    });

    // DEBUG: Test transformation with first annotation's first few points
    if (annotations.length > 0 && annotations[0].points.length > 0) {
      console.log('🔍 Detailed coordinate transformation:');
      console.log('Recording setup:', { 
        canvasSize: { width: recordingCanvasWidth, height: recordingCanvasHeight },
        imageOffset: { x: recordingImageOffsetX, y: recordingImageOffsetY }
      });
      console.log('Current setup:', {
        container: { width: containerRect.width, height: containerRect.height },
        renderedImage: { width: renderedImageWidth, height: renderedImageHeight },
        imageOffset: { x: imageOffsetX, y: imageOffsetY }
      });
      
      annotations[0].points.slice(0, 3).forEach((point, i) => {
        // Manual step-by-step transformation for debugging
        const recordingImageX = point.x - recordingImageOffsetX;
        const recordingImageY = point.y - recordingImageOffsetY;
        const scaleX = renderedImageWidth / recordingCanvasWidth;
        const scaleY = renderedImageHeight / recordingCanvasHeight;
        const finalX = (recordingImageX * scaleX) + imageOffsetX;
        const finalY = (recordingImageY * scaleY) + imageOffsetY;
        
        console.log(`🎯 Point ${i} transformation:`, {
          original: point,
          step1_removeRecordingOffset: { x: recordingImageX, y: recordingImageY },
          step2_scales: { scaleX: scaleX.toFixed(4), scaleY: scaleY.toFixed(4) },
          step3_scaled: { x: (recordingImageX * scaleX).toFixed(2), y: (recordingImageY * scaleY).toFixed(2) },
          step4_final: { x: finalX.toFixed(2), y: finalY.toFixed(2) },
          withinBounds: {
            x: finalX >= imageOffsetX && finalX <= imageOffsetX + renderedImageWidth,
            y: finalY >= imageOffsetY && finalY <= imageOffsetY + renderedImageHeight
          },
          expectedPosition: `Should be at (${finalX.toFixed(0)}, ${finalY.toFixed(0)}) within image bounds (${imageOffsetX.toFixed(0)}, ${imageOffsetY.toFixed(0)}) to (${(imageOffsetX + renderedImageWidth).toFixed(0)}, ${(imageOffsetY + renderedImageHeight).toFixed(0)})`
        });
      });
      
      // 🧪 COORDINATE TEST: Add a test point to validate transformation
      console.log('🧪 COORDINATE VALIDATION TEST:');
      const testRecordingPoint = { x: 826, y: 654 }; // Middle of recording image (1652/2, 1095/2 - offset)
      const testTransformed = convertPoint(testRecordingPoint);
      console.log(`Test point: Recording(${testRecordingPoint.x}, ${testRecordingPoint.y}) → Survey(${testTransformed.x.toFixed(1)}, ${testTransformed.y.toFixed(1)})`);
      console.log(`Should appear at center of survey image: (${(imageOffsetX + renderedImageWidth/2).toFixed(1)}, ${(imageOffsetY + renderedImageHeight/2).toFixed(1)})`);
    }

    // Simple approach: show annotations based on progress
    const totalAnnotations = annotations.length;
    const annotationsToShow = Math.floor((animationProgress / 100) * totalAnnotations);

    // Create test markers for coordinate validation
    const debugElements = [];
    if (annotations.length > 0) {
      // Add a test circle at the center of the recording image
      const testCenter = convertPoint({ x: 826, y: 654 }); // Center of recording space
      debugElements.push(
        <circle
          key="debug-center"
          cx={testCenter.x}
          cy={testCenter.y}
          r="5"
          fill="red"
          opacity="0.8"
        />
      );
      
      // Add a test circle for the first annotation's first point
      if (annotations[0].points && annotations[0].points.length > 0) {
        const firstPoint = convertPoint(annotations[0].points[0]);
        debugElements.push(
          <circle
            key="debug-first-point"
            cx={firstPoint.x}
            cy={firstPoint.y}
            r="3"
            fill="blue"
            opacity="0.8"
          />
        );
      }
    }

    return [
      ...debugElements,
      ...annotations.slice(0, annotationsToShow + 1).map((annotation, index) => {
        if (annotation.type === 'freehand' && annotation.points && annotation.points.length > 1) {
          const pathData = annotation.points.map((point, i) => {
            const convertedPoint = convertPoint(point);
            return i === 0 ? `M ${convertedPoint.x} ${convertedPoint.y}` : `L ${convertedPoint.x} ${convertedPoint.y}`;
          }).join(' ');
        
        return (
          <path
            key={annotation.id}
            d={pathData}
            stroke={annotation.color || '#2CA800'}
            strokeWidth="2"
            fill="none"
            opacity={0.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      } else if (annotation.type === 'line' && annotation.points && annotation.points.length >= 2) {
        const startPoint = convertPoint(annotation.points[0]);
        const endPoint = convertPoint(annotation.points[1]);
        
        return (
          <line
            key={annotation.id}
            x1={startPoint.x}
            y1={startPoint.y}
            x2={endPoint.x}
            y2={endPoint.y}
            stroke={annotation.color || '#2CA800'}
            strokeWidth="2"
            opacity={0.8}
            strokeLinecap="round"
          />
        );
             } else if (annotation.type === 'point' && annotation.points && annotation.points.length > 0) {
         const point = convertPoint(annotation.points[0]);
         
         return (
           <circle
             key={annotation.id}
             cx={point.x}
             cy={point.y}
             r="4"
             fill={annotation.color || '#2CA800'}
             opacity={0.8}
           />
         );
       } else if ((annotation.type === 'frame' || annotation.type === 'area') && annotation.points && annotation.points.length > 0) {
         if (annotation.points.length >= 3) {
           // Modern polygon format - show progressively based on animation progress
                       const pointsToShow = Math.max(1, Math.floor(annotation.points.length * Math.min((animationProgress + 10) / 100, 1)));
           
           const pathData = annotation.points.slice(0, pointsToShow).map((point, i) => {
             const convertedPoint = convertPoint(point);
             return i === 0 ? `M ${convertedPoint.x} ${convertedPoint.y}` : `L ${convertedPoint.x} ${convertedPoint.y}`;
           }).join(' ');
           
           // Close path if we've shown all points
           const finalPath = pointsToShow >= annotation.points.length ? pathData + ' Z' : pathData;
           
           return (
             <g key={annotation.id}>
               <path
                 d={finalPath}
                 stroke={annotation.color || '#2CA800'}
                 strokeWidth="2"
                 fill={annotation.type === 'area' && pointsToShow >= annotation.points.length ? annotation.color || '#2CA800' : 'none'}
                 fillOpacity={annotation.type === 'area' && pointsToShow >= annotation.points.length ? 0.2 : 0}
                 opacity={0.8}
                 strokeLinecap="round"
                 strokeLinejoin="round"
               />
             </g>
           );
         } else if (annotation.points.length === 2) {
           // Legacy rectangle format
           const startPoint = convertPoint(annotation.points[0]);
           const endPoint = convertPoint(annotation.points[1]);
           
           const width = endPoint.x - startPoint.x;
           const height = endPoint.y - startPoint.y;
           
           return (
             <g key={annotation.id}>
               <rect
                 x={startPoint.x}
                 y={startPoint.y}
                 width={width}
                 height={height}
                 stroke={annotation.color || '#2CA800'}
                 strokeWidth="2"
                 fill={annotation.type === 'area' ? annotation.color || '#2CA800' : 'none'}
                 fillOpacity={annotation.type === 'area' ? 0.2 : 0}
                 opacity={0.8}
               />
             </g>
           );
         }
       }
       
       return null;
      }).filter(Boolean)
    ];
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submissionData = {
      ...formData,
      additionalContext: contextItems,
      sessionMetadata: {
        sessionName,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        duration: '4 mins'
      }
    };
    
    onSubmit(submissionData);
  };

  // Get current session metadata
  const getCurrentDate = () => {
    const now = new Date();
    return `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()}`;
  };

  const getCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div style={{
        backgroundColor: '#FBFAF8',
        border: '1px solid #666666',
        borderRadius: '0',
        maxWidth: '1200px',
        width: '95%',
        maxHeight: '95vh',
        overflowY: 'auto',
        fontFamily: 'Azeret Mono, monospace',
        display: 'flex',
        gap: '24px'
      }}>
        {/* Left Panel - Session Replay */}
        <div style={{ 
          flex: '1 1 50%', 
          padding: '24px',
          minWidth: '400px'
        }}>
          {/* Session Replay - embedded directly without modal wrapper */}
          <div style={{
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '0',
            padding: '16px',
            fontFamily: 'Azeret Mono, monospace'
          }}>
            {/* Replay Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '16px',
              borderBottom: '1px solid #CCCCCC',
              paddingBottom: '12px'
            }}>
              <div style={{
                fontSize: '14px',
                fontFamily: 'Azeret Mono, monospace',
                fontWeight: 500,
                letterSpacing: '0.5px',
                color: '#333333'
              }}>
                Session Playback
              </div>
              <div style={{
                fontSize: '11px',
                fontFamily: 'Azeret Mono, monospace',
                fontWeight: 400,
                letterSpacing: '0.5px',
                color: '#666666'
              }}>
                {getCurrentDate()} • 4 mins
              </div>
            </div>

                         {/* Inline Session Animation */}
             <div style={{ position: 'relative' }}>
               {/* Image with annotation overlay */}
               <div style={{ position: 'relative', width: '500px', height: '375px', margin: '0 auto' }}>
                 <img
                   src={imageUrl}
                   alt="Session"
                   style={{
                     width: '100%',
                     height: '100%',
                     objectFit: 'cover',
                     border: '1px solid #CCCCCC'
                   }}
                 />
                 {/* Traces overlay */}
                 <div style={{
                   position: 'absolute',
                   top: 0,
                   left: 0,
                   right: 0,
                   bottom: 0,
                   pointerEvents: 'none'
                 }}>
                   <svg
                     width="100%"
                     height="100%"
                     style={{ 
                       position: 'absolute', 
                       top: 0, 
                       left: 0 
                     }}
                   >
                     {renderProgressiveAnnotations()}
                   </svg>
                 </div>
               </div>

               {/* Animation controls */}
               <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', marginTop: '12px' }}>
                 <button
                   onClick={handlePlayPause}
                   style={{
                     display: 'flex',
                     alignItems: 'center',
                     gap: '4px',
                     padding: '6px 12px',
                     border: '1px solid #666666',
                     borderRadius: '0',
                     backgroundColor: '#FFFFFF',
                     color: '#333333',
                     cursor: 'pointer',
                     fontSize: '11px'
                   }}
                 >
                   {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                   {isPlaying ? 'Pause' : 'Play'}
                 </button>
                 <button
                   onClick={handleRestart}
                   style={{
                     display: 'flex',
                     alignItems: 'center',
                     gap: '4px',
                     padding: '6px 12px',
                     border: '1px solid #666666',
                     borderRadius: '0',
                     backgroundColor: '#FFFFFF',
                     color: '#333333',
                     cursor: 'pointer',
                     fontSize: '11px'
                   }}
                 >
                   <RotateCcw size={14} />
                   Restart
                 </button>
                 <button
                   onClick={handleSpeedToggle}
                   style={{
                     display: 'flex',
                     alignItems: 'center',
                     gap: '4px',
                     padding: '6px 12px',
                     border: '1px solid #666666',
                     borderRadius: '0',
                     backgroundColor: '#FFFFFF',
                     color: '#333333',
                     cursor: 'pointer',
                     fontSize: '11px'
                   }}
                 >
                   <FastForward size={14} />
                   {playbackRate}x
                 </button>
                 <div style={{ fontSize: '11px', marginLeft: '8px', color: '#666' }}>
                   {Math.round(animationProgress)}%
                 </div>
               </div>

               {/* Progress Bar for Audio/Animation Sync */}
               {effectiveAudioUrl && (
                 <div style={{ marginTop: '16px' }}>
                   <div style={{ 
                     display: 'flex', 
                     justifyContent: 'space-between', 
                     fontSize: '10px', 
                     color: '#666',
                     marginBottom: '4px'
                   }}>
                     <span>{Math.floor(currentTime / 60)}:{(Math.floor(currentTime) % 60).toString().padStart(2, '0')}</span>
                     <span>{Math.floor(duration / 60)}:{(Math.floor(duration) % 60).toString().padStart(2, '0')}</span>
                   </div>
                   <div 
                     style={{ 
                       width: '100%', 
                       height: '6px', 
                       backgroundColor: '#CCCCCC', 
                       border: '1px solid #999',
                       cursor: 'pointer',
                       position: 'relative'
                     }}
                     onClick={(e) => {
                       const rect = e.currentTarget.getBoundingClientRect();
                       const clickX = e.clientX - rect.left;
                       const progressPercent = (clickX / rect.width) * 100;
                       handleProgressSeek(Math.max(0, Math.min(100, progressPercent)));
                     }}
                   >
                     <div
                       style={{ 
                         backgroundColor: '#333333', 
                         height: '100%', 
                         transition: isSeekingAudio ? 'none' : 'width 0.1s ease',
                         width: `${animationProgress}%`
                       }}
                     />
                   </div>
                 </div>
               )}

               {/* Hidden Audio Element */}
               {effectiveAudioUrl && (
                 <audio
                   ref={audioRef}
                   style={{ display: 'none' }}
                   preload="metadata"
                 />
               )}
             </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div style={{ 
          flex: '1 1 50%', 
          padding: '24px',
          minWidth: '400px'
        }}>
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '24px',
            borderBottom: '1px solid #CCCCCC',
            paddingBottom: '12px'
          }}>
            <div>
              <h1 style={{
                fontSize: '16px',
                fontFamily: 'Azeret Mono, monospace',
                fontWeight: 600,
                letterSpacing: '0.5px',
                color: '#333333',
                margin: '0 0 4px 0'
              }}>
                {sessionName}
              </h1>
              <div style={{
                fontSize: '11px',
                fontFamily: 'Azeret Mono, monospace',
                fontWeight: 400,
                letterSpacing: '0.5px',
                color: '#666666'
              }}>
                {getCurrentDate()} • {getCurrentTime()}
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

          <div style={{ flex: 1, padding: '0', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                Session Reflection
              </h2>
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 500 }}>
                    Your nickname
                  </label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => handleInputChange('nickname', e.target.value)}
                    style={{
                      width: '100%',
                      maxWidth: '300px',
                      padding: '8px 12px',
                      border: '1px solid #CCCCCC',
                      borderRadius: '0',
                      fontSize: '12px',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 500 }}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    style={{
                      width: '100%',
                      maxWidth: '300px',
                      padding: '8px 12px',
                      border: '1px solid #CCCCCC',
                      borderRadius: '0',
                      fontSize: '12px',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 500 }}>
                    What is the weather like now?
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                      { value: 'sunny', icon: '☀️' },
                      { value: 'cloudy', icon: '☁️' },
                      { value: 'rainy', icon: '🌧️' },
                      { value: 'snowy', icon: '❄️' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleInputChange('weather', option.value)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: '1px solid #CCCCCC',
                          borderRadius: '0',
                          backgroundColor: formData.weather === option.value ? '#333333' : '#FFFFFF',
                          color: formData.weather === option.value ? '#FFFFFF' : '#333333',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        {option.icon}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 500 }}>
                    How are you feeling?
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                      { value: 'happy', icon: '😊' },
                      { value: 'calm', icon: '😌' },
                      { value: 'excited', icon: '😄' },
                      { value: 'thoughtful', icon: '🤔' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleInputChange('mood', option.value)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: '1px solid #CCCCCC',
                          borderRadius: '0',
                          backgroundColor: formData.mood === option.value ? '#333333' : '#FFFFFF',
                          color: formData.mood === option.value ? '#FFFFFF' : '#333333',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        {option.icon}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px', fontWeight: 500 }}>
                    Share more about how you feel (optional)
                  </label>
                  <textarea
                    value={formData.feelings}
                    onChange={(e) => handleInputChange('feelings', e.target.value)}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #CCCCCC',
                      borderRadius: '0',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                    placeholder="Tell us about your experience..."
                  />
                </div>

                                 {/* Additional Context Section */}
                 <div>
                   <AdditionalContextFolder
                     items={contextItems}
                     onAddItem={handleAddContextItem}
                     onRemoveItem={handleRemoveContextItem}
                   />
                 </div>
                
                <button
                  type="submit"
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    padding: '12px 24px',
                    backgroundColor: '#323232',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '0',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                    gap: '8px'
                  }}
                >
                  <svg width="15" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2l-7 20-4-9-9-4z" fill="#FFFFFF"/>
                    <path d="M22 2l-10 10" stroke="#FFFFFF" strokeWidth="2"/>
                  </svg>
                  Submit Reflection
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmbienceSurvey; 
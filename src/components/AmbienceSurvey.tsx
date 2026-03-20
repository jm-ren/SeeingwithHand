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
  sessionStartTime?: number;
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
  sessionStartTime,
  onSubmit, 
  onClose,
  onViewReplay
}) => {
  // Sort annotations once by timestamp so replay always reflects drawing order
  const sortedAnnotations = React.useMemo(
    () => [...annotations].sort((a, b) => a.timestamp - b.timestamp),
    [annotations]
  );
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

  // Auto-start animation on mount - but only if no valid audio is available
  useEffect(() => {
    // Handle invalid audio duration (Infinity, NaN, 0) - fall back to animation progress
    const isValidAudioDuration = effectiveAudioUrl && duration > 0 && duration !== Infinity && !isNaN(duration);
    
    if (!effectiveAudioUrl || !isValidAudioDuration) {
      // Only auto-start animation if there's no valid audio
      console.log('[AmbienceSurvey] Auto-starting animation - no valid audio');
      setIsPlaying(true);
      setAnimationProgress(0);
    } else {
      // When valid audio is available, start in paused state so user can choose to play
      console.log('[AmbienceSurvey] Valid audio detected - starting paused');
      setIsPlaying(false);
      setAnimationProgress(0);
    }
  }, [effectiveAudioUrl, duration]);

  // Animation loop - now synchronized with audio
  useEffect(() => {
    if (isPlaying) {
      // Handle invalid audio duration (Infinity, NaN, 0) - fall back to animation progress
      const isValidAudioDuration = effectiveAudioUrl && duration > 0 && duration !== Infinity && !isNaN(duration);
      
      if (!effectiveAudioUrl || !isValidAudioDuration) {
        // No audio OR invalid audio duration - use fallback animation timing
        console.log('[AmbienceSurvey] Using fallback animation - no valid audio');
        intervalRef.current = setInterval(() => {
          setAnimationProgress(prev => {
            const increment = 0.8; // 0.8% per 100ms = ~8% per second  
            const newProgress = Math.min(prev + increment, 100);
            
            if (newProgress >= 100) {
              setIsPlaying(false);
              return 100;
            }
            return newProgress;
          });
        }, 100);
      } else {
        // Valid audio - set up fallback animation in case audio doesn't work
        // This ensures traces can still animate even if audio fails
        const fallbackTimer = setTimeout(() => {
          if (currentTime === 0 && isPlaying) {
            console.log('[AmbienceSurvey] Audio fallback: starting manual animation');
            intervalRef.current = setInterval(() => {
              setAnimationProgress(prev => {
                const increment = 0.5; // Slower than no-audio case
                const newProgress = Math.min(prev + increment, 100);
                
                if (newProgress >= 100) {
                  setIsPlaying(false);
                  return 100;
                }
                return newProgress;
              });
            }, 100);
          }
        }, 1000); // Wait 1 second for audio to start
        
        return () => {
          clearTimeout(fallbackTimer);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        };
      }
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
  }, [isPlaying, effectiveAudioUrl, duration, currentTime]);

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
    
    console.log('🎵 handlePlayPause called:', {
      isPlaying,
      hasAudio: !!audio,
      hasEffectiveAudioUrl: !!effectiveAudioUrl,
      audioLoaded,
      audioReadyState: audio?.readyState,
      audioDuration: audio?.duration
    });
    
    if (!isPlaying) {
      // Starting playback
      setIsPlaying(true);
      
      if (audio && effectiveAudioUrl && audioLoaded) {
        // Ensure audio is ready before playing
        if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or better
          audio.play().catch(error => {
            console.error('[AmbienceSurvey] Audio play failed:', error);
            // If audio fails, still allow trace animation
          });
        } else {
          console.log('[AmbienceSurvey] Audio not ready, waiting for canplay event');
          // Set up one-time event listener for when audio is ready
          const handleCanPlay = () => {
            audio.play().catch(error => {
              console.error('[AmbienceSurvey] Delayed audio play failed:', error);
            });
            audio.removeEventListener('canplay', handleCanPlay);
          };
          audio.addEventListener('canplay', handleCanPlay);
        }
      } else {
        console.log('[AmbienceSurvey] No audio to play, starting trace animation only');
      }
    } else {
      // Pausing playback
      setIsPlaying(false);
      
      if (audio && effectiveAudioUrl) {
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
    if (!sortedAnnotations || sortedAnnotations.length === 0) {
      return null;
    }

    const imageElement = document.querySelector('img[alt="Session"]') as HTMLImageElement;
    if (!imageElement || !imageElement.complete) {
      return null;
    }

    const containerRect = imageElement.parentElement?.getBoundingClientRect();
    if (!containerRect) {
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
    const recordingImageOffsetX = 0;
    const recordingImageOffsetY = 128.43; // The image was offset during recording
    
    // Convert a point from recording-space canvas coordinates to current SVG coordinates
    const convertPoint = (point: { x: number; y: number }) => {
      const recordingImageX = point.x - recordingImageOffsetX;
      const recordingImageY = point.y - recordingImageOffsetY;
      const scaleX = renderedImageWidth / recordingCanvasWidth;
      const scaleY = renderedImageHeight / recordingCanvasHeight;
      return {
        x: (recordingImageX * scaleX) + imageOffsetX,
        y: (recordingImageY * scaleY) + imageOffsetY
      };
    };

    // Determine the elapsed session time to use for filtering
    const effectiveStartTime = sessionStartTime ?? (sortedAnnotations[0]?.timestamp ?? 0);
    const lastTimestamp = sortedAnnotations[sortedAnnotations.length - 1]?.timestamp ?? effectiveStartTime;
    const totalSessionDurationMs = Math.max(lastTimestamp - effectiveStartTime, 1);

    const isValidAudioDuration = effectiveAudioUrl && duration > 0 && duration !== Infinity && !isNaN(duration);

    // When audio is playing, use audio currentTime directly (in ms) as elapsed time.
    // When no audio, derive elapsed time proportionally from animationProgress.
    const elapsedMs = isValidAudioDuration
      ? currentTime * 1000
      : (animationProgress / 100) * totalSessionDurationMs;

    // Show only strokes that had been drawn by the elapsed point in the session
    const visibleAnnotations = sortedAnnotations.filter(
      a => (a.timestamp - effectiveStartTime) <= elapsedMs
    );

    return [
      ...visibleAnnotations.map((annotation) => {
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
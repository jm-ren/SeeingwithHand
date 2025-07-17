import React, { useState, useEffect, useRef } from 'react';
import { Annotation, Group } from '../types/annotations';
import { Button } from './ui/button';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import EyeVisualization from './EyeVisualization';
import Legend from './Legend';
import AdditionalContextFolder, { AdditionalContextItem } from './AdditionalContextFolder';

interface AmbienceSurveyProps {
  annotations: Annotation[];
  groups: Group[];
  sessionName: string;
  imageUrl: string;
  audioUrl?: string;
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
  onSubmit, 
  onClose,
  onViewReplay
}) => {
  // Form state
  const [formData, setFormData] = useState({
    nickname: '',
    location: '',
    weather: '',
    mood: '',
    feelings: ''
  });

  // Animation state for inline replay
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout>();
  
  // Additional context state
  const [contextItems, setContextItems] = useState<AdditionalContextItem[]>([]);

  // Auto-start animation on mount
  useEffect(() => {
    setIsPlaying(true);
    setProgress(0);
  }, []);

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setProgress(prev => {
          const increment = 0.01 * playbackSpeed; // 1% per 100ms
          const newProgress = Math.min(prev + increment, 1);
          
          if (newProgress >= 1) {
            setIsPlaying(false);
            return 1;
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
  }, [isPlaying, playbackSpeed]);

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
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setProgress(0);
    setIsPlaying(true);
  };

  const handleSpeedToggle = () => {
    setPlaybackSpeed(prev => prev === 1 ? 2 : 1);
  };

  // Progressive annotation rendering
  const renderProgressiveAnnotations = () => {
    if (!annotations || annotations.length === 0) {
      return null;
    }

    // Calculate bounds of all annotations to determine original canvas size
    let maxX = 0, maxY = 0, minX = Infinity, minY = Infinity;
    annotations.forEach(annotation => {
      annotation.points.forEach(point => {
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
      });
    });
    
    // Estimate original canvas size with some padding
    const originalWidth = Math.max(maxX + 100, 1920);
    const originalHeight = Math.max(maxY + 100, 1080);
    
         // Display dimensions
     const displayWidth = 500;
     const displayHeight = 375;

    // Simple approach: show annotations based on progress
    const totalAnnotations = annotations.length;
    const annotationsToShow = Math.floor(progress * totalAnnotations);

    return annotations.slice(0, annotationsToShow + 1).map((annotation, index) => {
      if (annotation.type === 'freehand' && annotation.points && annotation.points.length > 1) {
        const pathData = annotation.points.map((point, i) => {
          const x = (point.x / originalWidth) * displayWidth;
          const y = (point.y / originalHeight) * displayHeight;
          return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
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
        const startPoint = annotation.points[0];
        const endPoint = annotation.points[1];
        
        const startX = (startPoint.x / originalWidth) * displayWidth;
        const startY = (startPoint.y / originalHeight) * displayHeight;
        const endX = (endPoint.x / originalWidth) * displayWidth;
        const endY = (endPoint.y / originalHeight) * displayHeight;
        
        return (
          <line
            key={annotation.id}
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke={annotation.color || '#2CA800'}
            strokeWidth="2"
            opacity={0.8}
            strokeLinecap="round"
          />
        );
             } else if (annotation.type === 'point' && annotation.points && annotation.points.length > 0) {
         const point = annotation.points[0];
         const x = (point.x / originalWidth) * displayWidth;
         const y = (point.y / originalHeight) * displayHeight;
         
         return (
           <circle
             key={annotation.id}
             cx={x}
             cy={y}
             r="4"
             fill={annotation.color || '#2CA800'}
             opacity={0.8}
           />
         );
       } else if ((annotation.type === 'frame' || annotation.type === 'area') && annotation.points && annotation.points.length > 0) {
         if (annotation.points.length >= 3) {
           // Modern polygon format - show progressively based on animation progress
           const pointsToShow = Math.max(1, Math.floor(annotation.points.length * Math.min(progress + 0.1, 1)));
           
           const pathData = annotation.points.slice(0, pointsToShow).map((point, i) => {
             const x = (point.x / originalWidth) * displayWidth;
             const y = (point.y / originalHeight) * displayHeight;
             return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
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
           const startPoint = annotation.points[0];
           const endPoint = annotation.points[1];
           
           const startX = (startPoint.x / originalWidth) * displayWidth;
           const startY = (startPoint.y / originalHeight) * displayHeight;
           const endX = (endPoint.x / originalWidth) * displayWidth;
           const endY = (endPoint.y / originalHeight) * displayHeight;
           
           const width = endX - startX;
           const height = endY - startY;
           
           return (
             <g key={annotation.id}>
               <rect
                 x={startX}
                 y={startY}
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
    }).filter(Boolean);
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
                   {playbackSpeed}x
                 </button>
                 <div style={{ fontSize: '11px', marginLeft: '8px', color: '#666' }}>
                   {Math.round(progress * 100)}%
                 </div>
               </div>

               {/* Eye Visualization - temporarily hidden */}
               {false && (
                 <div style={{ 
                   backgroundColor: '#F8F8F8', 
                   border: '1px solid #CCCCCC',
                   padding: '16px', 
                   display: 'flex', 
                   justifyContent: 'center',
                   marginTop: '12px'
                 }}>
                   <EyeVisualization
                     annotations={annotations}
                     isPlaying={isPlaying}
                     progress={progress * 100}
                     playbackSpeed={playbackSpeed}
                   />
                 </div>
               )}
             </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div style={{ 
          flex: '1 1 50%', 
          padding: '24px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #666666',
          borderRadius: '0',
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
                   <label style={{ fontSize: '12px', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                     Additional Context
                   </label>
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
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
}

const AmbienceSurvey: React.FC<AmbienceSurveyProps> = ({
  annotations,
  groups,
  sessionName,
  imageUrl,
  audioUrl,
  onSubmit,
  onClose
}) => {
  // Form state
  const [formData, setFormData] = useState({
    nickname: '',
    location: '',
    weather: '',
    mood: '',
    feelings: ''
  });

  // Animation state
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

  // Handle additional context
  const handleAddContextItem = (item: AdditionalContextItem) => {
    setContextItems(prev => [...prev, item]);
  };

  const handleRemoveContextItem = (id: string) => {
    setContextItems(prev => prev.filter(item => item.id !== id));
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
    const displayWidth = 646.5;
    const displayHeight = 431;

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
            strokeWidth="3"
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
            strokeWidth="3"
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
            r="6"
            fill={annotation.color || '#2CA800'}
            opacity={0.8}
          />
        );
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
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        fontFamily: 'Azeret Mono, monospace',
        padding: '20px'
      }}
    >
      <div
        style={{
          backgroundColor: '#FCFCF9',
          border: '1px solid #000000',
          borderRadius: '0',
          width: '100%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative'
        }}
      >
        {/* Header with logo and exit button */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 27px',
            borderBottom: '1px solid #CCCCCC'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '9%' }}>
              co-see
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '24px',
              height: '24px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="12.64" height="12.64" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#000000" strokeWidth="2"/>
            </svg>
          </button>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', gap: '26px', padding: '0 27px 0 19px' }}>
          {/* Left panel - Animation section */}
          <div style={{ width: '645px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', padding: '32px 0' }}>
              {/* Session info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#757575' }}>
                    {getCurrentDate()}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#757575' }}>
                    {getCurrentTime()}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#757575' }}>
                    4 mins
                  </span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h3 style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1%', margin: 0 }}>
                    {imageUrl.includes('agnes') ? 'agnes martin in new mexico' : 'Session Image'}
                  </h3>
                  <div style={{ width: '100%', height: '1px', backgroundColor: '#000000' }}></div>
                  <h4 style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1%', margin: 0 }}>
                    {sessionName}
                  </h4>
                </div>
              </div>

              {/* Session image with traces */}
              <div style={{ position: 'relative', width: '646.5px', height: '431px' }}>
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
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Button
                  onClick={handlePlayPause}
                  size="sm"
                  variant="outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button
                  onClick={handleRestart}
                  size="sm"
                  variant="outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <RotateCcw size={16} />
                  Restart
                </Button>
                <Button
                  onClick={handleSpeedToggle}
                  size="sm"
                  variant="outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <FastForward size={16} />
                  {playbackSpeed}x
                </Button>
                <div style={{ fontSize: '12px', marginLeft: '10px', color: '#666' }}>
                  {Math.round(progress * 100)}%
                </div>
              </div>
            </div>
          </div>

          {/* Right panel - Survey form */}
          <div style={{ flex: 1, padding: '32px 0' }}>
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
                    How you feel about this session
                  </label>
                  <textarea
                    value={formData.feelings}
                    onChange={(e) => handleInputChange('feelings', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #CCCCCC',
                      borderRadius: '0',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      height: '80px',
                      resize: 'vertical'
                    }}
                    placeholder="Share your thoughts about this seeing session..."
                  />
                </div>

                <AdditionalContextFolder
                  items={contextItems}
                  onAddItem={handleAddContextItem}
                  onRemoveItem={handleRemoveContextItem}
                />
                
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
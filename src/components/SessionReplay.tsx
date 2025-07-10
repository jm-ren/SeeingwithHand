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

  // Calculate total duration from annotations
  const totalDuration = annotations.length > 0 
    ? Math.max(...annotations.map(a => a.timestamp)) - Math.min(...annotations.map(a => a.timestamp))
    : 0;

  // Filter annotations up to current time
  const currentAnnotations = annotations.filter(annotation => {
    const annotationTime = annotation.timestamp - (annotations[0]?.timestamp || 0);
    return annotationTime <= currentTime;
  });

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
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid #666666',
                borderRadius: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#666666'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#666666';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#666666';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        {/* Session Image and Visualization */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            position: 'relative', 
            backgroundColor: '#F8F8F8', 
            borderRadius: '0',
            border: '1px solid #666666',
            overflow: 'hidden' 
          }}>
            <img
              src={imageUrl}
              alt={sessionName}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '384px',
                objectFit: 'contain'
              }}
            />
            {/* Annotation overlay */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
              {currentAnnotations.map((annotation) => (
                <div
                  key={annotation.id}
                  style={{
                    position: 'absolute',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#2CA800',
                    borderRadius: '0',
                    left: `${annotation.points[0]?.x || 0}%`,
                    top: `${annotation.points[0]?.y || 0}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              ))}
            </div>
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
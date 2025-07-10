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
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              {sessionDate && <span>{sessionDate}</span>}
              {sessionDate && sessionDuration && <span className="mx-2">•</span>}
              {sessionDuration && <span>{sessionDuration}</span>}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        {/* Session Image and Visualization */}
        <div className="mb-6">
          <div className="relative bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={imageUrl}
              alt={sessionName}
              className="w-full h-auto max-h-96 object-contain"
            />
            {/* Annotation overlay */}
            <div className="absolute inset-0">
              {currentAnnotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className="absolute w-2 h-2 bg-green-400 rounded-full"
                  style={{
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
        <div className="mb-6">
          <div className="bg-gray-200 rounded-lg p-6 flex justify-center">
            <EyeVisualization
              annotations={currentAnnotations}
              isPlaying={isPlaying}
              progress={progress}
              playbackSpeed={playbackSpeed}
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="mb-6">
          <Legend />
        </div>

        {/* Animation Controls */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={restart}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
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
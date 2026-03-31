import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { SessionData, updateSession } from '../lib/supabase';
import SessionComments from './SessionComments';
import {
  sortAnnotationsByTime,
  computeReplayBaseTime,
  computeTotalDuration,
  getAnnotationsAtTime,
  drawProgressiveAnnotation,
  imageToDisplay,
  ImageRect,
} from '../lib/replayUtils';
import { AdditionalContextItem } from './AdditionalContextFolder';

interface SessionViewerProps {
  session: SessionData;
  imageUrl: string;
  imageTitle: string;
  showComments?: boolean;
}

const WEATHER_ICONS: Record<string, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  rainy: '🌧️',
  snowy: '❄️',
};

const MOOD_ICONS: Record<string, string> = {
  happy: '😊',
  calm: '😌',
  excited: '😄',
  thoughtful: '🤔',
};

function formatViewerDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (minutes > 0) return `${minutes}m ${rem}s`;
  return `${seconds}s`;
}

function formatViewerDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const CONTROL_BUTTON_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '6px 12px',
  border: '1px solid #666666',
  borderRadius: 0,
  backgroundColor: '#FFFFFF',
  color: '#333333',
  cursor: 'pointer',
  fontSize: '11px',
  fontFamily: 'Azeret Mono, monospace',
  letterSpacing: '0.5px',
};

function generateShareSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const SessionViewer: React.FC<SessionViewerProps> = ({ session, imageUrl, imageTitle, showComments = true }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(4);
  const [shareSlug, setShareSlug] = useState<string | null>(session.share_slug);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const currentTimeRef = useRef(0);

  const sortedAnnotations = useMemo(
    () => sortAnnotationsByTime(session.annotations || []),
    [session.annotations]
  );

  const replayBaseTime = useMemo(
    () => computeReplayBaseTime(sortedAnnotations, session.session_start_time),
    [sortedAnnotations, session.session_start_time]
  );

  const totalDuration = useMemo(
    () => computeTotalDuration(sortedAnnotations, replayBaseTime),
    [sortedAnnotations, replayBaseTime]
  );

  const audioOffsetMs = useMemo(
    () => (session.audio_started_at ?? replayBaseTime) - replayBaseTime,
    [session.audio_started_at, replayBaseTime]
  );

  const hasAudio = !!session.audio_url;

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const getDisplayRect = useCallback((): ImageRect | null => {
    const container = containerRef.current;
    const image = imageRef.current;
    if (!container || !image || !image.complete) return null;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const iar = image.naturalWidth / image.naturalHeight;
    const car = cw / ch;

    let w, h, ox, oy;
    if (iar > car) {
      w = cw; h = cw / iar; ox = 0; oy = (ch - h) / 2;
    } else {
      w = ch * iar; h = ch; ox = (cw - w) / 2; oy = 0;
    }
    return { x: ox, y: oy, width: w, height: h };
  }, []);

  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const displayRect = getDisplayRect();
    if (!displayRect) return;

    const convertPoint = (p: { x: number; y: number }) => imageToDisplay(p, displayRect);
    const visible = getAnnotationsAtTime(sortedAnnotations, replayBaseTime, time);

    visible.forEach((annotation) => {
      const timeSinceStart = time - (annotation.timestamp - replayBaseTime);
      drawProgressiveAnnotation(ctx, annotation, timeSinceStart, convertPoint);
    });
  }, [sortedAnnotations, replayBaseTime, getDisplayRect]);

  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    draw(currentTimeRef.current);
  }, [draw]);

  useEffect(() => {
    const handleResize = () => updateCanvasSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateCanvasSize]);

  const hasAutoPlayed = useRef(false);

  const handleImageLoad = useCallback(() => {
    updateCanvasSize();
    if (!hasAutoPlayed.current && totalDuration > 0) {
      hasAutoPlayed.current = true;
      setCurrentTime(0);
      setIsPlaying(true);
      const audio = audioRef.current;
      if (audio && hasAudio) {
        audio.playbackRate = playbackSpeed;
        audio.play().catch(() => {});
      }
    }
  }, [updateCanvasSize, totalDuration, hasAudio, playbackSpeed]);

  useEffect(() => {
    draw(currentTime);
  }, [currentTime, draw]);

  // Animation loop: interval ticks at 50ms for smooth replay
  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const audio = audioRef.current;

    intervalRef.current = setInterval(() => {
      const hasValidAudio = hasAudio && audio &&
        audio.readyState >= 2 && audio.duration > 0 && isFinite(audio.duration);

      let newTime: number;
      if (hasValidAudio) {
        newTime = (audio!.currentTime * 1000) + audioOffsetMs;
      } else {
        newTime = currentTimeRef.current + (50 * playbackSpeed);
      }

      if (newTime >= totalDuration) {
        newTime = 0;
        if (hasValidAudio && audio) {
          audio.currentTime = 0;
        }
      }

      setCurrentTime(newTime);
    }, 50);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playbackSpeed, totalDuration, hasAudio, audioOffsetMs]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  // Stop playback and release resources on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, []);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!isPlaying) {
      if (currentTime >= totalDuration) {
        setCurrentTime(0);
        if (audio && hasAudio) audio.currentTime = 0;
      }
      setIsPlaying(true);
      if (audio && hasAudio) {
        audio.playbackRate = playbackSpeed;
        audio.play().catch(() => {});
      }
    } else {
      setIsPlaying(false);
      if (audio && hasAudio) audio.pause();
    }
  };

  const handleRestart = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    const audio = audioRef.current;
    if (audio && hasAudio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };

  const handleSpeedToggle = () => {
    const speeds = [1, 2, 4];
    const nextIndex = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
  };

  const handleShare = async () => {
    let slug = shareSlug;
    if (!slug) {
      slug = generateShareSlug();
      setShareSlug(slug);
      await updateSession(session.session_id, { share_slug: slug });
    }
    const url = `${window.location.origin}/view/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: prompt the user with the URL
      window.prompt('Copy this link:', url);
    }
  };

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  const curSec = Math.floor(currentTime / 1000);
  const curMin = Math.floor(curSec / 60);
  const curRem = curSec % 60;
  const totSec = Math.floor(totalDuration / 1000);
  const totMin = Math.floor(totSec / 60);
  const totRem = totSec % 60;

  const hasReflections = session.nickname || session.location ||
    session.weather || session.mood || session.feelings;
  const hasContext = session.additional_context && session.additional_context.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="gallery-title-main">{imageTitle}</div>
          <div className="gallery-title-sub" style={{ marginBottom: 4 }}>
            {session.session_name}
          </div>
          <div className="gallery-text-small" style={{ color: '#666666' }}>
            by {session.nickname || 'anonymous'}
            {session.created_at && ` · ${formatViewerDate(session.created_at)}`}
            {session.duration_ms > 0 && ` · ${formatViewerDuration(session.duration_ms)}`}
          </div>
        </div>
        <button onClick={handleShare} style={{ ...CONTROL_BUTTON_STYLE, flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>

      {/* Replay area: image with canvas overlay */}
      <div>
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            border: '1px solid #CCCCCC',
            overflow: 'hidden',
            backgroundColor: '#F8F8F8',
          }}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt={imageTitle}
            onLoad={handleImageLoad}
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '400px',
              objectFit: 'contain',
              display: 'block',
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Timeline + progress bar */}
        {totalDuration > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              fontFamily: 'Azeret Mono, monospace',
              color: '#666666',
              marginBottom: 4,
            }}>
              <span>{curMin}:{curRem.toString().padStart(2, '0')}</span>
              <span>{totMin}:{totRem.toString().padStart(2, '0')}</span>
            </div>
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#CCCCCC',
              border: '1px solid #999999',
            }}>
              <div style={{
                backgroundColor: '#333333',
                height: '100%',
                width: `${Math.min(progress, 100)}%`,
                transition: 'width 0.05s linear',
              }} />
            </div>
          </div>
        )}

        {/* Transport controls */}
        {totalDuration > 0 && (
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 12,
          }}>
            <button onClick={handlePlayPause} style={CONTROL_BUTTON_STYLE}>
              {isPlaying ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button onClick={handleRestart} style={CONTROL_BUTTON_STYLE}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
              Restart
            </button>
            <button onClick={handleSpeedToggle} style={CONTROL_BUTTON_STYLE}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13,19 22,12 13,5" />
                <polygon points="2,19 11,12 2,5" />
              </svg>
              {playbackSpeed}x
            </button>
          </div>
        )}
      </div>

      {/* Hidden audio element — only rendered when session has audio */}
      {hasAudio && (
        <audio
          ref={audioRef}
          src={session.audio_url!}
          preload="metadata"
          style={{ display: 'none' }}
        />
      )}

      {/* Reflections */}
      {hasReflections && (
        <div style={{ borderTop: '1px solid #CCCCCC', paddingTop: 20 }}>
          <div className="gallery-title-sub" style={{ marginBottom: 16 }}>
            Reflections
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {session.nickname && (
              <ReflectionField label="Nickname" value={session.nickname} />
            )}
            {session.location && (
              <ReflectionField label="Location" value={session.location} />
            )}
            {session.weather && (
              <ReflectionField
                label="Weather"
                value={`${WEATHER_ICONS[session.weather] || ''} ${session.weather}`}
              />
            )}
            {session.mood && (
              <ReflectionField
                label="Mood"
                value={`${MOOD_ICONS[session.mood] || ''} ${session.mood}`}
              />
            )}
            {session.feelings && (
              <div>
                <div className="gallery-text-small" style={{ color: '#666666', marginBottom: 4 }}>
                  Feelings
                </div>
                <div className="gallery-text-body" style={{ lineHeight: '1.6' }}>
                  {session.feelings}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional context items (read-only) */}
      {hasContext && (
        <div style={{ borderTop: '1px solid #CCCCCC', paddingTop: 20 }}>
          <div className="gallery-title-sub" style={{ marginBottom: 16 }}>
            Additional Context
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {session.additional_context.map((item) => (
              <ContextCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      {showComments && <SessionComments sessionId={session.session_id} />}
    </div>
  );
};

const ReflectionField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', gap: 12 }}>
    <div className="gallery-text-small" style={{ color: '#666666', minWidth: 80 }}>
      {label}
    </div>
    <div className="gallery-text-small">{value}</div>
  </div>
);

const ContextCard: React.FC<{ item: AdditionalContextItem }> = ({ item }) => {
  const fileTypeLabel = (ft?: string) => {
    if (!ft) return 'File';
    if (ft.startsWith('image/')) return 'Image';
    if (ft.startsWith('video/')) return 'Video';
    if (ft.startsWith('audio/')) return 'Audio';
    return 'File';
  };

  return (
    <div style={{
      padding: 12,
      border: '0.39px solid #666666',
      backgroundColor: '#FFFFFF',
      fontFamily: 'Azeret Mono, monospace',
      fontSize: '11px',
      aspectRatio: '1 / 1',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      <div style={{ fontSize: '10px', color: '#666666', flexShrink: 0 }}>
        {item.type === 'note' ? 'Note' : fileTypeLabel(item.fileType)}
      </div>
      {item.type === 'note' ? (
        <div style={{
          lineHeight: '1.4',
          color: '#333333',
          wordBreak: 'break-word',
          overflow: 'hidden',
          flex: 1,
        }}>
          {item.content}
        </div>
      ) : item.fileUrl && item.fileType?.startsWith('image/') ? (
        <img
          src={item.fileUrl}
          alt={item.filename}
          style={{
            width: '100%',
            flex: 1,
            objectFit: 'cover',
            border: '1px solid #CCCCCC',
            minHeight: 0,
          }}
        />
      ) : (
        <div style={{
          color: '#333333',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {item.filename || item.content}
        </div>
      )}
    </div>
  );
};

export default SessionViewer;

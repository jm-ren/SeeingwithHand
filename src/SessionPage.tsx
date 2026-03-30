import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Home from './components/home';
import { ApplicationProvider, useApplication, SessionEvent } from './context/ApplicationContext';
import { saveSession, uploadAudioFile, uploadContextFile, SessionDataInput } from './lib/supabase';
import AmbienceSurvey from './components/AmbienceSurvey';

const SessionPage: React.FC = () => {
  const { imageId, sessionId } = useParams<{ imageId: string; sessionId: string }>();

  return (
    <ApplicationProvider>
      <SessionPageContent imageId={imageId} sessionId={sessionId} />
    </ApplicationProvider>
  );
};

interface SessionSummary {
  sessionName: string;
  imageUrl: string;
  audioUrl?: string;
  audioBlob?: Blob;
  audioStartedAt?: number;
}

interface CapturedSessionState {
  sessionId: string;
  sessionStartTime: number;
  sessionEndTime: number;
  sessionEvents: SessionEvent[];
}

const SessionPageContent: React.FC<{ imageId?: string; sessionId?: string }> = ({ imageId, sessionId }) => {
  const [showSurvey, setShowSurvey] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const {
    annotations,
    groups,
    sessionId: sessionIdFromContext,
    sessionStartTime,
    sessionEvents,
    endSession,
  } = useApplication();
  const navigate = useNavigate();

  // Refs to capture session state before endSession() clears it
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const sessionEventsRef = useRef<SessionEvent[]>([]);

  useEffect(() => {
    if (sessionIdFromContext) sessionIdRef.current = sessionIdFromContext;
    if (sessionStartTime) sessionStartTimeRef.current = sessionStartTime;
    if (sessionEvents.length > 0) sessionEventsRef.current = sessionEvents;
  }, [sessionIdFromContext, sessionStartTime, sessionEvents]);

  // Captured state, set when session ends (before context clears)
  const [capturedState, setCapturedState] = useState<CapturedSessionState | null>(null);

  const handleSessionEnd = (summary: SessionSummary) => {
    // Capture session values from refs BEFORE endSession() clears them.
    // SessionControls already called endSession() by this point, but refs
    // still hold the last known-good values.
    const captured: CapturedSessionState = {
      sessionId: sessionIdRef.current || sessionIdFromContext || `fallback-${Date.now()}`,
      sessionStartTime: sessionStartTimeRef.current || sessionStartTime || Date.now(),
      sessionEndTime: Date.now(),
      sessionEvents: [...sessionEventsRef.current],
    };
    setCapturedState(captured);

    endSession();
    setSessionSummary(summary);
    setShowSurvey(true);
  };

  const handleSurveySubmit = async (data: {
    nickname: string;
    location: string;
    weather: string;
    mood: string;
    feelings: string;
    additionalContext: any[];
  }) => {
    if (!capturedState || !sessionSummary) return;

    try {
      let audioUrl = sessionSummary.audioUrl || null;
      if (sessionSummary.audioBlob) {
        const fileName = `${capturedState.sessionId}-${Date.now()}.webm`;
        audioUrl = await uploadAudioFile(sessionSummary.audioBlob, fileName);
      }

      const processedContextItems = [];
      if (data.additionalContext && Array.isArray(data.additionalContext)) {
        for (const item of data.additionalContext) {
          if (item.type === 'file' && item.fileUrl && item.fileUrl.startsWith('blob:')) {
            try {
              const response = await fetch(item.fileUrl);
              const blob = await response.blob();
              const file = new File([blob], item.filename || 'unknown', { type: blob.type });
              const fileName = `${capturedState.sessionId}-${Date.now()}-${item.filename}`;
              const uploadedUrl = await uploadContextFile(file, fileName);

              processedContextItems.push({
                ...item,
                fileUrl: uploadedUrl,
                originalBlobUrl: item.fileUrl,
              });
            } catch (error) {
              console.error('Error uploading context file:', error);
              processedContextItems.push({ ...item, uploadError: true });
            }
          } else {
            processedContextItems.push(item);
          }
        }
      }

      processedContextItems.forEach(item => {
        if (item.originalBlobUrl) URL.revokeObjectURL(item.originalBlobUrl);
      });

      const sessionData: SessionDataInput = {
        session_name: sessionSummary.sessionName || 'Untitled Session',
        image_id: imageId || 'unknown',
        session_id: capturedState.sessionId,
        annotations,
        groups,
        session_events: capturedState.sessionEvents,
        audio_url: audioUrl,
        audio_started_at: sessionSummary.audioStartedAt ?? null,
        session_start_time: capturedState.sessionStartTime,
        session_end_time: capturedState.sessionEndTime,
        duration_ms: capturedState.sessionEndTime - capturedState.sessionStartTime,
        nickname: data.nickname || '',
        location: data.location || '',
        weather: data.weather || '',
        mood: data.mood || '',
        feelings: data.feelings || '',
        additional_context: processedContextItems,
        is_public: true,
        share_slug: null,
      };

      console.log('Saving session data:', sessionData);
      const savedSession = await saveSession(sessionData);

      if (savedSession) {
        console.log('Session saved successfully:', savedSession);
        setShowConfirmation(true);
        setTimeout(() => navigate('/'), 2000);
      } else {
        console.error('Failed to save session');
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (error) {
      console.error('Error saving session:', error);
      setTimeout(() => navigate('/'), 2000);
    }
  };

  const handleBackToGallery = () => {
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FBFAF8' }}>
      {showSurvey && sessionSummary && (
        <AmbienceSurvey
          annotations={annotations}
          groups={groups}
          sessionName={sessionSummary.sessionName}
          imageUrl={sessionSummary.imageUrl}
          audioUrl={sessionSummary.audioUrl}
          audioBlob={sessionSummary.audioBlob}
          audioStartedAt={sessionSummary.audioStartedAt}
          sessionStartTime={capturedState?.sessionStartTime ?? undefined}
          onSubmit={handleSurveySubmit}
          onClose={() => setShowSurvey(false)}
        />
      )}

      {showConfirmation ? (
        <div style={{
          width: '100vw',
          height: '100vh',
          background: '#FBFAF8',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Azeret Mono, monospace'
        }}>
          <div style={{ textAlign: 'center', maxWidth: 600, padding: 40 }}>
            <h1 style={{
              fontSize: '28px',
              fontFamily: 'Azeret Mono, monospace',
              fontWeight: 500,
              letterSpacing: '0.5px',
              marginBottom: 16,
              color: '#333333'
            }}>
              Thank you for sharing!
            </h1>
            <p style={{
              fontSize: '16px',
              fontFamily: 'Azeret Mono, monospace',
              fontWeight: 400,
              letterSpacing: '0.5px',
              color: '#666666',
              marginBottom: 32,
              lineHeight: 1.6
            }}>
              Your session has been saved successfully. You'll be redirected to the gallery shortly.
            </p>
            <button
              onClick={handleBackToGallery}
              style={{
                padding: '12px 32px',
                background: '#DD4627',
                color: '#FFFFFF',
                border: '1px solid #666666',
                borderRadius: '0',
                fontFamily: 'Azeret Mono, monospace',
                fontWeight: 500,
                fontSize: '16px',
                letterSpacing: '0.5px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#B73A20'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#DD4627'}
            >
              Back to Gallery
            </button>
          </div>
        </div>
      ) : (
        <Home
          imageId={imageId}
          sessionId={sessionId}
          onSessionEnd={handleSessionEnd}
        />
      )}
    </div>
  );
};

export default SessionPage;

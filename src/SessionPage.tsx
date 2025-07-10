import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Home from './components/home';
import { AnnotationProvider, useAnnotations } from './context/AnnotationContext';
import { SessionProvider, useSession } from './context/SessionContext';
import SessionSurveyPage from './SessionSurveyPage';
import { saveSession, uploadAudioFile } from './lib/supabase';
import SessionReplay from './components/SessionReplay';
import ReflectionForm from './components/ReflectionForm';

const SessionPage: React.FC = () => {
  const { imageId, sessionId } = useParams<{ imageId: string; sessionId: string }>();

  return (
    <SessionProvider>
      <AnnotationProvider>
        <SessionPageContent imageId={imageId} sessionId={sessionId} />
      </AnnotationProvider>
    </SessionProvider>
  );
};

const SessionPageContent: React.FC<{ imageId?: string; sessionId?: string }> = ({ imageId, sessionId }) => {
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyData, setSurveyData] = useState<any>(null);
  const [sessionSummary, setSessionSummary] = useState<{ sessionName: string; imageUrl: string; audioUrl?: string; audioBlob?: Blob } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const { annotations, groups } = useAnnotations();
  const { sessionId: sessionIdFromContext, endSession } = useSession();
  const navigate = useNavigate();

  // Handler to trigger survey after session ends
  const handleSessionEnd = (summary: { sessionName: string; imageUrl: string; audioUrl?: string; audioBlob?: Blob }) => {
    console.log('[SessionPage] handleSessionEnd called with:', summary);
    // End the session to stop canvas recording
    endSession();
    setSessionSummary(summary);
    setShowSurvey(true);
  };

  const handleSurveySubmit = async (data: any) => {
    setSurveyData(data);
    
    try {
      // Upload audio file first if it exists
      let audioUrl = sessionSummary?.audioUrl;
      if (sessionSummary?.audioBlob) {
        const fileName = `${sessionIdFromContext}-${Date.now()}.webm`;
        audioUrl = await uploadAudioFile(sessionSummary.audioBlob, fileName);
      }

      // Bundle and save session data
      const sessionData = {
        session_name: sessionSummary?.sessionName || 'Untitled Session',
        image_id: imageId || 'unknown',
        session_id: sessionIdFromContext || 'unknown',
        annotations,
        groups,
        audio_url: audioUrl,
        survey_data: data,
      };

      console.log('Saving session data:', sessionData);
      const savedSession = await saveSession(sessionData);
      
      if (savedSession) {
        console.log('Session saved successfully:', savedSession);
        setShowConfirmation(true);
        
        // Navigate back to gallery after a short delay
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        console.error('Failed to save session');
        // Still navigate back on error
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (error) {
      console.error('Error saving session:', error);
      // Navigate back even on error
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }
  };

  const handleBackToGallery = () => {
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FBFAF8' }}>
      {showSurvey && sessionSummary && (
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
            fontFamily: 'Azeret Mono, monospace'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSurvey(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowSurvey(false);
            }
          }}
          tabIndex={0}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #666666',
            borderRadius: '0',
            padding: '32px',
            maxWidth: '720px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            margin: '20px',
            position: 'relative'
          }}>
            {/* Close button */}
            <button
              onClick={() => setShowSurvey(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                border: '1px solid #666666',
                borderRadius: '0',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
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
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
            <div style={{ marginBottom: '32px' }}>              
              {/* Session Summary */}
              <div style={{
                padding: '24px',
                border: '1px solid #CCCCCC',
                borderRadius: '0',
                backgroundColor: '#F8F8F8',
                marginBottom: '32px'
              }}>
                <h3 style={{
                  fontFamily: 'Azeret Mono, monospace',
                  fontSize: '16px',
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  color: '#333333',
                  margin: '0 0 16px 0'
                }}>
                  {sessionSummary.sessionName}
                </h3>
                <img 
                  src={sessionSummary.imageUrl} 
                  alt="Session" 
                  style={{
                    width: '100%',
                    height: '240px',
                    objectFit: 'cover',
                    borderRadius: '0',
                    border: '1px solid #CCCCCC',
                    marginBottom: '16px'
                  }}
                />
                
                {/* Audio Player */}
                {sessionSummary.audioUrl && (
                  <div style={{ marginBottom: '16px' }}>
                    <audio controls style={{ width: '100%' }}>
                      <source src={sessionSummary.audioUrl} type="audio/webm" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
                
                {/* Replay Button */}
                <button
                  onClick={() => setShowReplay(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
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
                    e.currentTarget.style.backgroundColor = '#333333';
                    e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.color = '#333333';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5,3 19,12 5,21"/>
                  </svg>
                  view session replay
                </button>
              </div>
            </div>
            
            <ReflectionForm onSubmit={handleSurveySubmit} />
          </div>
        </div>
      )}

      {/* Session Replay Modal */}
      {showReplay && sessionSummary && (
        <SessionReplay
          annotations={annotations}
          groups={groups}
          imageUrl={sessionSummary.imageUrl}
          sessionName={sessionSummary.sessionName}
          sessionDate={new Date().toLocaleDateString()}
          sessionDuration="4 mins"
          onClose={() => setShowReplay(false)}
        />
      )}

      {showConfirmation ? (
        <div style={{ width: '100vw', height: '100vh', background: '#F9F8F4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: 600, padding: 40 }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16, color: '#2D2D2D' }}>
              Thank you for sharing!
            </h1>
            <p style={{ fontSize: 18, color: '#666', marginBottom: 32, lineHeight: 1.6 }}>
              Your session has been saved successfully. You'll be redirected to the gallery shortly.
            </p>
            <button
              onClick={handleBackToGallery}
              style={{ 
                padding: '12px 32px', 
                background: '#DD4627', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 8, 
                fontWeight: 600, 
                fontSize: 16, 
                cursor: 'pointer',
                transition: 'background-color 0.2s'
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
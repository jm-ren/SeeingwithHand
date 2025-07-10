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
  const { sessionId: sessionIdFromContext } = useSession();
  const navigate = useNavigate();

  // Handler to trigger survey after session ends
  const handleSessionEnd = (summary: { sessionName: string; imageUrl: string; audioUrl?: string; audioBlob?: Blob }) => {
    console.log('[SessionPage] handleSessionEnd called with:', summary);
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
    <div className="min-h-screen bg-gray-50">
      {showSurvey && sessionSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-4">Session Reflection</h2>
              
              {/* Session Summary */}
              <div className="bg-gray-100 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-2">{sessionSummary.sessionName}</h3>
                <img 
                  src={sessionSummary.imageUrl} 
                  alt="Session" 
                  className="w-full h-48 object-cover rounded mb-4"
                />
                
                {/* Audio Player */}
                {sessionSummary.audioUrl && (
                  <div className="mb-4">
                    <audio controls className="w-full">
                      <source src={sessionSummary.audioUrl} type="audio/webm" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
                
                {/* Replay Button */}
                <button
                  onClick={() => setShowReplay(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5,3 19,12 5,21"/>
                  </svg>
                  View Session Replay
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
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Home from './components/home';
import { ApplicationProvider, useApplication } from './context/ApplicationContext';
import SessionSurveyPage from './SessionSurveyPage';
import { saveSession, uploadAudioFile, uploadContextFile } from './lib/supabase';
import SessionReplay from './components/SessionReplay';
import AmbienceSurvey from './components/AmbienceSurvey';

const SessionPage: React.FC = () => {
  const { imageId, sessionId } = useParams<{ imageId: string; sessionId: string }>();

  return (
    <ApplicationProvider>
      <SessionPageContent imageId={imageId} sessionId={sessionId} />
    </ApplicationProvider>
  );
};

const SessionPageContent: React.FC<{ imageId?: string; sessionId?: string }> = ({ imageId, sessionId }) => {
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyData, setSurveyData] = useState<any>(null);
  const [sessionSummary, setSessionSummary] = useState<{ sessionName: string; imageUrl: string; audioUrl?: string; audioBlob?: Blob } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const { annotations, groups, sessionId: sessionIdFromContext, endSession } = useApplication();
  const navigate = useNavigate();

  // Handler to trigger survey after session ends
  const handleSessionEnd = (summary: { sessionName: string; imageUrl: string; audioUrl?: string; audioBlob?: Blob }) => {
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

      // Process additional context items and upload files
      const processedContextItems = [];
      if (data.additionalContext && Array.isArray(data.additionalContext)) {
        for (const item of data.additionalContext) {
          if (item.type === 'file' && item.fileUrl && item.fileUrl.startsWith('blob:')) {
            // This is a local blob URL, need to upload the file
            try {
              const response = await fetch(item.fileUrl);
              const blob = await response.blob();
              const file = new File([blob], item.filename || 'unknown', { type: blob.type });
              
              const fileName = `${sessionIdFromContext}-${Date.now()}-${item.filename}`;
              const uploadedUrl = await uploadContextFile(file, fileName);
              
              processedContextItems.push({
                ...item,
                fileUrl: uploadedUrl,
                // Keep the original blob URL for cleanup
                originalBlobUrl: item.fileUrl
              });
            } catch (error) {
              console.error('Error uploading context file:', error);
              // Keep the item but with error indication
              processedContextItems.push({
                ...item,
                uploadError: true
              });
            }
          } else {
            // Text note or already uploaded file
            processedContextItems.push(item);
          }
        }
      }

      // Clean up blob URLs after upload
      processedContextItems.forEach(item => {
        if (item.originalBlobUrl) {
          URL.revokeObjectURL(item.originalBlobUrl);
        }
      });

      // Bundle and save session data
      const sessionData = {
        session_name: sessionSummary?.sessionName || 'Untitled Session',
        image_id: imageId || 'unknown',
        session_id: sessionIdFromContext || 'unknown',
        annotations,
        groups,
        audio_url: audioUrl,
        survey_data: {
          ...data,
          additionalContext: processedContextItems
        },
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
        <AmbienceSurvey
          annotations={annotations}
          groups={groups}
          sessionName={sessionSummary.sessionName}
          imageUrl={sessionSummary.imageUrl}
          audioUrl={sessionSummary.audioUrl}
          audioBlob={sessionSummary.audioBlob}
          onSubmit={handleSurveySubmit}
          onClose={() => setShowSurvey(false)}
          onViewReplay={() => {
            setShowSurvey(false);
            setShowReplay(true);
          }}
        />
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
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Home from './components/home';
import { AnnotationProvider, useAnnotations } from './context/AnnotationContext';
import { SessionProvider, useSession } from './context/SessionContext';
import SessionSurveyPage from './SessionSurveyPage';

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
  const { annotations, groups } = useAnnotations();
  const { sessionId: sessionIdFromContext } = useSession();

  // Handler to trigger survey after session ends
  const handleSessionEnd = (summary: { sessionName: string; imageUrl: string; audioUrl?: string; audioBlob?: Blob }) => {
    console.log('[SessionPage] handleSessionEnd called with:', summary);
    setSessionSummary(summary);
    setShowSurvey(true);
  };

  const handleSurveySubmit = (data: any) => {
    setSurveyData(data);
    // Bundle and upload session data
    const sessionData = {
      sessionName: sessionSummary?.sessionName,
      imageId,
      sessionId: sessionIdFromContext,
      annotations,
      groups,
      audioUrl: sessionSummary?.audioUrl,
      audioBlob: sessionSummary?.audioBlob,
      survey: data,
    };
    // TODO: Replace with real backend upload
    console.log('UPLOAD: Session data to backend:', sessionData);
    setShowConfirmation(true);
  };

  return (
    <>
      {showConfirmation ? (
        <div style={{ width: '100vw', height: '100vh', background: '#F9F8F4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Thank you for your reflection!</h1>
          <p style={{ fontSize: 18, color: '#444' }}>Your session has been saved (mock).</p>
          <button style={{ marginTop: 32, padding: '10px 28px', background: '#DD4627', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 17, cursor: 'pointer' }} onClick={() => window.location.href = '/'}>
            Return to Gallery
          </button>
        </div>
      ) : showSurvey && sessionSummary ? (
        <SessionSurveyPage
          sessionName={sessionSummary.sessionName}
          imageUrl={sessionSummary.imageUrl}
          audioUrl={sessionSummary.audioUrl}
          onSubmit={handleSurveySubmit}
        />
      ) : (
        <Home
          imageId={imageId}
          sessionId={sessionId}
          onSessionEnd={handleSessionEnd}
        />
      )}
    </>
  );
};

export default SessionPage; 
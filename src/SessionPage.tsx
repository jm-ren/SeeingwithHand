import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Home from './components/home';
import { AnnotationProvider } from './context/AnnotationContext';
import { SessionProvider } from './context/SessionContext';
import SessionSurveyPage from './SessionSurveyPage';

const SessionPage: React.FC = () => {
  const { imageId, sessionId } = useParams<{ imageId: string; sessionId: string }>();
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyData, setSurveyData] = useState<any>(null);
  const [sessionSummary, setSessionSummary] = useState<{ sessionName: string; imageUrl: string; audioUrl?: string } | null>(null);

  // Handler to trigger survey after session ends
  const handleSessionEnd = (summary: { sessionName: string; imageUrl: string; audioUrl?: string }) => {
    setSessionSummary(summary);
    setShowSurvey(true);
  };

  const handleSurveySubmit = (data: any) => {
    setSurveyData(data);
    // TODO: Save session + survey data, then redirect or show confirmation
    // For now, just return to gallery or show a thank you message
    window.location.href = '/';
  };

  return (
    <SessionProvider>
      <AnnotationProvider>
        {showSurvey && sessionSummary ? (
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
      </AnnotationProvider>
    </SessionProvider>
  );
};

export default SessionPage; 
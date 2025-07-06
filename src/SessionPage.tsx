import React from 'react';
import { useParams } from 'react-router-dom';
import Home from './components/home';
import { AnnotationProvider } from './context/AnnotationContext';
import { SessionProvider } from './context/SessionContext';

const SessionPage: React.FC = () => {
  const { imageId, sessionId } = useParams<{ imageId: string; sessionId: string }>();

  return (
    <SessionProvider>
      <AnnotationProvider>
        <Home imageId={imageId} sessionId={sessionId} />
      </AnnotationProvider>
    </SessionProvider>
  );
};

export default SessionPage; 
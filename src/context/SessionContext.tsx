import React, { createContext, useContext, useState, useCallback } from "react";

interface InteractionEventData {
  position?: { x: number; y: number };
  relatedAnnotationId?: string;
  toolType?: string;
  data?: Record<string, any>;
}

interface SessionContextProps {
  isSessionActive: boolean;
  sessionId: string | null;
  startSession: () => void;
  endSession: () => void;
  recordInteractionEvent: (
    eventType: string,
    data?: InteractionEventData
  ) => void;
}

const SessionContext = createContext<SessionContextProps>({
  isSessionActive: false,
  sessionId: null,
  startSession: () => {},
  endSession: () => {},
  recordInteractionEvent: () => {},
});

export const useSession = () => useContext(SessionContext);

interface SessionProviderProps {
  children: React.ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);

  const generateSessionId = () => {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };

  const startSession = useCallback(() => {
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    setIsSessionActive(true);
    console.log(`Session started: ${newSessionId}`);
    
    // Record session start event
    const startEvent = {
      type: 'session_start',
      timestamp: Date.now(),
      sessionId: newSessionId
    };
    
    setEvents(prev => [...prev, startEvent]);
  }, []);

  const endSession = useCallback(() => {
    if (!isSessionActive) return;
    
    // Record session end event
    const endEvent = {
      type: 'session_end',
      timestamp: Date.now(),
      sessionId
    };
    
    setEvents(prev => [...prev, endEvent]);
    console.log(`Session ended: ${sessionId}`);
    
    // Reset session state
    setIsSessionActive(false);
    setSessionId(null);
  }, [isSessionActive, sessionId]);

  const recordInteractionEvent = useCallback(
    (eventType: string, data?: InteractionEventData) => {
      if (!isSessionActive || !sessionId) return;

      const event = {
        type: eventType,
        timestamp: Date.now(),
        sessionId,
        ...data,
      };

      setEvents(prev => [...prev, event]);
      console.log(`Event recorded: ${eventType}`, data);
    },
    [isSessionActive, sessionId]
  );

  return (
    <SessionContext.Provider
      value={{
        isSessionActive,
        sessionId,
        startSession,
        endSession,
        recordInteractionEvent,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}; 
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface InteractionEventData {
  position?: { x: number; y: number };
  relatedAnnotationId?: string;
  toolType?: string;
  data?: Record<string, any>;
}

interface SessionContextType {
  isSessionActive: boolean;
  sessionId: string | null;
  startSession: () => void;
  endSession: () => void;
  recordInteractionEvent: (
    eventType: string,
    data?: InteractionEventData
  ) => void;
  countdown: number;
  showCountdown: boolean;
  setCountdown: React.Dispatch<React.SetStateAction<number>>;
  setShowCountdown: React.Dispatch<React.SetStateAction<boolean>>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

interface SessionProviderProps {
  children: React.ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [countdown, setCountdown] = useState(10);
  const [showCountdown, setShowCountdown] = useState(true);

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

  // Auto-start session when countdown reaches zero
  useEffect(() => {
    if (showCountdown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showCountdown && countdown === 0) {
      setShowCountdown(false);
      startSession(); // Auto-start session when countdown reaches zero
    }
  }, [countdown, showCountdown, startSession]);

  const value = {
    isSessionActive,
    sessionId,
    startSession,
    endSession,
    recordInteractionEvent,
    countdown,
    showCountdown,
    setCountdown,
    setShowCountdown
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}; 
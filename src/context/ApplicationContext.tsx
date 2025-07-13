import React, { createContext, useContext, useState, useCallback, ReactNode, useReducer, useEffect } from 'react';
import { Annotation, Tool, Group, TraceItem } from '../types/annotations';
import { processTracesForDisplay, generateId } from '../lib/utils';
import { useErrorHandler } from '../components/ErrorBoundary';

// === Types === //
export interface ApplicationState {
  // Annotation state
  annotations: Annotation[];
  groups: Group[];
  selectedAnnotations: string[];
  selectedTool: Tool;
  selectedColor: string;
  
  // Session state
  isSessionActive: boolean;
  sessionId: string | null;
  sessionEvents: SessionEvent[];
  countdown: number;
  showCountdown: boolean;
  
  // UI state
  isRecording: boolean;
  
  // Derived state
  traces: TraceItem[];
  selectedCount: number;
}

export interface SessionEvent {
  type: string;
  timestamp: number;
  sessionId: string;
  data?: any;
}

export interface InteractionEventData {
  toolUsed?: Tool;
  relatedAnnotationId?: string;
  coordinate?: { x: number; y: number };
  [key: string]: any;
}

// === Action Types === //
type ApplicationAction = 
  | { type: 'SET_ANNOTATIONS'; payload: Annotation[] }
  | { type: 'ADD_ANNOTATION'; payload: Omit<Annotation, 'id' | 'timestamp'> }
  | { type: 'UPDATE_ANNOTATION'; payload: { id: string; updates: Partial<Annotation> } }
  | { type: 'DELETE_ANNOTATION'; payload: string }
  | { type: 'SELECT_ANNOTATION'; payload: { id: string; multiSelect: boolean } }
  | { type: 'DESELECT_ALL' }
  | { type: 'SET_SELECTED_TOOL'; payload: Tool }
  | { type: 'SET_SELECTED_COLOR'; payload: string }
  | { type: 'CREATE_GROUP'; payload: string[] }
  | { type: 'START_SESSION' }
  | { type: 'END_SESSION' }
  | { type: 'RECORD_EVENT'; payload: { eventType: string; data?: InteractionEventData } }
  | { type: 'SET_COUNTDOWN'; payload: number }
  | { type: 'SET_SHOW_COUNTDOWN'; payload: boolean }
  | { type: 'SET_RECORDING'; payload: boolean }
  | { type: 'RESET_SESSION' };

// === Context Interface === //
interface ApplicationContextType {
  state: ApplicationState;
  
  // Annotation actions
  setAnnotations: (annotations: Annotation[]) => void;
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'timestamp'>) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  selectAnnotation: (id: string, multiSelect?: boolean) => void;
  deselectAll: () => void;
  setSelectedTool: (tool: Tool) => void;
  setSelectedColor: (color: string) => void;
  createGroup: (annotationIds: string[]) => void;
  
  // Session actions
  startSession: () => void;
  endSession: () => void;
  recordInteractionEvent: (eventType: string, data?: InteractionEventData) => void;
  setCountdown: (count: number) => void;
  setShowCountdown: (show: boolean) => void;
  setRecording: (recording: boolean) => void;
  resetSession: () => void;
  
  // Derived data
  annotations: Annotation[];
  groups: Group[];
  selectedTool: Tool;
  selectedAnnotations: string[];
  selectedColor: string;
  selectedCount: number;
  traces: TraceItem[];
  isSessionActive: boolean;
  sessionId: string | null;
  countdown: number;
  showCountdown: boolean;
  isRecording: boolean;
}

// === Initial State === //
const initialState: ApplicationState = {
  annotations: [],
  groups: [],
  selectedAnnotations: [],
  selectedTool: 'freehand',
  selectedColor: '#2CA800',
  
  isSessionActive: false,
  sessionId: null,
  sessionEvents: [],
  countdown: 3,
  showCountdown: true,
  
  isRecording: false,
  
  traces: [],
  selectedCount: 0,
};

// === Reducer === //
function applicationReducer(state: ApplicationState, action: ApplicationAction): ApplicationState {
  switch (action.type) {
    case 'SET_ANNOTATIONS':
      return {
        ...state,
        annotations: action.payload,
        traces: processTracesForDisplay(action.payload),
      };
      
    case 'ADD_ANNOTATION': {
      const newAnnotation: Annotation = {
        ...action.payload,
        id: generateId('annotation-'),
        timestamp: Date.now(),
      };
      
      const newAnnotations = [...state.annotations, newAnnotation];
      return {
        ...state,
        annotations: newAnnotations,
        traces: processTracesForDisplay(newAnnotations),
      };
    }
    
    case 'UPDATE_ANNOTATION': {
      const newAnnotations = state.annotations.map(annotation =>
        annotation.id === action.payload.id
          ? { ...annotation, ...action.payload.updates }
          : annotation
      );
      
      return {
        ...state,
        annotations: newAnnotations,
        traces: processTracesForDisplay(newAnnotations),
      };
    }
    
    case 'DELETE_ANNOTATION': {
      const newAnnotations = state.annotations.filter(a => a.id !== action.payload);
      const newSelectedAnnotations = state.selectedAnnotations.filter(id => id !== action.payload);
      
      return {
        ...state,
        annotations: newAnnotations,
        selectedAnnotations: newSelectedAnnotations,
        selectedCount: newSelectedAnnotations.length,
        traces: processTracesForDisplay(newAnnotations),
      };
    }
    
    case 'SELECT_ANNOTATION': {
      const { id, multiSelect } = action.payload;
      let newSelectedAnnotations: string[];
      
      if (multiSelect) {
        newSelectedAnnotations = state.selectedAnnotations.includes(id)
          ? state.selectedAnnotations.filter(selectedId => selectedId !== id)
          : [...state.selectedAnnotations, id];
      } else {
        newSelectedAnnotations = state.selectedAnnotations.includes(id) && state.selectedAnnotations.length === 1
          ? []
          : [id];
      }
      
      return {
        ...state,
        selectedAnnotations: newSelectedAnnotations,
        selectedCount: newSelectedAnnotations.length,
      };
    }
    
    case 'DESELECT_ALL':
      return {
        ...state,
        selectedAnnotations: [],
        selectedCount: 0,
      };
    
    case 'SET_SELECTED_TOOL':
      return {
        ...state,
        selectedTool: action.payload,
      };
    
    case 'SET_SELECTED_COLOR':
      return {
        ...state,
        selectedColor: action.payload,
      };
    
    case 'CREATE_GROUP': {
      const annotationIds = action.payload;
      
      if (annotationIds.length < 2) return state;
      
      const groupId = generateId('group-');
      const timestamp = Date.now();
      
      const newGroup: Group = {
        id: groupId,
        memberIds: annotationIds,
        timestamp,
      };
      
      const newAnnotations = state.annotations.map(annotation => {
        if (annotationIds.includes(annotation.id)) {
          const updatedGroupIds = annotation.groupIds 
            ? [...annotation.groupIds, groupId]
            : [groupId];
          
          return { ...annotation, groupIds: updatedGroupIds };
        }
        return annotation;
      });
      
      return {
        ...state,
        annotations: newAnnotations,
        groups: [...state.groups, newGroup],
        traces: processTracesForDisplay(newAnnotations),
      };
    }
    
    case 'START_SESSION': {
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const startEvent: SessionEvent = {
        type: 'session_start',
        timestamp: Date.now(),
        sessionId: newSessionId,
      };
      
      return {
        ...state,
        isSessionActive: true,
        sessionId: newSessionId,
        sessionEvents: [startEvent],
        showCountdown: false,
      };
    }
    
    case 'END_SESSION': {
      if (!state.isSessionActive || !state.sessionId) return state;
      
      const endEvent: SessionEvent = {
        type: 'session_end',
        timestamp: Date.now(),
        sessionId: state.sessionId,
      };
      
      return {
        ...state,
        isSessionActive: false,
        sessionId: null,
        sessionEvents: [...state.sessionEvents, endEvent],
      };
    }
    
    case 'RECORD_EVENT': {
      if (!state.isSessionActive || !state.sessionId) return state;
      
      const event: SessionEvent = {
        type: action.payload.eventType,
        timestamp: Date.now(),
        sessionId: state.sessionId,
        data: action.payload.data,
      };
      
      return {
        ...state,
        sessionEvents: [...state.sessionEvents, event],
      };
    }
    
    case 'SET_COUNTDOWN':
      return {
        ...state,
        countdown: action.payload,
      };
    
    case 'SET_SHOW_COUNTDOWN':
      return {
        ...state,
        showCountdown: action.payload,
      };
    
    case 'SET_RECORDING':
      return {
        ...state,
        isRecording: action.payload,
      };
    
    case 'RESET_SESSION':
      return {
        ...initialState,
        selectedTool: state.selectedTool,
        selectedColor: state.selectedColor,
      };
    
    default:
      return state;
  }
}

// === Context === //
const ApplicationContext = createContext<ApplicationContextType | undefined>(undefined);

// === Custom Hook === //
export const useApplication = () => {
  const context = useContext(ApplicationContext);
  if (context === undefined) {
    throw new Error('useApplication must be used within an ApplicationProvider');
  }
  return context;
};

// === Provider Props === //
interface ApplicationProviderProps {
  children: ReactNode;
  initialAnnotations?: Annotation[];
  initialTool?: Tool;
  onError?: (error: Error) => void;
}

// === Provider Component === //
export const ApplicationProvider: React.FC<ApplicationProviderProps> = ({
  children,
  initialAnnotations = [],
  initialTool = 'freehand',
  onError,
}) => {
  // Use a fallback error handler if useErrorHandler is not available
  const fallbackErrorHandler = useCallback((error: Error) => {
    console.error('ApplicationContext error (fallback):', error);
    // Don't throw here to prevent infinite loops
  }, []);
  
  let handleError = fallbackErrorHandler;
  
  try {
    // Try to use the error handler hook, but don't fail if it's not available
    handleError = useErrorHandler();
  } catch (hookError) {
    // If useErrorHandler fails, use the fallback
    console.warn('useErrorHandler not available, using fallback error handling');
  }
  
  const [state, dispatch] = useReducer(applicationReducer, {
    ...initialState,
    annotations: initialAnnotations,
    selectedTool: initialTool,
    traces: processTracesForDisplay(initialAnnotations),
  });

  // Error handling wrapper
  const safeDispatch = useCallback((action: ApplicationAction) => {
    try {
      dispatch(action);
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error('Unknown error occurred');
      console.error('ApplicationContext error:', errorMessage);
      
      if (onError) {
        onError(errorMessage);
      } else {
        handleError(errorMessage);
      }
    }
  }, [dispatch, onError, handleError]);

  // Auto-start countdown when component mounts and handle countdown logic
  useEffect(() => {
    if (state.showCountdown && state.countdown > 0) {
      const timer = setTimeout(() => {
        safeDispatch({ type: 'SET_COUNTDOWN', payload: state.countdown - 1 });
      }, 1000);
      return () => clearTimeout(timer);
    } else if (state.showCountdown && state.countdown === 0) {
      // Auto-start session when countdown reaches zero
      safeDispatch({ type: 'START_SESSION' });
    }
  }, [state.countdown, state.showCountdown, safeDispatch]);

  // === Action Creators === //
  const setAnnotations = useCallback((annotations: Annotation[]) => {
    safeDispatch({ type: 'SET_ANNOTATIONS', payload: annotations });
  }, [safeDispatch]);

  const addAnnotation = useCallback((annotation: Omit<Annotation, 'id' | 'timestamp'>) => {
    safeDispatch({ type: 'ADD_ANNOTATION', payload: annotation });
  }, [safeDispatch]);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    safeDispatch({ type: 'UPDATE_ANNOTATION', payload: { id, updates } });
  }, [safeDispatch]);

  const deleteAnnotation = useCallback((id: string) => {
    safeDispatch({ type: 'DELETE_ANNOTATION', payload: id });
  }, [safeDispatch]);

  const selectAnnotation = useCallback((id: string, multiSelect = false) => {
    safeDispatch({ type: 'SELECT_ANNOTATION', payload: { id, multiSelect } });
  }, [safeDispatch]);

  const deselectAll = useCallback(() => {
    safeDispatch({ type: 'DESELECT_ALL' });
  }, [safeDispatch]);

  const setSelectedTool = useCallback((tool: Tool) => {
    safeDispatch({ type: 'SET_SELECTED_TOOL', payload: tool });
  }, [safeDispatch]);

  const setSelectedColor = useCallback((color: string) => {
    safeDispatch({ type: 'SET_SELECTED_COLOR', payload: color });
  }, [safeDispatch]);

  const createGroup = useCallback((annotationIds: string[]) => {
    safeDispatch({ type: 'CREATE_GROUP', payload: annotationIds });
  }, [safeDispatch]);

  const startSession = useCallback(() => {
    safeDispatch({ type: 'START_SESSION' });
  }, [safeDispatch]);

  const endSession = useCallback(() => {
    safeDispatch({ type: 'END_SESSION' });
  }, [safeDispatch]);

  const recordInteractionEvent = useCallback((eventType: string, data?: InteractionEventData) => {
    safeDispatch({ type: 'RECORD_EVENT', payload: { eventType, data } });
  }, [safeDispatch]);

  const setCountdown = useCallback((count: number) => {
    safeDispatch({ type: 'SET_COUNTDOWN', payload: count });
  }, [safeDispatch]);

  const setShowCountdown = useCallback((show: boolean) => {
    safeDispatch({ type: 'SET_SHOW_COUNTDOWN', payload: show });
  }, [safeDispatch]);

  const setRecording = useCallback((recording: boolean) => {
    safeDispatch({ type: 'SET_RECORDING', payload: recording });
  }, [safeDispatch]);

  const resetSession = useCallback(() => {
    safeDispatch({ type: 'RESET_SESSION' });
  }, [safeDispatch]);

  // === Context Value === //
  const value: ApplicationContextType = {
    state,
    
    // Actions
    setAnnotations,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    selectAnnotation,
    deselectAll,
    setSelectedTool,
    setSelectedColor,
    createGroup,
    startSession,
    endSession,
    recordInteractionEvent,
    setCountdown,
    setShowCountdown,
    setRecording,
    resetSession,
    
    // Derived data (for backward compatibility)
    annotations: state.annotations,
    groups: state.groups,
    selectedTool: state.selectedTool,
    selectedAnnotations: state.selectedAnnotations,
    selectedColor: state.selectedColor,
    selectedCount: state.selectedCount,
    traces: state.traces,
    isSessionActive: state.isSessionActive,
    sessionId: state.sessionId,
    countdown: state.countdown,
    showCountdown: state.showCountdown,
    isRecording: state.isRecording,
  };

  return (
    <ApplicationContext.Provider value={value}>
      {children}
    </ApplicationContext.Provider>
  );
};

// === Legacy Compatibility Hooks === //
// These hooks provide backward compatibility with the old separate contexts
export const useAnnotations = () => {
  const app = useApplication();
  return {
    annotations: app.annotations,
    groups: app.groups,
    selectedTool: app.selectedTool,
    selectedAnnotations: app.selectedAnnotations,
    selectedColor: app.selectedColor,
    selectedCount: app.selectedCount,
    traces: app.traces,
    isRecording: app.isRecording,
    countdown: app.countdown,
    showCountdown: app.showCountdown,
    
    setAnnotations: app.setAnnotations,
    addAnnotation: app.addAnnotation,
    updateAnnotation: app.updateAnnotation,
    deleteAnnotation: app.deleteAnnotation,
    selectAnnotation: app.selectAnnotation,
    deselectAll: app.deselectAll,
    setSelectedTool: app.setSelectedTool,
    setSelectedColor: app.setSelectedColor,
    createGroup: app.createGroup,
    startRecording: () => app.setRecording(true),
    stopRecording: () => app.setRecording(false),
    resetSession: app.resetSession,
  };
};

export const useSession = () => {
  const app = useApplication();
  return {
    isSessionActive: app.isSessionActive,
    sessionId: app.sessionId,
    countdown: app.countdown,
    showCountdown: app.showCountdown,
    
    startSession: app.startSession,
    endSession: app.endSession,
    recordInteractionEvent: app.recordInteractionEvent,
  };
};

export default ApplicationContext; 
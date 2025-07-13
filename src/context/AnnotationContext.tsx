import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Annotation, Tool, Group, TraceItem } from '../types/annotations';
import { processTracesForDisplay, generateId } from '../lib/utils';

interface AnnotationContextType {
  // State
  annotations: Annotation[];
  groups: Group[];
  selectedTool: Tool;
  selectedAnnotations: string[];
  isRecording: boolean;
  countdown: number;
  showCountdown: boolean;
  selectedColor: string;
  
  // Derived data
  traces: TraceItem[];
  selectedCount: number;
  
  // Actions
  setAnnotations: (annotations: Annotation[]) => void;
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'timestamp'>) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  selectAnnotation: (id: string, multiSelect?: boolean) => void;
  deselectAll: () => void;
  setSelectedTool: (tool: Tool) => void;
  setSelectedColor: (color: string) => void;
  createGroup: (annotationIds: string[]) => void;
  startRecording: () => void;
  stopRecording: () => void;
  resetSession: () => void;
}

const AnnotationContext = createContext<AnnotationContextType | undefined>(undefined);

export const useAnnotations = () => {
  const context = useContext(AnnotationContext);
  if (context === undefined) {
    throw new Error('useAnnotations must be used within an AnnotationProvider');
  }
  return context;
};

interface AnnotationProviderProps {
  children: ReactNode;
  initialAnnotations?: Annotation[];
  initialTool?: Tool;
}

export const AnnotationProvider: React.FC<AnnotationProviderProps> = ({
  children,
  initialAnnotations = [],
  initialTool = 'freehand',
}) => {
  // State
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool>(initialTool);
  const [selectedAnnotations, setSelectedAnnotations] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [showCountdown, setShowCountdown] = useState(true);
  const [selectedColor, setSelectedColor] = useState<string>('#2CA800'); // Default to first palette color

  // Derived data
  const traces = processTracesForDisplay(annotations);
  const selectedCount = selectedAnnotations.length;

  // Actions
  const addAnnotation = useCallback((annotation: Omit<Annotation, 'id' | 'timestamp'>) => {
    const newAnnotation: Annotation = {
      ...annotation,
      id: generateId('annotation-'),
      timestamp: Date.now(),
    };
    
    setAnnotations(prev => [...prev, newAnnotation]);
  }, []);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev => 
      prev.map(annotation => 
        annotation.id === id ? { ...annotation, ...updates } : annotation
      )
    );
  }, []);

  const deleteAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(annotation => annotation.id !== id));
    setSelectedAnnotations(prev => prev.filter(annotationId => annotationId !== id));
  }, []);

  const selectAnnotation = useCallback((id: string, multiSelect = false) => {
    setSelectedAnnotations(prev => {
      if (multiSelect) {
        return prev.includes(id) 
          ? prev.filter(annotationId => annotationId !== id) 
          : [...prev, id];
      } else {
        return [id];
      }
    });
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedAnnotations([]);
  }, []);

  const createGroup = useCallback((annotationIds: string[]) => {
    if (annotationIds.length < 2) return;
    
    const groupId = generateId('group-');
    const timestamp = Date.now();
    
    // Create a new group
    const newGroup: Group = {
      id: groupId,
      memberIds: annotationIds,
      timestamp,
    };
    
    // Update annotations with the group ID - add to existing groupIds array instead of replacing
    setAnnotations(prev => 
      prev.map(annotation => {
        if (annotationIds.includes(annotation.id)) {
          // Add to existing groupIds array or create new array if none exists
          const updatedGroupIds = annotation.groupIds 
            ? [...annotation.groupIds, groupId]
            : [groupId];
          
          return { ...annotation, groupIds: updatedGroupIds };
        }
        return annotation;
      })
    );
    
    // Add the group
    setGroups(prev => [...prev, newGroup]);
    
    console.log(`Created group ${groupId} with ${annotationIds.length} annotations`);
  }, []);

  const startRecording = useCallback(() => {
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  const resetSession = useCallback(() => {
    setAnnotations([]);
    setGroups([]);
    setSelectedAnnotations([]);
    setIsRecording(false);
    setCountdown(10);
    setShowCountdown(true);
  }, []);

  const value = {
    // State
    annotations,
    groups,
    selectedTool,
    selectedAnnotations,
    isRecording,
    countdown,
    showCountdown,
    selectedColor,
    
    // Derived data
    traces,
    selectedCount,
    
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
    startRecording,
    stopRecording,
    resetSession,
  };

  return (
    <AnnotationContext.Provider value={value}>
      {children}
    </AnnotationContext.Provider>
  );
}; 
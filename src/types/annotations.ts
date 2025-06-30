/**
 * Annotation Types
 * Centralized type definitions for the annotation system
 */

// Tool types available in the application
export type Tool =
  | "point"
  | "line"
  | "frame"
  | "area"
  | "freehand"
  | "select"
  | "group";

// Represents a point with x,y coordinates
export interface Point {
  x: number;
  y: number;
}

// Represents a single annotation on the canvas
export interface Annotation {
  id: string;
  type: Tool;
  points: Point[];
  color: string;
  timestamp: number;
  selected?: boolean;
  groupIds?: string[];
  // --- V2 gesture classification metadata ---
  gestureType?: string;
  duration?: number;
  length?: number;
  boundingBox?: number;
  directionChanges?: number;
}

// Represents a group of annotations
export interface Group {
  id: string;
  memberIds: string[];
  timestamp: number;
}

// Represents a trace item in the timeline
export interface TraceItem {
  id: string;
  timestamp: string;
  type: Tool;
  coordinates: string;
  groupId?: string;
  numericTimestamp?: number;
}

// Props for the annotation canvas component
export interface AnnotationCanvasProps {
  imageUrl?: string;
  onAnnotationChange?: (annotations: Annotation[]) => void;
  onSelectionChange?: (selectedCount: number) => void;
  initialAnnotations?: Annotation[];
  selectedTool?: Tool;
  onToolChange?: (tool: Tool) => void;
}

// Props for the traceboard component
export interface TraceboardProps {
  traces?: TraceItem[];
  countdown?: number;
  showCountdown?: boolean;
}

// Props for the toolbox panel component
export interface ToolboxPanelProps {
  selectedTool: Tool;
  onToolSelect: (tool: Tool) => void;
  selectedCount: number;
}

// Props for the session controls component
export interface SessionControlsProps {
  onStart?: () => void;
  onStop?: () => void;
  onTransform?: () => void;
  onReset?: () => void;
  isRecording?: boolean;
  disabled?: boolean;
  countdown?: number;
  showCountdown?: boolean;
} 
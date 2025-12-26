export type NodeType = 'lecture' | 'concept' | 'flashcard' | 'task' | 'quiz' | 'question' | 'summary' | 'resource' | 'note' | 'goal' | 'event' | 'idea' | 'condition';

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'file' | 'audio';
  data: string; // Base64 or text content
}

export interface NodeData {
  label: string;
  front?: string;
  back?: string;
  isFlipped?: boolean;
  attachments: Attachment[];
  quizOptions?: string[]; // For Quiz nodes
  correctAnswer?: string; // For Quiz nodes
  userSelectedAnswer?: string; // For Quiz nodes
}

export interface Node {
  id: string;
  type: NodeType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  completed: boolean;
  data: NodeData;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
}

export interface Group {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface DragState {
  type: 'canvas' | 'node' | 'group' | 'resizeNode' | 'resizeGroup';
  id?: string;
  startX: number;
  startY: number;
  captured?: string[]; // IDs of nodes captured by group
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
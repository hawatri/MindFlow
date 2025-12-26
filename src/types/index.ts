export interface AIStructuredResponse {
  summary: string;
  key_points: string[];
  suggested_next_steps?: string[];
}

export interface Node {
  id: string;
  type: 'lecture' | 'concept' | 'question' | 'summary' | 'task' | 'resource' | 'event' | 'goal' | 'note' | 'idea';
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  completed: boolean;
  data: {
    label: string;
    attachments: Attachment[];
    aiInsight?: AIStructuredResponse;
  };
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

export interface Attachment {
  id: number;
  name: string;
  type: 'file' | 'link';
  url?: string;
  fileType?: 'text' | 'image' | 'other';
  content?: string;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface ContextMenu {
  x: number;
  y: number;
  viewportX?: number;
  viewportY?: number;
  type: 'canvas' | 'edge' | 'node';
  targetId?: string;
}

export interface AIMenu {
  nodeId: string;
  x: number;
  y: number;
}

export interface AppState {
  nodes: Node[];
  edges: Edge[];
  groups: Group[];
  viewport: Viewport;
}

export interface ConnectingState {
  source: string;
  x: number;
  y: number;
  currentX?: number;
  currentY?: number;
}

export interface DragState {
  id: string;
  capturedNodes?: string[];
}
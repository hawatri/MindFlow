import { NodeType } from './types';

export const GRID_SIZE = 20;
export const DEFAULT_NODE_WIDTH = 260;
export const DEFAULT_NODE_HEIGHT = 180;
export const DB_NAME = 'FlowDoDB';
export const DB_VERSION = 1;
export const STORE_NAME = 'appState';
export const STATE_KEY = 'current_flow';
export const SETTINGS_KEY = 'flowdo_settings';

export const COLORS = {
  bg: '#111111',
  grid: '#222222',
  nodeBg: '#1a1a1a',
  nodeHeaderTask: '#2563eb', // Blue
  nodeHeaderGoal: '#059669', // Green
  nodeHeaderLecture: '#7c3aed', // Violet
  nodeHeaderConcept: '#0891b2', // Cyan
  nodeHeaderQuestion: '#be123c', // Rose
  nodeHeaderSummary: '#d97706', // Amber
  nodeHeaderResource: '#4b5563', // Gray
  nodeHeaderNote: '#eab308', // Yellow
  groupHeader: 'rgba(255, 255, 255, 0.1)',
  groupBg: 'rgba(255, 255, 255, 0.02)',
  text: '#e5e7eb',
  wire: '#ffffff',
  wireActive: '#4ade80',
  wireLocked: '#ef4444',
  wireSelected: '#3b82f6',
  selection: 'rgba(59, 130, 246, 0.5)'
};

export const NODE_COLORS: Record<NodeType, { border: string; bg: string; icon: string }> = {
  lecture: { border: '#7c3aed', bg: 'rgba(124, 58, 237, 0.1)', icon: '#a78bfa' }, // Violet
  concept: { border: '#0891b2', bg: 'rgba(8, 145, 178, 0.1)', icon: '#22d3ee' }, // Cyan
  question: { border: '#be123c', bg: 'rgba(190, 18, 60, 0.1)', icon: '#fb7185' }, // Rose
  summary: { border: '#d97706', bg: 'rgba(217, 119, 6, 0.1)', icon: '#fbbf24' }, // Amber
  flashcard: { border: '#059669', bg: 'rgba(5, 150, 105, 0.1)', icon: '#34d399' }, // Emerald
  task: { border: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)', icon: '#60a5fa' }, // Blue
  quiz: { border: '#f43f5e', bg: 'rgba(244, 63, 94, 0.1)', icon: '#fb7185' }, // Rose
  resource: { border: '#4b5563', bg: 'rgba(75, 85, 99, 0.1)', icon: '#9ca3af' }, // Gray
  note: { border: '#eab308', bg: 'rgba(234, 179, 8, 0.1)', icon: '#fde047' }, // Yellow
  goal: { border: '#059669', bg: 'rgba(5, 150, 105, 0.1)', icon: '#34d399' }, // Green
  event: { border: '#059669', bg: 'rgba(5, 150, 105, 0.1)', icon: '#34d399' }, // Green
  idea: { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', icon: '#a78bfa' }, // Violet
  condition: { border: '#4b5563', bg: 'rgba(75, 85, 99, 0.1)', icon: '#9ca3af' }, // Gray
};

export const INITIAL_NODES = [
  { 
    id: '1', 
    type: 'lecture' as NodeType, 
    title: 'Physics 101: Mechanics', 
    x: 100, 
    y: 300, 
    width: 260, 
    height: 160, 
    completed: false, 
    data: { 
      label: 'Chapter 1: Newton\'s Laws\nProf. Smith', 
      attachments: [] 
    } 
  },
  { 
    id: '2', 
    type: 'concept' as NodeType, 
    title: 'Newton\'s First Law', 
    x: 450, 
    y: 150, 
    width: 260, 
    height: 180, 
    completed: false, 
    data: { 
      label: 'An object remains at rest or in uniform motion unless acted upon by a force.', 
      attachments: [] 
    } 
  },
  { 
    id: '3', 
    type: 'question' as NodeType, 
    title: 'Quiz Prep', 
    x: 450, 
    y: 450, 
    width: 260, 
    height: 160, 
    completed: false, 
    data: { 
      label: 'What is the difference between mass and weight?', 
      attachments: [] 
    } 
  },
  { 
    id: '4', 
    type: 'summary' as NodeType, 
    title: 'Lecture Summary', 
    x: 800, 
    y: 300, 
    width: 280, 
    height: 200, 
    completed: false, 
    data: { 
      label: 'Key takeaways:\n1. Inertia matches mass\n2. F=ma is crucial\n3. Action = Reaction', 
      attachments: [] 
    } 
  },
];

export const INITIAL_EDGES = [
  { id: 'e1', source: '1', target: '2' },
  { id: 'e2', source: '1', target: '3' },
  { id: 'e3', source: '2', target: '4' },
  { id: 'e4', source: '3', target: '4' },
];

export const INITIAL_GROUPS = [
  { id: 'g1', title: 'Week 1 Material', x: 50, y: 100, width: 1100, height: 600, color: 'rgba(255, 255, 255, 0.1)' }
];

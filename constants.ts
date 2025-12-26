import { NodeType } from './types';

export const GRID_SIZE = 20;
export const DEFAULT_NODE_WIDTH = 280;
export const DEFAULT_NODE_HEIGHT = 180;
export const DB_NAME = 'FlowDoDB';
export const SETTINGS_KEY = 'flowdo_settings';

export const COLORS = {
  bg: '#09090b',
  grid: '#18181b',
  nodeBg: '#18181b',
  // Study Colors
  lecture: '#7c3aed', // Violet
  concept: '#0891b2', // Cyan
  question: '#be123c', // Rose
  summary: '#d97706', // Amber
  flashcard: '#059669', // Emerald
  // Productivity Colors
  task: '#2563eb', // Blue
  goal: '#db2777', // Pink
  resource: '#4b5563', // Gray
  note: '#eab308', // Yellow
  groupHeader: 'rgba(255, 255, 255, 0.05)',
  groupBg: 'rgba(0, 0, 0, 0.2)',
  text: '#e4e4e7',
  wire: '#52525b',
  wireActive: '#10b981',
  wireLocked: '#ef4444',
  wireSelected: '#3b82f6',
  selection: 'rgba(59, 130, 246, 0.2)'
};

export const NODE_COLORS: Record<NodeType, { border: string; bg: string; icon: string }> = {
  lecture: { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', icon: '#a78bfa' }, // Violet
  concept: { border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)', icon: '#22d3ee' }, // Cyan
  flashcard: { border: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', icon: '#34d399' }, // Emerald
  task: { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', icon: '#60a5fa' }, // Blue
  quiz: { border: '#f43f5e', bg: 'rgba(244, 63, 94, 0.1)', icon: '#fb7185' }, // Rose
};

export const INITIAL_NODES = [
  { 
    id: '1', 
    type: 'lecture' as NodeType, 
    title: 'Biology: Cell Structure', 
    x: 100, 
    y: 300, 
    width: 280, 
    height: 160, 
    completed: false, 
    data: { 
      label: 'Topic: Mitochondria & Ribosomes\nSource: Chapter 4', 
      attachments: [] 
    } 
  },
  { 
    id: '2', 
    type: 'concept' as NodeType, 
    title: 'Mitochondria', 
    x: 450, 
    y: 150, 
    width: 280, 
    height: 180, 
    completed: false, 
    data: { 
      label: 'The powerhouse of the cell. Responsible for cellular respiration and ATP production.', 
      attachments: [] 
    } 
  },
  { 
    id: '3', 
    type: 'flashcard' as NodeType, 
    title: 'Flashcard: ATP', 
    x: 450, 
    y: 450, 
    width: 260, 
    height: 160, 
    completed: false, 
    data: { 
      label: '', 
      front: 'What does ATP stand for?', 
      back: 'Adenosine Triphosphate - the energy currency of the cell.', 
      isFlipped: false, 
      attachments: [] 
    } 
  },
];

export const INITIAL_EDGES = [
  { id: 'e1', source: '1', target: '2' },
  { id: 'e2', source: '1', target: '3' },
];

export const INITIAL_GROUPS = [
  { id: 'g1', title: 'Unit 1: The Cell', x: 50, y: 100, width: 800, height: 600, color: 'rgba(124, 58, 237, 0.1)' }
];

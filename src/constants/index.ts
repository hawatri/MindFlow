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
  nodeHeaderNote: '#6b7280', // Gray
  nodeHeaderIdea: '#8b5cf6', // Purple
  nodeHeaderEvent: '#059669', // Green
  groupHeader: 'rgba(255, 255, 255, 0.1)',
  groupBg: 'rgba(255, 255, 255, 0.02)',
  text: '#e5e7eb',
  wire: '#ffffff',
  wireActive: '#4ade80',
  wireLocked: '#ef4444',
  wireSelected: '#3b82f6',
  selection: 'rgba(59, 130, 246, 0.5)'
};

export const NODE_TYPES = {
  task: 'Task',
  event: 'Event',
  goal: 'Goal',
  note: 'Note',
  idea: 'Idea',
  lecture: 'Lecture',
  concept: 'Concept',
  question: 'Question',
  summary: 'Summary',
  resource: 'Resource'
};

export const MOCK_AI_RESPONSES = {
  explain: {
    summary: "Inertia is the resistance of any physical object to any change in its velocity. This includes changes to the object's speed, or direction of motion. It's a fundamental concept in Newton's First Law of Motion.",
    key_points: [
      "Objects at rest tend to stay at rest",
      "Objects in motion tend to stay in motion",
      "Inertia is directly proportional to mass",
      "No net force means no change in motion"
    ],
    suggested_next_steps: [
      "Explore real-world examples of inertia",
      "Study Newton's First Law in detail",
      "Practice problems involving inertial frames"
    ]
  },
  quiz: ["Q: What is the formula for Force? (A: F=ma)", "Q: If acceleration is zero, what is the net force? (A: Zero)", "Q: Does mass change on the moon? (A: No)"],
  decompose: ["Review textbook Ch.2", "Watch lab video", "Complete practice set", "Write summary"],
  brainstorm: ["Mind map connections", "Real-world examples", "Historical context", "Mathematical derivation"],
  enhance: {
    summary: "This concept requires a systematic approach focusing on system boundaries, force identification, and vector mathematics.",
    key_points: [
      "Define clear system boundaries before analysis",
      "Identify all external forces acting on the system",
      "Apply vector addition principles correctly",
      "Consider both magnitude and direction of forces"
    ],
    suggested_next_steps: [
      "Practice drawing free-body diagrams",
      "Work through vector addition examples",
      "Review coordinate system selection"
    ]
  },
  flow: [
    { id: 1, title: 'Introduction', type: 'lecture', description: 'Overview of the topic', dependsOn: [] },
    { id: 2, title: 'Core Concept', type: 'concept', description: 'Main definition and theory', dependsOn: [1] }
  ]
};
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { 
  GraduationCap, Settings, Download, Upload, Sparkles, Database, MessageSquare, Wand2, Maximize2, Eye, EyeOff 
} from 'lucide-react';

// Components
import { Wire } from './components/Wire';
import { FlowNode } from './components/FlowNode';
import { NodeGroup } from './components/NodeGroup';
import { ContextMenuComponent, AIMenuComponent } from './components/ContextMenus';
import { SettingsModal, TopicModal, LoadingOverlay } from './components/Modals';
import { ChatSidebar } from './components/ChatSidebar';
import { Minimap } from './components/Minimap';
import { ZoomControls } from './components/ZoomControls';

// Hooks
import { useCanvasInteractions } from './hooks/useCanvasInteractions';

// Utils
import { saveStateToDB, loadStateFromDB, clearDB } from './utils/database';
import { fileToBase64, fileToText, pdfToText, downloadFlow, uploadFlow } from './utils/fileHandlers';
import { generateAIContent, generateChatResponse } from './utils/aiService';
import { organizeNodesInViewport } from './utils/layout';

// Data
import { initialNodes, initialEdges, initialGroups } from './data/initialData';

// Constants
import { GRID_SIZE, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, SETTINGS_KEY, NODE_TYPES } from './constants';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;

// Toast style helpers
const toastStyle = {
  background: '#18181b',
  color: '#f4f4f5',
  border: '1px solid #3f3f46',
};

const toastError = (message: string) => {
  toast.error(message, {
    style: toastStyle,
    iconTheme: {
      primary: '#ef4444',
      secondary: '#f4f4f5',
    },
  });
};

const toastSuccess = (message: string) => {
  toast.success(message, {
    style: toastStyle,
    iconTheme: {
      primary: '#a855f7',
      secondary: '#f4f4f5',
    },
  });
};

// Types
import type { 
  Node, Edge, Group, Viewport, ContextMenu, AIMenu, 
  ConnectingState, DragState, Attachment 
} from './types';

function FlowDo() {
  // State
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [selection, setSelection] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [aiMenu, setAiMenu] = useState<AIMenu | null>(null);
  const [saveStatus, setSaveStatus] = useState<'loading' | 'saving' | 'saved' | 'error'>('loading');
  const [isDbReady, setIsDbReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showChatSidebar, setShowChatSidebar] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [topicInput, setTopicInput] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(SETTINGS_KEY) || '');
  const [importedText, setImportedText] = useState<string>('');
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null);
  const [isResizingNode, setIsResizingNode] = useState<string | null>(null);
  const [isDraggingGroup, setIsDraggingGroup] = useState<DragState | null>(null);
  const [isResizingGroup, setIsResizingGroup] = useState<string | null>(null);
  const [attachingNodeId, setAttachingNodeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [connecting, setConnecting] = useState<ConnectingState | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonUploadRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Canvas interactions hook
  const canvasInteractions = useCanvasInteractions({
    viewport,
    setViewport,
    isDraggingCanvas,
    setIsDraggingCanvas,
    isDraggingNode,
    setIsDraggingNode,
    isDraggingGroup,
    setIsDraggingGroup,
    isResizingNode,
    setIsResizingNode,
    isResizingGroup,
    setIsResizingGroup,
    connecting,
    setConnecting,
    dragStart,
    setDragStart,
    setSelection,
    setContextMenu,
    setAiMenu,
    onUpdateNodes: setNodes,
    onUpdateGroups: setGroups,
    canvasRef
  });

  // Database operations
  useEffect(() => {
    const initializeDB = async () => {
      try {
        const savedState = await loadStateFromDB();
        if (savedState) {
          setNodes(savedState.nodes);
          setEdges(savedState.edges);
          setGroups(savedState.groups);
          setViewport(savedState.viewport);
        }
        setSaveStatus('saved');
      } catch (e) {
        setSaveStatus('error');
      } finally {
        setIsDbReady(true);
      }
    };
    initializeDB();
  }, []);

  useEffect(() => {
    if (!isDbReady) return;
    
    const saveTimer = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        await saveStateToDB({ nodes, edges, groups, viewport });
        setSaveStatus('saved');
      } catch (e) {
        setSaveStatus('error');
      }
    }, 200);
    
    return () => clearTimeout(saveTimer);
  }, [nodes, edges, groups, viewport, isDbReady]);

  // Helper functions
  const isNodeInGroup = (node: Node, group: Group) => 
    node.x >= group.x && 
    node.x + (node.width || 240) <= group.x + group.width && 
    node.y >= group.y && 
    node.y + (node.height || 160) <= group.y + group.height;

  const isNodeLocked = (nodeId: string) => {
    const incomingEdges = edges.filter(e => e.target === nodeId);
    return incomingEdges.length > 0 && 
           !incomingEdges.every(e => nodes.find(n => n.id === e.source)?.completed);
  };

  const getPinPos = (node: Node, type: 'input' | 'output') => {
    const y = 61;
    const w = node.width || DEFAULT_NODE_WIDTH;
    return type === 'input' 
      ? { x: node.x, y: node.y + y } 
      : { x: node.x + w, y: node.y + y };
  };

  // Event handlers
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (e.button === 0) {
      const node = nodes.find(n => n.id === id);
      // Don't allow dragging if node is pinned
      if (node?.pinned) {
        setSelection(id);
        return;
      }
      setIsDraggingNode(id);
      setDragStart({ x: e.clientX, y: e.clientY });
      setSelection(id);
      setContextMenu(null);
      setAiMenu(null);
    }
  }, [nodes, setIsDraggingNode, setDragStart, setSelection, setContextMenu, setAiMenu]);

  const handleGroupMouseDown = useCallback((e: React.MouseEvent, group: Group) => {
    e.stopPropagation();
    if (e.button === 0) {
      // Don't allow dragging if group is pinned
      if (group.pinned) {
        setSelection(group.id);
        return;
      }
      const capturedNodes = nodes.filter(n => isNodeInGroup(n, group)).map(n => n.id);
      setIsDraggingGroup({ id: group.id, capturedNodes });
      setDragStart({ x: e.clientX, y: e.clientY });
      setSelection(group.id);
      setContextMenu(null);
      setAiMenu(null);
    }
  }, [nodes, setIsDraggingGroup, setDragStart, setSelection, setContextMenu, setAiMenu]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, id: string, type: 'node' | 'group') => {
    e.stopPropagation();
    e.preventDefault();
    if (e.button === 0) {
      // Don't allow resizing if pinned
      if (type === 'node') {
        const node = nodes.find(n => n.id === id);
        if (node?.pinned) {
          setSelection(id);
          return;
        }
        setIsResizingNode(id);
      } else {
        const group = groups.find(g => g.id === id);
        if (group?.pinned) {
          setSelection(id);
          return;
        }
        setIsResizingGroup(id);
      }
      setDragStart({ x: e.clientX, y: e.clientY });
      setSelection(id);
      setContextMenu(null);
    }
  }, [nodes, groups, setIsResizingNode, setIsResizingGroup, setDragStart, setSelection, setContextMenu]);

  const handlePinMouseDown = useCallback((e: React.MouseEvent, nodeId: string, _type: string) => {
    e.stopPropagation();
    if (e.button === 0) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setConnecting({
        source: nodeId,
        x: (rect.left + rect.width / 2 - viewport.x) / viewport.zoom,
        y: (rect.top + rect.height / 2 - viewport.y) / viewport.zoom
      });
    }
  }, [viewport, setConnecting]);

  const handlePinMouseUp = useCallback((e: React.MouseEvent, targetId: string, type: string) => {
    e.stopPropagation();
    if (connecting && type === 'input' && connecting.source !== targetId) {
      if (!edges.find(edge => edge.source === connecting.source && edge.target === targetId)) {
        setEdges(prev => [...prev, { 
          id: `e-${Date.now()}`, 
          source: connecting.source, 
          target: targetId 
        }]);
      }
      setConnecting(null);
    }
  }, [connecting, edges, setEdges, setConnecting]);

  const handleEdgeContextMenu = useCallback((e: React.MouseEvent, edgeId: string) => {
    setSelection(edgeId);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type: 'edge',
      targetId: edgeId
    });
    setAiMenu(null);
  }, [setSelection, setContextMenu, setAiMenu]);

  const handleNodeContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    setSelection(nodeId);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type: 'node',
      targetId: nodeId
    });
    setAiMenu(null);
  }, [setSelection, setContextMenu, setAiMenu]);

  const handleGroupContextMenu = useCallback((e: React.MouseEvent, groupId: string) => {
    e.preventDefault();
    setSelection(groupId);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type: 'group',
      targetId: groupId
    });
    setAiMenu(null);
  }, [setSelection, setContextMenu, setAiMenu]);

  // CRUD operations
  const addNode = useCallback((type: string) => {
    if (!contextMenu) return;
    
    const nodeTitle = NODE_TYPES[type as keyof typeof NODE_TYPES] || 'Node';
    setNodes(prev => [...prev, {
      id: `n-${Date.now()}`,
      type: type as Node['type'],
      title: nodeTitle,
      x: contextMenu.viewportX!,
      y: contextMenu.viewportY!,
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
      completed: false,
      data: { label: '', attachments: [] }
    }]);
    setContextMenu(null);
  }, [contextMenu, setNodes, setContextMenu]);

  const addGroup = useCallback(() => {
    if (!contextMenu) return;
    
    setGroups(prev => [...prev, {
      id: `g-${Date.now()}`,
      title: 'New Group',
      x: contextMenu.viewportX!,
      y: contextMenu.viewportY!,
      width: 400,
      height: 300,
      color: 'rgba(255, 255, 255, 0.1)'
    }]);
    setContextMenu(null);
  }, [contextMenu, setGroups, setContextMenu]);

  const deleteNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id));
    setSelection(null);
    setContextMenu(null);
  }, [setNodes, setEdges, setSelection, setContextMenu]);

  const deleteEdge = useCallback((id: string) => {
    setEdges(prev => prev.filter(e => e.id !== id));
    setSelection(null);
    setContextMenu(null);
  }, [setEdges, setSelection, setContextMenu]);

  const deleteGroup = useCallback((id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id));
    setSelection(null);
    setContextMenu(null);
  }, [setGroups, setSelection, setContextMenu]);

  const updateNode = useCallback((id: string, updates: Partial<Node>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, [setNodes]);

  const updateGroup = useCallback((id: string, updates: Partial<Group>) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  }, [setGroups]);

  const togglePinNode = useCallback((id: string) => {
    setNodes(prev => prev.map(n => 
      n.id === id ? { ...n, pinned: !n.pinned } : n
    ));
    setContextMenu(null);
  }, [setNodes, setContextMenu]);

  const togglePinGroup = useCallback((id: string) => {
    setGroups(prev => prev.map(g => 
      g.id === id ? { ...g, pinned: !g.pinned } : g
    ));
    setContextMenu(null);
  }, [setGroups, setContextMenu]);

  const deleteAttachment = useCallback((nodeId: string, attachmentId: number) => {
    setNodes(prev => prev.map(n => 
      n.id === nodeId 
        ? { 
            ...n, 
            data: { 
              ...n.data, 
              attachments: n.data.attachments.filter(a => a.id !== attachmentId) 
            } 
          } 
        : n
    ));
  }, [setNodes]);

  // File handling
  const handleAttachClick = useCallback((nodeId: string) => {
    setAttachingNodeId(nodeId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, [setAttachingNodeId]);

  const handleAddLink = useCallback((nodeId: string) => {
    const url = window.prompt("URL:");
    if (url) {
      setNodes(prev => prev.map(n => 
        n.id === nodeId 
          ? { 
              ...n, 
              data: { 
                ...n.data, 
                attachments: [...(n.data.attachments || []), {
                  id: Date.now(),
                  name: url,
                  type: 'link',
                  url
                }] 
              } 
            } 
          : n
      ));
    }
  }, [setNodes]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !attachingNodeId) return;

    try {
      setSaveStatus('saving');
      let attachmentData: Attachment = {
        id: Date.now(),
        name: file.name,
        type: 'file'
      };

      if (file.type.startsWith('image/')) {
        const url = await fileToBase64(file);
        attachmentData = { ...attachmentData, fileType: 'image', url };
      } else if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const content = await fileToText(file);
        attachmentData = { ...attachmentData, fileType: 'text', content };
      } else {
        const url = await fileToBase64(file);
        attachmentData = { ...attachmentData, fileType: 'other', url };
      }

      setNodes(prev => prev.map(n => 
        n.id === attachingNodeId 
          ? { 
              ...n, 
              data: { 
                ...n.data, 
                attachments: [...(n.data.attachments || []), attachmentData] 
              } 
            } 
          : n
      ));
    } catch (err) {
      toastError("File processing error");
    }
    setAttachingNodeId(null);
  }, [attachingNodeId, setNodes, setSaveStatus, setAttachingNodeId]);

  // AI operations
  const handleAIOperation = useCallback(async (operation: string, nodeId: string) => {
    setAiMenu(null);
    setIsAiLoading(true);
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const prompt = node.title + (node.data.label ? ": " + node.data.label : "");
    const attachment = node.data.attachments?.find(a => a.fileType === 'text' || a.fileType === 'image');

    try {
      if (operation === 'enhance' || operation === 'explain') {
        const structuredResult = await generateAIContent(operation, prompt, apiKey, attachment);
        setNodes(prev => prev.map(n => 
          n.id === nodeId 
            ? { 
                ...n, 
                data: { 
                  ...n.data, 
                  aiInsight: structuredResult
                } 
              } 
            : n
        ));
      } else {
        const items = await generateAIContent(operation, prompt, apiKey, attachment);
        if (Array.isArray(items) && items.length > 0) {
          const newNodes: Node[] = [];
          const newEdges: Edge[] = [];
          const startX = node.x + node.width + 100;
          const startY = node.y - ((items.length - 1) * 180) / 2;
          const targetType = operation === 'quiz' ? 'question' : (operation === 'brainstorm' ? 'idea' : 'task');

          items.forEach((item, index) => {
            const newNodeId = `ai-${Date.now()}-${index}`;
            newNodes.push({
              id: newNodeId,
              type: targetType as Node['type'],
              title: operation === 'quiz' ? 'Question' : 'Sub-item',
              x: startX,
              y: startY + (index * 200),
              width: DEFAULT_NODE_WIDTH,
              height: DEFAULT_NODE_HEIGHT,
              completed: false,
              data: { label: item, attachments: [] }
            });
            newEdges.push({
              id: `ai-e-${Date.now()}-${index}`,
              source: node.id,
              target: newNodeId
            });
          });

          setNodes(prev => [...prev, ...newNodes]);
          setEdges(prev => [...prev, ...newEdges]);
        } else {
          toastError("AI returned no suggestions.");
        }
      }
    } catch (e) {
      toastError(`AI Failed: ${(e as Error).message}`);
    } finally {
      setIsAiLoading(false);
    }
  }, [nodes, apiKey, setAiMenu, setIsAiLoading, setNodes, setEdges]);

  const handleImportFileForFlow = useCallback(async (file: File) => {
    try {
      setIsAiLoading(true);
      let text = '';
      
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        text = await pdfToText(file);
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        text = await fileToText(file);
      } else {
        toastError('Unsupported file type. Please upload a PDF or text file.');
        setIsAiLoading(false);
        return;
      }
      
      setImportedText(text);
      setImportedFileName(file.name);
    } catch (error) {
      console.error('File import error:', error);
      toastError('Failed to import file. Please try again.');
      setIsAiLoading(false);
    } finally {
      setIsAiLoading(false);
    }
  }, [setIsAiLoading, setImportedText, setImportedFileName]);

  const handleGenerateFlow = useCallback(async () => {
    if (!topicInput.trim() && !importedText) {
      toastError('Please enter a topic or upload a file');
      return;
    }
    
    setShowTopicModal(false);
    setIsAiLoading(true);
    
    try {
      const prompt = topicInput.trim() || (importedFileName ? `Content from ${importedFileName}` : 'Study Plan');
      const steps = await generateAIContent('flow', prompt, apiKey, null, importedText);
      console.log('Generated steps:', steps);
      
      if (!Array.isArray(steps)) {
        console.error('Steps is not an array:', steps);
        toastError("AI returned an invalid format. Please try again.");
        setIsAiLoading(false);
        setTopicInput('');
        return;
      }
      
      if (steps.length === 0) {
        toastError("AI could not generate a valid plan. Please try a different topic.");
        setIsAiLoading(false);
        setTopicInput('');
        return;
      }

      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];
      const idMap: Record<number | string, string> = {};
      const timestamp = Date.now();
      const centerX = -viewport.x + (window.innerWidth - (showChatSidebar ? 384 : 0)) / 2 / viewport.zoom;
      const centerY = -viewport.y + window.innerHeight / 2 / viewport.zoom;

      // First pass: create ID map
      steps.forEach((step: any, index: number) => {
        const stepId = step.id !== undefined ? step.id : index + 1;
        idMap[stepId] = `gen-${timestamp}-${stepId}`;
      });

      // Second pass: create nodes
      steps.forEach((step: any, index: number) => {
        const stepId = step.id !== undefined ? step.id : index + 1;
        const nodeId = idMap[stepId];
        
        if (!nodeId) {
          console.warn('Missing node ID for step:', step);
          return;
        }

        newNodes.push({
          id: nodeId,
          type: ['lecture', 'concept', 'question', 'summary', 'task'].includes(step.type) 
            ? step.type 
            : 'lecture',
          title: step.title || `Step ${index + 1}`,
          x: centerX - (DEFAULT_NODE_WIDTH / 2) + (index % 3 - 1) * (DEFAULT_NODE_WIDTH + 40),
          y: centerY - ((steps.length - 1) * 200) / 2 + (index * 200),
          width: DEFAULT_NODE_WIDTH,
          height: DEFAULT_NODE_HEIGHT,
          completed: false,
          data: { label: step.description || step.content || '', attachments: [] }
        });

        // Create edges based on dependencies
        if (step.dependsOn && Array.isArray(step.dependsOn)) {
          step.dependsOn.forEach((depId: number | string) => {
            const sourceId = idMap[depId];
            if (sourceId && nodeId) {
              newEdges.push({
                id: `gen-e-${timestamp}-${depId}-${stepId}`,
                source: sourceId,
                target: nodeId
              });
            }
          });
        }
      });

      // Create a group to contain all the nodes
      if (newNodes.length > 0) {
        const minX = Math.min(...newNodes.map(n => n.x)) - 50;
        const maxX = Math.max(...newNodes.map(n => n.x + n.width)) + 50;
        const minY = Math.min(...newNodes.map(n => n.y)) - 80;
        const maxY = Math.max(...newNodes.map(n => n.y + n.height)) + 50;

        const newGroup: Group = {
          id: `g-gen-${timestamp}`,
          title: topicInput,
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          color: 'rgba(255, 255, 255, 0.1)'
        };

        setNodes(prev => [...prev, ...newNodes]);
        setEdges(prev => [...prev, ...newEdges]);
        setGroups(prev => [...prev, newGroup]);
      } else {
        toastError("No nodes were created. Please try again.");
      }
    } catch (e) {
      console.error('Flow generation error:', e);
      toastError(`AI Flow Failed: ${(e as Error).message}`);
    } finally {
      setIsAiLoading(false);
      setTopicInput('');
      setImportedText('');
      setImportedFileName(null);
    }
  }, [topicInput, importedText, importedFileName, apiKey, viewport, showChatSidebar, setShowTopicModal, setIsAiLoading, setNodes, setEdges, setGroups, setTopicInput, setImportedText, setImportedFileName]);

  // Chat handler
  const handleChatQuery = useCallback(async (query: string, visibleNodesContext: string): Promise<string> => {
    return await generateChatResponse(query, visibleNodesContext, apiKey);
  }, [apiKey]);

  // Zoom handler
  const handleZoomChange = useCallback((newZoom: number) => {
    setViewport(prev => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))
    }));
  }, [setViewport]);

  // Magic Organize handler
  const handleMagicOrganize = useCallback(() => {
    if (nodes.length === 0) {
      toastError('No nodes to organize');
      return;
    }

    const canvasWidth = window.innerWidth - (showChatSidebar ? 384 : 0);
    const canvasHeight = window.innerHeight;

    const organizedNodes = organizeNodesInViewport(
      nodes,
      edges,
      viewport.x,
      viewport.y,
      canvasWidth,
      canvasHeight
    );

    setNodes(organizedNodes);
  }, [nodes, edges, viewport, showChatSidebar, setNodes]);

  // Fit to View handler
  const handleFitToView = useCallback(() => {
    if (nodes.length === 0) {
      toastError('No nodes to fit');
      return;
    }

    const canvasWidth = window.innerWidth - (showChatSidebar ? 384 : 0);
    const canvasHeight = window.innerHeight;

    // Calculate bounding box of all nodes
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x + (n.width || DEFAULT_NODE_WIDTH)));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y + (n.height || DEFAULT_NODE_HEIGHT)));

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Add padding (10% on each side)
    const padding = 0.1;
    const paddedWidth = contentWidth * (1 + padding * 2);
    const paddedHeight = contentHeight * (1 + padding * 2);

    // Calculate zoom to fit
    const zoomX = canvasWidth / paddedWidth;
    const zoomY = canvasHeight / paddedHeight;
    const newZoom = Math.min(zoomX, zoomY, 1); // Don't zoom in beyond 1x

    // Center the content in viewport
    const newX = -(centerX * newZoom - canvasWidth / 2);
    const newY = -(centerY * newZoom - canvasHeight / 2);

    setViewport({
      x: newX,
      y: newY,
      zoom: newZoom
    });
  }, [nodes, showChatSidebar, setViewport]);

  // Settings
  const saveSettings = useCallback(() => {
    localStorage.setItem(SETTINGS_KEY, apiKey);
    setShowSettings(false);
    toastSuccess("Saved!");
  }, [apiKey, setShowSettings]);

  const handleReset = useCallback(async () => {
    if (window.confirm('Reset all data?')) {
      await clearDB();
      window.location.reload();
    }
  }, []);

  const handleUploadFlow = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await uploadFlow(file);
      
      // Confirm before overwriting current data
      if (nodes.length > 0 || edges.length > 0 || groups.length > 0) {
        if (!window.confirm('This will replace your current flow. Continue?')) {
          if (jsonUploadRef.current) {
            jsonUploadRef.current.value = '';
          }
          return;
        }
      }

      // Restore the state
      setNodes(data.nodes);
      setEdges(data.edges);
      setGroups(data.groups);
      setViewport(data.viewport);
      
      toastSuccess('Flow loaded successfully!');
    } catch (error) {
      toastError(`Failed to load flow: ${(error as Error).message}`);
    } finally {
      // Reset the input
      if (jsonUploadRef.current) {
        jsonUploadRef.current.value = '';
      }
    }
  }, [nodes, edges, groups, setNodes, setEdges, setGroups, setViewport]);

  if (!isDbReady) {
    return (
      <div className="w-full h-screen bg-zinc-950 flex items-center justify-center text-white">
        <Database className="animate-pulse mr-2" /> Loading Database...
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-zinc-950 text-white font-sans select-none relative">
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#18181b',
            color: '#f4f4f5',
            border: '1px solid #3f3f46',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontFamily: 'inherit',
          },
          success: {
            iconTheme: {
              primary: '#a855f7',
              secondary: '#f4f4f5',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f4f4f5',
            },
          },
        }}
      />
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={jsonUploadRef} 
        accept=".json" 
        onChange={handleUploadFlow} 
        className="hidden" 
      />

      {/* Modals */}
      <SettingsModal
        isOpen={showSettings}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
        onSave={saveSettings}
        onClose={() => setShowSettings(false)}
      />

      <TopicModal
        isOpen={showTopicModal}
        topicInput={topicInput}
        onTopicInputChange={setTopicInput}
        onGenerate={handleGenerateFlow}
        onClose={() => {
          setShowTopicModal(false);
          setImportedText('');
          setImportedFileName(null);
        }}
        isLoading={isAiLoading}
        onFileUpload={handleImportFileForFlow}
        fileName={importedFileName}
      />

      <LoadingOverlay isVisible={isAiLoading} />

      {/* Header */}
      <div className="absolute top-4 left-4 z-50 pointer-events-none">
        <h1 className="text-3xl font-bold tracking-tighter text-white opacity-80 flex items-center gap-2">
          <GraduationCap className="w-8 h-8 text-indigo-500" /> 
          FlowDo 
          <span className="text-sm font-normal text-zinc-500">Learning</span>
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Right-click: Add Nodes | Wand: AI Tools</p>
      </div>

      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-50 flex gap-2 pointer-events-auto items-center">
        <div className={`text-xs mr-2 font-mono ${
          saveStatus === 'error' ? 'text-red-500' : 'text-zinc-500'
        }`}>
          {saveStatus === 'saving' ? 'Saving...' : (saveStatus === 'error' ? 'Error!' : 'Saved')}
        </div>
        <button 
          onClick={handleFitToView} 
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2"
          title="Fit all nodes to view"
        >
          <Maximize2 size={14} /> Fit to View
        </button>
        <button 
          onClick={handleMagicOrganize} 
          className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/40 hover:to-pink-600/40 text-purple-300 border border-purple-500/50 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2"
          title="Automatically organize all nodes into a clean hierarchical layout"
        >
          <Wand2 size={14} /> Magic Organize
        </button>
        <button 
          onClick={() => setShowChatSidebar(!showChatSidebar)} 
          className={`${showChatSidebar ? 'bg-indigo-600/40 hover:bg-indigo-600/60' : 'bg-indigo-600/20 hover:bg-indigo-600/40'} text-indigo-300 border border-indigo-500/50 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2`}
        >
          <MessageSquare size={14} /> Chat
        </button>
        <button 
          onClick={() => setShowTopicModal(true)} 
          className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/50 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2"
          title="Generate a study plan from a topic"
        >
          <Sparkles size={14} /> Plan
        </button>
        <button 
          onClick={() => setShowMinimap(!showMinimap)} 
          className={`${showMinimap ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-800/50 hover:bg-zinc-700/50'} text-zinc-300 border border-zinc-700 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2`}
          title={showMinimap ? "Hide minimap" : "Show minimap"}
        >
          {showMinimap ? <EyeOff size={14} /> : <Eye size={14} />} Minimap
        </button>
        <button 
          onClick={() => setShowSettings(true)} 
          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-md border border-zinc-700 text-zinc-300"
        >
          <Settings size={16} />
        </button>
        <button 
          onClick={() => jsonUploadRef.current?.click()} 
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-700 transition-colors"
          title="Upload saved flow"
        >
          <Upload size={14} />
        </button>
        <button 
          onClick={() => downloadFlow(nodes, edges, groups, viewport)} 
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-700 transition-colors"
          title="Download flow as JSON"
        >
          <Download size={14} />
        </button>
        <button 
          onClick={handleReset} 
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-700"
        >
          Reset
        </button>
      </div>

      {/* Canvas */}
      <div 
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={canvasInteractions.handleMouseDown}
        onMouseMove={canvasInteractions.handleMouseMove}
        onMouseUp={canvasInteractions.handleMouseUp}
        onWheel={canvasInteractions.handleWheel}
        onContextMenu={canvasInteractions.handleContextMenu}
        style={{
          backgroundSize: `${GRID_SIZE * viewport.zoom}px ${GRID_SIZE * viewport.zoom}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          backgroundImage: `linear-gradient(#222222 1px, transparent 1px), linear-gradient(90deg, #222222 1px, transparent 1px)`
        }}
      >
        <div 
          className="w-full h-full origin-top-left transition-transform duration-75 ease-out"
          style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}
        >
          {/* Groups */}
          {groups.map(group => (
            <NodeGroup
              key={group.id}
              group={group}
              isSelected={selection === group.id}
              onMouseDown={handleGroupMouseDown}
              onResizeMouseDown={(e, id) => handleResizeMouseDown(e, id, 'group')}
              onUpdateGroup={updateGroup}
              onDeleteGroup={deleteGroup}
              onContextMenu={handleGroupContextMenu}
            />
          ))}

          {/* Wires */}
          <svg className="absolute top-0 left-0 overflow-visible pointer-events-none w-1 h-1" style={{ zIndex: 10 }}>
            {edges.map(edge => {
              const source = nodes.find(n => n.id === edge.source);
              const target = nodes.find(n => n.id === edge.target);
              if (!source || !target) return null;

              const start = getPinPos(source, 'output');
              const end = getPinPos(target, 'input');
              const status = isNodeLocked(target.id) ? 'locked' : (source.completed ? 'active' : 'default');

              return (
                <Wire
                  key={edge.id}
                  id={edge.id}
                  start={start}
                  end={end}
                  status={status}
                  isSelected={selection === edge.id}
                  onSelect={setSelection}
                  onContextMenu={handleEdgeContextMenu}
                />
              );
            })}
            {connecting && connecting.currentX !== undefined && connecting.currentY !== undefined && (
              <Wire
                start={getPinPos(nodes.find(n => n.id === connecting.source)!, 'output')}
                end={{ x: connecting.currentX, y: connecting.currentY }}
                status="default"
                id="dragging-wire"
                onSelect={() => {}}
                onContextMenu={() => {}}
              />
            )}
          </svg>

          {/* Nodes */}
          {nodes.map(node => (
            <FlowNode
              key={node.id}
              node={node}
              isLocked={isNodeLocked(node.id)}
              isSelected={selection === node.id}
              onMouseDown={handleNodeMouseDown}
              onResizeMouseDown={(e, id) => handleResizeMouseDown(e, id, 'node')}
              onPinMouseDown={handlePinMouseDown}
              onPinMouseUp={handlePinMouseUp}
              onUpdateNode={updateNode}
              onDeleteNode={deleteNode}
              onDeleteAttachment={deleteAttachment}
              onAttachClick={handleAttachClick}
              onAddLink={handleAddLink}
              onAIClick={(e, nodeId) => {
                e.stopPropagation();
                setAiMenu({ nodeId, x: e.clientX, y: e.clientY });
              }}
              onContextMenu={handleNodeContextMenu}
            />
          ))}
        </div>
      </div>

      {/* Context Menus */}
      {contextMenu && (
        <ContextMenuComponent
          contextMenu={contextMenu}
          onAddNode={addNode}
          onAddGroup={addGroup}
          onDeleteEdge={deleteEdge}
          onTogglePinNode={togglePinNode}
          onTogglePinGroup={togglePinGroup}
          selectedNode={contextMenu.type === 'node' && contextMenu.targetId 
            ? nodes.find(n => n.id === contextMenu.targetId) || null 
            : null}
          selectedGroup={contextMenu.type === 'group' && contextMenu.targetId 
            ? groups.find(g => g.id === contextMenu.targetId) || null 
            : null}
        />
      )}

      {aiMenu && (
        <AIMenuComponent
          aiMenu={aiMenu}
          onAIOperation={handleAIOperation}
        />
      )}

      {/* Chat Sidebar */}
      <ChatSidebar
        isOpen={showChatSidebar}
        onClose={() => setShowChatSidebar(false)}
        nodes={nodes}
        viewport={viewport}
        apiKey={apiKey}
        onChatQuery={handleChatQuery}
      />

      {/* Minimap */}
      {showMinimap && (
        <Minimap
          nodes={nodes}
          edges={edges}
          viewport={viewport}
          onViewportChange={setViewport}
          canvasWidth={window.innerWidth - (showChatSidebar ? 384 : 0)}
          canvasHeight={window.innerHeight}
          sidebarOpen={showChatSidebar}
        />
      )}

      {/* Zoom Controls */}
      <ZoomControls
        viewport={viewport}
        onZoomChange={handleZoomChange}
      />
    </div>
  );
}

export default FlowDo;
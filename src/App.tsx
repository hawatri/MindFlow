import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  GraduationCap, Settings, Download, Sparkles, Database, MessageSquare, Wand2, Maximize2 
} from 'lucide-react';

// Components
import { Wire } from './components/Wire';
import { FlowNode } from './components/FlowNode';
import { NodeGroup } from './components/NodeGroup';
import { ContextMenuComponent, AIMenuComponent } from './components/ContextMenus';
import { SettingsModal, TopicModal, LoadingOverlay } from './components/Modals';
import { ChatSidebar } from './components/ChatSidebar';
import { Minimap } from './components/Minimap';

// Hooks
import { useCanvasInteractions } from './hooks/useCanvasInteractions';

// Utils
import { saveStateToDB, loadStateFromDB, clearDB } from './utils/database';
import { fileToBase64, fileToText, downloadFlow } from './utils/fileHandlers';
import { generateAIContent, generateChatResponse } from './utils/aiService';
import { organizeNodesInViewport } from './utils/layout';

// Data
import { initialNodes, initialEdges, initialGroups } from './data/initialData';

// Constants
import { GRID_SIZE, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT, SETTINGS_KEY, NODE_TYPES } from './constants';

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
  const [topicInput, setTopicInput] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(SETTINGS_KEY) || '');
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
      setIsDraggingNode(id);
      setDragStart({ x: e.clientX, y: e.clientY });
      setSelection(id);
      setContextMenu(null);
      setAiMenu(null);
    }
  }, [setIsDraggingNode, setDragStart, setSelection, setContextMenu, setAiMenu]);

  const handleGroupMouseDown = useCallback((e: React.MouseEvent, group: Group) => {
    e.stopPropagation();
    if (e.button === 0) {
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
      if (type === 'node') {
        setIsResizingNode(id);
      } else {
        setIsResizingGroup(id);
      }
      setDragStart({ x: e.clientX, y: e.clientY });
      setSelection(id);
      setContextMenu(null);
    }
  }, [setIsResizingNode, setIsResizingGroup, setDragStart, setSelection, setContextMenu]);

  const handlePinMouseDown = useCallback((e: React.MouseEvent, nodeId: string, type: string) => {
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
      alert("File processing error");
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
          alert("AI returned no suggestions.");
        }
      }
    } catch (e) {
      alert(`AI Failed: ${(e as Error).message}`);
    } finally {
      setIsAiLoading(false);
    }
  }, [nodes, apiKey, setAiMenu, setIsAiLoading, setNodes, setEdges]);

  const handleGenerateFlow = useCallback(async () => {
    if (!topicInput.trim()) return;
    
    setShowTopicModal(false);
    setIsAiLoading(true);
    
    try {
      const steps = await generateAIContent('flow', topicInput, apiKey);
      if (Array.isArray(steps) && steps.length > 0) {
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        const idMap: Record<number, string> = {};
        const centerX = -viewport.x + 400;
        const centerY = -viewport.y + 200;

        steps.forEach((step: any) => {
          idMap[step.id] = `gen-${Date.now()}-${step.id}`;
        });

        steps.forEach((step: any, index: number) => {
          newNodes.push({
            id: idMap[step.id],
            type: ['lecture', 'concept', 'question', 'summary', 'task'].includes(step.type) 
              ? step.type 
              : 'lecture',
            title: step.title || 'Step',
            x: centerX + (index % 2 === 0 ? 0 : 50),
            y: centerY + (index * 240),
            width: DEFAULT_NODE_WIDTH,
            height: DEFAULT_NODE_HEIGHT,
            completed: false,
            data: { label: step.description || '', attachments: [] }
          });

          if (step.dependsOn) {
            step.dependsOn.forEach((depId: number) => {
              if (idMap[depId]) {
                newEdges.push({
                  id: `gen-e-${Date.now()}-${depId}-${step.id}`,
                  source: idMap[depId],
                  target: idMap[step.id]
                });
              }
            });
          }
        });

        const newGroup: Group = {
          id: `g-gen-${Date.now()}`,
          title: topicInput,
          x: centerX - 50,
          y: centerY - 80,
          width: DEFAULT_NODE_WIDTH + 150,
          height: (steps.length * 240) + 100,
          color: 'rgba(255, 255, 255, 0.1)'
        };

        setNodes(prev => [...prev, ...newNodes]);
        setEdges(prev => [...prev, ...newEdges]);
        setGroups(prev => [...prev, newGroup]);
      } else {
        alert("AI could not generate a valid plan.");
      }
    } catch (e) {
      alert(`AI Flow Failed: ${(e as Error).message}`);
    } finally {
      setIsAiLoading(false);
      setTopicInput('');
    }
  }, [topicInput, apiKey, viewport, setShowTopicModal, setIsAiLoading, setNodes, setEdges, setGroups, setTopicInput]);

  // Chat handler
  const handleChatQuery = useCallback(async (query: string, visibleNodesContext: string): Promise<string> => {
    return await generateChatResponse(query, visibleNodesContext, apiKey);
  }, [apiKey]);

  // Magic Organize handler
  const handleMagicOrganize = useCallback(() => {
    if (nodes.length === 0) {
      alert('No nodes to organize');
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
      alert('No nodes to fit');
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
    alert("Saved!");
  }, [apiKey, setShowSettings]);

  const handleReset = useCallback(async () => {
    if (window.confirm('Reset all data?')) {
      await clearDB();
      window.location.reload();
    }
  }, []);

  if (!isDbReady) {
    return (
      <div className="w-full h-screen bg-zinc-950 flex items-center justify-center text-white">
        <Database className="animate-pulse mr-2" /> Loading Database...
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-zinc-950 text-white font-sans select-none relative">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
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
        onClose={() => setShowTopicModal(false)}
        isLoading={isAiLoading}
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
        >
          <Sparkles size={14} /> Plan
        </button>
        <button 
          onClick={() => setShowSettings(true)} 
          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-md border border-zinc-700 text-zinc-300"
        >
          <Settings size={16} />
        </button>
        <button 
          onClick={() => downloadFlow(nodes, edges, groups, viewport)} 
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-700 transition-colors"
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
            {connecting && connecting.currentX && (
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
      <Minimap
        nodes={nodes}
        edges={edges}
        viewport={viewport}
        onViewportChange={setViewport}
        canvasWidth={window.innerWidth - (showChatSidebar ? 384 : 0)}
        canvasHeight={window.innerHeight}
        sidebarOpen={showChatSidebar}
      />
    </div>
  );
}

export default FlowDo;
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
    Grid, Users, Plus, Minus, Settings, Bot, Timer, 
    MousePointer2, Eraser, Download, Share2, Sparkles, X, Layout, Play,
    GraduationCap, Clock, RotateCcw, Send, CheckCircle, Circle, Trash2,
    Presentation, Layers, Lightbulb, BoxSelect, Paperclip, FileText, Music,
    Image as ImageIcon, Zap, HelpCircle, GripHorizontal, Search, Map,
    Command, Save, Upload, BookOpen, Wand2, Lock, Unlock, Maximize2,
    Minimize2, RotateCw, Copy, Scissors, Type, Filter, GitBranch
} from 'lucide-react';
import { INITIAL_NODES, INITIAL_EDGES, INITIAL_GROUPS, GRID_SIZE, NODE_COLORS, DB_NAME, SETTINGS_KEY, DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH, COLORS } from './constants';
import { Node, Edge, Viewport, DragState, Group, NodeType, ChatMessage } from './types';
import { NodeItem } from './components/NodeItem';
import { generateText, generateFlashcards, generateQuiz } from './services/geminiService';

// --- Helper for IDs ---
const uuid = () => Math.random().toString(36).substr(2, 9);

// --- Wire Component ---
const Wire = ({ id, start, end, status = 'default', isSelected, onSelect, onContextMenu }: {
    id: string;
    start: { x: number; y: number };
    end: { x: number; y: number };
    status?: 'default' | 'active' | 'locked';
    isSelected?: boolean;
    onSelect?: (id: string) => void;
    onContextMenu?: (e: React.MouseEvent, id: string) => void;
} & React.SVGProps<SVGPathElement>) => {
    const dist = Math.abs(end.x - start.x);
    const controlPointX = Math.max(dist * 0.5, 50);
    const path = `M ${start.x} ${start.y} C ${start.x + controlPointX} ${start.y}, ${end.x - controlPointX} ${end.y}, ${end.x} ${end.y}`;
    
    let strokeColor = '#777', strokeWidth = 3, strokeDash = '', shadowOpacity = 0.2;
    if (isSelected) { 
        strokeColor = COLORS.wireSelected; 
        strokeWidth = 4; 
        shadowOpacity = 0.6; 
    } else if (status === 'active') { 
        strokeColor = COLORS.wireActive; 
        strokeWidth = 5; 
        shadowOpacity = 0.4; 
    } else if (status === 'locked') { 
        strokeColor = '#ef4444'; 
        strokeDash = '10,5'; 
        strokeWidth = 3; 
    } else { 
        strokeColor = '#999'; 
        strokeWidth = 3; 
    }
    
    return (
        <g 
            onClick={(e) => { e.stopPropagation(); onSelect?.(id); }} 
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu?.(e, id); }} 
            className="group"
            style={{ pointerEvents: 'all' }}
        >
            <path d={path} fill="none" stroke="transparent" strokeWidth={25} style={{ cursor: 'pointer', pointerEvents: 'stroke' }} />
            <path d={path} fill="none" stroke="#000" strokeWidth={strokeWidth + 3} strokeOpacity={shadowOpacity} strokeLinecap="round" className="pointer-events-none" />
            <path d={path} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={strokeDash} strokeLinecap="round" className="transition-colors duration-200 pointer-events-none" />
        </g>
    );
};

export default function App() {
    // --- State ---
    const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES);
    const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES);
    const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
    const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
    const [selection, setSelection] = useState<string | null>(null);
    
    // UI State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{ id: 'init', role: 'model', text: 'Hi! I\'m your study companion. Ask me anything about your notes or upload a topic to discuss.', timestamp: Date.now() }]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [timerState, setTimerState] = useState<{time: number, active: boolean, mode: 'focus' | 'break'}>({ time: 25*60, active: false, mode: 'focus' });
    const [contextMenu, setContextMenu] = useState<{x: number, y: number, canvasX: number, canvasY: number} | null>(null);
    const [aiMenu, setAiMenu] = useState<{id: string, x: number, y: number} | null>(null);
    const [apiKey, setApiKey] = useState(() => localStorage.getItem(SETTINGS_KEY) || '');
    const [loadingAI, setLoadingAI] = useState(false);
    const [connecting, setConnecting] = useState<{source: string, x: number, y: number, currentX?: number, currentY?: number} | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [showMinimap, setShowMinimap] = useState(true);
    const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('flowdo_tutorial_completed'));
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
    const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'success' | 'error' | 'info'}>>([]);

    // Interaction Refs
    const canvasRef = useRef<HTMLDivElement>(null);
    const dragStateRef = useRef<DragState | null>(null);
    const connectingRef = useRef<{ source: string, currentX: number, currentY: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const activeUploadNodeId = useRef<string | null>(null);

    // --- Persistence ---
    useEffect(() => {
        // Simple persistence for demo
        const saved = localStorage.getItem(DB_NAME);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                setNodes(data.nodes || []);
                setEdges(data.edges || []);
                setGroups(data.groups || []);
            } catch (e) { console.error("Load failed", e); }
        }
    }, []);

    useEffect(() => {
        setSaveStatus('saving');
        const t = setTimeout(() => {
            try {
                localStorage.setItem(DB_NAME, JSON.stringify({ nodes, edges, groups, viewport }));
                setSaveStatus('saved');
            } catch (e) {
                setSaveStatus('error');
            }
        }, 500);
        return () => clearTimeout(t);
    }, [nodes, edges, groups, viewport]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + K for search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setShowSearch(true);
            }
            // Delete key
            if (e.key === 'Delete' && selection) {
                const node = nodes.find(n => n.id === selection);
                if (node) {
                    deleteNode(selection);
                    addNotification('Node deleted', 'success');
                }
            }
            // Escape to close modals
            if (e.key === 'Escape') {
                setContextMenu(null);
                setAiMenu(null);
                setShowSearch(false);
                setShowTutorial(false);
            }
            // Cmd/Ctrl + S to save
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                addNotification('Saved!', 'success');
            }
            // Cmd/Ctrl + Plus to zoom in
            if ((e.metaKey || e.ctrlKey) && (e.key === '+' || e.key === '=')) {
                e.preventDefault();
                setViewport(p => ({ ...p, zoom: Math.min(p.zoom + 0.1, 3) }));
            }
            // Cmd/Ctrl + Minus to zoom out
            if ((e.metaKey || e.ctrlKey) && e.key === '-') {
                e.preventDefault();
                setViewport(p => ({ ...p, zoom: Math.max(p.zoom - 0.1, 0.1) }));
            }
            // Cmd/Ctrl + 0 to reset zoom
            if ((e.metaKey || e.ctrlKey) && e.key === '0') {
                e.preventDefault();
                setViewport({ x: 0, y: 0, zoom: 1 });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selection, nodes]);

    // Notification system
    const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = uuid();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 3000);
    };

    // --- Timer Logic ---
    useEffect(() => {
        let interval: any;
        if (timerState.active && timerState.time > 0) {
            interval = setInterval(() => setTimerState(p => ({ ...p, time: p.time - 1 })), 1000);
        } else if (timerState.time === 0) {
             setTimerState(p => ({...p, active: false}));
             new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(()=>{});
        }
        return () => clearInterval(interval);
    }, [timerState.active, timerState.time]);

    // --- Geometry Helpers ---
    const screenToCanvas = (sx: number, sy: number) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return {
            x: (sx - rect.left - viewport.x) / viewport.zoom,
            y: (sy - rect.top - viewport.y) / viewport.zoom
        };
    };

    const getPinPos = (node: Node | undefined, type: 'input' | 'output') => {
        if (!node) return { x: 0, y: 0 };
        const y = 61;
        const w = node.width || DEFAULT_NODE_WIDTH;
        return type === 'input' 
            ? { x: node.x, y: node.y + y } 
            : { x: node.x + w, y: node.y + y };
    };

    // --- Event Handlers ---
    const handleMouseDown = (e: React.MouseEvent) => {
        // Middle click or space+click (simulated here by context) usually pans, 
        // but for simplicity left click on empty space pans
        if (e.button === 0 && e.target === canvasRef.current) {
            dragStateRef.current = { type: 'canvas', startX: e.clientX, startY: e.clientY };
            setSelection(null);
            setContextMenu(null);
        } else if (e.button === 2) {
            e.preventDefault();
            const pos = screenToCanvas(e.clientX, e.clientY);
            setContextMenu({ x: e.clientX, y: e.clientY, canvasX: pos.x, canvasY: pos.y });
        }
    };

    const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        // Don't start dragging if we're already connecting
        if (connecting) return;
        if (e.button === 0) {
            // Check if click is on a pin, button, input, or other interactive element
            const target = e.target as HTMLElement;
            if (target.closest('.group\\/pin') || 
                target.closest('[title="Input"]') || 
                target.closest('[title="Output"]') ||
                target.tagName === 'BUTTON' ||
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.closest('button') ||
                target.closest('input') ||
                target.closest('textarea')) {
                return; // Don't drag if clicking on interactive elements
            }
            // Store initial position but don't start dragging yet - wait for movement threshold
            dragStateRef.current = { 
                type: 'node', 
                id, 
                startX: e.clientX, 
                startY: e.clientY,
                initialX: e.clientX,
                initialY: e.clientY
            };
            setSelection(id);
            setContextMenu(null);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const ds = dragStateRef.current;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Handle Connecting Line Drawing - prioritize this over dragging
        if (connecting) {
            const canvasPos = screenToCanvas(e.clientX, e.clientY);
            setConnecting({ ...connecting, currentX: canvasPos.x, currentY: canvasPos.y });
            // Don't process drag when connecting
            return;
        }

        if (!ds) return;

        // For node dragging, check if we've moved enough to start dragging (threshold)
        if (ds.type === 'node' && ds.id && (ds as any).initialX !== undefined) {
            const moveX = Math.abs(e.clientX - (ds as any).initialX);
            const moveY = Math.abs(e.clientY - (ds as any).initialY);
            const threshold = 8; // pixels - increased from 5 to reduce accidental drags
            
            // Only start dragging if moved beyond threshold
            if (moveX < threshold && moveY < threshold) {
                return; // Don't drag yet, wait for more movement
            }
            // Mark as actively dragging
            if (!(ds as any).isDragging) {
                (ds as any).isDragging = true;
            }
        }

        const dx = e.clientX - ds.startX;
        const dy = e.clientY - ds.startY;
        
        if (ds.type === 'canvas') {
            setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            ds.startX = e.clientX;
            ds.startY = e.clientY;
        } else if (ds.type === 'node' && ds.id && (ds as any).isDragging) {
            const scale = viewport.zoom;
            setNodes(prev => prev.map(n => n.id === ds.id ? { ...n, x: n.x + dx / scale, y: n.y + dy / scale } : n));
            ds.startX = e.clientX;
            ds.startY = e.clientY;
        } else if (ds.type === 'group' && ds.id) {
            const scale = viewport.zoom;
            setGroups(prev => prev.map(g => g.id === ds.id ? { ...g, x: g.x + dx / scale, y: g.y + dy / scale } : g));
            // Move captured nodes
            const group = groups.find(g => g.id === ds.id);
            if (group) {
                const captured = nodes.filter(n => n.x >= group.x && n.x + n.width <= group.x + group.width && n.y >= group.y && n.y + n.height <= group.y + group.height).map(n => n.id);
                setNodes(prev => prev.map(n => captured.includes(n.id) ? { ...n, x: n.x + dx / scale, y: n.y + dy / scale } : n));
            }
            ds.startX = e.clientX;
            ds.startY = e.clientY;
        } else if (ds.type === 'resizeNode' && ds.id) {
            const scale = viewport.zoom;
            setNodes(prev => prev.map(n => n.id === ds.id ? { 
                ...n, 
                width: Math.max(180, n.width + dx / scale), 
                height: Math.max(100, n.height + dy / scale) 
            } : n));
            ds.startX = e.clientX;
            ds.startY = e.clientY;
        } else if (ds.type === 'resizeGroup' && ds.id) {
            const scale = viewport.zoom;
            setGroups(prev => prev.map(g => g.id === ds.id ? { 
                ...g, 
                width: Math.max(200, g.width + dx / scale), 
                height: Math.max(100, g.height + dy / scale) 
            } : g));
            ds.startX = e.clientX;
            ds.startY = e.clientY;
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        const ds = dragStateRef.current;
        
        // If we were dragging a node but didn't move much, it was just a click
        if (ds && ds.type === 'node' && (ds as any).initialX !== undefined) {
            const moveX = Math.abs(e.clientX - (ds as any).initialX);
            const moveY = Math.abs(e.clientY - (ds as any).initialY);
            const threshold = 8; // pixels - match the threshold used in mousemove
            
            // If we didn't move much, it was just a click - don't update position
            if (moveX < threshold && moveY < threshold && !(ds as any).isDragging) {
                // Just a click, don't do anything
            }
        }
        
        // Always clear drag state on mouse up
        dragStateRef.current = null;
        
        // If connecting and mouse up on canvas (not on a pin), cancel connection
        if (connecting && e.target === canvasRef.current) {
            setConnecting(null);
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const zoomSensitivity = 0.001;
            const newZoom = Math.min(Math.max(0.1, viewport.zoom - e.deltaY * zoomSensitivity), 3);
            
            // Zoom towards pointer could be implemented here, centering for now
            setViewport(prev => ({ ...prev, zoom: newZoom }));
        } else {
            setViewport(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
        }
    };

    // --- Search Functionality ---
    const filteredNodes = useMemo(() => {
        if (!searchQuery.trim()) return nodes;
        const query = searchQuery.toLowerCase();
        return nodes.filter(node => 
            node.title.toLowerCase().includes(query) ||
            node.data.label.toLowerCase().includes(query) ||
            node.type.toLowerCase().includes(query)
        );
    }, [nodes, searchQuery]);

    const highlightNode = (nodeId: string) => {
        setSelection(nodeId);
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            // Center viewport on node
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            setViewport({
                x: centerX - (node.x * viewport.zoom) - (node.width * viewport.zoom / 2),
                y: centerY - (node.y * viewport.zoom) - (node.height * viewport.zoom / 2),
                zoom: viewport.zoom
            });
        }
    };

    // --- Node Logic ---
    const addNode = (type: NodeType, x: number, y: number) => {
        const newNode: Node = {
            id: uuid(),
            type,
            title: type === 'flashcard' ? 'Flashcard' : 'Untitled',
            x,
            y,
            width: DEFAULT_NODE_WIDTH,
            height: type === 'flashcard' ? 220 : DEFAULT_NODE_HEIGHT,
            completed: false,
            data: { label: '', attachments: [], front: '', back: '' }
        };
        setNodes(p => [...p, newNode]);
        setContextMenu(null);
        addNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} node created`, 'success');
    };

    const deleteNode = (id: string) => {
        setNodes(p => p.filter(n => n.id !== id));
        setEdges(p => p.filter(e => e.source !== id && e.target !== id));
        if (selection === id) setSelection(null);
    };

    // --- Export/Import ---
    const exportFlow = () => {
        const data = {
            nodes,
            edges,
            groups,
            viewport,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flowdo-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addNotification('Flow exported successfully!', 'success');
    };

    const importFlow = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target?.result as string);
                    if (data.nodes) setNodes(data.nodes);
                    if (data.edges) setEdges(data.edges);
                    if (data.groups) setGroups(data.groups);
                    if (data.viewport) setViewport(data.viewport);
                    addNotification('Flow imported successfully!', 'success');
                } catch (err) {
                    addNotification('Failed to import flow', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const updateNode = (id: string, data: Partial<Node>) => {
        setNodes(p => p.map(n => n.id === id ? { ...n, ...data } : n));
    };

    // --- Edge Logic ---
    const handlePinMouseDown = (e: React.MouseEvent, nodeId: string, type: 'input' | 'output') => {
        e.stopPropagation();
        e.preventDefault(); // Prevent default to avoid any drag behavior
        if (e.button === 0 && type === 'output') {
            // Clear any existing drag state to prevent node dragging
            dragStateRef.current = null;
            const rect = e.currentTarget.getBoundingClientRect();
            const canvasPos = screenToCanvas(rect.left + rect.width / 2, rect.top + rect.height / 2);
            setConnecting({ source: nodeId, x: canvasPos.x, y: canvasPos.y, currentX: canvasPos.x, currentY: canvasPos.y });
        }
    };

    const handlePinMouseUp = (e: React.MouseEvent, targetId: string, type: 'input' | 'output') => {
        e.stopPropagation();
        e.preventDefault(); // Prevent default
        if (connecting && type === 'input' && connecting.source !== targetId) {
            // Check if edge already exists
            if (!edges.find(edge => edge.source === connecting.source && edge.target === targetId)) {
                const newEdge: Edge = {
                    id: uuid(),
                    source: connecting.source,
                    target: targetId
                };
                setEdges(p => [...p, newEdge]);
            }
            setConnecting(null);
        } else if (connecting && type === 'output') {
            // If releasing on output pin, cancel connection
            setConnecting(null);
        }
    };

    // --- AI Features ---
    const handleAIAction = async (nodeId: string, action: string) => {
        setAiMenu(null);
        setLoadingAI(true);
        const node = nodes.find(n => n.id === nodeId);
        if (!node) { setLoadingAI(false); return; }

        try {
            if (action === 'enhance') {
                const improved = await generateText(`Improve and expand this note academically:\n${node.data.label}`, "You are an expert tutor.");
                updateNode(nodeId, { data: { ...node.data, label: improved } });
            } else if (action === 'flashcards') {
                const cards = await generateFlashcards(node.data.label);
                // Create nodes for cards
                const newNodes: Node[] = cards.map((c, i) => ({
                    id: uuid(),
                    type: 'flashcard',
                    title: 'Card',
                    x: node.x + node.width + 50,
                    y: node.y + (i * 190),
                    width: 260,
                    height: 160,
                    completed: false,
                    data: { label: '', front: c.front, back: c.back, isFlipped: false, attachments: [] }
                }));
                const newEdges: Edge[] = newNodes.map(n => ({ id: uuid(), source: nodeId, target: n.id }));
                setNodes(p => [...p, ...newNodes]);
                setEdges(p => [...p, ...newEdges]);
            } else if (action === 'quiz') {
                 const quizData = await generateQuiz(node.data.label);
                 if(quizData.length > 0) {
                     const q = quizData[0];
                     updateNode(nodeId, { data: { ...node.data, label: node.data.label + "\n\n-- AI Quiz --\n" + q.question + "\nOptions: " + q.options.join(", ") + "\nAnswer: " + q.answer } });
                 }
            }
        } catch (e: any) {
            alert("AI Error: " + (e.message || "Failed to connect to AI service"));
        } finally {
            setLoadingAI(false);
        }
    };

    // --- Chat Logic ---
    const sendChatMessage = async () => {
        if(!chatInput.trim()) return;
        const text = chatInput;
        setChatInput('');
        setChatMessages(p => [...p, { id: uuid(), role: 'user', text, timestamp: Date.now() }]);
        setIsChatLoading(true);

        try {
            // Context injection
            let context = "User is in a study canvas.";
            if (selection) {
                const n = nodes.find(n => n.id === selection);
                if (n) {
                    context += ` user selected note titled "${n.title}" with content: ${n.data.label}`;
                    if (n.data.front) context += `\nFlashcard Front: "${n.data.front}"`;
                    if (n.data.back) context += `\nFlashcard Back: "${n.data.back}"`;
                }
            }

            const response = await generateText(text, `You are a helpful study assistant. Context: ${context}`);
            setChatMessages(p => [...p, { id: uuid(), role: 'model', text: response, timestamp: Date.now() }]);
        } catch (e) {
            setChatMessages(p => [...p, { id: uuid(), role: 'model', text: "Error connecting to Gemini.", timestamp: Date.now() }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    // --- Timer Component ---
    const Timer = () => {
        const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
        const toggleTimer = () => setTimerState(p => ({...p, active: !p.active}));
        const resetTimer = () => {
            setTimerState(p => ({...p, active: false, time: p.mode === 'focus' ? 25 * 60 : 5 * 60}));
        };
        const switchMode = () => {
            const newMode = timerState.mode === 'focus' ? 'break' : 'focus';
            setTimerState({ active: false, time: newMode === 'focus' ? 25 * 60 : 5 * 60, mode: newMode });
        };

        return (
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 text-xs">
                <Clock size={14} className={timerState.mode === 'focus' ? "text-rose-500" : "text-emerald-500"} />
                <span className="font-mono font-medium text-white min-w-[40px] text-center">{formatTime(timerState.time)}</span>
                <button onClick={toggleTimer} className="hover:text-white text-zinc-400"><Play size={12} fill={timerState.active?"currentColor":"none"}/></button>
                <button onClick={resetTimer} className="hover:text-white text-zinc-400"><RotateCcw size={12}/></button>
                <button onClick={switchMode} className="text-[10px] uppercase font-bold text-zinc-500 hover:text-white ml-1">{timerState.mode}</button>
            </div>
        );
    };

    // --- Render ---
    return (
        <div className="w-full h-screen bg-zinc-950 text-zinc-100 overflow-hidden relative">
            
            {/* Background */}
            <div 
                ref={canvasRef}
                className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing pt-14"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                onContextMenu={(e) => { e.preventDefault(); if(!dragStateRef.current) { const pos = screenToCanvas(e.clientX, e.clientY); setContextMenu({x: e.clientX, y: e.clientY, canvasX: pos.x, canvasY: pos.y}); } }}
                style={{
                    backgroundSize: `${GRID_SIZE * viewport.zoom}px ${GRID_SIZE * viewport.zoom}px`,
                    backgroundPosition: `${viewport.x}px ${viewport.y}px`,
                    backgroundImage: `linear-gradient(${COLORS.grid} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.grid} 1px, transparent 1px)`
                }}
            >
                <div 
                    className="origin-top-left"
                    style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}
                >
                    {/* Groups */}
                    {groups.map(g => (
                        <div key={g.id} className="absolute border rounded-xl pointer-events-auto" 
                            style={{ left: g.x, top: g.y, width: g.width, height: g.height, backgroundColor: COLORS.groupBg, borderColor: selection===g.id ? '#fff' : COLORS.groupHeader }}
                            onMouseDown={(e) => { e.stopPropagation(); if(e.button === 0) { dragStateRef.current = { type: 'group', id: g.id, startX: e.clientX, startY: e.clientY }; setSelection(g.id); setContextMenu(null); } }}>
                            <div className="px-4 py-2 font-bold text-white/50 cursor-grab active:cursor-grabbing">
                                <input className="bg-transparent outline-none w-full" value={g.title} onChange={e => setGroups(p => p.map(gr => gr.id===g.id ? {...gr, title:e.target.value} : gr))} onMouseDown={e => e.stopPropagation()} />
                            </div>
                            <div className="absolute bottom-2 right-2 cursor-nwse-resize" onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); dragStateRef.current = { type: 'resizeGroup', id: g.id, startX: e.clientX, startY: e.clientY }; }}>
                                <GripHorizontal size={20} className="text-zinc-600 rotate-45" />
                            </div>
                        </div>
                    ))}

                    {/* Wires */}
                    <svg className="absolute top-0 left-0 overflow-visible w-1 h-1" style={{ zIndex: 10 }}>
                        {edges.map(edge => {
                            const source = nodes.find(n => n.id === edge.source);
                            const target = nodes.find(n => n.id === edge.target);
                            if (!source || !target) return null;
                            
                            const start = getPinPos(source, 'output');
                            const end = getPinPos(target, 'input');
                            const status = source.completed ? 'active' : 'default';
                            
                            return (
                                <Wire 
                                    key={edge.id}
                                    id={edge.id} 
                                    start={start} 
                                    end={end} 
                                    status={status} 
                                    isSelected={selection === edge.id}
                                    onSelect={setSelection}
                                    onContextMenu={(e, id) => {
                                        e.preventDefault();
                                        const pos = screenToCanvas(e.clientX, e.clientY);
                                        setContextMenu({ x: e.clientX, y: e.clientY, canvasX: pos.x, canvasY: pos.y });
                                        setSelection(id);
                                    }}
                                />
                            );
                        })}
                        {connecting && connecting.currentX !== undefined && connecting.currentY !== undefined && (
                            <Wire 
                                start={getPinPos(nodes.find(n => n.id === connecting.source), 'output')} 
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
                        <NodeItem 
                            key={node.id}
                            node={node}
                            isSelected={selection === node.id}
                            scale={viewport.zoom}
                            onUpdate={updateNode}
                            onDelete={deleteNode}
                            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                            onConnectStart={handlePinMouseDown}
                            onConnectEnd={handlePinMouseUp}
                            onResizeStart={(e) => { e.stopPropagation(); dragStateRef.current = { type: 'resizeNode', id: node.id, startX: e.clientX, startY: e.clientY }; }}
                            onAttach={() => { activeUploadNodeId.current = node.id; fileInputRef.current?.click(); }}
                            onAIAction={(nodeId, action, event) => { 
                                if (action === 'menu' && event) { 
                                    setAiMenu({ id: nodeId, x: event.clientX, y: event.clientY }); 
                                } else {
                                    handleAIAction(nodeId, action);
                                    setAiMenu(null);
                                }
                            }}
                            searchQuery={searchQuery}
                        />
                    ))}
                </div>
            </div>

            {/* UI Overlay */}
            
            {/* Top Bar - Enhanced */}
            <div className="absolute top-0 left-0 w-full h-14 glass border-b border-white/10 flex items-center justify-between px-4 z-50 animate-fadeIn">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg hover-glow transition-smooth">
                        <GraduationCap size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-sm leading-tight gradient-text">FlowDo</h1>
                        <p className="text-[10px] text-zinc-400">AI-Powered Learning Canvas</p>
                    </div>
                </div>
                
                {/* Search Bar */}
                <div className="flex-1 max-w-md mx-8 relative">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search nodes... (⌘K)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setShowSearch(true)}
                            className="w-full bg-zinc-900/50 border border-zinc-700/50 rounded-lg px-10 py-2 text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-zinc-900 transition-smooth"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    {showSearch && searchQuery && filteredNodes.length > 0 && (
                        <div className="absolute top-full mt-2 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl max-h-64 overflow-y-auto z-50 animate-fadeIn">
                            {filteredNodes.map(node => (
                                <button
                                    key={node.id}
                                    onClick={() => { highlightNode(node.id); setShowSearch(false); }}
                                    className="w-full px-4 py-2 text-left hover:bg-zinc-800 flex items-center gap-2 transition-smooth"
                                >
                                    <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: COLORS[`nodeHeader${node.type.charAt(0).toUpperCase() + node.type.slice(1)}` as keyof typeof COLORS] || COLORS.nodeHeaderTask }} />
                                    <span className="text-sm">{node.title}</span>
                                    <span className="text-xs text-zinc-500 ml-auto">{node.type}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Timer />
                    <div className="h-6 w-px bg-zinc-700"></div>
                    <button onClick={() => setShowMinimap(!showMinimap)} className={`p-2 rounded hover:bg-zinc-800 transition-smooth ${showMinimap ? 'bg-indigo-600/20 text-indigo-400' : 'text-zinc-400'}`} title="Toggle Mini-map">
                        <Map size={18} />
                    </button>
                    <button onClick={() => setIsChatOpen(!isChatOpen)} className={`p-2 rounded hover:bg-zinc-800 transition-smooth ${isChatOpen ? 'bg-indigo-600 hover:bg-indigo-500' : ''}`} title="AI Companion">
                        <Bot size={18} />
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded hover:bg-zinc-800 transition-smooth" title="Settings">
                        <Settings size={18} />
                    </button>
                </div>
            </div>

            {/* Save Status */}
            <div className="absolute top-16 left-4 z-40 animate-fadeIn">
                <div className={`text-xs font-mono px-2 py-1 rounded glass ${
                    saveStatus === 'saving' ? 'text-yellow-400 animate-pulse-slow' :
                    saveStatus === 'error' ? 'text-red-400' :
                    'text-green-400'
                }`}>
                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'error' ? 'Error!' : '✓ Saved'}
                </div>
            </div>

            {/* Notifications */}
            <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2">
                {notifications.map(notif => (
                    <div
                        key={notif.id}
                        className={`px-4 py-2 rounded-lg shadow-xl glass border animate-slideIn ${
                            notif.type === 'success' ? 'border-green-500/50 text-green-400' :
                            notif.type === 'error' ? 'border-red-500/50 text-red-400' :
                            'border-blue-500/50 text-blue-400'
                        }`}
                    >
                        {notif.message}
                    </div>
                ))}
            </div>

            {/* Mini-map */}
            {showMinimap && (
                <div className="absolute bottom-4 right-4 w-48 h-32 bg-zinc-900/90 backdrop-blur-xl border border-zinc-700 rounded-lg p-2 z-40 animate-fadeIn">
                    <div className="text-xs text-zinc-400 mb-1 flex items-center justify-between">
                        <span>Mini-map</span>
                        <button onClick={() => setShowMinimap(false)} className="hover:text-white">
                            <X size={12} />
                        </button>
                    </div>
                    <div className="relative w-full h-full bg-zinc-950 rounded overflow-hidden">
                        {/* Mini-map content would go here - simplified for now */}
                        <div className="absolute inset-0 opacity-50" style={{
                            backgroundSize: '4px 4px',
                            backgroundImage: `linear-gradient(${COLORS.grid} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.grid} 1px, transparent 1px)`
                        }} />
                        {nodes.map(node => (
                            <div
                                key={node.id}
                                className="absolute bg-indigo-500/50 rounded"
                                style={{
                                    left: `${(node.x / 2000) * 100}%`,
                                    top: `${(node.y / 2000) * 100}%`,
                                    width: `${((node.width || DEFAULT_NODE_WIDTH) / 2000) * 100}%`,
                                    height: `${((node.height || DEFAULT_NODE_HEIGHT) / 2000) * 100}%`,
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Actions Toolbar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass border border-white/10 rounded-2xl px-3 py-2 flex items-center gap-2 z-40 animate-fadeIn">
                <button onClick={exportFlow} className="p-2 rounded-lg hover:bg-zinc-800 transition-smooth" title="Export (⌘E)">
                    <Download size={16} />
                </button>
                <button onClick={importFlow} className="p-2 rounded-lg hover:bg-zinc-800 transition-smooth" title="Import">
                    <Upload size={16} />
                </button>
                <div className="w-px h-6 bg-zinc-700"></div>
                <button onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })} className="p-2 rounded-lg hover:bg-zinc-800 transition-smooth" title="Reset View">
                    <RotateCw size={16} />
                </button>
                <button onClick={() => setShowTutorial(true)} className="p-2 rounded-lg hover:bg-zinc-800 transition-smooth" title="Tutorial">
                    <HelpCircle size={16} />
                </button>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div className="fixed bg-zinc-900 border border-zinc-700 shadow-2xl rounded-lg p-1 min-w-[160px] z-[60] flex flex-col gap-1 text-sm text-zinc-300 animate-in fade-in zoom-in duration-100" style={{ left: contextMenu.x, top: contextMenu.y }}>
                    <div className="px-2 py-1 text-xs font-bold text-zinc-500 uppercase">Learning</div>
                    <button onClick={() => { addNode('lecture', contextMenu.canvasX, contextMenu.canvasY); setContextMenu(null); }} className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded"><Presentation size={14} className="text-violet-500"/> Lecture</button>
                    <button onClick={() => { addNode('concept', contextMenu.canvasX, contextMenu.canvasY); setContextMenu(null); }} className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded"><Lightbulb size={14} className="text-cyan-500"/> Concept</button>
                    <button onClick={() => { addNode('flashcard', contextMenu.canvasX, contextMenu.canvasY); setContextMenu(null); }} className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded"><Layers size={14} className="text-emerald-500"/> Flashcard</button>
                    <div className="h-px bg-zinc-800 my-1"></div>
                    <div className="px-2 py-1 text-xs font-bold text-zinc-500 uppercase">Productivity</div>
                    <button onClick={() => { addNode('task', contextMenu.canvasX, contextMenu.canvasY); setContextMenu(null); }} className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded"><CheckCircle size={14} className="text-blue-500"/> Task</button>
                    <button onClick={() => { setGroups(p => [...p, { id: uuid(), title: 'Group', x: contextMenu.canvasX, y: contextMenu.canvasY, width: 400, height: 300, color: COLORS.groupHeader }]); setContextMenu(null); }} className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded"><BoxSelect size={14}/> Group</button>
                </div>
            )}

            {/* Chat Panel */}
            {isChatOpen && (
                <div className="fixed bottom-4 right-4 w-80 h-96 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl flex flex-col z-[60] overflow-hidden">
                    <div className="p-3 bg-zinc-800 border-b border-zinc-700 flex justify-between items-center">
                        <span className="text-sm font-bold text-white flex items-center gap-2"><Sparkles size={14} className="text-indigo-400"/> AI Companion</span>
                        <button onClick={() => setIsChatOpen(false)}><X size={14} className="text-zinc-400 hover:text-white"/></button>
                    </div>
                    {selection && nodes.find(n => n.id === selection) && (
                        <div className="bg-indigo-900/30 px-3 py-1 text-[10px] text-indigo-200 border-b border-indigo-500/20 truncate">
                            Context: {nodes.find(n => n.id === selection)!.title}
                        </div>
                    )}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {chatMessages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-lg p-2 text-xs ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {isChatLoading && <div className="text-xs text-zinc-500 italic">Thinking...</div>}
                    </div>
                    <div className="p-2 border-t border-zinc-700 flex gap-2">
                        <input 
                            className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                            placeholder="Ask Gemini..."
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                        />
                        <button onClick={sendChatMessage} disabled={isChatLoading} className="p-2 bg-indigo-600 rounded hover:bg-indigo-500 disabled:opacity-50 text-white"><Send size={14}/></button>
                    </div>
                </div>
            )}

            {/* AI Menu */}
            {aiMenu && (
                <div className="fixed bg-zinc-900 border border-indigo-500/30 shadow-2xl rounded-lg p-1 min-w-[170px] z-[60] text-sm text-zinc-300" style={{ left: aiMenu.x + 10, top: aiMenu.y }}>
                    <div className="px-2 py-1 text-xs font-bold text-indigo-400 uppercase flex items-center gap-2"><Sparkles size={12}/> AI Tools</div>
                    <button onClick={() => { handleAIAction(aiMenu.id, 'enhance'); setAiMenu(null); }} className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-zinc-800 rounded text-left"><Zap size={14} className="text-amber-400"/> Improve Note</button>
                    <button onClick={() => { handleAIAction(aiMenu.id, 'quiz'); setAiMenu(null); }} className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-zinc-800 rounded text-left"><HelpCircle size={14} className="text-rose-400"/> Generate Quiz</button>
                    <button onClick={() => { handleAIAction(aiMenu.id, 'flashcards'); setAiMenu(null); }} className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-zinc-800 rounded text-left"><Layers size={14} className="text-emerald-400"/> Make Flashcards</button>
                </div>
            )}

            {/* Settings */}
            {isSettingsOpen && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-xl w-96 shadow-2xl">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Settings className="w-5 h-5" /> Settings</h2>
                        <label className="block text-sm text-zinc-400 mb-2">Gemini API Key</label>
                        <input type="password" className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-sm outline-none focus:border-indigo-500 mb-4" placeholder="Leave empty for Demo Mode" value={apiKey} onChange={e => setApiKey(e.target.value)} />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsSettingsOpen(false)} className="px-3 py-1.5 hover:bg-zinc-800 rounded text-sm">Cancel</button>
                            <button onClick={() => { localStorage.setItem(SETTINGS_KEY, apiKey); setIsSettingsOpen(false); }} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {loadingAI && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 rounded-full text-sm font-medium shadow-2xl z-[100] animate-pulse-slow flex items-center gap-2 hover-glow">
                <Sparkles size={16} className="animate-spin"/> AI Working...
            </div>}

            {/* Tutorial Overlay */}
            {showTutorial && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center animate-fadeIn">
                    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-2xl mx-4 shadow-2xl animate-slideIn">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
                                <BookOpen size={24} /> Welcome to FlowDo!
                            </h2>
                            <button onClick={() => { setShowTutorial(false); localStorage.setItem('flowdo_tutorial_completed', 'true'); }} className="text-zinc-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4 text-zinc-300">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                                    <MousePointer2 size={16} className="text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white mb-1">Right-click to Create</h3>
                                    <p className="text-sm">Right-click anywhere on the canvas to add new nodes</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                                    <GitBranch size={16} className="text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white mb-1">Connect Nodes</h3>
                                    <p className="text-sm">Drag from the right pin (output) to the left pin (input) to connect nodes</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-cyan-600/20 flex items-center justify-center flex-shrink-0">
                                    <Command size={16} className="text-cyan-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white mb-1">Keyboard Shortcuts</h3>
                                    <p className="text-sm"><kbd className="px-2 py-1 bg-zinc-800 rounded text-xs">⌘K</kbd> Search • <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs">⌘S</kbd> Save • <kbd className="px-2 py-1 bg-zinc-800 rounded text-xs">Delete</kbd> Remove</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center flex-shrink-0">
                                    <Sparkles size={16} className="text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white mb-1">AI Features</h3>
                                    <p className="text-sm">Click the sparkle icon on any node to access AI tools like enhancement, quiz generation, and more</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => { setShowTutorial(false); localStorage.setItem('flowdo_tutorial_completed', 'true'); }}
                            className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-4 py-2 rounded-lg font-medium transition-smooth hover-glow"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            )}
            
            <input type="file" ref={fileInputRef} className="hidden" />
        </div>
    );
}
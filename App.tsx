import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
    Grid, Users, Plus, Minus, Settings, Bot, Timer, 
    MousePointer2, Eraser, Download, Share2, Sparkles, X, Layout, Play,
    GraduationCap, Clock, RotateCcw, Send, CheckCircle, Circle, Trash2,
    Presentation, Layers, Lightbulb, BoxSelect, Paperclip, FileText, Music,
    Image as ImageIcon, Zap, HelpCircle, GripHorizontal
} from 'lucide-react';
import { INITIAL_NODES, INITIAL_EDGES, INITIAL_GROUPS, GRID_SIZE, NODE_COLORS, DB_NAME, SETTINGS_KEY, DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH, COLORS } from './constants';
import { Node, Edge, Viewport, DragState, Group, NodeType, ChatMessage } from './types';
import { NodeItem } from './components/NodeItem';
import { generateText, generateFlashcards, generateQuiz } from './services/geminiService';

// --- Helper for IDs ---
const uuid = () => Math.random().toString(36).substr(2, 9);

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
        const t = setTimeout(() => {
            localStorage.setItem(DB_NAME, JSON.stringify({ nodes, edges, groups }));
        }, 1000);
        return () => clearTimeout(t);
    }, [nodes, edges, groups]);

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
        if (e.button === 0) {
            dragStateRef.current = { type: 'node', id, startX: e.clientX, startY: e.clientY };
            setSelection(id);
            setContextMenu(null);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const ds = dragStateRef.current;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        // Handle Connecting Line Drawing
        if (connectingRef.current) {
            const { x, y } = screenToCanvas(e.clientX, e.clientY);
            connectingRef.current = { ...connectingRef.current, currentX: x, currentY: y };
            // Force re-render for line update
            setViewport(v => ({ ...v })); 
        }

        if (!ds) return;

        const dx = e.clientX - ds.startX;
        const dy = e.clientY - ds.startY;
        
        if (ds.type === 'canvas') {
            setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            ds.startX = e.clientX;
            ds.startY = e.clientY;
        } else if (ds.type === 'node' && ds.id) {
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
        dragStateRef.current = null;
        if (connectingRef.current) {
            // Check if dropped on a node
            // Note: Simplistic hit testing. Ideally, onConnectEnd in Node handles this.
            connectingRef.current = null;
            setViewport(v => ({...v})); // cleanup render
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
    };

    const deleteNode = (id: string) => {
        setNodes(p => p.filter(n => n.id !== id));
        setEdges(p => p.filter(e => e.source !== id && e.target !== id));
    };

    const updateNode = (id: string, data: Partial<Node>) => {
        setNodes(p => p.map(n => n.id === id ? { ...n, ...data } : n));
    };

    // --- Edge Logic ---
    const startConnect = (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        const { x, y } = screenToCanvas(e.clientX, e.clientY);
        connectingRef.current = { source: nodeId, currentX: x, currentY: y };
    };

    const endConnect = (e: React.MouseEvent, targetId: string) => {
        e.stopPropagation();
        if (connectingRef.current && connectingRef.current.source !== targetId) {
            const newEdge: Edge = {
                id: uuid(),
                source: connectingRef.current.source,
                target: targetId
            };
            setEdges(p => [...p, newEdge]);
        }
        connectingRef.current = null;
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
                    <svg className="absolute top-0 left-0 overflow-visible w-1 h-1 pointer-events-none">
                        {edges.map(edge => {
                            const source = nodes.find(n => n.id === edge.source);
                            const target = nodes.find(n => n.id === edge.target);
                            if (!source || !target) return null;
                            
                            const sp = { x: source.x + (source.width||DEFAULT_NODE_WIDTH), y: source.y + 60 };
                            const tp = { x: target.x, y: target.y + 60 };
                            const dist = Math.abs(tp.x - sp.x);
                            const controlPointX = Math.max(dist * 0.5, 50);
                            const path = `M ${sp.x} ${sp.y} C ${sp.x + controlPointX} ${sp.y}, ${tp.x - controlPointX} ${tp.y}, ${tp.x} ${tp.y}`;
                            const stroke = source.completed ? COLORS.wireActive : COLORS.wire;
                            const width = source.completed ? 3 : 2;

                            return (
                                <path 
                                    key={edge.id}
                                    d={path}
                                    stroke={stroke}
                                    strokeWidth={width}
                                    fill="none"
                                    className="transition-colors duration-300"
                                />
                            );
                        })}
                        {connectingRef.current && (() => {
                            const source = nodes.find(n => n.id === connectingRef.current!.source);
                            if (!source) return null;
                            const startX = source.x + source.width;
                            const startY = source.y + 60;
                            const dist = Math.abs(connectingRef.current.currentX - startX);
                            const controlPointX = Math.max(dist * 0.5, 50);
                            const path = `M ${startX} ${startY} C ${startX + controlPointX} ${startY}, ${connectingRef.current.currentX - controlPointX} ${connectingRef.current.currentY}, ${connectingRef.current.currentX} ${connectingRef.current.currentY}`;
                            return <path d={path} fill="none" stroke={COLORS.wire} strokeWidth={2} className="transition-colors duration-300" />;
                        })()}
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
                            onConnectStart={startConnect}
                            onConnectEnd={endConnect}
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
                        />
                    ))}
                </div>
            </div>

            {/* UI Overlay */}
            
            {/* Header */}
            <div className="absolute top-0 left-0 w-full h-14 bg-zinc-900/80 backdrop-blur border-b border-zinc-800 flex items-center justify-between px-4 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center"><GraduationCap size={20} /></div>
                    <div>
                        <h1 className="font-bold text-sm leading-tight">FlowDo</h1>
                        <p className="text-[10px] text-zinc-400">AI Study Suite</p>
                    </div>
                </div>
                <Timer />
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsChatOpen(!isChatOpen)} className={`p-2 rounded hover:bg-zinc-800 ${isChatOpen ? 'bg-indigo-600 hover:bg-indigo-500' : ''}`} title="AI Companion"><Bot size={18} /></button>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded hover:bg-zinc-800"><Settings size={18} /></button>
                </div>
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

            {loadingAI && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-indigo-600 px-4 py-2 rounded-full text-sm font-medium shadow-lg z-[100] animate-pulse flex items-center gap-2"><Sparkles size={16}/> AI Working...</div>}
            
            <input type="file" ref={fileInputRef} className="hidden" />
        </div>
    );
}
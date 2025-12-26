import React, { useRef, useState } from 'react';
import { Node, NodeType, Attachment } from '../types';
import { NODE_COLORS, COLORS, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../constants';
import { 
  Trash2, GripHorizontal, CheckCircle, Circle, RefreshCw, 
  Sparkles, Paperclip, ImageIcon, FileText, Music, Play,
  Presentation, Layers, X
} from 'lucide-react';

interface NodeProps {
  node: Node;
  isSelected: boolean;
  scale: number;
  onUpdate: (id: string, data: Partial<Node>) => void;
  onDelete: (id: string) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onConnectStart: (e: React.MouseEvent, nodeId: string) => void;
  onConnectEnd: (e: React.MouseEvent, nodeId: string) => void;
  onResizeStart: (e: React.MouseEvent, nodeId: string) => void;
  onAttach: (nodeId: string) => void;
  onAIAction: (nodeId: string, action: string, event?: React.MouseEvent) => void;
}

export const NodeItem: React.FC<NodeProps> = ({
  node, isSelected, scale, onUpdate, onDelete, onMouseDown, 
  onConnectStart, onConnectEnd, onResizeStart, onAttach, onAIAction
}) => {
  const styles = NODE_COLORS[node.type];
  let color = COLORS.task;
  if (COLORS[node.type as keyof typeof COLORS]) color = COLORS[node.type as keyof typeof COLORS];

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(node.id, { 
      data: { ...node.data, isFlipped: !node.data.isFlipped } 
    });
  };

  const renderContent = () => {
    switch (node.type) {
      case 'flashcard':
        return (
          <div className="flex-1 flex flex-col items-center justify-center text-center cursor-pointer perspective-1000 group" onClick={handleFlip}>
            <div className="text-sm font-medium text-zinc-200">
              {node.data.isFlipped ? (node.data.back || 'No Answer') : (node.data.front || 'No Question')}
            </div>
            <div className="mt-2 text-[10px] text-zinc-500 uppercase font-bold">{node.data.isFlipped ? 'Back' : 'Front'}</div>
          </div>
        );
      case 'quiz':
         return (
             <div className="flex flex-col h-full p-2">
                 <div className="font-semibold text-rose-400 mb-2">AI Quiz Question</div>
                 <div className="text-sm mb-3">{node.data.label}</div>
                 <div className="flex flex-col gap-1.5 overflow-y-auto flex-1">
                    {node.data.quizOptions?.map((opt, i) => {
                        const isCorrect = opt === node.data.correctAnswer;
                        const isSelected = opt === node.data.userSelectedAnswer;
                        let bgClass = "bg-zinc-800 hover:bg-zinc-700";
                        if (node.data.userSelectedAnswer) {
                            if (isCorrect) bgClass = "bg-green-600 text-white";
                            else if (isSelected) bgClass = "bg-red-600 text-white";
                            else bgClass = "bg-zinc-800 opacity-50";
                        }
                        return (
                            <button 
                                key={i}
                                onClick={(e) => { e.stopPropagation(); if(!node.data.userSelectedAnswer) onUpdate(node.id, { data: {...node.data, userSelectedAnswer: opt}})}}
                                className={`px-3 py-2 rounded text-left text-xs transition-colors ${bgClass}`}
                            >
                                {opt}
                            </button>
                        )
                    })}
                 </div>
             </div>
         );
      default:
        return (
          <textarea
            className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-zinc-300 placeholder-zinc-600"
            value={node.data.label}
            onChange={(e) => onUpdate(node.id, { data: { ...node.data, label: e.target.value } })}
            placeholder="Content..."
            onMouseDown={(e) => e.stopPropagation()}
          />
        );
    }
  };

  return (
    <div
      className="absolute flex flex-col rounded-xl shadow-xl border overflow-hidden node-shadow bg-[#18181b]"
      style={{
        left: node.x,
        top: node.y,
        width: node.width || DEFAULT_NODE_WIDTH,
        height: node.height || DEFAULT_NODE_HEIGHT,
        borderColor: isSelected ? COLORS.wireSelected : '#333',
        borderWidth: isSelected ? 2 : 1
      }}
      onMouseDown={onMouseDown}
    >
      {/* Header */}
      <div 
        className="px-3 py-2 text-xs font-bold text-white uppercase tracking-wider flex justify-between items-center shrink-0" 
        style={{ background: `linear-gradient(90deg, ${color}cc, ${color}00)`, borderBottom: '1px solid #333' }}
      >
        <span className="flex items-center gap-2">
          {node.type === 'lecture' && <Presentation size={12} />}
          {node.type === 'flashcard' && <Layers size={12} />}
          {node.title}
        </span>
        <button onClick={(e) => { e.stopPropagation(); onDelete(node.id); }} className="hover:text-red-400"><Trash2 size={12} /></button>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col p-3 relative overflow-hidden">
        {/* Pins */}
        <div className="absolute left-[-8px] top-2 w-4 h-4 bg-white rounded-full border-4 border-zinc-800 cursor-crosshair hover:scale-125 z-10" onMouseUp={(e) => onConnectEnd(e, node.id)}></div>
        <div className="absolute right-[-8px] top-2 w-4 h-4 border-4 border-zinc-800 rounded-full cursor-crosshair hover:scale-125 z-10" style={{backgroundColor: node.completed ? '#10b981' : '#52525b'}} onMouseDown={(e) => onConnectStart(e, node.id)}></div>

        {/* Content */}
        {renderContent()}

        {/* Attachments */}
        {node.data.attachments && node.data.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {node.data.attachments.map(att => (
              <div key={att.id} className="bg-zinc-800 rounded px-1.5 py-0.5 text-[10px] flex items-center gap-1 border border-zinc-700 max-w-full">
                {att.type === 'image' ? <ImageIcon size={10} className="text-purple-400"/> : att.type === 'audio' ? <Music size={10} className="text-pink-400"/> : <FileText size={10} className="text-blue-400"/>}
                <span className="truncate max-w-[60px] cursor-pointer hover:underline" onClick={(e) => {e.stopPropagation(); if(att.data) window.open(att.data)}}>{att.name}</span>
                <X size={10} className="cursor-pointer hover:text-red-400" onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { data: {...node.data, attachments: node.data.attachments.filter(a=>a.id!==att.id)} }); }} />
              </div>
            ))}
          </div>
        )}

        {/* Footer Controls */}
        <div className="mt-2 pt-2 border-t border-zinc-800 flex gap-2 shrink-0">
          <button onClick={(e) => {e.stopPropagation(); onAttach(node.id);}} className="p-1 hover:bg-zinc-700 rounded text-zinc-400"><Paperclip size={12}/></button>
          <button onClick={(e) => {e.stopPropagation(); onAIAction(node.id, 'menu', e);}} className="p-1 hover:bg-zinc-700 rounded text-indigo-400"><Sparkles size={12}/></button>
          {node.type === 'flashcard' && <button onClick={(e)=>{e.stopPropagation(); const f=prompt("Front:"); const b=prompt("Back:"); if(f&&b) onUpdate(node.id, {data:{...node.data, front:f, back:b}});}} className="p-1 hover:bg-zinc-700 rounded text-emerald-400"><FileText size={12}/></button>}
          <div className="flex-1"></div>
          <button onClick={(e) => { e.stopPropagation(); onUpdate(node.id, { completed: !node.completed }); }} className={`p-1 rounded ${node.completed ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}><CheckCircle size={14} /></button>
          <div className="cursor-nwse-resize pl-2" onMouseDown={(e) => onResizeStart(e, node.id)}><GripHorizontal size={14} className="text-zinc-600 rotate-45" /></div>
        </div>
      </div>
    </div>
  );
};
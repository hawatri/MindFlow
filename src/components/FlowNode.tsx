import React from 'react';
import { 
  CheckCircle, Circle, X, Trash2, Lock, Paperclip, 
  Presentation, Lightbulb, HelpCircle, FileText, 
  Link as LinkIcon, Sparkles, GripHorizontal, Pin
} from 'lucide-react';
import { COLORS, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../constants';
import type { Node, Attachment } from '../types';
import { AIInsight } from './AIInsight';

interface FlowNodeProps {
  node: Node;
  isLocked: boolean;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onResizeMouseDown: (e: React.MouseEvent, id: string) => void;
  onPinMouseDown: (e: React.MouseEvent, id: string, type: string) => void;
  onPinMouseUp: (e: React.MouseEvent, id: string, type: string) => void;
  onUpdateNode: (id: string, updates: Partial<Node>) => void;
  onDeleteNode: (id: string) => void;
  onDeleteAttachment: (nodeId: string, attachmentId: number) => void;
  onAttachClick: (nodeId: string) => void;
  onAddLink: (nodeId: string) => void;
  onAIClick: (e: React.MouseEvent, nodeId: string) => void;
  onContextMenu?: (e: React.MouseEvent, nodeId: string) => void;
}

export const FlowNode: React.FC<FlowNodeProps> = ({
  node,
  isLocked,
  isSelected,
  onMouseDown,
  onResizeMouseDown,
  onPinMouseDown,
  onPinMouseUp,
  onUpdateNode,
  onDeleteNode,
  onDeleteAttachment,
  onAttachClick,
  onAddLink,
  onAIClick,
  onContextMenu
}) => {
  let headerColor = COLORS.nodeHeaderTask;
  
  if (node.type === 'event' || node.type === 'goal') headerColor = COLORS.nodeHeaderGoal;
  if (node.type === 'note') headerColor = COLORS.nodeHeaderNote;
  if (node.type === 'lecture') headerColor = COLORS.nodeHeaderLecture;
  if (node.type === 'concept') headerColor = COLORS.nodeHeaderConcept;
  if (node.type === 'question') headerColor = COLORS.nodeHeaderQuestion;
  if (node.type === 'summary') headerColor = COLORS.nodeHeaderSummary;
  if (node.type === 'resource') headerColor = COLORS.nodeHeaderResource;
  if (node.type === 'idea') headerColor = COLORS.nodeHeaderIdea;

  const getNodeIcon = () => {
    switch (node.type) {
      case 'lecture': return <Presentation size={12} />;
      case 'concept': return <Lightbulb size={12} />;
      case 'question': return <HelpCircle size={12} />;
      case 'summary': return <FileText size={12} />;
      default: return <CheckCircle size={12} />;
    }
  };

  const handleToggleComplete = () => {
    if (!isLocked) {
      onUpdateNode(node.id, { completed: !node.completed });
    }
  };

  const handleLabelChange = (value: string) => {
    onUpdateNode(node.id, { 
      data: { ...node.data, label: value } 
    });
  };

  return (
    <div 
      className="absolute flex flex-col rounded-lg shadow-xl border overflow-hidden group transition-shadow duration-200" 
      style={{ 
        left: node.x, 
        top: node.y, 
        width: node.width || DEFAULT_NODE_WIDTH, 
        height: node.height || DEFAULT_NODE_HEIGHT, 
        backgroundColor: 'rgba(20, 20, 20, 0.95)', 
        borderColor: isSelected ? '#3b82f6' : (isLocked ? '#7f1d1d' : node.pinned ? '#f59e0b' : '#333'), 
        borderWidth: isSelected ? '2px' : '1px', 
        opacity: isLocked ? 0.6 : 1, 
        backdropFilter: 'blur(8px)', 
        zIndex: 20 
      }} 
      onMouseDown={(e) => onMouseDown(e, node.id)}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.stopPropagation();
          onContextMenu(e, node.id);
        }
      }}
    >
      {/* Header */}
      <div 
        className="px-3 py-2 text-xs font-bold text-white uppercase tracking-wider flex justify-between items-center shrink-0" 
        style={{ 
          background: `linear-gradient(90deg, ${headerColor}cc 0%, ${headerColor}00 100%)`, 
          borderBottom: '1px solid rgba(255,255,255,0.1)' 
        }}
      >
        <span className="flex items-center gap-2">
          {getNodeIcon()}
          {node.title}
          {node.pinned && (
            <Pin size={12} className="text-amber-500" fill="currentColor" />
          )}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              onDeleteNode(node.id); 
            }} 
            className="hover:text-red-400"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 text-sm relative flex flex-col flex-grow h-full overflow-hidden">
        {/* Input Pin */}
        {node.type !== 'event' && (
          <div 
            className="absolute left-[-21px] top-2 p-3 cursor-crosshair z-10 group/pin" 
            title="Input" 
            onMouseDown={(e) => e.stopPropagation()} 
            onMouseUp={(e) => onPinMouseUp(e, node.id, 'input')}
          >
            <div className="w-4 h-4 rounded-full bg-white border-2 border-zinc-800 group-hover/pin:scale-150 transition-transform shadow-sm"></div>
          </div>
        )}

        {/* Output Pin */}
        {node.type !== 'goal' && node.type !== 'note' && (
          <div 
            className="absolute right-[-21px] top-2 p-3 cursor-crosshair z-10 group/pin" 
            title="Output" 
            onMouseDown={(e) => onPinMouseDown(e, node.id, 'output')}
          >
            <div 
              className="w-4 h-4 rounded-full border-2 border-zinc-800 group-hover/pin:scale-150 transition-transform shadow-sm" 
              style={{ backgroundColor: node.completed ? '#4ade80' : '#fff' }}
            ></div>
          </div>
        )}

        <div className="flex flex-col gap-2 flex-grow h-full overflow-hidden">
          {/* Text Area */}
          <textarea 
            className="bg-transparent border-none text-zinc-300 focus:text-white focus:outline-none placeholder-zinc-600 w-full resize-none flex-grow text-sm font-mono leading-relaxed p-1 min-h-[40px]" 
            value={node.data.label} 
            onChange={(e) => handleLabelChange(e.target.value)} 
            placeholder="Notes..." 
            onMouseDown={(e) => e.stopPropagation()} 
          />

          {/* AI Insight */}
          {node.data.aiInsight && (
            <AIInsight insight={node.data.aiInsight} />
          )}

          {/* Attachments */}
          <div className="flex flex-col gap-1 mb-1 max-h-[120px] overflow-y-auto pr-1">
            {node.data.attachments?.map((att: Attachment) => {
              const isImage = att.type === 'file' && att.url && att.url.startsWith('data:image');
              
              if (isImage) {
                return (
                  <div key={att.id} className="relative group/image mb-1">
                    <img 
                      src={att.url} 
                      alt={att.name} 
                      className="w-full h-auto max-h-32 object-cover rounded bg-zinc-900 border border-zinc-700" 
                    />
                    <div className="absolute top-1 right-1 opacity-0 group-hover/image:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          onDeleteAttachment(node.id, att.id); 
                        }} 
                        className="p-1 bg-black/50 hover:bg-red-500 rounded text-white"
                      >
                        <X size={10} />
                      </button>
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate px-1 mt-0.5">{att.name}</div>
                  </div>
                );
              }
              
              return (
                <div 
                  key={att.id} 
                  className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 text-[10px] max-w-full" 
                  title={att.name}
                >
                  {att.type === 'link' ? (
                    <LinkIcon size={10} className="text-blue-400 shrink-0"/>
                  ) : (
                    <FileText size={10} className="text-zinc-400 shrink-0"/>
                  )}
                  <a 
                    href={att.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="truncate flex-1 hover:underline text-zinc-300 hover:text-white" 
                    onMouseDown={e => e.stopPropagation()}
                  >
                    {att.name}
                  </a>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onDeleteAttachment(node.id, att.id); 
                    }} 
                    className="hover:text-red-400 shrink-0 ml-1"
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          {node.type !== 'note' && (
            <div className="flex items-center gap-2 mt-auto pt-2 border-t border-zinc-800 shrink-0">
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onAttachClick(node.id); 
                }} 
                className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                <Paperclip size={12} />
              </button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onAddLink(node.id); 
                }} 
                className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                <LinkIcon size={12} />
              </button>
              <button 
                onClick={(e) => onAIClick(e, node.id)} 
                className="p-1 rounded bg-zinc-800 text-indigo-400 hover:text-indigo-200 hover:bg-zinc-700 transition-colors"
              >
                <Sparkles size={12} />
              </button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  handleToggleComplete(); 
                }} 
                disabled={isLocked} 
                className={`flex-1 py-1 px-2 rounded flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
                  isLocked 
                    ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed' 
                    : (node.completed 
                      ? 'bg-green-900/50 text-green-400 hover:bg-green-900/70' 
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white')
                }`}
              >
                {isLocked ? <Lock size={12} /> : (node.completed ? <CheckCircle size={12} /> : <Circle size={12} />)}
                {isLocked ? 'LOCKED' : (node.completed ? 'DONE' : 'MARK DONE')}
              </button>
            </div>
          )}
        </div>

        {/* Resize Handle */}
        {!node.pinned && (
          <div 
            className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-center justify-center text-zinc-600 hover:text-zinc-400 z-20" 
            onMouseDown={(e) => onResizeMouseDown(e, node.id)}
          >
            <GripHorizontal size={14} className="rotate-45" />
          </div>
        )}
      </div>
    </div>
  );
};
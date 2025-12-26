import React from 'react';
import { 
  CheckCircle, Unplug, Presentation, Lightbulb, HelpCircle, 
  FileText, FolderOpen, BoxSelect, Sparkles, GraduationCap, 
  Zap, Pin, PinOff
} from 'lucide-react';
import type { ContextMenu, AIMenu } from '../types';

interface ContextMenuProps {
  contextMenu: ContextMenu;
  onAddNode: (type: string) => void;
  onAddGroup: () => void;
  onDeleteEdge: (id: string) => void;
  onTogglePinNode?: (id: string) => void;
  onTogglePinGroup?: (id: string) => void;
  selectedNode?: { id: string; pinned?: boolean } | null;
  selectedGroup?: { id: string; pinned?: boolean } | null;
}

export const ContextMenuComponent: React.FC<ContextMenuProps> = ({
  contextMenu,
  onAddNode,
  onAddGroup,
  onDeleteEdge,
  onTogglePinNode,
  onTogglePinGroup,
  selectedNode,
  selectedGroup
}) => {
  const isNodeMenu = contextMenu.type === 'node' && contextMenu.targetId;
  const isGroupMenu = contextMenu.type === 'group' && contextMenu.targetId;
  const isPinned = isNodeMenu ? selectedNode?.pinned : (isGroupMenu ? selectedGroup?.pinned : false);

  return (
    <div 
      className="fixed bg-zinc-900 border border-zinc-700 shadow-2xl rounded-lg p-1 min-w-[160px] z-[60] flex flex-col gap-1 text-sm text-zinc-300 animate-in fade-in zoom-in duration-100" 
      style={{ top: contextMenu.y, left: contextMenu.x }} 
      onClick={(e) => e.stopPropagation()}
    >
      {contextMenu.type === 'edge' ? (
        <button 
          onClick={() => onDeleteEdge(contextMenu.targetId!)} 
          className="flex items-center gap-2 px-2 py-1.5 hover:bg-red-900/50 hover:text-red-400 rounded text-left"
        >
          <Unplug size={14} /> Disconnect
        </button>
      ) : isNodeMenu || isGroupMenu ? (
        <>
          {(onTogglePinNode || onTogglePinGroup) && (
            <button 
              onClick={() => {
                if (isNodeMenu && onTogglePinNode) {
                  onTogglePinNode(contextMenu.targetId!);
                } else if (isGroupMenu && onTogglePinGroup) {
                  onTogglePinGroup(contextMenu.targetId!);
                }
              }}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded text-left"
            >
              {isPinned ? (
                <>
                  <PinOff size={14} className="text-amber-500" /> Unpin
                </>
              ) : (
                <>
                  <Pin size={14} className="text-amber-500" /> Pin
                </>
              )}
            </button>
          )}
        </>
      ) : (
        <>
          <div className="px-2 py-1 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Learning</div>
          <button 
            onClick={() => onAddNode('lecture')} 
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded text-left"
          >
            <Presentation size={14} className="text-violet-500" /> Lecture Note
          </button>
          <button 
            onClick={() => onAddNode('concept')} 
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded text-left"
          >
            <Lightbulb size={14} className="text-cyan-500" /> Concept
          </button>
          <button 
            onClick={() => onAddNode('question')} 
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded text-left"
          >
            <HelpCircle size={14} className="text-rose-500" /> Question
          </button>
          <button 
            onClick={() => onAddNode('summary')} 
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded text-left"
          >
            <FileText size={14} className="text-amber-500" /> Summary
          </button>
          <div className="h-px bg-zinc-800 my-0.5"></div>
          <div className="px-2 py-1 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Action</div>
          <button 
            onClick={() => onAddNode('task')} 
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded text-left"
          >
            <CheckCircle size={14} className="text-blue-500" /> Task
          </button>
          <button 
            onClick={() => onAddNode('resource')} 
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded text-left"
          >
            <FolderOpen size={14} className="text-gray-400" /> Resource
          </button>
          <button 
            onClick={onAddGroup} 
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded text-left"
          >
            <BoxSelect size={14} /> Group
          </button>
        </>
      )}
    </div>
  );
};

interface AIMenuProps {
  aiMenu: AIMenu;
  onAIOperation: (operation: string, nodeId: string) => void;
}

const SplitIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
    <path d="M12 3v18"/>
    <path d="M3 12h18"/>
  </svg>
);

export const AIMenuComponent: React.FC<AIMenuProps> = ({
  aiMenu,
  onAIOperation
}) => {
  return (
    <div 
      className="fixed bg-zinc-900 border border-indigo-500/30 shadow-2xl shadow-indigo-900/20 rounded-lg p-1 min-w-[170px] z-[60] flex flex-col gap-1 text-sm text-zinc-300 animate-in fade-in zoom-in duration-100" 
      style={{ top: aiMenu.y - 140, left: aiMenu.x + 20 }} 
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-2 py-1 text-xs text-indigo-400 font-semibold uppercase tracking-wider flex items-center gap-2">
        <Sparkles size={12} /> AI Tutor
      </div>
      <button 
        onClick={() => onAIOperation('explain', aiMenu.nodeId)} 
        className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded text-left"
      >
        <GraduationCap className="w-4 h-4 text-cyan-400" /> Explain
      </button>
      <button 
        onClick={() => onAIOperation('quiz', aiMenu.nodeId)} 
        className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded text-left"
      >
        <HelpCircle className="w-4 h-4 text-rose-400" /> Quiz Me
      </button>
      <button 
        onClick={() => onAIOperation('decompose', aiMenu.nodeId)} 
        className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded text-left"
      >
        <SplitIcon className="w-4 h-4 text-blue-400" /> Break Down
      </button>
      <button 
        onClick={() => onAIOperation('enhance', aiMenu.nodeId)} 
        className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded text-left"
      >
        <Zap className="w-4 h-4 text-amber-400" /> Enhance
      </button>
    </div>
  );
};
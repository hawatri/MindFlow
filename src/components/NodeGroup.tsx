import React from 'react';
import { GripHorizontal, Trash2, Pin } from 'lucide-react';
import { COLORS } from '../constants';
import type { Group } from '../types';

interface NodeGroupProps {
  group: Group;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, group: Group) => void;
  onResizeMouseDown: (e: React.MouseEvent, id: string) => void;
  onUpdateGroup: (id: string, updates: Partial<Group>) => void;
  onDeleteGroup: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, groupId: string) => void;
}

export const NodeGroup: React.FC<NodeGroupProps> = ({
  group,
  isSelected,
  onMouseDown,
  onResizeMouseDown,
  onUpdateGroup,
  onDeleteGroup,
  onContextMenu
}) => {
  const handleTitleChange = (value: string) => {
    onUpdateGroup(group.id, { title: value });
  };

  return (
    <div 
      className="absolute border flex flex-col group/groupbox" 
      style={{ 
        left: group.x, 
        top: group.y, 
        width: group.width, 
        height: group.height, 
        backgroundColor: COLORS.groupBg, 
        borderColor: isSelected ? '#ffffff' : (group.pinned ? '#f59e0b' : 'rgba(255,255,255,0.1)'), 
        borderRadius: '16px', 
        zIndex: 0 
      }} 
      onMouseDown={(e) => onMouseDown(e, group)}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.stopPropagation();
          onContextMenu(e, group.id);
        }
      }}
    >
      <div 
        className={`px-4 py-2 rounded-t-2xl font-bold text-lg text-white/50 hover:text-white transition-colors flex items-center gap-2 ${group.pinned ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
        style={{ backgroundColor: group.color }}
      >
        <input 
          value={group.title} 
          onChange={(e) => handleTitleChange(e.target.value)} 
          className="bg-transparent border-none focus:outline-none flex-1 cursor-text" 
          onMouseDown={(e) => e.stopPropagation()} 
        />
        {group.pinned && (
          <Pin size={14} className="text-amber-500" fill="currentColor" />
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteGroup(group.id);
          }}
          className="opacity-0 group-hover/groupbox:opacity-100 hover:text-red-400 transition-opacity p-1"
          title="Delete Group"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {!group.pinned && (
        <div 
          className="absolute bottom-2 right-2 w-6 h-6 cursor-nwse-resize flex items-center justify-center text-zinc-600 hover:text-white z-10" 
          onMouseDown={(e) => onResizeMouseDown(e, group.id)}
        >
          <GripHorizontal size={20} className="rotate-45" />
        </div>
      )}
    </div>
  );
};
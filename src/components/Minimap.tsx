import React, { useMemo } from 'react';
import type { Node, Edge, Viewport } from '../types';
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../constants';

interface MinimapProps {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  onViewportChange: (viewport: Viewport) => void;
  canvasWidth: number;
  canvasHeight: number;
  sidebarOpen?: boolean;
}

const MINIMAP_SIZE = 200;
const MINIMAP_PADDING = 20;

export const Minimap: React.FC<MinimapProps> = ({
  nodes,
  edges,
  viewport,
  onViewportChange,
  canvasWidth,
  canvasHeight,
  sidebarOpen = false
}) => {
  // Calculate bounding box of all nodes
  const bounds = useMemo(() => {
    if (nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 1000, maxY: 1000, width: 1000, height: 1000 };
    }

    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x + (n.width || DEFAULT_NODE_WIDTH)));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y + (n.height || DEFAULT_NODE_HEIGHT)));
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Add padding
    const padding = 100;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
      width: width + padding * 2,
      height: height + padding * 2
    };
  }, [nodes]);

  // Calculate scale to fit all nodes in minimap
  const scale = useMemo(() => {
    const availableWidth = MINIMAP_SIZE - MINIMAP_PADDING * 2;
    const availableHeight = MINIMAP_SIZE - MINIMAP_PADDING * 2;
    const scaleX = availableWidth / bounds.width;
    const scaleY = availableHeight / bounds.height;
    return Math.min(scaleX, scaleY, 1); // Don't scale up
  }, [bounds]);

  // Convert world coordinates to minimap coordinates
  const worldToMinimap = (worldX: number, worldY: number) => {
    const x = MINIMAP_PADDING + (worldX - bounds.minX) * scale;
    const y = MINIMAP_PADDING + (worldY - bounds.minY) * scale;
    return { x, y };
  };

  // Convert minimap coordinates to world coordinates
  const minimapToWorld = (minimapX: number, minimapY: number) => {
    const worldX = bounds.minX + (minimapX - MINIMAP_PADDING) / scale;
    const worldY = bounds.minY + (minimapY - MINIMAP_PADDING) / scale;
    return { worldX, worldY };
  };

  // Calculate viewport rectangle in minimap coordinates
  const viewportRect = useMemo(() => {
    // Viewport world coordinates (top-left of visible area)
    const visibleLeft = -viewport.x / viewport.zoom;
    const visibleTop = -viewport.y / viewport.zoom;
    const visibleWidth = canvasWidth / viewport.zoom;
    const visibleHeight = canvasHeight / viewport.zoom;

    const topLeft = worldToMinimap(visibleLeft, visibleTop);
    const bottomRight = worldToMinimap(visibleLeft + visibleWidth, visibleTop + visibleHeight);

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y
    };
  }, [viewport, canvasWidth, canvasHeight, bounds, scale]);

  const handleMinimapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const minimapX = e.clientX - rect.left;
    const minimapY = e.clientY - rect.top;

    const { worldX, worldY } = minimapToWorld(minimapX, minimapY);

    // Center viewport on clicked position
    const newX = -(worldX * viewport.zoom - canvasWidth / 2);
    const newY = -(worldY * viewport.zoom - canvasHeight / 2);

    onViewportChange({
      ...viewport,
      x: newX,
      y: newY
    });
  };

  if (nodes.length === 0) {
    return null;
  }

  // Adjust position if sidebar is open
  const rightOffset = sidebarOpen ? 408 : 16; // 384px sidebar + 16px padding + 8px gap

  return (
    <div 
      className="absolute bottom-4 bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 rounded-lg shadow-xl z-40 pointer-events-auto"
      style={{ 
        width: MINIMAP_SIZE, 
        height: MINIMAP_SIZE,
        right: `${rightOffset}px`
      }}
    >
      <svg
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
        className="cursor-pointer"
        onClick={handleMinimapClick}
      >
        {/* Background */}
        <rect width={MINIMAP_SIZE} height={MINIMAP_SIZE} fill="#18181b" rx="8" />

        {/* Draw nodes */}
        {nodes.map(node => {
          const pos = worldToMinimap(node.x, node.y);
          const width = (node.width || DEFAULT_NODE_WIDTH) * scale;
          const height = (node.height || DEFAULT_NODE_HEIGHT) * scale;

          return (
            <rect
              key={node.id}
              x={pos.x}
              y={pos.y}
              width={Math.max(width, 2)}
              height={Math.max(height, 2)}
              fill="#3b82f6"
              fillOpacity={0.4}
              stroke="#3b82f6"
              strokeWidth={0.5}
              rx={1}
            />
          );
        })}

        {/* Draw edges */}
        {edges.map(edge => {
          const source = nodes.find(n => n.id === edge.source);
          const target = nodes.find(n => n.id === edge.target);
          if (!source || !target) return null;

          const sourcePos = worldToMinimap(
            source.x + (source.width || DEFAULT_NODE_WIDTH) / 2,
            source.y + (source.height || DEFAULT_NODE_HEIGHT) / 2
          );
          const targetPos = worldToMinimap(
            target.x + (target.width || DEFAULT_NODE_WIDTH) / 2,
            target.y + (target.height || DEFAULT_NODE_HEIGHT) / 2
          );

          return (
            <line
              key={edge.id}
              x1={sourcePos.x}
              y1={sourcePos.y}
              x2={targetPos.x}
              y2={targetPos.y}
              stroke="#64748b"
              strokeWidth={0.5}
              opacity={0.3}
            />
          );
        })}

        {/* Viewport rectangle */}
        <rect
          x={viewportRect.x}
          y={viewportRect.y}
          width={Math.max(viewportRect.width, 4)}
          height={Math.max(viewportRect.height, 4)}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={2}
          strokeDasharray="3 3"
          rx={1}
        />
      </svg>
    </div>
  );
};


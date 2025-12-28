import { useRef, useCallback } from 'react';
import type { Viewport, ConnectingState, DragState } from '../types';

interface UseCanvasInteractionsProps {
  viewport: Viewport;
  setViewport: (viewport: Viewport | ((prev: Viewport) => Viewport)) => void;
  isDraggingCanvas: boolean;
  setIsDraggingCanvas: (dragging: boolean) => void;
  isDraggingNode: string | null;
  setIsDraggingNode: (nodeId: string | null) => void;
  isDraggingGroup: DragState | null;
  setIsDraggingGroup: (state: DragState | null) => void;
  isResizingNode: string | null;
  setIsResizingNode: (nodeId: string | null) => void;
  isResizingGroup: string | null;
  setIsResizingGroup: (groupId: string | null) => void;
  connecting: ConnectingState | null;
  setConnecting: (state: ConnectingState | null) => void;
  dragStart: { x: number; y: number };
  setDragStart: (pos: { x: number; y: number }) => void;
  setSelection: (id: string | null) => void;
  setContextMenu: (menu: any) => void;
  setAiMenu: (menu: any) => void;
  onUpdateNodes: (updater: (nodes: any[]) => any[]) => void;
  onUpdateGroups: (updater: (groups: any[]) => any[]) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}

export const useCanvasInteractions = ({
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
  onUpdateNodes,
  onUpdateGroups,
  canvasRef
}: UseCanvasInteractionsProps) => {
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const touchDownPos = useRef<{ x: number; y: number } | null>(null);
  const touchStartDistance = useRef<number | null>(null);
  const touchStartZoom = useRef<number>(1);
  const longPressTimer = useRef<number | null>(null);
  const lastTouchTime = useRef<number>(0);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setViewport(prev => ({
        ...prev,
        zoom: Math.min(Math.max(prev.zoom - e.deltaY * 0.001, 0.2), 3)
      }));
    } else {
      setViewport(prev => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  }, [setViewport]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ([0, 1, 2].includes(e.button)) {
      mouseDownPos.current = { x: e.clientX, y: e.clientY };
      if (e.button === 0) {
        setSelection(null);
        setContextMenu(null);
        setAiMenu(null);
      }
    }
  }, [setSelection, setContextMenu, setAiMenu]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (mouseDownPos.current && !isDraggingCanvas && !isDraggingNode && !isDraggingGroup && !isResizingNode && !isResizingGroup && !connecting) {
      if (Math.abs(e.clientX - mouseDownPos.current.x) > 5 || Math.abs(e.clientY - mouseDownPos.current.y) > 5) {
        setIsDraggingCanvas(true);
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    }

    if (isDraggingCanvas) {
      setViewport(prev => ({
        ...prev,
        x: prev.x + (e.clientX - dragStart.x),
        y: prev.y + (e.clientY - dragStart.y)
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }

    if (isDraggingNode) {
      onUpdateNodes(nodes => 
        nodes.map(n => 
          n.id === isDraggingNode 
            ? { 
                ...n, 
                x: n.x + (e.clientX - dragStart.x) / viewport.zoom, 
                y: n.y + (e.clientY - dragStart.y) / viewport.zoom 
              } 
            : n
        )
      );
      setDragStart({ x: e.clientX, y: e.clientY });
    }

    if (isDraggingGroup) {
      const dx = (e.clientX - dragStart.x) / viewport.zoom;
      const dy = (e.clientY - dragStart.y) / viewport.zoom;
      
      onUpdateGroups(groups => 
        groups.map(g => 
          g.id === isDraggingGroup.id 
            ? { ...g, x: g.x + dx, y: g.y + dy } 
            : g
        )
      );
      
      onUpdateNodes(nodes => 
        nodes.map(n => 
          isDraggingGroup.capturedNodes?.includes(n.id) 
            ? { ...n, x: n.x + dx, y: n.y + dy } 
            : n
        )
      );
      
      setDragStart({ x: e.clientX, y: e.clientY });
    }

    if (isResizingNode) {
      onUpdateNodes(nodes => 
        nodes.map(n => 
          n.id === isResizingNode 
            ? { 
                ...n, 
                width: Math.max(180, n.width + (e.clientX - dragStart.x) / viewport.zoom), 
                height: Math.max(120, n.height + (e.clientY - dragStart.y) / viewport.zoom) 
              } 
            : n
        )
      );
      setDragStart({ x: e.clientX, y: e.clientY });
    }

    if (isResizingGroup) {
      onUpdateGroups(groups => 
        groups.map(g => 
          g.id === isResizingGroup 
            ? { 
                ...g, 
                width: Math.max(200, g.width + (e.clientX - dragStart.x) / viewport.zoom), 
                height: Math.max(150, g.height + (e.clientY - dragStart.y) / viewport.zoom) 
              } 
            : g
        )
      );
      setDragStart({ x: e.clientX, y: e.clientY });
    }

    if (connecting && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setConnecting(prev => prev ? {
        ...prev,
        currentX: (e.clientX - rect.left - viewport.x) / viewport.zoom,
        currentY: (e.clientY - rect.top - viewport.y) / viewport.zoom
      } : null);
    }
  }, [
    isDraggingCanvas, isDraggingNode, isDraggingGroup, isResizingNode, isResizingGroup, connecting,
    dragStart, viewport, setViewport, setIsDraggingCanvas, setDragStart, onUpdateNodes, onUpdateGroups,
    setConnecting, canvasRef
  ]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingCanvas(false);
    setIsDraggingNode(null);
    setIsDraggingGroup(null);
    setIsResizingNode(null);
    setIsResizingGroup(null);
    setConnecting(null);
    mouseDownPos.current = null;
  }, [setIsDraggingCanvas, setIsDraggingNode, setIsDraggingGroup, setIsResizingNode, setIsResizingGroup, setConnecting]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (isDraggingCanvas) return;
    
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        viewportX: (e.clientX - rect.left - viewport.x) / viewport.zoom,
        viewportY: (e.clientY - rect.top - viewport.y) / viewport.zoom,
        type: 'canvas'
      });
    }
    setAiMenu(null);
  }, [isDraggingCanvas, canvasRef, viewport, setContextMenu, setAiMenu]);

  // Touch event handlers
  const getTouchPos = useCallback((e: React.TouchEvent | TouchEvent) => {
    const touch = e.touches[0] || e.changedTouches[0];
    return { x: touch.clientX, y: touch.clientY };
  }, []);

  const getTouchDistance = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (e.touches.length < 2) return null;
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touchPos = getTouchPos(e);
    touchDownPos.current = touchPos;
    lastTouchTime.current = Date.now();

    // Handle pinch-to-zoom (two touches)
    if (e.touches.length === 2) {
      const distance = getTouchDistance(e);
      if (distance) {
        touchStartDistance.current = distance;
        touchStartZoom.current = viewport.zoom;
      }
      return;
    }

    // Single touch - start long press timer for context menu
    if (e.touches.length === 1) {
      longPressTimer.current = window.setTimeout(() => {
        if (canvasRef.current && touchDownPos.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          setContextMenu({
            x: touchDownPos.current.x,
            y: touchDownPos.current.y,
            viewportX: (touchDownPos.current.x - rect.left - viewport.x) / viewport.zoom,
            viewportY: (touchDownPos.current.y - rect.top - viewport.y) / viewport.zoom,
            type: 'canvas'
          });
          setAiMenu(null);
        }
      }, 500); // 500ms for long press
    }

    setSelection(null);
    setContextMenu(null);
    setAiMenu(null);
  }, [viewport, canvasRef, setSelection, setContextMenu, setAiMenu, getTouchPos, getTouchDistance]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    // Cancel long press if user moves
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Handle pinch-to-zoom
    if (e.touches.length === 2 && touchStartDistance.current !== null) {
      const distance = getTouchDistance(e);
      if (distance && touchStartDistance.current > 0) {
        const scale = distance / touchStartDistance.current;
        const newZoom = Math.min(Math.max(touchStartZoom.current * scale, 0.2), 3);
        setViewport(prev => ({ ...prev, zoom: newZoom }));
      }
      return;
    }

    // Single touch - handle pan/drag
    if (e.touches.length === 1 && touchDownPos.current) {
      const touchPos = getTouchPos(e);
      
      if (!isDraggingCanvas && !isDraggingNode && !isDraggingGroup && !isResizingNode && !isResizingGroup && !connecting) {
        if (Math.abs(touchPos.x - touchDownPos.current.x) > 5 || Math.abs(touchPos.y - touchDownPos.current.y) > 5) {
          setIsDraggingCanvas(true);
          setDragStart(touchPos);
        }
      }

      if (isDraggingCanvas) {
        setViewport(prev => ({
          ...prev,
          x: prev.x + (touchPos.x - dragStart.x),
          y: prev.y + (touchPos.y - dragStart.y)
        }));
        setDragStart(touchPos);
      }

      if (isDraggingNode) {
        onUpdateNodes(nodes => 
          nodes.map(n => 
            n.id === isDraggingNode 
              ? { 
                  ...n, 
                  x: n.x + (touchPos.x - dragStart.x) / viewport.zoom, 
                  y: n.y + (touchPos.y - dragStart.y) / viewport.zoom 
                } 
              : n
          )
        );
        setDragStart(touchPos);
      }

      if (isDraggingGroup) {
        const dx = (touchPos.x - dragStart.x) / viewport.zoom;
        const dy = (touchPos.y - dragStart.y) / viewport.zoom;
        
        onUpdateGroups(groups => 
          groups.map(g => 
            g.id === isDraggingGroup.id 
              ? { ...g, x: g.x + dx, y: g.y + dy } 
              : g
          )
        );
        
        onUpdateNodes(nodes => 
          nodes.map(n => 
            isDraggingGroup.capturedNodes?.includes(n.id) 
              ? { ...n, x: n.x + dx, y: n.y + dy } 
              : n
          )
        );
        
        setDragStart(touchPos);
      }

      if (isResizingNode) {
        onUpdateNodes(nodes => 
          nodes.map(n => 
            n.id === isResizingNode 
              ? { 
                  ...n, 
                  width: Math.max(180, n.width + (touchPos.x - dragStart.x) / viewport.zoom), 
                  height: Math.max(120, n.height + (touchPos.y - dragStart.y) / viewport.zoom) 
                } 
              : n
          )
        );
        setDragStart(touchPos);
      }

      if (isResizingGroup) {
        onUpdateGroups(groups => 
          groups.map(g => 
            g.id === isResizingGroup 
              ? { 
                  ...g, 
                  width: Math.max(200, g.width + (touchPos.x - dragStart.x) / viewport.zoom), 
                  height: Math.max(150, g.height + (touchPos.y - dragStart.y) / viewport.zoom) 
                } 
              : g
          )
        );
        setDragStart(touchPos);
      }

      if (connecting && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setConnecting(prev => prev ? {
          ...prev,
          currentX: (touchPos.x - rect.left - viewport.x) / viewport.zoom,
          currentY: (touchPos.y - rect.top - viewport.y) / viewport.zoom
        } : null);
      }
    }
  }, [
    isDraggingCanvas, isDraggingNode, isDraggingGroup, isResizingNode, isResizingGroup, connecting,
    dragStart, viewport, setViewport, setIsDraggingCanvas, setDragStart, onUpdateNodes, onUpdateGroups,
    setConnecting, canvasRef, getTouchPos, getTouchDistance
  ]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    
    // Cancel long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    setIsDraggingCanvas(false);
    setIsDraggingNode(null);
    setIsDraggingGroup(null);
    setIsResizingNode(null);
    setIsResizingGroup(null);
    setConnecting(null);
    touchDownPos.current = null;
    touchStartDistance.current = null;
  }, [setIsDraggingCanvas, setIsDraggingNode, setIsDraggingGroup, setIsResizingNode, setIsResizingGroup, setConnecting]);

  return {
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleContextMenu,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
};
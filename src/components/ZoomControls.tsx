import React from 'react';
import { ZoomIn, ZoomOut, Minus } from 'lucide-react';
import type { Viewport } from '../types';

interface ZoomControlsProps {
  viewport: Viewport;
  onZoomChange: (zoom: number) => void;
}

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  viewport,
  onZoomChange
}) => {
  const handleZoomIn = () => {
    onZoomChange(Math.min(viewport.zoom + 0.1, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(viewport.zoom - 0.1, MIN_ZOOM));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    onZoomChange(newZoom);
  };

  const zoomPercentage = Math.round(viewport.zoom * 100);

  return (
    <div className="absolute bottom-4 left-4 bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 rounded-lg shadow-xl z-40 pointer-events-auto p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={handleZoomOut}
          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 text-zinc-300 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        
        <div className="flex items-center gap-2 min-w-[120px]">
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.05}
            value={viewport.zoom}
            onChange={handleSliderChange}
            className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <span className="text-xs text-zinc-400 font-mono min-w-[45px] text-right">
            {zoomPercentage}%
          </span>
        </div>

        <button
          onClick={handleZoomIn}
          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 text-zinc-300 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
      </div>
    </div>
  );
};


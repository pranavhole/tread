"use client";

import React from 'react';
import {
  Eye,
  EyeOff,
  Magnet,
  MousePointer2,
  PencilLine,
  RectangleHorizontal,
  Redo2,
  RotateCcw,
  TextCursorInput,
  Trash2,
  TrendingUp,
  Undo2,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  clearDrawings,
  redoDrawings,
  setActiveTool,
  setDrawingsVisible,
  setMagnetMode,
  undoDrawings,
  type DrawingTool,
} from '../../features/drawings/drawingSlice';
import SaveChartButton from './SaveChartButton';

type DrawingToolbarProps = {
  onExport: () => string | null;
};

const tools: Array<{ tool: DrawingTool; title: string; icon: React.ReactNode }> = [
  { tool: 'select', title: 'Select', icon: <MousePointer2 size={15} /> },
  { tool: 'trendLine', title: 'Trend line (T)', icon: <TrendingUp size={15} /> },
  { tool: 'horizontalLine', title: 'Horizontal line', icon: <RotateCcw size={15} className="rotate-90" /> },
  { tool: 'rectangle', title: 'Rectangle zone (R)', icon: <RectangleHorizontal size={15} /> },
  { tool: 'freehand', title: 'Freehand', icon: <PencilLine size={15} /> },
  { tool: 'fib', title: 'Fibonacci retracement', icon: <span className="text-[11px] font-semibold">%</span> },
  { tool: 'text', title: 'Text annotation', icon: <TextCursorInput size={15} /> },
];

const DrawingToolbar: React.FC<DrawingToolbarProps> = ({ onExport }) => {
  const dispatch = useAppDispatch();
  const { activeTool, magnetMode, drawingsVisible, drawings, historyPast, historyFuture } = useAppSelector(
    (state) => state.drawings
  );

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[#2a2e39] px-4 py-2">
      <div className="flex h-8 items-center rounded border border-[#2a2e39] bg-[#11151d]">
        {tools.map((item, index) => (
          <button
            key={item.tool}
            type="button"
            onClick={() => dispatch(setActiveTool(item.tool))}
            className={`grid h-8 w-8 place-items-center ${
              index > 0 ? 'border-l border-[#2a2e39]' : ''
            } ${
              activeTool === item.tool
                ? 'bg-[#f0b90b]/18 text-[#f0b90b]'
                : 'text-[#a7b1c2] hover:text-white'
            }`}
            title={item.title}
          >
            {item.icon}
          </button>
        ))}
      </div>

      <div className="flex h-8 items-center rounded border border-[#2a2e39] bg-[#11151d]">
        <button
          type="button"
          onClick={() => dispatch(undoDrawings())}
          disabled={historyPast.length === 0}
          className="grid h-8 w-8 place-items-center text-[#a7b1c2] hover:text-white disabled:opacity-35"
          title="Undo"
        >
          <Undo2 size={15} />
        </button>
        <button
          type="button"
          onClick={() => dispatch(redoDrawings())}
          disabled={historyFuture.length === 0}
          className="grid h-8 w-8 place-items-center border-l border-[#2a2e39] text-[#a7b1c2] hover:text-white disabled:opacity-35"
          title="Redo"
        >
          <Redo2 size={15} />
        </button>
        <button
          type="button"
          onClick={() => dispatch(clearDrawings())}
          disabled={drawings.length === 0}
          className="grid h-8 w-8 place-items-center border-l border-[#2a2e39] text-[#a7b1c2] hover:text-[#ea3943] disabled:opacity-35"
          title="Clear drawings"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => dispatch(setMagnetMode(!magnetMode))}
        className={`inline-grid h-8 w-8 place-items-center rounded border border-[#2a2e39] bg-[#11151d] ${
          magnetMode ? 'text-[#f0b90b]' : 'text-[#a7b1c2] hover:text-white'
        }`}
        title="Magnet snap to OHLC"
      >
        <Magnet size={15} />
      </button>

      <button
        type="button"
        onClick={() => dispatch(setDrawingsVisible(!drawingsVisible))}
        className="inline-grid h-8 w-8 place-items-center rounded border border-[#2a2e39] bg-[#11151d] text-[#a7b1c2] hover:text-white"
        title={drawingsVisible ? 'Hide drawings' : 'Show drawings'}
      >
        {drawingsVisible ? <Eye size={15} /> : <EyeOff size={15} />}
      </button>

      <SaveChartButton onExport={onExport} />
    </div>
  );
};

export default DrawingToolbar;

"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Chart as ChartJS } from 'chart.js';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  addDrawing,
  deleteDrawing,
  selectDrawing,
  setActiveTool,
  setHoveredDrawing,
  toggleDrawingLock,
  toggleDrawingVisibility,
  updateDrawingPoints,
  type Drawing,
  type DrawingPoint,
  type DrawingType,
} from '../../features/drawings/drawingSlice';
import {
  createCoordinateMapper,
  findDrawingAtPoint,
  pixelToWorld,
  snapToNearestOhlc,
  type MarketCandleForSnap,
  type PixelPoint,
} from './drawingGeometry';
import { renderDrawings } from './drawingRenderer';

type DrawingCanvasOverlayProps = {
  chartRef: React.RefObject<ChartJS<'candlestick'> | null>;
  candles: MarketCandleForSnap[];
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
};

type DraftState = {
  type: DrawingType;
  points: DrawingPoint[];
};

type DragState =
  | {
      mode: 'anchor';
      drawingId: string;
      anchorIndex: number;
      originalPoints: DrawingPoint[];
    }
  | {
      mode: 'move';
      drawingId: string;
      startPoint: DrawingPoint;
      originalPoints: DrawingPoint[];
    };

type ContextMenuState = {
  drawingId: string;
  x: number;
  y: number;
};

function makePreview(type: DrawingType, points: DrawingPoint[]): Drawing {
  return {
    id: 'preview',
    type,
    points,
    locked: false,
    visible: true,
    style:
      type === 'rectangle'
        ? { stroke: '#22c55e', fill: 'rgba(34, 197, 94, 0.14)', width: 1.5 }
        : type === 'horizontalLine'
          ? { stroke: '#38bdf8', width: 1.5, dash: [8, 6] }
          : type === 'fib'
            ? { stroke: '#a78bfa', width: 1.25 }
            : type === 'freehand'
              ? { stroke: '#e879f9', width: 2 }
              : { stroke: '#f0b90b', width: 2 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function getCanvasPoint(event: React.PointerEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

const DrawingCanvasOverlay: React.FC<DrawingCanvasOverlayProps> = ({
  chartRef,
  candles,
  canvasRef,
  chartContainerRef,
}) => {
  const dispatch = useAppDispatch();
  const {
    activeTool,
    drawings,
    drawingsVisible,
    hoveredDrawingId,
    magnetMode,
    selectedDrawingId,
  } = useAppSelector((state) => state.drawings);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renderTick, setRenderTick] = useState(0);
  const frameRef = useRef<number | null>(null);

  const preview = useMemo(() => (draft ? makePreview(draft.type, draft.points) : null), [draft]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = chartContainerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
      setRenderTick((tick) => tick + 1);
    };

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(container);

    return () => observer.disconnect();
  }, [canvasRef, chartContainerRef]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      if (event.key.toLowerCase() === 't') dispatch(setActiveTool('trendLine'));
      if (event.key.toLowerCase() === 'r') dispatch(setActiveTool('rectangle'));
      if (event.key === 'Escape') {
        setDraft(null);
        setDrag(null);
        dispatch(selectDrawing(null));
      }
      if (event.key === 'Delete' && selectedDrawingId) {
        dispatch(deleteDrawing(selectedDrawingId));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, selectedDrawingId]);

  useEffect(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);

    frameRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      const chart = chartRef.current;
      const ctx = canvas?.getContext('2d');
      const mapper = chart ? createCoordinateMapper(chart) : null;

      if (!canvas || !ctx || !chart || !mapper) return;
      if (!drawingsVisible) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      renderDrawings(
        ctx,
        drawings,
        mapper,
        chart.chartArea,
        selectedDrawingId,
        hoveredDrawingId,
        preview
      );
    });

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [
    canvasRef,
    chartRef,
    drawings,
    drawingsVisible,
    hoveredDrawingId,
    preview,
    renderTick,
    selectedDrawingId,
    candles,
  ]);

  const toWorldPoint = (pixel: PixelPoint) => {
    const chart = chartRef.current;
    const mapper = chart ? createCoordinateMapper(chart) : null;
    if (!mapper) return null;

    const point = pixelToWorld(pixel, mapper);
    return magnetMode ? snapToNearestOhlc(point, candles, mapper) : point;
  };

  const commitDraft = (currentDraft: DraftState) => {
    const points = currentDraft.points.filter(
      (point) => Number.isFinite(point.time) && Number.isFinite(point.price)
    );

    if (currentDraft.type === 'freehand' && points.length >= 2) {
      dispatch(addDrawing({ type: currentDraft.type, points }));
    } else if (currentDraft.type === 'horizontalLine' && points[0]) {
      dispatch(addDrawing({ type: currentDraft.type, points: [points[0]] }));
    } else if (points.length >= 2) {
      dispatch(addDrawing({ type: currentDraft.type, points: points.slice(0, 2) }));
    }

    setDraft(null);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const chart = chartRef.current;
    const mapper = chart ? createCoordinateMapper(chart) : null;
    if (!chart || !mapper || event.button !== 0) return;

    const pixel = getCanvasPoint(event);
    const world = toWorldPoint(pixel);
    if (!world) return;

    setContextMenu(null);
    event.currentTarget.setPointerCapture(event.pointerId);

    if (activeTool === 'select') {
      const hit = findDrawingAtPoint(drawings, pixel, mapper, chart.chartArea);
      dispatch(selectDrawing(hit?.drawing.id ?? null));

      if (hit?.drawing && !hit.drawing.locked) {
        setDrag(
          hit.anchorIndex >= 0
            ? {
                mode: 'anchor',
                drawingId: hit.drawing.id,
                anchorIndex: hit.anchorIndex,
                originalPoints: hit.drawing.points,
              }
            : {
                mode: 'move',
                drawingId: hit.drawing.id,
                startPoint: world,
                originalPoints: hit.drawing.points,
              }
        );
      }
      return;
    }

    if (activeTool === 'text') {
      const text = window.prompt('Annotation text');
      if (text?.trim()) dispatch(addDrawing({ type: 'text', points: [world], text: text.trim() }));
      return;
    }

    setDraft({ type: activeTool, points: [world, world] });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const chart = chartRef.current;
    const mapper = chart ? createCoordinateMapper(chart) : null;
    if (!chart || !mapper) return;

    const pixel = getCanvasPoint(event);
    const world = toWorldPoint(pixel);
    if (!world) return;

    if (drag) {
      const drawing = drawings.find((item) => item.id === drag.drawingId);
      if (!drawing || drawing.locked) return;

      if (drag.mode === 'anchor') {
        const points = drawing.points.map((point, index) => (index === drag.anchorIndex ? world : point));
        dispatch(updateDrawingPoints({ id: drawing.id, points }));
      } else {
        const deltaTime = world.time - drag.startPoint.time;
        const deltaPrice = world.price - drag.startPoint.price;
        dispatch(
          updateDrawingPoints({
            id: drawing.id,
            points: drag.originalPoints.map((point) => ({
              time: point.time + deltaTime,
              price: point.price + deltaPrice,
            })),
          })
        );
      }
      return;
    }

    if (draft) {
      setDraft((current) => {
        if (!current) return null;
        if (current.type === 'freehand') {
          const last = current.points.at(-1);
          if (last && Math.abs(last.time - world.time) < 1 && Math.abs(last.price - world.price) < 0.01) {
            return current;
          }
          return { ...current, points: [...current.points, world] };
        }

        return { ...current, points: [current.points[0], world] };
      });
      return;
    }

    if (activeTool === 'select') {
      const hit = findDrawingAtPoint(drawings, pixel, mapper, chart.chartArea);
      dispatch(setHoveredDrawing(hit?.drawing.id ?? null));
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;

    if (drag) {
      const drawing = drawings.find((item) => item.id === drag.drawingId);
      if (drawing) {
        dispatch(
          updateDrawingPoints({
            id: drawing.id,
            points: drawing.points,
            commit: true,
            historyPoints: drag.originalPoints,
          })
        );
      }
      setDrag(null);
    }

    if (draft) commitDraft(draft);

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const chart = chartRef.current;
    const mapper = chart ? createCoordinateMapper(chart) : null;
    if (!chart || !mapper) return;

    const hit = findDrawingAtPoint(drawings, getCanvasPoint(event), mapper, chart.chartArea);
    if (!hit) {
      setContextMenu(null);
      return;
    }

    dispatch(selectDrawing(hit.drawing.id));
    setContextMenu({ drawingId: hit.drawing.id, x: event.clientX, y: event.clientY });
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    const chartCanvas = chartRef.current?.canvas;
    if (!chartCanvas) return;

    chartCanvas.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        clientX: event.clientX,
        clientY: event.clientY,
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      })
    );
    window.setTimeout(() => setRenderTick((tick) => tick + 1), 0);
  };

  const menuDrawing = contextMenu
    ? drawings.find((drawing) => drawing.id === contextMenu.drawingId)
    : null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 z-10 ${activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      />

      {contextMenu && menuDrawing && (
        <div
          className="fixed z-50 min-w-36 overflow-hidden rounded border border-[#2a2e39] bg-[#11151d] py-1 text-sm text-[#d1d5db] shadow-2xl shadow-black/50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            onClick={() => {
              dispatch(toggleDrawingLock(menuDrawing.id));
              setContextMenu(null);
            }}
            className="block w-full px-3 py-2 text-left hover:bg-[#17202b] hover:text-white"
          >
            {menuDrawing.locked ? 'Unlock' : 'Lock'}
          </button>
          <button
            type="button"
            onClick={() => {
              dispatch(toggleDrawingVisibility(menuDrawing.id));
              setContextMenu(null);
            }}
            className="block w-full px-3 py-2 text-left hover:bg-[#17202b] hover:text-white"
          >
            {menuDrawing.visible === false ? 'Show' : 'Hide'}
          </button>
          <button
            type="button"
            onClick={() => {
              dispatch(deleteDrawing(menuDrawing.id));
              setContextMenu(null);
            }}
            className="block w-full px-3 py-2 text-left text-[#f87171] hover:bg-[#17202b]"
          >
            Delete
          </button>
        </div>
      )}
    </>
  );
};

export default DrawingCanvasOverlay;

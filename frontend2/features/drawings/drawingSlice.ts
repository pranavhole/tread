import { createSlice, nanoid } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type DrawingTool =
  | 'select'
  | 'trendLine'
  | 'horizontalLine'
  | 'rectangle'
  | 'freehand'
  | 'fib'
  | 'text';

export type DrawingType = Exclude<DrawingTool, 'select'>;

export type DrawingPoint = {
  time: number;
  price: number;
};

export type DrawingStyle = {
  stroke: string;
  fill?: string;
  width: number;
  dash?: number[];
};

export type Drawing = {
  id: string;
  type: DrawingType;
  points: DrawingPoint[];
  text?: string;
  locked?: boolean;
  visible?: boolean;
  style: DrawingStyle;
  createdAt: string;
  updatedAt: string;
};

interface DrawingsState {
  activeTool: DrawingTool;
  drawings: Drawing[];
  selectedDrawingId: string | null;
  hoveredDrawingId: string | null;
  magnetMode: boolean;
  drawingsVisible: boolean;
  historyPast: Drawing[][];
  historyFuture: Drawing[][];
}

const defaultStyles: Record<DrawingType, DrawingStyle> = {
  trendLine: { stroke: '#f0b90b', width: 2 },
  horizontalLine: { stroke: '#38bdf8', width: 1.5, dash: [8, 6] },
  rectangle: {
    stroke: '#22c55e',
    fill: 'rgba(34, 197, 94, 0.14)',
    width: 1.5,
  },
  freehand: { stroke: '#e879f9', width: 2 },
  fib: { stroke: '#a78bfa', width: 1.25 },
  text: { stroke: '#f8fafc', width: 1 },
};

const initialState: DrawingsState = {
  activeTool: 'select',
  drawings: [],
  selectedDrawingId: null,
  hoveredDrawingId: null,
  magnetMode: true,
  drawingsVisible: true,
  historyPast: [],
  historyFuture: [],
};

function pushHistory(state: DrawingsState) {
  state.historyPast.push(state.drawings.map((drawing) => ({ ...drawing, points: [...drawing.points] })));
  if (state.historyPast.length > 80) state.historyPast.shift();
  state.historyFuture = [];
}

function makeDrawing(type: DrawingType, points: DrawingPoint[], text?: string): Drawing {
  const now = new Date().toISOString();

  return {
    id: nanoid(),
    type,
    points,
    text,
    locked: false,
    visible: true,
    style: defaultStyles[type],
    createdAt: now,
    updatedAt: now,
  };
}

const drawingSlice = createSlice({
  name: 'drawings',
  initialState,
  reducers: {
    setActiveTool: (state, action: PayloadAction<DrawingTool>) => {
      state.activeTool = action.payload;
      state.selectedDrawingId = null;
    },
    setHoveredDrawing: (state, action: PayloadAction<string | null>) => {
      state.hoveredDrawingId = action.payload;
    },
    selectDrawing: (state, action: PayloadAction<string | null>) => {
      state.selectedDrawingId = action.payload;
      state.activeTool = 'select';
    },
    addDrawing: (
      state,
      action: PayloadAction<{ type: DrawingType; points: DrawingPoint[]; text?: string }>
    ) => {
      pushHistory(state);
      const drawing = makeDrawing(action.payload.type, action.payload.points, action.payload.text);
      state.drawings.push(drawing);
      state.selectedDrawingId = drawing.id;
      state.activeTool = 'select';
    },
    updateDrawingPoints: (
      state,
      action: PayloadAction<{ id: string; points: DrawingPoint[]; commit?: boolean; historyPoints?: DrawingPoint[] }>
    ) => {
      const drawing = state.drawings.find((item) => item.id === action.payload.id);
      if (!drawing || drawing.locked) return;

      if (action.payload.commit) {
        const snapshot = state.drawings.map((item) => ({
          ...item,
          points:
            item.id === action.payload.id && action.payload.historyPoints
              ? action.payload.historyPoints
              : [...item.points],
        }));
        state.historyPast.push(snapshot);
        if (state.historyPast.length > 80) state.historyPast.shift();
        state.historyFuture = [];
      }

      drawing.points = action.payload.points;
      drawing.updatedAt = new Date().toISOString();
    },
    deleteDrawing: (state, action: PayloadAction<string>) => {
      const exists = state.drawings.some((drawing) => drawing.id === action.payload);
      if (!exists) return;

      pushHistory(state);
      state.drawings = state.drawings.filter((drawing) => drawing.id !== action.payload);
      if (state.selectedDrawingId === action.payload) state.selectedDrawingId = null;
      if (state.hoveredDrawingId === action.payload) state.hoveredDrawingId = null;
    },
    toggleDrawingLock: (state, action: PayloadAction<string>) => {
      const drawing = state.drawings.find((item) => item.id === action.payload);
      if (!drawing) return;

      pushHistory(state);
      drawing.locked = !drawing.locked;
      drawing.updatedAt = new Date().toISOString();
    },
    toggleDrawingVisibility: (state, action: PayloadAction<string>) => {
      const drawing = state.drawings.find((item) => item.id === action.payload);
      if (!drawing) return;

      pushHistory(state);
      drawing.visible = drawing.visible === false;
      drawing.updatedAt = new Date().toISOString();
    },
    setMagnetMode: (state, action: PayloadAction<boolean>) => {
      state.magnetMode = action.payload;
    },
    setDrawingsVisible: (state, action: PayloadAction<boolean>) => {
      state.drawingsVisible = action.payload;
    },
    replaceDrawings: (state, action: PayloadAction<Drawing[]>) => {
      pushHistory(state);
      state.drawings = action.payload;
      state.selectedDrawingId = null;
      state.hoveredDrawingId = null;
    },
    undoDrawings: (state) => {
      const previous = state.historyPast.pop();
      if (!previous) return;

      state.historyFuture.push(state.drawings);
      state.drawings = previous;
      state.selectedDrawingId = null;
      state.hoveredDrawingId = null;
    },
    redoDrawings: (state) => {
      const next = state.historyFuture.pop();
      if (!next) return;

      state.historyPast.push(state.drawings);
      state.drawings = next;
      state.selectedDrawingId = null;
      state.hoveredDrawingId = null;
    },
    clearDrawings: (state) => {
      if (state.drawings.length === 0) return;

      pushHistory(state);
      state.drawings = [];
      state.selectedDrawingId = null;
      state.hoveredDrawingId = null;
    },
  },
});

export const {
  addDrawing,
  clearDrawings,
  deleteDrawing,
  redoDrawings,
  replaceDrawings,
  selectDrawing,
  setActiveTool,
  setDrawingsVisible,
  setHoveredDrawing,
  setMagnetMode,
  toggleDrawingLock,
  toggleDrawingVisibility,
  undoDrawings,
  updateDrawingPoints,
} = drawingSlice.actions;

export default drawingSlice.reducer;

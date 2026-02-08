import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Point } from '@/types/annotations';

export interface Transform {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface DraggingAnnotationState {
  id: string;
  startPoint: Point;
  originalPoints: Point[];
  currentPoints: Point[];
}

interface CanvasState {
  transform: Transform;
  isPanning: boolean;
  draggingAnnotation: DraggingAnnotationState | null;
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
}

const initialState: CanvasState = {
  transform: {
    scale: 1,
    translateX: 0,
    translateY: 0,
  },
  isPanning: false,
  draggingAnnotation: null,
  minZoom: 0.25,
  maxZoom: 10,
  zoomStep: 0.25,
};

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    setTransform: (state, action: PayloadAction<Transform>) => {
      state.transform = action.payload;
    },
    zoomIn: (state) => {
      state.transform.scale = Math.min(state.transform.scale + state.zoomStep, state.maxZoom);
    },
    zoomOut: (state) => {
      state.transform.scale = Math.max(state.transform.scale - state.zoomStep, state.minZoom);
    },
    setZoom: (state, action: PayloadAction<number>) => {
      state.transform.scale = Math.max(state.minZoom, Math.min(action.payload, state.maxZoom));
    },
    resetTransform: (state) => {
      state.transform = { scale: 1, translateX: 0, translateY: 0 };
    },
    pan: (state, action: PayloadAction<{ deltaX: number; deltaY: number }>) => {
      state.transform.translateX += action.payload.deltaX;
      state.transform.translateY += action.payload.deltaY;
    },
    startPan: (state) => {
      state.isPanning = true;
    },
    endPan: (state) => {
      state.isPanning = false;
    },
    setDraggingAnnotation: (state, action: PayloadAction<DraggingAnnotationState | null>) => {
      state.draggingAnnotation = action.payload;
    },
    updateDraggingPoints: (state, action: PayloadAction<Point[]>) => {
      if (state.draggingAnnotation) {
        state.draggingAnnotation.currentPoints = action.payload;
      }
    },
  },
});

export const {
  setTransform,
  zoomIn,
  zoomOut,
  setZoom,
  resetTransform,
  pan,
  startPan,
  endPan,
  setDraggingAnnotation,
  updateDraggingPoints,
} = canvasSlice.actions;

export default canvasSlice.reducer;

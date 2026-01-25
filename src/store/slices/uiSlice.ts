import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  AnnotationCategory,
  AnnotationType,
  LayerVisibility,
  SubLayerVisibility,
  EditorMode,
  Point,
  SignageType,
  BarrierType,
  FlowType,
} from '@/types/annotations';

const initialSubLayerVisibility: SubLayerVisibility = {
  signage: {
    ticket: true,
    vip: true,
    alcohol: true,
    accessibility: true,
    washroom: true,
    area: true,
  },
  barrier: {
    stanchion: true,
    drape: true,
  },
  flow: {
    ingress: true,
    egress: true,
  },
};

interface UiState {
  mode: EditorMode;
  selectedCategory: AnnotationCategory;
  selectedType: AnnotationType;
  selectedAnnotationId: string | null;
  focusedCategory: AnnotationCategory | null;
  layerVisibility: LayerVisibility;
  subLayerVisibility: SubLayerVisibility;
  pendingLine: Point[] | null;
}

const initialState: UiState = {
  mode: 'edit',
  selectedCategory: 'signage',
  selectedType: 'ticket',
  selectedAnnotationId: null,
  focusedCategory: null,
  layerVisibility: {
    signage: true,
    barrier: true,
    flow: true,
  },
  subLayerVisibility: initialSubLayerVisibility,
  pendingLine: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setMode: (state, action: PayloadAction<EditorMode>) => {
      state.mode = action.payload;
      if (action.payload === 'view') {
        state.selectedAnnotationId = null;
        state.pendingLine = null;
      }
    },
    selectAnnotationType: (
      state,
      action: PayloadAction<{ category: AnnotationCategory; type: AnnotationType }>
    ) => {
      state.selectedCategory = action.payload.category;
      state.selectedType = action.payload.type;
    },
    setSelectedAnnotationId: (state, action: PayloadAction<string | null>) => {
      state.selectedAnnotationId = action.payload;
    },
    setFocusedCategory: (state, action: PayloadAction<AnnotationCategory | null>) => {
      state.focusedCategory = action.payload;
    },
    toggleLayerVisibility: (state, action: PayloadAction<AnnotationCategory>) => {
      state.layerVisibility[action.payload] = !state.layerVisibility[action.payload];
    },
    toggleSubLayerVisibility: (
      state,
      action: PayloadAction<{ category: AnnotationCategory; type: AnnotationType }>
    ) => {
      const { category, type } = action.payload;
      if (category === 'signage') {
        state.subLayerVisibility.signage[type as SignageType] =
          !state.subLayerVisibility.signage[type as SignageType];
      } else if (category === 'barrier') {
        state.subLayerVisibility.barrier[type as BarrierType] =
          !state.subLayerVisibility.barrier[type as BarrierType];
      } else if (category === 'flow') {
        state.subLayerVisibility.flow[type as FlowType] =
          !state.subLayerVisibility.flow[type as FlowType];
      }
    },
    setPendingLine: (state, action: PayloadAction<Point[] | null>) => {
      state.pendingLine = action.payload;
    },
  },
});

export const {
  setMode,
  selectAnnotationType,
  setSelectedAnnotationId,
  setFocusedCategory,
  toggleLayerVisibility,
  toggleSubLayerVisibility,
  setPendingLine,
} = uiSlice.actions;

export default uiSlice.reducer;

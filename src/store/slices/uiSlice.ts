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
  WashroomSubType,
} from '@/types/annotations';

// Note: ticket types are dynamic (loaded from database) so not included in static visibility
// All ticket type annotations are visible when the signage layer is visible
const initialSubLayerVisibility: SubLayerVisibility = {
  signage: {
    ticket: true,  // Kept for backwards compatibility
    alcohol: true,
    accessibility: true,
    washroom: true,
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
  selectedSignageTypeId: string | null;  // ID of selected signage type (from database)
  selectedSignageSubTypeId: string | null;  // ID of selected signage sub-type (from database)
  selectedWashroomSubType: WashroomSubType | null;  // Deprecated - kept for backwards compatibility
  selectedAnnotationId: string | null;
  focusedCategory: AnnotationCategory | null;
  layerVisibility: LayerVisibility;
  subLayerVisibility: SubLayerVisibility;
  pendingLine: Point[] | null;
}

const initialState: UiState = {
  mode: 'edit',
  selectedCategory: 'signage',
  selectedType: 'alcohol',
  selectedSignageTypeId: null,
  selectedSignageSubTypeId: null,
  selectedWashroomSubType: null,
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
      // Clear signage type/sub-type selection when selecting a different type
      state.selectedSignageTypeId = null;
      state.selectedSignageSubTypeId = null;
      // Clear washroom sub-type selection (deprecated)
      state.selectedWashroomSubType = null;
    },
    setSelectedSignageTypeId: (state, action: PayloadAction<string | null>) => {
      state.selectedSignageTypeId = action.payload;
      // Clear sub-type selection when changing parent type
      state.selectedSignageSubTypeId = null;
      // When selecting a signage type, set category to signage and type to ticket
      if (action.payload) {
        state.selectedCategory = 'signage';
        state.selectedType = 'ticket';
        state.selectedWashroomSubType = null;
      }
    },
    setSelectedSignageSubTypeId: (
      state,
      action: PayloadAction<{ signageTypeId: string; subTypeId: string } | null>
    ) => {
      if (action.payload) {
        state.selectedSignageTypeId = action.payload.signageTypeId;
        state.selectedSignageSubTypeId = action.payload.subTypeId;
        state.selectedCategory = 'signage';
        state.selectedType = 'ticket';
        state.selectedWashroomSubType = null;
      } else {
        state.selectedSignageSubTypeId = null;
      }
    },
    setSelectedWashroomSubType: (state, action: PayloadAction<WashroomSubType | null>) => {
      state.selectedWashroomSubType = action.payload;
      // When selecting a washroom sub-type, set category to signage and type to washroom
      if (action.payload) {
        state.selectedCategory = 'signage';
        state.selectedType = 'washroom';
        state.selectedSignageTypeId = null;
        state.selectedSignageSubTypeId = null;
      }
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
  setSelectedSignageTypeId,
  setSelectedSignageSubTypeId,
  setSelectedWashroomSubType,
  setSelectedAnnotationId,
  setFocusedCategory,
  toggleLayerVisibility,
  toggleSubLayerVisibility,
  setPendingLine,
} = uiSlice.actions;

export default uiSlice.reducer;

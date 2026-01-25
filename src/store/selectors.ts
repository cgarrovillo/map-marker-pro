import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';
import type { Annotation, SignageType, BarrierType, FlowType } from '@/types/annotations';

// UI Selectors
export const selectMode = (state: RootState) => state.ui.mode;
export const selectIsEditMode = (state: RootState) => state.ui.mode === 'edit';
export const selectSelectedCategory = (state: RootState) => state.ui.selectedCategory;
export const selectSelectedType = (state: RootState) => state.ui.selectedType;
export const selectSelectedAnnotationId = (state: RootState) => state.ui.selectedAnnotationId;
export const selectFocusedCategory = (state: RootState) => state.ui.focusedCategory;
export const selectLayerVisibility = (state: RootState) => state.ui.layerVisibility;
export const selectSubLayerVisibility = (state: RootState) => state.ui.subLayerVisibility;
export const selectPendingLine = (state: RootState) => state.ui.pendingLine;

// Canvas Selectors
export const selectTransform = (state: RootState) => state.canvas.transform;
export const selectIsPanning = (state: RootState) => state.canvas.isPanning;
export const selectDraggingAnnotation = (state: RootState) => state.canvas.draggingAnnotation;
export const selectMinZoom = (state: RootState) => state.canvas.minZoom;
export const selectMaxZoom = (state: RootState) => state.canvas.maxZoom;

export const selectZoomPercentage = createSelector(
  [selectTransform],
  (transform) => Math.round(transform.scale * 100)
);

// Visibility check for annotations (returns a function that can be called with an annotation)
export const selectIsAnnotationVisible = createSelector(
  [selectLayerVisibility, selectSubLayerVisibility],
  (layerVis, subLayerVis) => (annotation: Annotation): boolean => {
    if (!layerVis[annotation.category]) return false;

    const { category, type } = annotation;
    if (category === 'signage') {
      return subLayerVis.signage[type as SignageType] ?? false;
    } else if (category === 'barrier') {
      return subLayerVis.barrier[type as BarrierType] ?? false;
    } else if (category === 'flow') {
      return subLayerVis.flow[type as FlowType] ?? false;
    }
    return false;
  }
);

// Combined selector for annotation type selection
export const selectAnnotationTypeSelection = createSelector(
  [selectSelectedCategory, selectSelectedType],
  (category, type) => ({ category, type })
);

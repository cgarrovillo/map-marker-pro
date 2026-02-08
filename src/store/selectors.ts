import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from './index';
import type { Annotation, SignageType, BarrierType, FlowType } from '@/types/annotations';

// UI Selectors
export const selectMode = (state: RootState) => state.ui.mode;
export const selectIsEditMode = (state: RootState) => state.ui.mode === 'edit';
export const selectIsAssetsMode = (state: RootState) => state.ui.mode === 'assets';
export const selectSelectedCategory = (state: RootState) => state.ui.selectedCategory;
export const selectSelectedType = (state: RootState) => state.ui.selectedType;
export const selectSelectedSignageTypeId = (state: RootState) => state.ui.selectedSignageTypeId;
export const selectSelectedSignageSubTypeId = (state: RootState) => state.ui.selectedSignageSubTypeId;
export const selectSelectedWashroomSubType = (state: RootState) => state.ui.selectedWashroomSubType;
export const selectSelectedAnnotationId = (state: RootState) => state.ui.selectedAnnotationId;
export const selectFocusedCategory = (state: RootState) => state.ui.focusedCategory;
export const selectLayerVisibility = (state: RootState) => state.ui.layerVisibility;
export const selectSubLayerVisibility = (state: RootState) => state.ui.subLayerVisibility;
export const selectSignageTypeVisibility = (state: RootState) => state.ui.signageTypeVisibility;
export const selectSignageSubTypeVisibility = (state: RootState) => state.ui.signageSubTypeVisibility;
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
// All signage types (dynamic AND static) are now driven by signageTypeVisibility / signageSubTypeVisibility.
export const selectIsAnnotationVisible = createSelector(
  [selectLayerVisibility, selectSubLayerVisibility, selectSignageTypeVisibility, selectSignageSubTypeVisibility],
  (layerVis, subLayerVis, signageTypeVis, signageSubTypeVis) => (annotation: Annotation): boolean => {
    if (!layerVis[annotation.category]) return false;

    const { category, type } = annotation;
    if (category === 'signage') {
      if (type === 'ticket') {
        // Dynamic signage types - check parent visibility, then sub-type
        if (annotation.signageTypeName) {
          const parentVisible = signageTypeVis[annotation.signageTypeName] ?? true;
          if (!parentVisible) return false;

          // If annotation has a sub-type, check sub-type visibility
          if (annotation.signageSubTypeName) {
            const subKey = `${annotation.signageTypeName}/${annotation.signageSubTypeName}`;
            return signageSubTypeVis[subKey] ?? true;
          }
        }
        return true; // Legacy ticket annotations without signageTypeName
      }
      // Static signage types (alcohol, accessibility, washroom)
      // Unified under signageTypeVisibility keyed by the type string
      return signageTypeVis[type] ?? true;
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

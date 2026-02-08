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

// Collect per-side type pairs from an annotation (with root-level fallback for backwards compat)
function collectSideTypes(annotation: Annotation): Array<{ typeName: string; subTypeName?: string }> {
  const sides: Array<{ typeName: string; subTypeName?: string }> = [];

  // Side 1: prefer side1-level, fall back to root-level
  const s1TypeName = annotation.side1?.signageTypeName ?? annotation.signageTypeName;
  if (s1TypeName) {
    sides.push({
      typeName: s1TypeName,
      subTypeName: annotation.side1?.signageSubTypeName ?? annotation.signageSubTypeName,
    });
  }

  // Side 2: only side2-level (no root-level fallback for side 2)
  if (annotation.side2?.signageTypeName) {
    sides.push({
      typeName: annotation.side2.signageTypeName,
      subTypeName: annotation.side2.signageSubTypeName,
    });
  }

  return sides;
}

// Visibility check for annotations (returns a function that can be called with an annotation)
// All signage types (dynamic AND static) are now driven by signageTypeVisibility / signageSubTypeVisibility.
export const selectIsAnnotationVisible = createSelector(
  [selectLayerVisibility, selectSubLayerVisibility, selectSignageTypeVisibility, selectSignageSubTypeVisibility],
  (layerVis, subLayerVis, signageTypeVis, signageSubTypeVis) => (annotation: Annotation): boolean => {
    if (!layerVis[annotation.category]) return false;

    const { category, type } = annotation;
    if (category === 'signage') {
      if (type === 'ticket') {
        const sideTypes = collectSideTypes(annotation);
        if (sideTypes.length === 0) return true; // Legacy annotations without any type

        // Visible if ANY side's type is visible
        return sideTypes.some(({ typeName, subTypeName }) => {
          const parentVisible = signageTypeVis[typeName] ?? true;
          if (!parentVisible) return false;
          if (subTypeName) {
            return signageSubTypeVis[`${typeName}/${subTypeName}`] ?? true;
          }
          return true;
        });
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

// Whether a placement tool is active (vs pointer/select mode)
export const selectHasActiveTool = createSelector(
  [selectSelectedType],
  (type) => type !== null
);

// Combined selector for annotation type selection
export const selectAnnotationTypeSelection = createSelector(
  [selectSelectedCategory, selectSelectedType],
  (category, type) => ({ category, type })
);

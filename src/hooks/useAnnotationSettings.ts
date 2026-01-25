import { useState, useCallback } from 'react';
import {
  Annotation,
  AnnotationCategory,
  AnnotationType,
  LayerVisibility,
  SubLayerVisibility,
  EditorMode,
  Point,
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

export function useAnnotationSettings() {
  const [mode, setMode] = useState<EditorMode>('edit');
  const [selectedCategory, setSelectedCategory] = useState<AnnotationCategory>('signage');
  const [selectedType, setSelectedType] = useState<AnnotationType>('ticket');
  const [focusedCategory, setFocusedCategory] = useState<AnnotationCategory | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    signage: true,
    barrier: true,
    flow: true,
  });
  const [subLayerVisibility, setSubLayerVisibility] = useState<SubLayerVisibility>(
    initialSubLayerVisibility
  );
  const [pendingLine, setPendingLine] = useState<Point[] | null>(null);

  const toggleLayerVisibility = useCallback((category: AnnotationCategory) => {
    setLayerVisibility((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  const toggleSubLayerVisibility = useCallback(
    (category: AnnotationCategory, type: AnnotationType) => {
      setSubLayerVisibility((prev) => ({
        ...prev,
        [category]: {
          ...prev[category],
          [type]: !prev[category][type as keyof typeof prev[typeof category]],
        },
      }));
    },
    []
  );

  const isAnnotationVisible = useCallback(
    (annotation: Annotation) => {
      const categoryVisible = layerVisibility[annotation.category];
      if (!categoryVisible) return false;

      const subVisibility = subLayerVisibility[annotation.category];
      return subVisibility[annotation.type as keyof typeof subVisibility];
    },
    [layerVisibility, subLayerVisibility]
  );

  const selectAnnotationType = useCallback(
    (category: AnnotationCategory, type: AnnotationType) => {
      setSelectedCategory(category);
      setSelectedType(type);
    },
    []
  );

  // Clear selection when switching modes
  const handleSetMode = useCallback((newMode: EditorMode) => {
    setMode(newMode);
    if (newMode === 'view') {
      setSelectedAnnotationId(null);
      setPendingLine(null);
    }
  }, []);

  return {
    mode,
    setMode: handleSetMode,
    selectedCategory,
    selectedType,
    selectAnnotationType,
    focusedCategory,
    setFocusedCategory,
    selectedAnnotationId,
    setSelectedAnnotationId,
    layerVisibility,
    subLayerVisibility,
    toggleLayerVisibility,
    toggleSubLayerVisibility,
    isAnnotationVisible,
    pendingLine,
    setPendingLine,
  };
}

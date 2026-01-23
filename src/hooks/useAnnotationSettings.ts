import { useState, useCallback } from 'react';
import {
  Annotation,
  AnnotationCategory,
  AnnotationType,
  LayerVisibility,
  SubLayerVisibility,
  EditorMode,
  ToolMode,
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
  const [toolMode, setToolMode] = useState<ToolMode>('marker');
  const [selectedCategory, setSelectedCategory] = useState<AnnotationCategory>('signage');
  const [selectedType, setSelectedType] = useState<AnnotationType>('ticket');
  const [focusedCategory, setFocusedCategory] = useState<AnnotationCategory | null>(null);
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

  return {
    mode,
    setMode,
    toolMode,
    setToolMode,
    selectedCategory,
    selectedType,
    selectAnnotationType,
    focusedCategory,
    setFocusedCategory,
    layerVisibility,
    subLayerVisibility,
    toggleLayerVisibility,
    toggleSubLayerVisibility,
    isAnnotationVisible,
    pendingLine,
    setPendingLine,
  };
}

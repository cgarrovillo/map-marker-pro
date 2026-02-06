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

const generateId = () => Math.random().toString(36).substring(2, 9);

const initialSubLayerVisibility: SubLayerVisibility = {
  signage: {
    ticket: true,
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

export function useAnnotations() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [mode, setMode] = useState<EditorMode>('edit');
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

  const addAnnotation = useCallback((points: Point[], label?: string) => {
    const newAnnotation: Annotation = {
      id: generateId(),
      category: selectedCategory,
      type: selectedType,
      points,
      label,
      createdAt: Date.now(),
    };
    setAnnotations((prev) => [...prev, newAnnotation]);
    return newAnnotation;
  }, [selectedCategory, selectedType]);

  const deleteAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }, []);

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

  const clearAnnotations = useCallback(() => {
    setAnnotations([]);
  }, []);

  const exportAnnotations = useCallback(() => {
    return JSON.stringify(annotations, null, 2);
  }, [annotations]);

  const importAnnotations = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        setAnnotations(parsed);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return {
    annotations,
    mode,
    setMode,
    selectedCategory,
    selectedType,
    selectAnnotationType,
    focusedCategory,
    setFocusedCategory,
    layerVisibility,
    subLayerVisibility,
    toggleLayerVisibility,
    toggleSubLayerVisibility,
    addAnnotation,
    deleteAnnotation,
    updateAnnotation,
    isAnnotationVisible,
    clearAnnotations,
    exportAnnotations,
    importAnnotations,
    pendingLine,
    setPendingLine,
  };
}

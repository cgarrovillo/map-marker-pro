import { useState, useCallback } from 'react';
import { FloorPlanEvent, Annotation, Point } from '@/types/annotations';

const generateId = () => Math.random().toString(36).substring(2, 9);

const createNewEvent = (name: string): FloorPlanEvent => ({
  id: generateId(),
  name,
  image: null,
  annotations: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export function useEvents() {
  const [events, setEvents] = useState<FloorPlanEvent[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  const activeEvent = events.find((e) => e.id === activeEventId) || null;

  const createEvent = useCallback((name: string) => {
    const newEvent = createNewEvent(name);
    setEvents((prev) => [...prev, newEvent]);
    setActiveEventId(newEvent.id);
    return newEvent;
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    if (activeEventId === id) {
      setActiveEventId(null);
    }
  }, [activeEventId]);

  const renameEvent = useCallback((id: string, name: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, name, updatedAt: Date.now() } : e
      )
    );
  }, []);

  const setEventImage = useCallback((id: string, image: string | null) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, image, updatedAt: Date.now() } : e
      )
    );
  }, []);

  const addAnnotation = useCallback(
    (
      eventId: string,
      category: string,
      type: string,
      points: Point[],
      label?: string
    ): Annotation | null => {
      const newAnnotation: Annotation = {
        id: generateId(),
        category: category as Annotation['category'],
        type: type as Annotation['type'],
        points,
        label,
        createdAt: Date.now(),
      };

      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                annotations: [...e.annotations, newAnnotation],
                updatedAt: Date.now(),
              }
            : e
        )
      );

      return newAnnotation;
    },
    []
  );

  const deleteAnnotation = useCallback((eventId: string, annotationId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              annotations: e.annotations.filter((a) => a.id !== annotationId),
              updatedAt: Date.now(),
            }
          : e
      )
    );
  }, []);

  const updateAnnotation = useCallback(
    (eventId: string, annotationId: string, updates: Partial<Annotation>) => {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                annotations: e.annotations.map((a) =>
                  a.id === annotationId ? { ...a, ...updates } : a
                ),
                updatedAt: Date.now(),
              }
            : e
        )
      );
    },
    []
  );

  const clearAnnotations = useCallback((eventId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, annotations: [], updatedAt: Date.now() }
          : e
      )
    );
  }, []);

  const exportEvent = useCallback((eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return null;
    return JSON.stringify(event, null, 2);
  }, [events]);

  const importEvent = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json) as FloorPlanEvent;
      if (parsed.id && parsed.name && Array.isArray(parsed.annotations)) {
        const newEvent = {
          ...parsed,
          id: generateId(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setEvents((prev) => [...prev, newEvent]);
        setActiveEventId(newEvent.id);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return {
    events,
    activeEvent,
    activeEventId,
    setActiveEventId,
    createEvent,
    deleteEvent,
    renameEvent,
    setEventImage,
    addAnnotation,
    deleteAnnotation,
    updateAnnotation,
    clearAnnotations,
    exportEvent,
    importEvent,
  };
}

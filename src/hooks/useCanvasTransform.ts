import { useState, useCallback, useRef } from 'react';

export interface Transform {
  scale: number;
  translateX: number;
  translateY: number;
}

interface UseCanvasTransformOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  /** Sensitivity for smooth wheel zoom (default: 0.002) */
  zoomSensitivity?: number;
  /** Sensitivity for trackpad pan (default: 1) */
  panSensitivity?: number;
}

export function useCanvasTransform(options: UseCanvasTransformOptions = {}) {
  const { 
    minZoom = 0.25, 
    maxZoom = 4, 
    zoomStep = 0.25,
    zoomSensitivity = 0.008,
    panSensitivity = 1,
  } = options;

  const [transform, setTransform] = useState<Transform>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  const [isPanning, setIsPanning] = useState(false);
  const lastPanPosition = useRef<{ x: number; y: number } | null>(null);

  const zoomIn = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(prev.scale + zoomStep, maxZoom),
    }));
  }, [maxZoom, zoomStep]);

  const zoomOut = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(prev.scale - zoomStep, minZoom),
    }));
  }, [minZoom, zoomStep]);

  const setZoom = useCallback(
    (scale: number) => {
      setTransform((prev) => ({
        ...prev,
        scale: Math.max(minZoom, Math.min(scale, maxZoom)),
      }));
    },
    [minZoom, maxZoom]
  );

  const resetTransform = useCallback(() => {
    setTransform({
      scale: 1,
      translateX: 0,
      translateY: 0,
    });
  }, []);

  const fitToView = useCallback(() => {
    setTransform({
      scale: 1,
      translateX: 0,
      translateY: 0,
    });
  }, []);

  /**
   * Handle smooth wheel zoom (pinch-to-zoom on trackpad or Ctrl+scroll)
   * Uses proportional scaling based on actual deltaY for natural feel
   */
  const handleWheelZoom = useCallback(
    (e: WheelEvent, containerRect: DOMRect) => {
      e.preventDefault();

      // Normalize deltaY across different deltaMode values
      // deltaMode: 0 = pixels, 1 = lines (~16px), 2 = pages (~100px)
      const deltaMultiplier = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
      const normalizedDelta = e.deltaY * deltaMultiplier;

      // Use exponential scaling for natural zoom feel
      // Negative delta = zoom in, positive delta = zoom out
      const zoomFactor = Math.pow(2, -normalizedDelta * zoomSensitivity);
      const newScale = Math.max(minZoom, Math.min(transform.scale * zoomFactor, maxZoom));

      if (Math.abs(newScale - transform.scale) < 0.001) return;

      // Calculate cursor position relative to container
      const cursorX = e.clientX - containerRect.left;
      const cursorY = e.clientY - containerRect.top;

      // Calculate the point under cursor in transformed space
      const pointX = (cursorX - transform.translateX) / transform.scale;
      const pointY = (cursorY - transform.translateY) / transform.scale;

      // Calculate new translation to keep the same point under cursor
      const newTranslateX = cursorX - pointX * newScale;
      const newTranslateY = cursorY - pointY * newScale;

      setTransform({
        scale: newScale,
        translateX: newTranslateX,
        translateY: newTranslateY,
      });
    },
    [transform, minZoom, maxZoom, zoomSensitivity]
  );

  /**
   * Handle two-finger trackpad pan (wheel events without modifier keys)
   * Directly maps deltaX/deltaY to canvas translation
   */
  const handleWheelPan = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      // Normalize delta across different deltaMode values
      const deltaMultiplier = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
      const deltaX = e.deltaX * deltaMultiplier * panSensitivity;
      const deltaY = e.deltaY * deltaMultiplier * panSensitivity;

      setTransform((prev) => ({
        ...prev,
        translateX: prev.translateX - deltaX,
        translateY: prev.translateY - deltaY,
      }));
    },
    [panSensitivity]
  );

  const startPan = useCallback((x: number, y: number) => {
    setIsPanning(true);
    lastPanPosition.current = { x, y };
  }, []);

  const updatePan = useCallback(
    (x: number, y: number) => {
      if (!isPanning || !lastPanPosition.current) return;

      const deltaX = x - lastPanPosition.current.x;
      const deltaY = y - lastPanPosition.current.y;

      setTransform((prev) => ({
        ...prev,
        translateX: prev.translateX + deltaX,
        translateY: prev.translateY + deltaY,
      }));

      lastPanPosition.current = { x, y };
    },
    [isPanning]
  );

  const endPan = useCallback(() => {
    setIsPanning(false);
    lastPanPosition.current = null;
  }, []);

  // Screen coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number, containerRect: DOMRect): { x: number; y: number } => {
      const x = (screenX - containerRect.left - transform.translateX) / transform.scale;
      const y = (screenY - containerRect.top - transform.translateY) / transform.scale;
      return { x, y };
    },
    [transform]
  );

  // Canvas coordinates to screen coordinates
  const canvasToScreen = useCallback(
    (canvasX: number, canvasY: number, containerRect: DOMRect): { x: number; y: number } => {
      const x = canvasX * transform.scale + transform.translateX + containerRect.left;
      const y = canvasY * transform.scale + transform.translateY + containerRect.top;
      return { x, y };
    },
    [transform]
  );

  const zoomPercentage = Math.round(transform.scale * 100);

  return {
    transform,
    setTransform,
    zoomIn,
    zoomOut,
    setZoom,
    resetTransform,
    fitToView,
    handleWheelZoom,
    handleWheelPan,
    isPanning,
    startPan,
    updatePan,
    endPan,
    screenToCanvas,
    canvasToScreen,
    zoomPercentage,
    minZoom,
    maxZoom,
  };
}

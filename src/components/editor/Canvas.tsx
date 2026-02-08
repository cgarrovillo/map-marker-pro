import { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, Image as ImageIcon, RefreshCw, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import {
  Annotation,
  Point,
  BARRIER_TYPES,
  FLOW_TYPES,
  SIGN_DIRECTIONS,
  SIGN_HOLDERS,
  DEFAULT_SIGN_HOLDER,
  SignSide,
  isLineAnnotation,
  AnnotationCategory,
  AnnotationType,
} from '@/types/annotations';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type SignageType = Tables<'signage_types'>;
type SignageSubType = Tables<'signage_sub_types'>;
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectTransform,
  selectIsPanning,
  selectMinZoom,
  selectMaxZoom,
  selectZoomPercentage,
  selectIsEditMode,
  selectSelectedCategory,
  selectSelectedType,
  selectSelectedAnnotationId,
  selectFocusedCategory,
  selectPendingLine,
  selectIsAnnotationVisible,
  selectHasActiveTool,
} from '@/store/selectors';
import {
  setTransform,
  zoomIn,
  zoomOut,
  setZoom,
  resetTransform,
  pan,
  startPan,
  endPan,
} from '@/store/slices/canvasSlice';
import {
  setSelectedAnnotationId,
  setPendingLine,
  clearActiveTool,
} from '@/store/slices/uiSlice';

interface CanvasProps {
  image: string | null;
  onImageUpload: (file: File) => void;
  annotations: Annotation[];
  onAddAnnotation: (points: Point[], label?: string) => void;
  onDeleteAnnotation: (id: string) => void;
  onUpdateAnnotation?: (id: string, updates: Partial<Annotation>) => void;
  signageTypes?: SignageType[];
  subTypesByParent?: Record<string, SignageSubType[]>;
}

const DEFAULT_TYPE_COLORS: Record<string, string> = {
  'signage-ticket': 'hsl(210, 85%, 55%)',
  'signage-alcohol': 'hsl(340, 75%, 55%)',
  'signage-accessibility': 'hsl(200, 80%, 50%)',
  'signage-washroom': 'hsl(230, 70%, 60%)',
  'barrier-stanchion': 'hsl(35, 90%, 55%)',
  'barrier-drape': 'hsl(25, 85%, 50%)',
  'flow-ingress': 'hsl(145, 70%, 45%)',
  'flow-egress': 'hsl(0, 75%, 55%)',
};

/**
 * Resolve color from a signageTypeName / signageSubTypeName pair using live data.
 * Returns undefined if no matching color is found.
 */
const resolveSignageColor = (
  signageTypeName: string | undefined,
  signageSubTypeName: string | undefined,
  signageTypes?: SignageType[],
  subTypesByParent?: Record<string, SignageSubType[]>,
): string | undefined => {
  if (!signageTypeName || !signageTypes) return undefined;
  const matchingType = signageTypes.find(t => t.name === signageTypeName);
  if (!matchingType) return undefined;
  if (signageSubTypeName && subTypesByParent) {
    const subTypes = subTypesByParent[matchingType.id] || [];
    const matchingSubType = subTypes.find(st => st.name === signageSubTypeName);
    if (matchingSubType?.color) return matchingSubType.color;
  }
  return matchingType.color || undefined;
};

/**
 * Resolve annotation color dynamically from live signage types data.
 * Priority: sub-type color > parent type color > stored annotation.color > hardcoded default
 */
const getTypeColor = (
  category: AnnotationCategory,
  type: AnnotationType,
  annotation?: Annotation,
  signageTypes?: SignageType[],
  subTypesByParent?: Record<string, SignageSubType[]>,
): string => {
  if (annotation && category === 'signage' && signageTypes) {
    const color = resolveSignageColor(
      annotation.signageTypeName,
      annotation.signageSubTypeName,
      signageTypes,
      subTypesByParent,
    );
    if (color) return color;
  }

  // Fallback: stored annotation color (for deleted types or non-signage)
  if (annotation?.color) return annotation.color;

  // Fallback: hardcoded defaults
  return DEFAULT_TYPE_COLORS[`${category}-${type}`] || 'hsl(185, 75%, 55%)';
};

/**
 * Resolve color for a specific side's type, falling back to the annotation-level color.
 */
const getSideColor = (
  sideData: SignSide | undefined,
  fallbackColor: string,
  signageTypes?: SignageType[],
  subTypesByParent?: Record<string, SignageSubType[]>,
): string => {
  if (sideData?.signageTypeName) {
    const color = resolveSignageColor(
      sideData.signageTypeName,
      sideData.signageSubTypeName,
      signageTypes,
      subTypesByParent,
    );
    if (color) return color;
  }
  return fallbackColor;
};

/**
 * Build a display label from a side's type fields.
 */
const getSideLabel = (sideData: SignSide | undefined): string | undefined => {
  if (!sideData?.signageTypeName) return undefined;
  if (sideData.signageSubTypeName) {
    return `${sideData.signageTypeName} - ${sideData.signageSubTypeName}`;
  }
  return sideData.signageTypeName;
};

const getTypeLabel = (category: AnnotationCategory, type: AnnotationType, annotation?: Annotation): string => {
  if (category === 'signage') {
    // For the two-level hierarchy: show "ParentType - SubType" or just "ParentType"
    if (annotation?.signageTypeName) {
      if (annotation.signageSubTypeName) {
        return `${annotation.signageTypeName} - ${annotation.signageSubTypeName}`;
      }
      return annotation.signageTypeName;
    }
    // Legacy support: washroomSubType for old annotations
    if (type === 'washroom' && annotation?.washroomSubType) {
      const subType = annotation.washroomSubType === 'men' ? 'Men' : annotation.washroomSubType === 'women' ? 'Women' : 'All Gender';
      return `Washroom - ${subType}`;
    }
    // Fallback to type name
    return type;
  }
  if (category === 'barrier') return BARRIER_TYPES[type as keyof typeof BARRIER_TYPES]?.label || type;
  if (category === 'flow') return FLOW_TYPES[type as keyof typeof FLOW_TYPES]?.label || type;
  return type;
};

export function Canvas({
  image,
  onImageUpload,
  annotations,
  onAddAnnotation,
  onDeleteAnnotation,
  onUpdateAnnotation,
  signageTypes,
  subTypesByParent,
}: CanvasProps) {
  const dispatch = useAppDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastPanPosition = useRef<{ x: number; y: number } | null>(null);
  
  // Redux state
  const transform = useAppSelector(selectTransform);
  const isPanning = useAppSelector(selectIsPanning);
  const minZoom = useAppSelector(selectMinZoom);
  const maxZoom = useAppSelector(selectMaxZoom);
  const zoomPercentage = useAppSelector(selectZoomPercentage);
  const isEditMode = useAppSelector(selectIsEditMode);
  const selectedCategory = useAppSelector(selectSelectedCategory);
  const selectedType = useAppSelector(selectSelectedType);
  const hasActiveTool = useAppSelector(selectHasActiveTool);
  const selectedAnnotationId = useAppSelector(selectSelectedAnnotationId);
  const focusedCategory = useAppSelector(selectFocusedCategory);
  const pendingLine = useAppSelector(selectPendingLine);
  const isAnnotationVisible = useAppSelector(selectIsAnnotationVisible);
  
  // Local state (kept local for performance - frequent updates during drag)
  const [isDragging, setIsDragging] = useState(false);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [draggingAnnotation, setDraggingAnnotation] = useState<{
    id: string;
    startPoint: Point;
    originalPoints: Point[];
    currentPoints: Point[];
  } | null>(null);
  // Track the natural image dimensions for proper coordinate mapping
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  
  // Whether the current annotation type uses lines or markers
  const usesLineDrawing = selectedType !== null && isLineAnnotation(selectedCategory, selectedType);

  // Calculate the actual rendered image bounds within the container (accounting for object-contain)
  const getImageBounds = useCallback(() => {
    const container = containerRef.current;
    if (!container || !imageDimensions) return null;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imageAspectRatio = imageDimensions.width / imageDimensions.height;
    const containerAspectRatio = containerWidth / containerHeight;

    let renderedWidth: number;
    let renderedHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (imageAspectRatio > containerAspectRatio) {
      // Image is wider than container - width is the constraint
      renderedWidth = containerWidth;
      renderedHeight = containerWidth / imageAspectRatio;
      offsetX = 0;
      offsetY = (containerHeight - renderedHeight) / 2;
    } else {
      // Image is taller than container - height is the constraint
      renderedHeight = containerHeight;
      renderedWidth = containerHeight * imageAspectRatio;
      offsetX = (containerWidth - renderedWidth) / 2;
      offsetY = 0;
    }

    return { renderedWidth, renderedHeight, offsetX, offsetY };
  }, [imageDimensions]);

  // Handle image load to get natural dimensions
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
  }, []);

  // Force re-render on container resize to recalculate image bounds
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      forceUpdate({});
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Zoom sensitivity for wheel events
  const zoomSensitivity = 0.008;
  const panSensitivity = 1;

  // Handle wheel events for zoom and pan
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      // Pinch-to-zoom on trackpad sends ctrlKey: true
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const rect = container.getBoundingClientRect();
        const deltaMultiplier = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
        const normalizedDelta = e.deltaY * deltaMultiplier;
        const zoomFactor = Math.pow(2, -normalizedDelta * zoomSensitivity);
        const newScale = Math.max(minZoom, Math.min(transform.scale * zoomFactor, maxZoom));

        if (Math.abs(newScale - transform.scale) < 0.001) return;

        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;
        const pointX = (cursorX - transform.translateX) / transform.scale;
        const pointY = (cursorY - transform.translateY) / transform.scale;
        const newTranslateX = cursorX - pointX * newScale;
        const newTranslateY = cursorY - pointY * newScale;

        dispatch(setTransform({
          scale: newScale,
          translateX: newTranslateX,
          translateY: newTranslateY,
        }));
      } else {
        // Pan
        const deltaMultiplier = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
        const deltaX = e.deltaX * deltaMultiplier * panSensitivity;
        const deltaY = e.deltaY * deltaMultiplier * panSensitivity;
        dispatch(pan({ deltaX: -deltaX, deltaY: -deltaY }));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [dispatch, transform, minZoom, maxZoom]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        onImageUpload(file);
      }
    },
    [onImageUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onImageUpload(file);
      }
    },
    [onImageUpload]
  );

  // Convert screen coordinates to image percentage coordinates
  const screenToCanvasPercent = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const container = containerRef.current;
      const bounds = getImageBounds();
      if (!container || !bounds) return null;

      const rect = container.getBoundingClientRect();
      // Get position in the untransformed canvas space
      const canvasX = (clientX - rect.left - transform.translateX) / transform.scale;
      const canvasY = (clientY - rect.top - transform.translateY) / transform.scale;
      
      // Convert to percentage relative to the actual image bounds, not the container
      const x = ((canvasX - bounds.offsetX) / bounds.renderedWidth) * 100;
      const y = ((canvasY - bounds.offsetY) / bounds.renderedHeight) * 100;

      return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    },
    [transform, getImageBounds]
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!image) return;

      // Pan with middle mouse button or Alt+click
      if ((e.button === 1) || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        dispatch(startPan());
        lastPanPosition.current = { x: e.clientX, y: e.clientY };
        return;
      }
    },
    [image, dispatch]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Update mouse position for crosshair
      const pos = screenToCanvasPercent(e.clientX, e.clientY);
      if (pos) setMousePos(pos);

      // Handle panning
      if (isPanning && lastPanPosition.current) {
        const deltaX = e.clientX - lastPanPosition.current.x;
        const deltaY = e.clientY - lastPanPosition.current.y;
        dispatch(pan({ deltaX, deltaY }));
        lastPanPosition.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // Handle annotation dragging
      if (draggingAnnotation) {
        const currentPos = screenToCanvasPercent(e.clientX, e.clientY);
        if (!currentPos) return;

        const deltaX = currentPos.x - draggingAnnotation.startPoint.x;
        const deltaY = currentPos.y - draggingAnnotation.startPoint.y;

        const newPoints = draggingAnnotation.originalPoints.map((p) => ({
          x: Math.max(0, Math.min(100, p.x + deltaX)),
          y: Math.max(0, Math.min(100, p.y + deltaY)),
        }));

        setDraggingAnnotation({
          ...draggingAnnotation,
          currentPoints: newPoints,
        });
      }
    },
    [screenToCanvasPercent, isPanning, dispatch, draggingAnnotation]
  );

  const handleCanvasMouseUp = useCallback(() => {
    if (isPanning) {
      dispatch(endPan());
      lastPanPosition.current = null;
    }
    if (draggingAnnotation && onUpdateAnnotation) {
      onUpdateAnnotation(draggingAnnotation.id, { points: draggingAnnotation.currentPoints });
      setDraggingAnnotation(null);
    }
  }, [isPanning, dispatch, draggingAnnotation, onUpdateAnnotation]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditMode || !image) return;
      if (isPanning || draggingAnnotation) return;

      // Clear selection when clicking on empty canvas
      dispatch(setSelectedAnnotationId(null));

      // Pointer mode — no tool selected, just deselect and return
      if (!hasActiveTool) return;

      const pos = screenToCanvasPercent(e.clientX, e.clientY);
      if (!pos) return;

      if (usesLineDrawing) {
        if (!pendingLine) {
          dispatch(setPendingLine([pos]));
        } else {
          onAddAnnotation([...pendingLine, pos]);
          dispatch(setPendingLine(null));
        }
      } else {
        onAddAnnotation([pos]);
      }
    },
    [
      isEditMode,
      image,
      isPanning,
      draggingAnnotation,
      hasActiveTool,
      screenToCanvasPercent,
      onAddAnnotation,
      pendingLine,
      usesLineDrawing,
      dispatch,
    ]
  );

  const handleAnnotationMouseDown = useCallback(
    (e: React.MouseEvent, annotation: Annotation) => {
      e.stopPropagation();
      if (!isEditMode) return;

      const pos = screenToCanvasPercent(e.clientX, e.clientY);
      if (!pos) return;

      if (selectedAnnotationId === annotation.id) {
        setDraggingAnnotation({
          id: annotation.id,
          startPoint: pos,
          originalPoints: [...annotation.points],
          currentPoints: [...annotation.points],
        });
      } else {
        dispatch(setSelectedAnnotationId(annotation.id));
        if (pendingLine) dispatch(setPendingLine(null));
      }
    },
    [isEditMode, screenToCanvasPercent, selectedAnnotationId, dispatch, pendingLine]
  );

  const handleAnnotationClick = useCallback(
    (e: React.MouseEvent, _annotation: Annotation) => {
      e.stopPropagation();
    },
    []
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'Escape') {
        if (pendingLine) {
          dispatch(setPendingLine(null));
        } else if (selectedAnnotationId) {
          dispatch(setSelectedAnnotationId(null));
        } else if (hasActiveTool) {
          dispatch(clearActiveTool());
        }
      }
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotationId && isEditMode) {
        e.preventDefault();
        const idToDelete = selectedAnnotationId;
        dispatch(setSelectedAnnotationId(null));
        onDeleteAnnotation(idToDelete);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingLine, selectedAnnotationId, hasActiveTool, isEditMode, onDeleteAnnotation, dispatch]);

  // Handle mouse up outside of component
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isPanning) {
        dispatch(endPan());
        lastPanPosition.current = null;
      }
      if (draggingAnnotation && onUpdateAnnotation) {
        onUpdateAnnotation(draggingAnnotation.id, { points: draggingAnnotation.currentPoints });
        setDraggingAnnotation(null);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isPanning, dispatch, draggingAnnotation, onUpdateAnnotation]);

  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (draggingAnnotation) return 'grabbing';
    if (!isEditMode) return 'default';
    if (!hasActiveTool) return 'default';  // Pointer mode — no placement tool selected
    return 'crosshair';
  };

  const handleZoomIn = useCallback(() => dispatch(zoomIn()), [dispatch]);
  const handleZoomOut = useCallback(() => dispatch(zoomOut()), [dispatch]);
  const handleSetZoom = useCallback((value: number) => dispatch(setZoom(value)), [dispatch]);
  const handleResetTransform = useCallback(() => dispatch(resetTransform()), [dispatch]);

  const uploadOverlay = (
    <label className="cursor-pointer">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInput}
      />
      <div className="flex flex-col items-center gap-4 p-8 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-secondary/30 transition-all">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
          {isDragging ? (
            <ImageIcon className="w-8 h-8 text-primary" />
          ) : (
            <Upload className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <div className="text-center">
          <p className="text-lg font-medium">
            {isDragging ? 'Drop your floor plan here' : 'Upload a floor plan'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Drag & drop or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Supports PNG, JPG, SVG
          </p>
        </div>
      </div>
    </label>
  );

  if (!image) {
    return (
      <div
        className={cn(
          'flex-1 flex items-center justify-center canvas-grid relative',
          isDragging && 'ring-2 ring-primary ring-inset'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {uploadOverlay}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden canvas-grid"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onClick={handleCanvasClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ cursor: getCursor() }}
    >
      {/* Zoom Controls */}
      <div
        className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-card/95 backdrop-blur-sm rounded-lg p-1.5 shadow-lg border border-border"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleZoomOut}
              disabled={zoomPercentage <= minZoom * 100}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom out</TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-2 px-1">
          <Slider
            value={[transform.scale]}
            min={minZoom}
            max={maxZoom}
            step={0.05}
            onValueChange={([value]) => handleSetZoom(value)}
            className="w-24"
          />
          <span className="text-xs font-mono text-muted-foreground w-10 text-right">
            {zoomPercentage}%
          </span>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleZoomIn}
              disabled={zoomPercentage >= maxZoom * 100}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom in</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleResetTransform}
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset view (100%)</TooltipContent>
        </Tooltip>
      </div>

      {/* Replace image button */}
      <div
        className="absolute top-3 right-3 z-10"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <label>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileInput}
              />
              <Button variant="secondary" size="sm" className="cursor-pointer" asChild>
                <span>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Replace Image
                </span>
              </Button>
            </label>
          </TooltipTrigger>
          <TooltipContent>Upload a new floor plan image</TooltipContent>
        </Tooltip>
      </div>

      {isDragging && (
        <div className="absolute inset-0 z-30 bg-primary/10 backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-primary">
          <div className="text-center">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 text-primary" />
            <p className="text-lg font-medium text-primary">Drop to replace floor plan</p>
          </div>
        </div>
      )}

      {/* Transformable Canvas Container */}
      <div
        ref={canvasRef}
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`,
          width: '100%',
          height: '100%',
        }}
      >
        <img
          ref={imageRef}
          src={image}
          alt="Floor plan"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
          draggable={false}
          onLoad={handleImageLoad}
        />

        {/* Annotation layer - positioned to match the actual rendered image bounds */}
        {imageDimensions && (() => {
          const bounds = getImageBounds();
          if (!bounds) return null;
          
          return (
            <div
              className="absolute"
              style={{
                left: bounds.offsetX,
                top: bounds.offsetY,
                width: bounds.renderedWidth,
                height: bounds.renderedHeight,
              }}
            >
              <svg 
                viewBox="0 0 100 100" 
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: 'none' }}
              >
          {/* Render flow lines */}
          {annotations
            .filter((a) => a.points.length > 1 && isAnnotationVisible(a))
            .map((annotation) => {
              const opacity =
                focusedCategory && focusedCategory !== annotation.category ? 0.2 : 1;
              const color = getTypeColor(annotation.category, annotation.type, annotation, signageTypes, subTypesByParent);
              const isBeingDragged = draggingAnnotation?.id === annotation.id;
              const isSelected = selectedAnnotationId === annotation.id;
              const points = isBeingDragged ? draggingAnnotation.currentPoints : annotation.points;

              return (
                <g
                  key={annotation.id}
                  style={{ opacity }}
                  className={cn(
                    'transition-opacity',
                    isBeingDragged && 'drop-shadow-lg'
                  )}
                >
                  {/* Selection outline */}
                  {isSelected && (
                    <polyline
                      points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="white"
                      strokeWidth={0.8 / transform.scale}
                      strokeLinecap="round"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                  {/* Invisible wider stroke for easier selection */}
                  <polyline
                    points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={1.5 / transform.scale}
                    style={{ 
                      pointerEvents: 'auto', 
                      cursor: isEditMode ? (isSelected ? 'move' : 'pointer') : undefined 
                    }}
                    onMouseDown={(e) => handleAnnotationMouseDown(e as unknown as React.MouseEvent, annotation)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <polyline
                    points={points.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke={color}
                    strokeWidth={0.4 / transform.scale}
                    className={annotation.category === 'flow' ? 'flow-line' : ''}
                    style={{ pointerEvents: 'none' }}
                  />
                  {/* Arrow head for flows */}
                  {annotation.category === 'flow' && points.length >= 2 && (
                    <polygon
                      points={(() => {
                        const last = points[points.length - 1];
                        const prev = points[points.length - 2];
                        const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
                        const size = 0.8 / transform.scale;
                        const x1 = last.x - size * Math.cos(angle - Math.PI / 6);
                        const y1 = last.y - size * Math.sin(angle - Math.PI / 6);
                        const x2 = last.x - size * Math.cos(angle + Math.PI / 6);
                        const y2 = last.y - size * Math.sin(angle + Math.PI / 6);
                        return `${last.x},${last.y} ${x1},${y1} ${x2},${y2}`;
                      })()}
                      fill={color}
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                </g>
              );
            })}

                {/* Pending line preview */}
                {pendingLine && mousePos && selectedType && (
                  <line
                    x1={pendingLine[pendingLine.length - 1].x}
                    y1={pendingLine[pendingLine.length - 1].y}
                    x2={mousePos.x}
                    y2={mousePos.y}
                    stroke={getTypeColor(selectedCategory, selectedType)}
                    strokeWidth={0.3 / transform.scale}
                    strokeDasharray={`${0.5 / transform.scale},${0.5 / transform.scale}`}
                    opacity="0.6"
                    style={{ pointerEvents: 'none' }}
                  />
                )}
              </svg>

              {/* Render markers */}
              {annotations
                .filter((a) => a.points.length === 1 && isAnnotationVisible(a))
                .map((annotation) => {
                  const opacity =
                    focusedCategory && focusedCategory !== annotation.category ? 0.2 : 1;
                  const color = getTypeColor(annotation.category, annotation.type, annotation, signageTypes, subTypesByParent);
                  const isBeingDragged = draggingAnnotation?.id === annotation.id;
                  const isSelected = selectedAnnotationId === annotation.id;
                  const point = isBeingDragged ? draggingAnnotation.currentPoints[0] : annotation.points[0];
                  const label = getTypeLabel(annotation.category, annotation.type, annotation);
                  const isSignage = annotation.category === 'signage';

                  // Signage annotations render as small dots with optional direction arrows
                  if (isSignage) {
                    // Get holder config to determine if 2-sided
                    const currentHolder = annotation.signHolder || DEFAULT_SIGN_HOLDER;
                    const holderConfig = SIGN_HOLDERS[currentHolder];
                    const isTwoSided = holderConfig?.sides === 2;

                    // Get side data with backwards compatibility (including type fields)
                    const getCanvasSideData = (side: 1 | 2): SignSide | undefined => {
                      if (side === 1) {
                        if (annotation.side1) {
                          return {
                            ...annotation.side1,
                            signageTypeName: annotation.side1.signageTypeName ?? annotation.signageTypeName,
                            signageSubTypeName: annotation.side1.signageSubTypeName ?? annotation.signageSubTypeName,
                          };
                        }
                        if (annotation.direction || annotation.signageTypeName) {
                          return {
                            direction: annotation.direction,
                            signageTypeName: annotation.signageTypeName,
                            signageSubTypeName: annotation.signageSubTypeName,
                          };
                        }
                        return undefined;
                      }
                      return annotation.side2;
                    };

                    const side1Data = getCanvasSideData(1);
                    const side2Data = getCanvasSideData(2);

                    // Helper to render a label with direction arrow, using per-side label/color
                    const renderLabel = (sideData: SignSide | undefined, fallbackLabel: string) => {
                      const direction = sideData?.direction;
                      const directionRotation = direction ? SIGN_DIRECTIONS[direction].rotation : 0;
                      const sideLabel = getSideLabel(sideData) || fallbackLabel;
                      const sideBgColor = getSideColor(sideData, color, signageTypes, subTypesByParent);
                      
                      return (
                        <div
                          className="whitespace-nowrap flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: sideBgColor, color: 'white' }}
                        >
                          {sideLabel}
                          {direction && (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              style={{ transform: `rotate(${directionRotation}deg)` }}
                            >
                              <path
                                d="M6 2L6 10M6 2L3 5M6 2L9 5"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      );
                    };

                    return (
                      <div
                        key={annotation.id}
                        className={cn(
                          'annotation-marker absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto',
                          isBeingDragged && 'scale-110 drop-shadow-xl',
                          isEditMode && (isSelected ? 'cursor-move' : 'cursor-pointer')
                        )}
                        style={{
                          left: `${point.x}%`,
                          top: `${point.y}%`,
                          opacity,
                        }}
                        onMouseDown={(e) => handleAnnotationMouseDown(e, annotation)}
                        onClick={(e) => handleAnnotationClick(e, annotation)}
                      >
                        <div className="relative" style={{ transform: `scale(${1 / transform.scale})` }}>
                          {/* Selection ring */}
                          {isSelected && (
                            <div 
                              className="absolute rounded-full border-2 border-white"
                              style={{ 
                                boxShadow: '0 0 8px rgba(255,255,255,0.5)',
                                top: '-6px',
                                left: '-6px',
                                right: '-6px',
                                bottom: '-6px',
                              }}
                            />
                          )}
                          {/* Small dot */}
                          <div
                            className="w-4 h-4 rounded-full border-2 border-white"
                            style={{ backgroundColor: color, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                          />
                          {/* Orientation indicator — line extending from dot center */}
                          {annotation.orientation !== undefined && (() => {
                            const orientRad = (annotation.orientation * Math.PI) / 180;
                            const dx = 16 * Math.sin(orientRad);
                            const dy = -16 * Math.cos(orientRad);
                            // 2-sided: diameter line spanning both directions; 1-sided: radius from center
                            const lx1 = isTwoSided ? 18 - dx : 18;
                            const ly1 = isTwoSided ? 18 - dy : 18;
                            const lx2 = 18 + dx;
                            const ly2 = 18 + dy;
                            return (
                              <svg
                                className="absolute pointer-events-none"
                                width="36"
                                height="36"
                                viewBox="0 0 36 36"
                                style={{
                                  left: '50%',
                                  top: '50%',
                                  transform: 'translate(-50%, -50%)',
                                }}
                              >
                                <line
                                  x1={lx1}
                                  y1={ly1}
                                  x2={lx2}
                                  y2={ly2}
                                  stroke="white"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  style={{ filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.6))' }}
                                />
                              </svg>
                            );
                          })()}
                          {/* Labels - stacked for 2-sided signs */}
                          <div className="absolute left-1/2 -translate-x-1/2 top-6 flex flex-col items-center gap-1">
                            {renderLabel(side1Data, label)}
                            {isTwoSided && side2Data?.signageTypeName
                              ? renderLabel(side2Data, getSideLabel(side2Data) || label)
                              : isTwoSided && (
                                <div
                                  className="whitespace-nowrap px-2 py-0.5 rounded text-xs font-medium italic opacity-60"
                                  style={{ backgroundColor: color, color: 'white' }}
                                >
                                  No type
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Non-signage markers (barriers) render as pin markers
                  return (
                    <div
                      key={annotation.id}
                      className={cn(
                        'annotation-marker absolute -translate-x-1/2 -translate-y-full pointer-events-auto',
                        isBeingDragged && 'scale-110 drop-shadow-xl',
                        isEditMode && (isSelected ? 'cursor-move' : 'cursor-pointer')
                      )}
                      style={{
                        left: `${point.x}%`,
                        top: `${point.y}%`,
                        opacity,
                        transformOrigin: 'center bottom',
                      }}
                      onMouseDown={(e) => handleAnnotationMouseDown(e, annotation)}
                      onClick={(e) => handleAnnotationClick(e, annotation)}
                    >
                      <div className="relative" style={{ transform: `scale(${1 / transform.scale})`, transformOrigin: 'center bottom' }}>
                        {/* Selection ring */}
                        {isSelected && (
                          <div 
                            className="absolute -inset-2 rounded-full border-2 border-white"
                            style={{ 
                              boxShadow: '0 0 8px rgba(255,255,255,0.5)',
                              top: '-4px',
                              left: '-4px',
                              right: '-4px',
                              bottom: '4px',
                            }}
                          />
                        )}
                        <svg
                          width="28"
                          height="36"
                          viewBox="0 0 28 36"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z"
                            fill={color}
                          />
                          <circle cx="14" cy="14" r="6" fill="white" fillOpacity="0.9" />
                        </svg>
                        <div
                          className="absolute left-1/2 -translate-x-1/2 top-10 whitespace-nowrap px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: color, color: 'white' }}
                        >
                          {label}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          );
        })()}
      </div>

      {/* Crosshair for line drawing mode */}
      {isEditMode && selectedType && usesLineDrawing && mousePos && !isPanning && (() => {
        const bounds = getImageBounds();
        if (!bounds) return null;
        
        // Convert image-relative percentage to screen position
        const imageX = (mousePos.x / 100) * bounds.renderedWidth + bounds.offsetX;
        const imageY = (mousePos.y / 100) * bounds.renderedHeight + bounds.offsetY;
        const screenX = imageX * transform.scale + transform.translateX;
        const screenY = imageY * transform.scale + transform.translateY;
        
        return (
          <div
            className="absolute w-6 h-6 pointer-events-none z-10"
            style={{
              left: screenX,
              top: screenY,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="w-full h-0.5 absolute top-1/2 left-0"
              style={{ backgroundColor: getTypeColor(selectedCategory, selectedType) }}
            />
            <div
              className="h-full w-0.5 absolute left-1/2 top-0"
              style={{ backgroundColor: getTypeColor(selectedCategory, selectedType) }}
            />
          </div>
        );
      })()}

      {/* Pending line instructions */}
      {isEditMode && pendingLine && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm z-10"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          Click to complete line • <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs font-mono">Esc</kbd> to cancel
        </div>
      )}

      {/* Selected annotation hint */}
      {isEditMode && selectedAnnotationId && !pendingLine && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm z-10"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          Drag to move • <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs font-mono">Del</kbd> to delete • <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs font-mono">Esc</kbd> to deselect
        </div>
      )}
    </div>
  );
}

import { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, Image as ImageIcon, RefreshCw, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import {
  Annotation,
  AnnotationCategory,
  AnnotationType,
  Point,
  SIGNAGE_TYPES,
  BARRIER_TYPES,
  FLOW_TYPES,
  isLineAnnotation,
} from '@/types/annotations';
import { cn } from '@/lib/utils';
import { useCanvasTransform } from '@/hooks/useCanvasTransform';

interface CanvasProps {
  image: string | null;
  onImageUpload: (file: File) => void;
  annotations: Annotation[];
  isAnnotationVisible: (annotation: Annotation) => boolean;
  focusedCategory: AnnotationCategory | null;
  isEditMode: boolean;
  onAddAnnotation: (points: Point[], label?: string) => void;
  onDeleteAnnotation: (id: string) => void;
  onUpdateAnnotation?: (id: string, updates: Partial<Annotation>) => void;
  selectedCategory: AnnotationCategory;
  selectedType: AnnotationType;
  pendingLine: Point[] | null;
  setPendingLine: (points: Point[] | null) => void;
  selectedAnnotationId: string | null;
  setSelectedAnnotationId: (id: string | null) => void;
}

const getTypeColor = (category: AnnotationCategory, type: AnnotationType): string => {
  const colors: Record<string, string> = {
    'signage-ticket': 'hsl(210, 85%, 55%)',
    'signage-vip': 'hsl(280, 75%, 60%)',
    'signage-alcohol': 'hsl(340, 75%, 55%)',
    'signage-accessibility': 'hsl(200, 80%, 50%)',
    'signage-washroom': 'hsl(230, 70%, 60%)',
    'signage-area': 'hsl(260, 65%, 55%)',
    'barrier-stanchion': 'hsl(35, 90%, 55%)',
    'barrier-drape': 'hsl(25, 85%, 50%)',
    'flow-ingress': 'hsl(145, 70%, 45%)',
    'flow-egress': 'hsl(0, 75%, 55%)',
  };
  return colors[`${category}-${type}`] || 'hsl(185, 75%, 55%)';
};

const getTypeLabel = (category: AnnotationCategory, type: AnnotationType): string => {
  if (category === 'signage') return SIGNAGE_TYPES[type as keyof typeof SIGNAGE_TYPES]?.label || type;
  if (category === 'barrier') return BARRIER_TYPES[type as keyof typeof BARRIER_TYPES]?.label || type;
  if (category === 'flow') return FLOW_TYPES[type as keyof typeof FLOW_TYPES]?.label || type;
  return type;
};

export function Canvas({
  image,
  onImageUpload,
  annotations,
  isAnnotationVisible,
  focusedCategory,
  isEditMode,
  onAddAnnotation,
  onDeleteAnnotation,
  onUpdateAnnotation,
  selectedCategory,
  selectedType,
  pendingLine,
  setPendingLine,
  selectedAnnotationId,
  setSelectedAnnotationId,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  
  // Drag state for annotations (triggered after selecting)
  // We track the current dragged points locally for smooth visual feedback
  const [draggingAnnotation, setDraggingAnnotation] = useState<{
    id: string;
    startPoint: Point;
    originalPoints: Point[];
    currentPoints: Point[]; // Live position during drag
  } | null>(null);
  
  // Whether the current annotation type uses lines or markers
  const usesLineDrawing = isLineAnnotation(selectedCategory, selectedType);

  // Canvas transform (zoom/pan)
  const {
    transform,
    zoomIn,
    zoomOut,
    setZoom,
    resetTransform,
    handleWheelZoom,
    handleWheelPan,
    isPanning,
    startPan,
    updatePan,
    endPan,
    zoomPercentage,
    minZoom,
    maxZoom,
  } = useCanvasTransform();

  // Handle wheel events for zoom and pan
  // - Ctrl/Cmd + scroll OR pinch-to-zoom: zoom
  // - Two-finger swipe (no modifier): pan
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Pinch-to-zoom on trackpad sends ctrlKey: true
      // Also handle explicit Ctrl/Cmd + scroll for mouse users
      if (e.ctrlKey || e.metaKey) {
        const rect = container.getBoundingClientRect();
        handleWheelZoom(e, rect);
      } else {
        // Two-finger swipe on trackpad OR regular scroll wheel
        // Use this for panning the canvas
        handleWheelPan(e);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheelZoom, handleWheelPan]);

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

  // Convert screen coordinates to canvas percentage coordinates
  // Must account for zoom/pan transform to get correct positions
  const screenToCanvasPercent = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const container = containerRef.current;
      if (!container) return null;

      const rect = container.getBoundingClientRect();
      
      // Get position relative to container, then reverse the transform
      // The canvas is translated by (translateX, translateY) and scaled by scale
      const canvasX = (clientX - rect.left - transform.translateX) / transform.scale;
      const canvasY = (clientY - rect.top - transform.translateY) / transform.scale;
      
      // Convert to percentage (canvas at scale 1 fills the container)
      const x = (canvasX / rect.width) * 100;
      const y = (canvasY / rect.height) * 100;

      return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    },
    [transform]
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!image) return;

      // Pan with middle mouse button or Alt+click
      if ((e.button === 1) || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        startPan(e.clientX, e.clientY);
        return;
      }
    },
    [image, startPan]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Update mouse position for crosshair
      const pos = screenToCanvasPercent(e.clientX, e.clientY);
      if (pos) setMousePos(pos);

      // Handle panning
      if (isPanning) {
        updatePan(e.clientX, e.clientY);
        return;
      }

      // Handle annotation dragging - update local state for smooth visual feedback
      if (draggingAnnotation) {
        const currentPos = screenToCanvasPercent(e.clientX, e.clientY);
        if (!currentPos) return;

        const deltaX = currentPos.x - draggingAnnotation.startPoint.x;
        const deltaY = currentPos.y - draggingAnnotation.startPoint.y;

        const newPoints = draggingAnnotation.originalPoints.map((p) => ({
          x: Math.max(0, Math.min(100, p.x + deltaX)),
          y: Math.max(0, Math.min(100, p.y + deltaY)),
        }));

        // Update local drag state for immediate visual feedback
        setDraggingAnnotation({
          ...draggingAnnotation,
          currentPoints: newPoints,
        });
      }
    },
    [screenToCanvasPercent, isPanning, updatePan, draggingAnnotation]
  );

  const handleCanvasMouseUp = useCallback(() => {
    if (isPanning) {
      endPan();
    }
    // Save the final position to database when drag ends
    if (draggingAnnotation && onUpdateAnnotation) {
      onUpdateAnnotation(draggingAnnotation.id, { points: draggingAnnotation.currentPoints });
      setDraggingAnnotation(null);
    }
  }, [isPanning, endPan, draggingAnnotation, onUpdateAnnotation]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditMode || !image) return;
      if (isPanning || draggingAnnotation) return;

      const pos = screenToCanvasPercent(e.clientX, e.clientY);
      if (!pos) return;

      // Clear selection when clicking on empty canvas
      setSelectedAnnotationId(null);

      // Auto-detect marker vs line based on selected annotation type
      if (usesLineDrawing) {
        // Line drawing mode (flows, drapes)
        if (!pendingLine) {
          setPendingLine([pos]);
        } else {
          onAddAnnotation([...pendingLine, pos]);
          setPendingLine(null);
        }
      } else {
        // Marker mode (signage, stanchions)
        onAddAnnotation([pos]);
      }
    },
    [
      isEditMode,
      image,
      isPanning,
      draggingAnnotation,
      screenToCanvasPercent,
      onAddAnnotation,
      pendingLine,
      setPendingLine,
      usesLineDrawing,
      setSelectedAnnotationId,
    ]
  );

  const handleAnnotationMouseDown = useCallback(
    (e: React.MouseEvent, annotation: Annotation) => {
      e.stopPropagation();
      if (!isEditMode) return;

      const pos = screenToCanvasPercent(e.clientX, e.clientY);
      if (!pos) return;

      // If this annotation is already selected, start dragging
      if (selectedAnnotationId === annotation.id) {
        setDraggingAnnotation({
          id: annotation.id,
          startPoint: pos,
          originalPoints: [...annotation.points],
          currentPoints: [...annotation.points], // Start with current position
        });
      } else {
        // Select this annotation
        setSelectedAnnotationId(annotation.id);
        // Cancel any pending line drawing
        if (pendingLine) setPendingLine(null);
      }
    },
    [isEditMode, screenToCanvasPercent, selectedAnnotationId, setSelectedAnnotationId, pendingLine, setPendingLine]
  );

  const handleAnnotationClick = useCallback(
    (e: React.MouseEvent, _annotation: Annotation) => {
      e.stopPropagation();
      // Selection is handled in mouseDown, nothing extra needed here
    },
    []
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input or editable element
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }

      // Escape cancels pending line or deselects annotation
      if (e.key === 'Escape') {
        if (pendingLine) {
          setPendingLine(null);
        } else if (selectedAnnotationId) {
          setSelectedAnnotationId(null);
        }
      }
      
      // Delete/Backspace deletes selected annotation
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotationId && isEditMode) {
        e.preventDefault();
        const idToDelete = selectedAnnotationId;
        setSelectedAnnotationId(null);
        onDeleteAnnotation(idToDelete);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingLine, setPendingLine, selectedAnnotationId, setSelectedAnnotationId, isEditMode, onDeleteAnnotation]);

  // Handle mouse up outside of component
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isPanning) endPan();
      // Save final position when releasing outside the canvas
      if (draggingAnnotation && onUpdateAnnotation) {
        onUpdateAnnotation(draggingAnnotation.id, { points: draggingAnnotation.currentPoints });
        setDraggingAnnotation(null);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isPanning, endPan, draggingAnnotation, onUpdateAnnotation]);

  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (draggingAnnotation) return 'grabbing';
    if (!isEditMode) return 'default';
    // Show crosshair for placing annotations in edit mode
    return 'crosshair';
  };

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
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-card/95 backdrop-blur-sm rounded-lg p-1.5 shadow-lg border border-border">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={zoomOut}
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
            onValueChange={([value]) => setZoom(value)}
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
              onClick={zoomIn}
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
              onClick={resetTransform}
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset view (100%)</TooltipContent>
        </Tooltip>
      </div>

      {/* Replace image button */}
      <div className="absolute top-3 right-3 z-10">
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
          src={image}
          alt="Floor plan"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
          draggable={false}
        />

        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Render flow lines */}
          {annotations
            .filter((a) => a.points.length > 1 && isAnnotationVisible(a))
            .map((annotation) => {
              const opacity =
                focusedCategory && focusedCategory !== annotation.category ? 0.2 : 1;
              const color = getTypeColor(annotation.category, annotation.type);
              const isBeingDragged = draggingAnnotation?.id === annotation.id;
              const isSelected = selectedAnnotationId === annotation.id;
              // Use live dragged position for smooth feedback
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
                      points={points.map((p) => `${p.x}%,${p.y}%`).join(' ')}
                      fill="none"
                      stroke="white"
                      strokeWidth={6 / transform.scale}
                      strokeLinecap="round"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                  {/* Invisible wider stroke for easier selection */}
                  <polyline
                    points={points.map((p) => `${p.x}%,${p.y}%`).join(' ')}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={12 / transform.scale}
                    style={{ 
                      pointerEvents: 'stroke', 
                      cursor: isEditMode ? (isSelected ? 'move' : 'pointer') : undefined 
                    }}
                    onMouseDown={(e) => handleAnnotationMouseDown(e as unknown as React.MouseEvent, annotation)}
                  />
                  <polyline
                    points={points.map((p) => `${p.x}%,${p.y}%`).join(' ')}
                    fill="none"
                    stroke={color}
                    strokeWidth={3 / transform.scale}
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
                        const size = 1.5 / transform.scale;
                        const x1 = last.x - size * Math.cos(angle - Math.PI / 6);
                        const y1 = last.y - size * Math.sin(angle - Math.PI / 6);
                        const x2 = last.x - size * Math.cos(angle + Math.PI / 6);
                        const y2 = last.y - size * Math.sin(angle + Math.PI / 6);
                        return `${last.x}%,${last.y}% ${x1}%,${y1}% ${x2}%,${y2}%`;
                      })()}
                      fill={color}
                    />
                  )}
                </g>
              );
            })}

          {/* Pending line preview */}
          {pendingLine && mousePos && (
            <line
              x1={`${pendingLine[pendingLine.length - 1].x}%`}
              y1={`${pendingLine[pendingLine.length - 1].y}%`}
              x2={`${mousePos.x}%`}
              y2={`${mousePos.y}%`}
              stroke={getTypeColor(selectedCategory, selectedType)}
              strokeWidth={2 / transform.scale}
              strokeDasharray={`${5 / transform.scale},${5 / transform.scale}`}
              opacity="0.6"
            />
          )}
        </svg>

        {/* Render markers */}
        {annotations
          .filter((a) => a.points.length === 1 && isAnnotationVisible(a))
          .map((annotation) => {
            const opacity =
              focusedCategory && focusedCategory !== annotation.category ? 0.2 : 1;
            const color = getTypeColor(annotation.category, annotation.type);
            const isBeingDragged = draggingAnnotation?.id === annotation.id;
            const isSelected = selectedAnnotationId === annotation.id;
            // Use live dragged position for smooth feedback
            const point = isBeingDragged ? draggingAnnotation.currentPoints[0] : annotation.points[0];
            const label = getTypeLabel(annotation.category, annotation.type);

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

      {/* Crosshair for line drawing mode */}
      {isEditMode && usesLineDrawing && mousePos && !isPanning && (
        <div
          className="absolute w-6 h-6 pointer-events-none z-10"
          style={{
            left: `calc(${mousePos.x}% * ${transform.scale} + ${transform.translateX}px)`,
            top: `calc(${mousePos.y}% * ${transform.scale} + ${transform.translateY}px)`,
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
      )}

      {/* Pending line instructions */}
      {isEditMode && pendingLine && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm z-10">
          Click to complete line • <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs font-mono">Esc</kbd> to cancel
        </div>
      )}

      {/* Selected annotation hint */}
      {isEditMode && selectedAnnotationId && !pendingLine && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm z-10">
          Drag to move • <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs font-mono">Del</kbd> to delete • <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs font-mono">Esc</kbd> to deselect
        </div>
      )}
    </div>
  );
}

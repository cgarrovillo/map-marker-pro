import { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import {
  Annotation,
  AnnotationCategory,
  AnnotationType,
  Point,
  ToolMode,
  SIGNAGE_TYPES,
  BARRIER_TYPES,
  FLOW_TYPES,
} from '@/types/annotations';
import { cn } from '@/lib/utils';

interface CanvasProps {
  image: string | null;
  onImageUpload: (file: File) => void;
  annotations: Annotation[];
  isAnnotationVisible: (annotation: Annotation) => boolean;
  focusedCategory: AnnotationCategory | null;
  toolMode: ToolMode;
  isEditMode: boolean;
  onAddAnnotation: (points: Point[], label?: string) => void;
  onDeleteAnnotation: (id: string) => void;
  selectedCategory: AnnotationCategory;
  selectedType: AnnotationType;
  pendingLine: Point[] | null;
  setPendingLine: (points: Point[] | null) => void;
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
  toolMode,
  isEditMode,
  onAddAnnotation,
  onDeleteAnnotation,
  selectedCategory,
  selectedType,
  pendingLine,
  setPendingLine,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mousePos, setMousePos] = useState<Point | null>(null);

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

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditMode || !image) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      if (toolMode === 'marker') {
        onAddAnnotation([{ x, y }]);
      } else if (toolMode === 'line') {
        if (!pendingLine) {
          setPendingLine([{ x, y }]);
        } else {
          onAddAnnotation([...pendingLine, { x, y }]);
          setPendingLine(null);
        }
      }
    },
    [isEditMode, image, toolMode, onAddAnnotation, pendingLine, setPendingLine]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setMousePos({ x, y });
    },
    []
  );

  const handleAnnotationClick = useCallback(
    (e: React.MouseEvent, annotation: Annotation) => {
      e.stopPropagation();
      if (toolMode === 'delete' && isEditMode) {
        onDeleteAnnotation(annotation.id);
      }
    },
    [toolMode, isEditMode, onDeleteAnnotation]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pendingLine) {
        setPendingLine(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingLine, setPendingLine]);

  const getCursor = () => {
    if (!isEditMode) return 'default';
    switch (toolMode) {
      case 'marker':
        return 'crosshair';
      case 'line':
        return 'crosshair';
      case 'delete':
        return 'pointer';
      default:
        return 'default';
    }
  };

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
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden canvas-grid"
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      style={{ cursor: getCursor() }}
    >
      <img
        src={image}
        alt="Floor plan"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
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
            const points = annotation.points;

            return (
              <g key={annotation.id} style={{ opacity }}>
                <polyline
                  points={points.map((p) => `${p.x}%,${p.y}%`).join(' ')}
                  fill="none"
                  stroke={color}
                  strokeWidth="3"
                  className={annotation.category === 'flow' ? 'flow-line' : ''}
                  style={{ pointerEvents: 'stroke' }}
                  onClick={(e) => handleAnnotationClick(e as unknown as React.MouseEvent, annotation)}
                />
                {/* Arrow head for flows */}
                {annotation.category === 'flow' && points.length >= 2 && (
                  <polygon
                    points={(() => {
                      const last = points[points.length - 1];
                      const prev = points[points.length - 2];
                      const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
                      const size = 1.5;
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
            strokeWidth="2"
            strokeDasharray="5,5"
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
          const point = annotation.points[0];
          const label = getTypeLabel(annotation.category, annotation.type);

          return (
            <div
              key={annotation.id}
              className="annotation-marker absolute -translate-x-1/2 -translate-y-full pointer-events-auto"
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
                opacity,
              }}
              onClick={(e) => handleAnnotationClick(e, annotation)}
            >
              <div className="relative">
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

      {/* Crosshair for line tool */}
      {isEditMode && toolMode === 'line' && mousePos && (
        <div
          className="absolute w-6 h-6 pointer-events-none"
          style={{
            left: `${mousePos.x}%`,
            top: `${mousePos.y}%`,
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

      {/* Instructions overlay */}
      {isEditMode && pendingLine && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm">
          Click to add point • Press <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs font-mono">Esc</kbd> to cancel
        </div>
      )}
    </div>
  );
}

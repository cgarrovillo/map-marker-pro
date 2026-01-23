import { Eye, EyeOff, Focus, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
  AnnotationCategory,
  AnnotationType,
  LayerVisibility,
  SubLayerVisibility,
  SIGNAGE_TYPES,
  BARRIER_TYPES,
  FLOW_TYPES,
  Annotation,
} from '@/types/annotations';
import { cn } from '@/lib/utils';

interface LayersPanelProps {
  layerVisibility: LayerVisibility;
  subLayerVisibility: SubLayerVisibility;
  onToggleLayer: (category: AnnotationCategory) => void;
  onToggleSubLayer: (category: AnnotationCategory, type: AnnotationType) => void;
  focusedCategory: AnnotationCategory | null;
  onFocusCategory: (category: AnnotationCategory | null) => void;
  annotations: Annotation[];
}

interface LayerRowProps {
  category: AnnotationCategory;
  label: string;
  visible: boolean;
  focused: boolean;
  onToggle: () => void;
  onFocus: () => void;
  colorClass: string;
  count: number;
  children?: React.ReactNode;
}

function LayerRow({
  label,
  visible,
  focused,
  onToggle,
  onFocus,
  colorClass,
  count,
  children,
}: LayerRowProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border-b border-border">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2.5 hover:bg-secondary/50 transition-colors',
          focused && 'bg-secondary'
        )}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        <div className={cn('w-3 h-3 rounded-full', colorClass)} />
        <span className="flex-1 text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground font-mono">{count}</span>
        <button
          onClick={onFocus}
          className={cn(
            'p-1 rounded hover:bg-secondary transition-colors',
            focused && 'text-primary'
          )}
          title="Focus layer"
        >
          <Focus className="w-4 h-4" />
        </button>
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-secondary transition-colors"
          title={visible ? 'Hide layer' : 'Show layer'}
        >
          {visible ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>
      {isExpanded && children && (
        <div className="pl-6 pb-1">{children}</div>
      )}
    </div>
  );
}

interface SubLayerRowProps {
  type: string;
  label: string;
  visible: boolean;
  onToggle: () => void;
  colorClass: string;
  count: number;
}

function SubLayerRow({
  label,
  visible,
  onToggle,
  colorClass,
  count,
}: SubLayerRowProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-secondary/30 transition-colors rounded">
      <div className={cn('w-2 h-2 rounded-full', colorClass)} />
      <span className="flex-1 text-xs">{label}</span>
      <span className="text-xs text-muted-foreground font-mono">{count}</span>
      <button
        onClick={onToggle}
        className="p-0.5 rounded hover:bg-secondary transition-colors"
      >
        {visible ? (
          <Eye className="w-3.5 h-3.5" />
        ) : (
          <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}

export function LayersPanel({
  layerVisibility,
  subLayerVisibility,
  onToggleLayer,
  onToggleSubLayer,
  focusedCategory,
  onFocusCategory,
  annotations,
}: LayersPanelProps) {
  const countByType = (category: AnnotationCategory, type?: AnnotationType) => {
    return annotations.filter(
      (a) => a.category === category && (type ? a.type === type : true)
    ).length;
  };

  return (
    <div className="w-64 bg-sidebar border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Layers</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Toggle visibility & focus
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <LayerRow
          category="signage"
          label="Signages"
          visible={layerVisibility.signage}
          focused={focusedCategory === 'signage'}
          onToggle={() => onToggleLayer('signage')}
          onFocus={() =>
            onFocusCategory(focusedCategory === 'signage' ? null : 'signage')
          }
          colorClass="bg-signage"
          count={countByType('signage')}
        >
          {Object.entries(SIGNAGE_TYPES).map(([type, config]) => (
            <SubLayerRow
              key={type}
              type={type}
              label={config.label}
              visible={subLayerVisibility.signage[type as keyof typeof subLayerVisibility.signage]}
              onToggle={() => onToggleSubLayer('signage', type as AnnotationType)}
              colorClass={`bg-signage-${type}`}
              count={countByType('signage', type as AnnotationType)}
            />
          ))}
        </LayerRow>
        <LayerRow
          category="barrier"
          label="Barriers"
          visible={layerVisibility.barrier}
          focused={focusedCategory === 'barrier'}
          onToggle={() => onToggleLayer('barrier')}
          onFocus={() =>
            onFocusCategory(focusedCategory === 'barrier' ? null : 'barrier')
          }
          colorClass="bg-barrier"
          count={countByType('barrier')}
        >
          {Object.entries(BARRIER_TYPES).map(([type, config]) => (
            <SubLayerRow
              key={type}
              type={type}
              label={config.label}
              visible={subLayerVisibility.barrier[type as keyof typeof subLayerVisibility.barrier]}
              onToggle={() => onToggleSubLayer('barrier', type as AnnotationType)}
              colorClass={`bg-barrier-${type}`}
              count={countByType('barrier', type as AnnotationType)}
            />
          ))}
        </LayerRow>
        <LayerRow
          category="flow"
          label="Crowd Flow"
          visible={layerVisibility.flow}
          focused={focusedCategory === 'flow'}
          onToggle={() => onToggleLayer('flow')}
          onFocus={() =>
            onFocusCategory(focusedCategory === 'flow' ? null : 'flow')
          }
          colorClass="bg-flow"
          count={countByType('flow')}
        >
          {Object.entries(FLOW_TYPES).map(([type, config]) => (
            <SubLayerRow
              key={type}
              type={type}
              label={config.label}
              visible={subLayerVisibility.flow[type as keyof typeof subLayerVisibility.flow]}
              onToggle={() => onToggleSubLayer('flow', type as AnnotationType)}
              colorClass={`bg-flow-${type}`}
              count={countByType('flow', type as AnnotationType)}
            />
          ))}
        </LayerRow>
      </div>
    </div>
  );
}

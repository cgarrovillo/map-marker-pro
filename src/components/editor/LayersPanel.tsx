import { Eye, EyeOff, Focus, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useState } from 'react';
import {
  AnnotationCategory,
  AnnotationType,
  SIGNAGE_TYPES,
  BARRIER_TYPES,
  FLOW_TYPES,
  Annotation,
} from '@/types/annotations';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectLayerVisibility,
  selectSubLayerVisibility,
  selectSignageTypeVisibility,
  selectSignageSubTypeVisibility,
  selectFocusedCategory,
} from '@/store/selectors';
import {
  toggleLayerVisibility,
  toggleSubLayerVisibility,
  toggleSignageTypeVisibility,
  toggleSignageSubTypeVisibility,
  setFocusedCategory,
  setSelectedAnnotationId,
} from '@/store/slices/uiSlice';
import { SignDetailsPanel } from './SignDetailsPanel';
import { Tables } from '@/integrations/supabase/types';

type SignageTypeRow = Tables<'signage_types'>;
type SignageSubTypeRow = Tables<'signage_sub_types'>;

interface LayersPanelProps {
  annotations: Annotation[];
  selectedAnnotation: Annotation | null;
  onUpdateAnnotation?: (id: string, updates: Partial<Annotation>) => void;
  signageTypes?: SignageTypeRow[];
  subTypesByParent?: Record<string, SignageSubTypeRow[]>;
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
  colorClass?: string;
  dotColor?: string;
  count: number;
}

function SubLayerRow({
  label,
  visible,
  onToggle,
  colorClass,
  dotColor,
  count,
}: SubLayerRowProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-secondary/30 transition-colors rounded">
      <div
        className={cn('w-2 h-2 rounded-full', colorClass)}
        style={dotColor ? { backgroundColor: dotColor } : undefined}
      />
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
  annotations, 
  selectedAnnotation, 
  onUpdateAnnotation,
  signageTypes = [],
  subTypesByParent = {},
}: LayersPanelProps) {
  const dispatch = useAppDispatch();
  const layerVisibility = useAppSelector(selectLayerVisibility);
  const subLayerVisibility = useAppSelector(selectSubLayerVisibility);
  const signageTypeVisibility = useAppSelector(selectSignageTypeVisibility);
  const signageSubTypeVisibility = useAppSelector(selectSignageSubTypeVisibility);
  const focusedCategory = useAppSelector(selectFocusedCategory);
  
  // Check if selected annotation is a signage type
  const isSignageSelected = selectedAnnotation?.category === 'signage';
  
  const handleSignUpdate = (updates: Partial<Annotation>) => {
    if (selectedAnnotation && onUpdateAnnotation) {
      onUpdateAnnotation(selectedAnnotation.id, updates);
    }
  };

  const countByType = (category: AnnotationCategory, type?: AnnotationType) => {
    return annotations.filter(
      (a) => a.category === category && (type ? a.type === type : true)
    ).length;
  };

  const countBySignageTypeName = (signageTypeName: string) => {
    return annotations.filter(
      (a) => a.category === 'signage' && a.signageTypeName === signageTypeName
    ).length;
  };

  const countBySignageSubTypeName = (parentName: string, subTypeName: string) => {
    return annotations.filter(
      (a) =>
        a.category === 'signage' &&
        a.signageTypeName === parentName &&
        a.signageSubTypeName === subTypeName
    ).length;
  };

  const handleToggleLayer = (category: AnnotationCategory) => {
    dispatch(toggleLayerVisibility(category));
  };

  const handleToggleSubLayer = (category: AnnotationCategory, type: AnnotationType) => {
    dispatch(toggleSubLayerVisibility({ category, type }));
  };

  const handleFocusCategory = (category: AnnotationCategory | null) => {
    dispatch(setFocusedCategory(category));
  };

  // When a signage annotation is selected, show dedicated Sign Details view
  if (isSignageSelected && selectedAnnotation) {
    const signageConfig = SIGNAGE_TYPES[selectedAnnotation.type as keyof typeof SIGNAGE_TYPES];
    const headerLabel = selectedAnnotation.type === 'ticket'
      ? (selectedAnnotation.signageTypeName || 'Signage')
      : (signageConfig?.label || selectedAnnotation.type);
    const headerSubLabel = selectedAnnotation.signageSubTypeName
      ? `${headerLabel} — ${selectedAnnotation.signageSubTypeName}`
      : headerLabel;

    // Look up parent signage type notes
    const parentSignageType = selectedAnnotation.signageTypeName
      ? signageTypes.find((t) => t.name === selectedAnnotation.signageTypeName)
      : undefined;
    const parentNotes = parentSignageType?.notes;

    return (
      <div className="w-64 bg-sidebar border-l border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold">Sign Details</h2>
              <p className="text-xs text-muted-foreground mt-0.5 truncate" title={headerSubLabel}>
                {headerSubLabel}
              </p>
            </div>
            <button
              onClick={() => dispatch(setSelectedAnnotationId(null))}
              className="p-1 rounded hover:bg-secondary transition-colors ml-2 flex-shrink-0"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {parentNotes && (
            <p className="mt-2 text-xs text-muted-foreground bg-secondary/50 rounded-md px-2.5 py-2 whitespace-pre-wrap">
              {parentNotes}
            </p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          <SignDetailsPanel
            annotation={selectedAnnotation}
            onUpdate={handleSignUpdate}
          />
        </div>
      </div>
    );
  }

  // Normal Layers view when no signage annotation is selected
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
          onToggle={() => handleToggleLayer('signage')}
          onFocus={() =>
            handleFocusCategory(focusedCategory === 'signage' ? null : 'signage')
          }
          colorClass="bg-signage"
          count={countByType('signage')}
        >
          {/* Dynamic signage types from database — with nested sub-types */}
          {signageTypes.map((st) => {
            const parentVisible = signageTypeVisibility[st.name] ?? true;
            const childSubTypes = subTypesByParent[st.id] || [];

            return (
              <div key={st.id}>
                <SubLayerRow
                  type={st.name}
                  label={st.name}
                  visible={parentVisible}
                  onToggle={() => dispatch(toggleSignageTypeVisibility(st.name))}
                  dotColor={st.color || undefined}
                  count={countBySignageTypeName(st.name)}
                />
                {/* Sub-type rows (indented further) */}
                {parentVisible && childSubTypes.length > 0 && (
                  <div className="pl-4">
                    {childSubTypes.map((sub) => {
                      const subKey = `${st.name}/${sub.name}`;
                      return (
                        <SubLayerRow
                          key={sub.id}
                          type={sub.name}
                          label={sub.name}
                          visible={signageSubTypeVisibility[subKey] ?? true}
                          onToggle={() => dispatch(toggleSignageSubTypeVisibility(subKey))}
                          dotColor={sub.color || st.color || undefined}
                          count={countBySignageSubTypeName(st.name, sub.name)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {/* Static signage types — only shown when annotations of that type exist */}
          {Object.entries(SIGNAGE_TYPES).map(([type, config]) => {
            const count = countByType('signage', type as AnnotationType);
            if (count === 0) return null;
            return (
              <SubLayerRow
                key={type}
                type={type}
                label={config.label}
                visible={signageTypeVisibility[type] ?? true}
                onToggle={() => dispatch(toggleSignageTypeVisibility(type))}
                colorClass={`bg-signage-${type}`}
                count={count}
              />
            );
          })}
        </LayerRow>
        {/* Coming soon - Barriers */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <div className="opacity-40 pointer-events-none select-none">
                <LayerRow
                  category="barrier"
                  label="Barriers"
                  visible={layerVisibility.barrier}
                  focused={false}
                  onToggle={() => {}}
                  onFocus={() => {}}
                  colorClass="bg-barrier"
                  count={countByType('barrier')}
                >
                  {Object.entries(BARRIER_TYPES).map(([type, config]) => (
                    <SubLayerRow
                      key={type}
                      type={type}
                      label={config.label}
                      visible={subLayerVisibility.barrier[type as keyof typeof subLayerVisibility.barrier]}
                      onToggle={() => {}}
                      colorClass={`bg-barrier-${type}`}
                      count={countByType('barrier', type as AnnotationType)}
                    />
                  ))}
                </LayerRow>
              </div>
              <div className="absolute inset-0 cursor-not-allowed" />
            </div>
          </TooltipTrigger>
          <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>

        {/* Coming soon - Crowd Flow */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <div className="opacity-40 pointer-events-none select-none">
                <LayerRow
                  category="flow"
                  label="Crowd Flow"
                  visible={layerVisibility.flow}
                  focused={false}
                  onToggle={() => {}}
                  onFocus={() => {}}
                  colorClass="bg-flow"
                  count={countByType('flow')}
                >
                  {Object.entries(FLOW_TYPES).map(([type, config]) => (
                    <SubLayerRow
                      key={type}
                      type={type}
                      label={config.label}
                      visible={subLayerVisibility.flow[type as keyof typeof subLayerVisibility.flow]}
                      onToggle={() => {}}
                      colorClass={`bg-flow-${type}`}
                      count={countByType('flow', type as AnnotationType)}
                    />
                  ))}
                </LayerRow>
              </div>
              <div className="absolute inset-0 cursor-not-allowed" />
            </div>
          </TooltipTrigger>
          <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

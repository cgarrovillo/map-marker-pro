import {
  Ticket,
  Crown,
  Wine,
  Accessibility,
  Bath,
  MapPin,
  Circle,
  Minus,
  ArrowRight,
  LogOut,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import {
  AnnotationCategory,
  AnnotationType,
  SIGNAGE_TYPES,
  BARRIER_TYPES,
  FLOW_TYPES,
  SignageType,
  BarrierType,
  FlowType,
  Annotation,
} from '@/types/annotations';
import { cn } from '@/lib/utils';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectSelectedCategory, selectSelectedType, selectIsEditMode } from '@/store/selectors';
import { selectAnnotationType } from '@/store/slices/uiSlice';

const ICONS = {
  Ticket,
  Crown,
  Wine,
  Accessibility,
  Bath,
  MapPin,
  Circle,
  Minus,
  ArrowRight,
  LogOut,
};

interface AnnotationPanelProps {
  annotations: Annotation[];
}

interface CategorySectionProps {
  title: string;
  category: AnnotationCategory;
  types: Record<string, { label: string; icon: string }>;
  selectedCategory: AnnotationCategory;
  selectedType: AnnotationType;
  onSelect: (category: AnnotationCategory, type: AnnotationType) => void;
  colorClass: string;
  typeColorMap: Record<string, string>;
  isEditMode: boolean;
}

function CategorySection({
  title,
  category,
  types,
  selectedCategory,
  selectedType,
  onSelect,
  colorClass,
  typeColorMap,
  isEditMode,
}: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isActive = selectedCategory === category;

  return (
    <div className="panel-section">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between py-1 text-sm font-semibold uppercase tracking-wider',
          colorClass
        )}
      >
        <span>{title}</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>
      {isExpanded && (
        <div className="mt-2 space-y-1">
          {Object.entries(types).map(([type, config]) => {
            const Icon = ICONS[config.icon as keyof typeof ICONS];
            const isSelected = isActive && selectedType === type;
            const typeColor = typeColorMap[type];

            return (
              <button
                key={type}
                onClick={() => isEditMode && onSelect(category, type as AnnotationType)}
                disabled={!isEditMode}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                  isEditMode && 'hover:bg-secondary cursor-pointer',
                  !isEditMode && 'opacity-60 cursor-default',
                  isSelected && 'bg-secondary ring-1 ring-primary'
                )}
              >
                <div
                  className={cn(
                    'w-6 h-6 rounded-md flex items-center justify-center',
                    typeColor
                  )}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className={cn(isSelected && 'text-foreground font-medium')}>
                  {config.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AnnotationPanel({ annotations }: AnnotationPanelProps) {
  const dispatch = useAppDispatch();
  const selectedCategory = useAppSelector(selectSelectedCategory);
  const selectedType = useAppSelector(selectSelectedType);
  const isEditMode = useAppSelector(selectIsEditMode);

  const handleSelect = (category: AnnotationCategory, type: AnnotationType) => {
    dispatch(selectAnnotationType({ category, type }));
  };

  const signageColors: Record<SignageType, string> = {
    ticket: 'bg-signage-ticket',
    vip: 'bg-signage-vip',
    alcohol: 'bg-signage-alcohol',
    accessibility: 'bg-signage-accessibility',
    washroom: 'bg-signage-washroom',
    area: 'bg-signage-area',
  };

  const barrierColors: Record<BarrierType, string> = {
    stanchion: 'bg-barrier-stanchion',
    drape: 'bg-barrier-drape',
  };

  const flowColors: Record<FlowType, string> = {
    ingress: 'bg-flow-ingress',
    egress: 'bg-flow-egress',
  };

  return (
    <div className="w-64 bg-sidebar border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Annotations</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {isEditMode ? 'Select a type to place' : 'View mode active'}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <CategorySection
          title="Signages"
          category="signage"
          types={SIGNAGE_TYPES}
          selectedCategory={selectedCategory}
          selectedType={selectedType}
          onSelect={handleSelect}
          colorClass="text-signage"
          typeColorMap={signageColors}
          isEditMode={isEditMode}
        />
        <CategorySection
          title="Barriers"
          category="barrier"
          types={BARRIER_TYPES}
          selectedCategory={selectedCategory}
          selectedType={selectedType}
          onSelect={handleSelect}
          colorClass="text-barrier"
          typeColorMap={barrierColors}
          isEditMode={isEditMode}
        />
        <CategorySection
          title="Crowd Flow"
          category="flow"
          types={FLOW_TYPES}
          selectedCategory={selectedCategory}
          selectedType={selectedType}
          onSelect={handleSelect}
          colorClass="text-flow"
          typeColorMap={flowColors}
          isEditMode={isEditMode}
        />
      </div>
    </div>
  );
}

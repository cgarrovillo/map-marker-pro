import {
  Ticket,
  Wine,
  Accessibility,
  Bath,
  Circle,
  Minus,
  ArrowRight,
  LogOut,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Trash2,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import {
  AnnotationCategory,
  AnnotationType,
  BARRIER_TYPES,
  FLOW_TYPES,
  BarrierType,
  FlowType,
  Annotation,
} from '@/types/annotations';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { 
  selectSelectedCategory, 
  selectSelectedType, 
  selectIsEditMode,
  selectSelectedSignageTypeId,
  selectSelectedSignageSubTypeId,
} from '@/store/selectors';
import { selectAnnotationType, setSelectedSignageTypeId, setSelectedSignageSubTypeId } from '@/store/slices/uiSlice';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type SignageType = Tables<'signage_types'>;
type SignageSubType = Tables<'signage_sub_types'>;

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Ticket,
  Wine,
  Accessibility,
  Bath,
  Circle,
  Minus,
  ArrowRight,
  LogOut,
};

// Get the appropriate icon for a signage type
function getSignageIcon(icon: string | null): React.ComponentType<{ className?: string }> {
  if (icon && ICONS[icon]) {
    return ICONS[icon];
  }
  return Ticket; // Default fallback
}

// Get background color class for signage type based on name/icon
function getSignageColorClass(signageType: SignageType): string {
  switch (signageType.name) {
    case 'No Alcohol':
      return 'bg-signage-alcohol';
    case 'Accessibility':
      return 'bg-signage-accessibility';
    case 'Washroom':
      return 'bg-signage-washroom';
    default:
      return 'bg-signage-ticket';
  }
}

interface AnnotationPanelProps {
  annotations: Annotation[];
  signageTypes: SignageType[];
  signageTypesLoading: boolean;
  subTypesByParent: Record<string, SignageSubType[]>;
  subTypesLoading: boolean;
  onCreateSignageType: (name: string) => Promise<SignageType | null>;
  onDeleteSignageType: (id: string) => Promise<void>;
  onCreateSubType: (signageTypeId: string, name: string) => Promise<SignageSubType | null>;
  onDeleteSubType: (signageTypeId: string, subTypeId: string) => Promise<void>;
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
  children?: React.ReactNode;
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
  children,
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
          {children}
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

// Component for adding a new signage type or sub-type
function AddTypeForm({
  onAdd,
  onCancel,
  placeholder,
  buttonText = 'Add',
}: {
  onAdd: (name: string) => void;
  onCancel: () => void;
  placeholder: string;
  buttonText?: string;
}) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onAdd(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-3 py-2 space-y-2">
      <Input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="flex-1 h-7 text-xs">
          {buttonText}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    </form>
  );
}

// Component for a single sub-type item
function SubTypeItem({
  subType,
  signageTypeId,
  isSelected,
  isEditMode,
  onSelect,
  onDelete,
  colorClass,
  Icon,
}: {
  subType: SignageSubType;
  signageTypeId: string;
  isSelected: boolean;
  isEditMode: boolean;
  onSelect: () => void;
  onDelete: () => void;
  colorClass: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <button
        onClick={() => isEditMode && onSelect()}
        disabled={!isEditMode}
        className={cn(
          'w-full flex items-center gap-3 pl-9 pr-3 py-1.5 rounded-lg text-sm transition-all',
          isEditMode && 'hover:bg-secondary cursor-pointer',
          !isEditMode && 'opacity-60 cursor-default',
          isSelected && 'bg-secondary ring-1 ring-primary'
        )}
      >
        <div className={cn('w-5 h-5 rounded flex items-center justify-center', colorClass)}>
          <Icon className="w-3 h-3 text-white" />
        </div>
        <span className={cn('flex-1 text-left text-sm', isSelected && 'text-foreground font-medium')}>
          {subType.name}
        </span>
      </button>
      {isEditMode && showDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete sub-type"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// Single signage type accordion with its sub-types
function SignageTypeAccordionItem({
  signageType,
  subTypes,
  selectedSignageTypeId,
  selectedSignageSubTypeId,
  isEditMode,
  onSelectSubType,
  onAddSubType,
  onDeleteSubType,
  onDeleteSignageType,
}: {
  signageType: SignageType;
  subTypes: SignageSubType[];
  selectedSignageTypeId: string | null;
  selectedSignageSubTypeId: string | null;
  isEditMode: boolean;
  onSelectSubType: (signageTypeId: string, subTypeId: string) => void;
  onAddSubType: (signageTypeId: string, name: string) => void;
  onDeleteSubType: (signageTypeId: string, subTypeId: string) => void;
  onDeleteSignageType: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingSubType, setIsAddingSubType] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Check if this parent type is selected (via one of its sub-types)
  const isParentSelected = selectedSignageTypeId === signageType.id;
  const colorClass = getSignageColorClass(signageType);
  const Icon = getSignageIcon(signageType.icon);

  const handleAdd = (name: string) => {
    onAddSubType(signageType.id, name);
    setIsAddingSubType(false);
  };

  return (
    <div
      className="mb-1"
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      {/* Signage Type Header */}
      <div className="relative">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
            isEditMode && 'hover:bg-secondary cursor-pointer',
            !isEditMode && 'opacity-60 cursor-default',
            isParentSelected && 'bg-secondary/50'
          )}
        >
          <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', colorClass)}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <span className={cn('flex-1 text-left', isParentSelected && 'text-foreground font-medium')}>
            {signageType.name}
          </span>
          <span className="text-xs text-muted-foreground mr-1">
            {subTypes.length}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        {/* Delete button for non-default types */}
        {isEditMode && showDelete && !signageType.is_default && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSignageType(signageType.id);
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
            title="Delete signage type"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Expanded content - sub-types */}
      {isExpanded && (
        <div className="mt-1 space-y-0.5">
          {/* Sub-types list */}
          {subTypes.length === 0 ? (
            <div className="pl-9 py-2 text-xs text-muted-foreground">
              No sub-types yet
            </div>
          ) : (
            subTypes.map((subType) => (
              <SubTypeItem
                key={subType.id}
                subType={subType}
                signageTypeId={signageType.id}
                isSelected={selectedSignageTypeId === signageType.id && selectedSignageSubTypeId === subType.id}
                isEditMode={isEditMode}
                onSelect={() => onSelectSubType(signageType.id, subType.id)}
                onDelete={() => onDeleteSubType(signageType.id, subType.id)}
                colorClass={colorClass}
                Icon={Icon}
              />
            ))
          )}

          {/* Add Sub-Type Form */}
          {isAddingSubType ? (
            <div className="pl-6">
              <AddTypeForm
                onAdd={handleAdd}
                onCancel={() => setIsAddingSubType(false)}
                placeholder="e.g., VIP, Men, Wheelchair"
                buttonText="Add"
              />
            </div>
          ) : isEditMode ? (
            <button
              onClick={() => setIsAddingSubType(true)}
              className="w-full flex items-center gap-3 pl-9 pr-3 py-1.5 rounded-lg text-sm transition-all hover:bg-secondary cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <div className="w-5 h-5 rounded flex items-center justify-center border border-dashed border-muted-foreground/50">
                <Plus className="w-3 h-3" />
              </div>
              <span className="text-xs">Add Sub-Type</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

// Signages section with all database-driven signage types
function SignagesSection({
  signageTypes,
  signageTypesLoading,
  subTypesByParent,
  subTypesLoading,
  selectedSignageTypeId,
  selectedSignageSubTypeId,
  isEditMode,
  onSelectSubType,
  onAddSignageType,
  onDeleteSignageType,
  onAddSubType,
  onDeleteSubType,
}: {
  signageTypes: SignageType[];
  signageTypesLoading: boolean;
  subTypesByParent: Record<string, SignageSubType[]>;
  subTypesLoading: boolean;
  selectedSignageTypeId: string | null;
  selectedSignageSubTypeId: string | null;
  isEditMode: boolean;
  onSelectSubType: (signageTypeId: string, subTypeId: string) => void;
  onAddSignageType: (name: string) => void;
  onDeleteSignageType: (id: string) => void;
  onAddSubType: (signageTypeId: string, name: string) => void;
  onDeleteSubType: (signageTypeId: string, subTypeId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddingSignageType, setIsAddingSignageType] = useState(false);

  const handleAdd = (name: string) => {
    onAddSignageType(name);
    setIsAddingSignageType(false);
  };

  return (
    <div className="panel-section">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-1 text-sm font-semibold uppercase tracking-wider text-signage"
      >
        <span>Signages</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>
      {isExpanded && (
        <div className="mt-2 space-y-1">
          {/* Loading state */}
          {signageTypesLoading ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Loading signage types...
            </div>
          ) : signageTypes.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No signage types yet
            </div>
          ) : (
            // Render all signage types as expandable accordions
            signageTypes.map((signageType) => (
              <SignageTypeAccordionItem
                key={signageType.id}
                signageType={signageType}
                subTypes={subTypesByParent[signageType.id] || []}
                selectedSignageTypeId={selectedSignageTypeId}
                selectedSignageSubTypeId={selectedSignageSubTypeId}
                isEditMode={isEditMode}
                onSelectSubType={onSelectSubType}
                onAddSubType={onAddSubType}
                onDeleteSubType={onDeleteSubType}
                onDeleteSignageType={onDeleteSignageType}
              />
            ))
          )}

          {/* Add Signage Type - at the bottom, full width, not indented */}
          {isAddingSignageType ? (
            <AddTypeForm
              onAdd={handleAdd}
              onCancel={() => setIsAddingSignageType(false)}
              placeholder="e.g., Tickets, Food, Information"
              buttonText="Add"
            />
          ) : isEditMode ? (
            <button
              onClick={() => setIsAddingSignageType(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-secondary cursor-pointer text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/30"
            >
              <div className="w-6 h-6 rounded-md flex items-center justify-center border border-dashed border-muted-foreground/50">
                <Plus className="w-4 h-4" />
              </div>
              <span>Add Signage Type</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function AnnotationPanel({ 
  annotations,
  signageTypes,
  signageTypesLoading,
  subTypesByParent,
  subTypesLoading,
  onCreateSignageType,
  onDeleteSignageType,
  onCreateSubType,
  onDeleteSubType,
}: AnnotationPanelProps) {
  const dispatch = useAppDispatch();
  const selectedCategory = useAppSelector(selectSelectedCategory);
  const selectedType = useAppSelector(selectSelectedType);
  const selectedSignageTypeId = useAppSelector(selectSelectedSignageTypeId);
  const selectedSignageSubTypeId = useAppSelector(selectSelectedSignageSubTypeId);
  const isEditMode = useAppSelector(selectIsEditMode);

  const handleSelect = (category: AnnotationCategory, type: AnnotationType) => {
    dispatch(selectAnnotationType({ category, type }));
  };

  const handleSelectSubType = (signageTypeId: string, subTypeId: string) => {
    dispatch(setSelectedSignageSubTypeId({ signageTypeId, subTypeId }));
  };

  const handleAddSignageType = async (name: string) => {
    try {
      const newType = await onCreateSignageType(name);
      if (newType) {
        // After creating, user can expand to add sub-types
        dispatch(setSelectedSignageTypeId(newType.id));
      }
    } catch (error) {
      console.error('Failed to create signage type:', error);
    }
  };

  const handleDeleteSignageType = async (id: string) => {
    if (confirm('Delete this signage type? This will also delete all sub-types. Existing signs will keep their names.')) {
      try {
        await onDeleteSignageType(id);
        // Clear selection if deleted type was selected
        if (selectedSignageTypeId === id) {
          dispatch(setSelectedSignageTypeId(null));
        }
      } catch (error) {
        console.error('Failed to delete signage type:', error);
      }
    }
  };

  const handleAddSubType = async (signageTypeId: string, name: string) => {
    try {
      const newSubType = await onCreateSubType(signageTypeId, name);
      if (newSubType) {
        // Auto-select the new sub-type
        dispatch(setSelectedSignageSubTypeId({ signageTypeId, subTypeId: newSubType.id }));
      }
    } catch (error) {
      console.error('Failed to create sub-type:', error);
    }
  };

  const handleDeleteSubType = async (signageTypeId: string, subTypeId: string) => {
    if (confirm('Delete this sub-type? Existing signs will keep their names.')) {
      try {
        await onDeleteSubType(signageTypeId, subTypeId);
        // Clear selection if deleted sub-type was selected
        if (selectedSignageSubTypeId === subTypeId) {
          dispatch(setSelectedSignageSubTypeId(null));
        }
      } catch (error) {
        console.error('Failed to delete sub-type:', error);
      }
    }
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
        {/* Signages Section - all database-driven */}
        <SignagesSection
          signageTypes={signageTypes}
          signageTypesLoading={signageTypesLoading}
          subTypesByParent={subTypesByParent}
          subTypesLoading={subTypesLoading}
          selectedSignageTypeId={selectedSignageTypeId}
          selectedSignageSubTypeId={selectedSignageSubTypeId}
          isEditMode={isEditMode}
          onSelectSubType={handleSelectSubType}
          onAddSignageType={handleAddSignageType}
          onDeleteSignageType={handleDeleteSignageType}
          onAddSubType={handleAddSubType}
          onDeleteSubType={handleDeleteSubType}
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

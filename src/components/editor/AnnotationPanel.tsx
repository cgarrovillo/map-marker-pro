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
  SIGNAGE_TYPES,
  BARRIER_TYPES,
  FLOW_TYPES,
  WASHROOM_SUB_TYPES,
  BarrierType,
  FlowType,
  WashroomSubType,
  Annotation,
} from '@/types/annotations';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { 
  selectSelectedCategory, 
  selectSelectedType, 
  selectIsEditMode,
  selectSelectedTicketTypeId,
  selectSelectedWashroomSubType,
} from '@/store/selectors';
import { selectAnnotationType, setSelectedTicketTypeId, setSelectedWashroomSubType } from '@/store/slices/uiSlice';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type TicketType = Tables<'ticket_types'>;

const ICONS = {
  Ticket,
  Wine,
  Accessibility,
  Bath,
  Circle,
  Minus,
  ArrowRight,
  LogOut,
};

interface AnnotationPanelProps {
  annotations: Annotation[];
  ticketTypes: TicketType[];
  ticketTypesLoading: boolean;
  onCreateTicketType: (name: string) => Promise<TicketType | null>;
  onDeleteTicketType: (id: string) => Promise<void>;
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

// Component for adding a new ticket type
function AddTicketTypeForm({
  onAdd,
  onCancel,
}: {
  onAdd: (name: string) => void;
  onCancel: () => void;
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
    <form onSubmit={handleSubmit} className="pl-6 pr-3 py-2 space-y-2">
      <Input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="e.g., VIP, General Admission"
        className="h-8 text-sm"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="flex-1 h-7 text-xs">
          Add
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    </form>
  );
}

// Component for a single ticket type item
function TicketTypeItem({
  ticketType,
  isSelected,
  isEditMode,
  onSelect,
  onDelete,
}: {
  ticketType: TicketType;
  isSelected: boolean;
  isEditMode: boolean;
  onSelect: () => void;
  onDelete: () => void;
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
        <div className="w-5 h-5 rounded flex items-center justify-center bg-signage-ticket">
          <Ticket className="w-3 h-3 text-white" />
        </div>
        <span className={cn('flex-1 text-left text-sm', isSelected && 'text-foreground font-medium')}>
          {ticketType.name}
        </span>
      </button>
      {isEditMode && showDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete ticket type"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// Nested accordion for Ticket Types
function TicketTypeAccordion({
  ticketTypes,
  ticketTypesLoading,
  selectedTicketTypeId,
  isEditMode,
  onSelectTicketType,
  onAddTicketType,
  onDeleteTicketType,
}: {
  ticketTypes: TicketType[];
  ticketTypesLoading: boolean;
  selectedTicketTypeId: string | null;
  isEditMode: boolean;
  onSelectTicketType: (id: string) => void;
  onAddTicketType: (name: string) => void;
  onDeleteTicketType: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddingTicketType, setIsAddingTicketType] = useState(false);

  // Check if any ticket type is selected
  const hasSelectedTicketType = selectedTicketTypeId && ticketTypes.some(t => t.id === selectedTicketTypeId);

  const handleAdd = (name: string) => {
    onAddTicketType(name);
    setIsAddingTicketType(false);
  };

  return (
    <div className="mb-1">
      {/* Ticket Type Header - acts as accordion trigger */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
          isEditMode && 'hover:bg-secondary cursor-pointer',
          !isEditMode && 'opacity-60 cursor-default',
          hasSelectedTicketType && 'bg-secondary/50'
        )}
      >
        <div className="w-6 h-6 rounded-md flex items-center justify-center bg-signage-ticket">
          <Ticket className="w-4 h-4 text-white" />
        </div>
        <span className={cn('flex-1 text-left', hasSelectedTicketType && 'text-foreground font-medium')}>
          Ticket Type
        </span>
        <span className="text-xs text-muted-foreground mr-1">
          {ticketTypes.length}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-1 space-y-0.5">
          {/* Add Ticket Type Button */}
          {isEditMode && !isAddingTicketType && (
            <button
              onClick={() => setIsAddingTicketType(true)}
              className="w-full flex items-center gap-3 pl-9 pr-3 py-1.5 rounded-lg text-sm transition-all hover:bg-secondary cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <div className="w-5 h-5 rounded flex items-center justify-center border border-dashed border-muted-foreground/50">
                <Plus className="w-3 h-3" />
              </div>
              <span className="text-xs">Add Ticket Type</span>
            </button>
          )}

          {/* Add Ticket Type Form */}
          {isAddingTicketType && (
            <AddTicketTypeForm
              onAdd={handleAdd}
              onCancel={() => setIsAddingTicketType(false)}
            />
          )}

          {/* Ticket Types List */}
          {ticketTypesLoading ? (
            <div className="pl-9 py-2 text-xs text-muted-foreground">
              Loading...
            </div>
          ) : ticketTypes.length === 0 ? (
            <div className="pl-9 py-2 text-xs text-muted-foreground">
              No ticket types yet
            </div>
          ) : (
            ticketTypes.map((ticketType) => (
              <TicketTypeItem
                key={ticketType.id}
                ticketType={ticketType}
                isSelected={selectedTicketTypeId === ticketType.id}
                isEditMode={isEditMode}
                onSelect={() => onSelectTicketType(ticketType.id)}
                onDelete={() => onDeleteTicketType(ticketType.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Nested accordion for Washroom Types (Men/Women)
function WashroomTypeAccordion({
  selectedWashroomSubType,
  isEditMode,
  onSelectWashroomSubType,
}: {
  selectedWashroomSubType: WashroomSubType | null;
  isEditMode: boolean;
  onSelectWashroomSubType: (subType: WashroomSubType) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Check if any washroom type is selected
  const hasSelectedWashroomType = selectedWashroomSubType !== null;

  return (
    <div className="mb-1">
      {/* Washroom Type Header - acts as accordion trigger */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
          isEditMode && 'hover:bg-secondary cursor-pointer',
          !isEditMode && 'opacity-60 cursor-default',
          hasSelectedWashroomType && 'bg-secondary/50'
        )}
      >
        <div className="w-6 h-6 rounded-md flex items-center justify-center bg-signage-washroom">
          <Bath className="w-4 h-4 text-white" />
        </div>
        <span className={cn('flex-1 text-left', hasSelectedWashroomType && 'text-foreground font-medium')}>
          Washroom
        </span>
        <span className="text-xs text-muted-foreground mr-1">
          {Object.keys(WASHROOM_SUB_TYPES).length}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-1 space-y-0.5">
          {Object.entries(WASHROOM_SUB_TYPES).map(([key, config]) => {
            const subType = key as WashroomSubType;
            const isSelected = selectedWashroomSubType === subType;

            return (
              <button
                key={subType}
                onClick={() => isEditMode && onSelectWashroomSubType(subType)}
                disabled={!isEditMode}
                className={cn(
                  'w-full flex items-center gap-3 pl-9 pr-3 py-1.5 rounded-lg text-sm transition-all',
                  isEditMode && 'hover:bg-secondary cursor-pointer',
                  !isEditMode && 'opacity-60 cursor-default',
                  isSelected && 'bg-secondary ring-1 ring-primary'
                )}
              >
                <div className="w-5 h-5 rounded flex items-center justify-center bg-signage-washroom">
                  <Bath className="w-3 h-3 text-white" />
                </div>
                <span className={cn('flex-1 text-left text-sm', isSelected && 'text-foreground font-medium')}>
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

export function AnnotationPanel({ 
  annotations,
  ticketTypes,
  ticketTypesLoading,
  onCreateTicketType,
  onDeleteTicketType,
}: AnnotationPanelProps) {
  const dispatch = useAppDispatch();
  const selectedCategory = useAppSelector(selectSelectedCategory);
  const selectedType = useAppSelector(selectSelectedType);
  const selectedTicketTypeId = useAppSelector(selectSelectedTicketTypeId);
  const selectedWashroomSubType = useAppSelector(selectSelectedWashroomSubType);
  const isEditMode = useAppSelector(selectIsEditMode);

  const handleSelect = (category: AnnotationCategory, type: AnnotationType) => {
    dispatch(selectAnnotationType({ category, type }));
  };

  const handleSelectTicketType = (ticketTypeId: string) => {
    dispatch(setSelectedTicketTypeId(ticketTypeId));
  };

  const handleSelectWashroomSubType = (subType: WashroomSubType) => {
    dispatch(setSelectedWashroomSubType(subType));
  };

  const handleAddTicketType = async (name: string) => {
    try {
      const newType = await onCreateTicketType(name);
      if (newType) {
        // Auto-select the new ticket type
        dispatch(setSelectedTicketTypeId(newType.id));
      }
    } catch (error) {
      console.error('Failed to create ticket type:', error);
    }
  };

  const handleDeleteTicketType = async (id: string) => {
    if (confirm('Delete this ticket type? Existing signs will keep their names.')) {
      try {
        await onDeleteTicketType(id);
        // Clear selection if deleted type was selected
        if (selectedTicketTypeId === id) {
          dispatch(setSelectedTicketTypeId(null));
        }
      } catch (error) {
        console.error('Failed to delete ticket type:', error);
      }
    }
  };

  const signageColors: Record<string, string> = {
    ticket: 'bg-signage-ticket',
    alcohol: 'bg-signage-alcohol',
    accessibility: 'bg-signage-accessibility',
    washroom: 'bg-signage-washroom',
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
        {/* Signages Section */}
        <CategorySection
          title="Signages"
          category="signage"
          types={
            // Exclude washroom from default types - it has its own accordion
            Object.fromEntries(
              Object.entries(SIGNAGE_TYPES).filter(([key]) => key !== 'washroom')
            ) as Record<string, { label: string; icon: string }>
          }
          selectedCategory={selectedCategory}
          selectedType={selectedType}
          onSelect={handleSelect}
          colorClass="text-signage"
          typeColorMap={signageColors}
          isEditMode={isEditMode}
        >
          {/* Nested Ticket Type Accordion */}
          <TicketTypeAccordion
            ticketTypes={ticketTypes}
            ticketTypesLoading={ticketTypesLoading}
            selectedTicketTypeId={selectedTicketTypeId}
            isEditMode={isEditMode}
            onSelectTicketType={handleSelectTicketType}
            onAddTicketType={handleAddTicketType}
            onDeleteTicketType={handleDeleteTicketType}
          />
          {/* Nested Washroom Type Accordion */}
          <WashroomTypeAccordion
            selectedWashroomSubType={selectedWashroomSubType}
            isEditMode={isEditMode}
            onSelectWashroomSubType={handleSelectWashroomSubType}
          />
        </CategorySection>

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

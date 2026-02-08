import {
  Circle,
  Minus,
  ArrowRight,
  LogOut,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Trash2,
  Settings,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
import { ColorPicker } from '@/components/ui/ColorPicker';
import { SignTypeDetailsSheet } from './SignTypeDetailsSheet';
import { SignSubTypeDetailsSheet } from './SignSubTypeDetailsSheet';
import { AddSignageTypeDialog } from './AddSignageTypeDialog';

type SignageType = Tables<'signage_types'>;
type SignageSubType = Tables<'signage_sub_types'>;

const DEFAULT_FALLBACK_COLOR = '#3B82F6';

// Get the actual color for a signage type (custom or fallback)
function getSignageColor(signageType: SignageType): string {
  if (signageType.color) return signageType.color;
  return DEFAULT_FALLBACK_COLOR;
}

// Map legacy Lucide icon names to emojis (for pre-migration data)
const LEGACY_ICON_TO_EMOJI: Record<string, string> = {
  Wine: '🚫',
  Bath: '🚻',
  Ticket: '🎫',
  Accessibility: '♿',
  Circle: '📍',
  Minus: '📍',
  ArrowRight: '📍',
  LogOut: '📍',
};

// Get the emoji icon for a signage type (handles both emoji and legacy Lucide names)
function getSignageEmoji(icon: string | null): string {
  if (!icon) return '📍';
  // If it's a known legacy Lucide icon name, convert to emoji
  if (LEGACY_ICON_TO_EMOJI[icon]) return LEGACY_ICON_TO_EMOJI[icon];
  // Otherwise it's already an emoji (or user-defined text)
  return icon;
}

// Get the actual color for a sub-type (custom, parent, or default)
function getSubTypeColor(subType: SignageSubType, parentType: SignageType): string {
  if (subType.color) return subType.color;
  return getSignageColor(parentType);
}

interface AnnotationPanelProps {
  annotations: Annotation[];
  signageTypes: SignageType[];
  signageTypesLoading: boolean;
  subTypesByParent: Record<string, SignageSubType[]>;
  subTypesLoading: boolean;
  onCreateSignageType: (name: string, icon?: string, color?: string) => Promise<SignageType | null>;
  onDeleteSignageType: (id: string) => Promise<void>;
  onCreateSubType: (signageTypeId: string, name: string) => Promise<SignageSubType | null>;
  onDeleteSubType: (signageTypeId: string, subTypeId: string) => Promise<void>;
  onUpdateSignageTypeColor: (id: string, color: string) => Promise<void>;
  onUpdateSignageTypeIcon: (id: string, icon: string | null) => Promise<void>;
  onUpdateSubTypeColor: (signageTypeId: string, subTypeId: string, color: string) => Promise<void>;
  onRenameSignageType: (id: string, newName: string) => Promise<void>;
  onUpdateSignageTypeNotes: (id: string, notes: string | null) => Promise<void>;
  onUpdateSignageTypeImage: (id: string, imageUrl: string | null) => Promise<void>;
  onUpdateSubTypeImage: (signageTypeId: string, subTypeId: string, imageUrl: string | null) => Promise<void>;
  onRenameSubType: (signageTypeId: string, subTypeId: string, newName: string) => Promise<void>;
}

// Lucide icons for non-signage categories (barriers, flow)
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Circle,
  Minus,
  ArrowRight,
  LogOut,
};

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
            const Icon = CATEGORY_ICONS[config.icon as keyof typeof CATEGORY_ICONS];
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
  parentType,
  isSelected,
  isEditMode,
  onSelect,
  onDelete,
  onEdit,
  onColorChange,
}: {
  subType: SignageSubType;
  signageTypeId: string;
  parentType: SignageType;
  isSelected: boolean;
  isEditMode: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onColorChange: (color: string) => void;
}) {
  const color = getSubTypeColor(subType, parentType);
  const emoji = getSignageEmoji(parentType.icon);
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <button
        onClick={() => isEditMode && onSelect()}
        disabled={!isEditMode}
        className={cn(
          'w-full flex items-center gap-2 pl-9 pr-3 py-1.5 rounded-lg text-sm transition-all',
          isEditMode && 'hover:bg-secondary cursor-pointer',
          !isEditMode && 'opacity-60 cursor-default',
          isSelected && 'bg-secondary ring-1 ring-primary'
        )}
      >
        {/* Color picker for sub-type */}
        {isEditMode && (
          <div onClick={(e) => e.stopPropagation()}>
            <ColorPicker
              color={subType.color}
              onChange={onColorChange}
              defaultColor={getSignageColor(parentType)}
            />
          </div>
        )}
        {!isEditMode && (
          <div
            className="h-4 w-4 rounded-full border border-border"
            style={{ backgroundColor: color }}
          />
        )}
        <div
          className="w-5 h-5 rounded flex items-center justify-center"
          style={{ backgroundColor: color }}
        >
          <span className="text-xs leading-none">{emoji}</span>
        </div>
        <span className={cn('flex-1 text-left text-sm', isSelected && 'text-foreground font-medium')}>
          {subType.name}
        </span>
      </button>
      {isEditMode && showActions && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Edit sub-type"
          >
            <Settings className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
            title="Delete sub-type"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
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
  onSelectType,
  onSelectSubType,
  onAddSubType,
  onDeleteSubType,
  onDeleteSignageType,
  onEdit,
  onEditSubType,
  onColorChange,
  onSubTypeColorChange,
}: {
  signageType: SignageType;
  subTypes: SignageSubType[];
  selectedSignageTypeId: string | null;
  selectedSignageSubTypeId: string | null;
  isEditMode: boolean;
  onSelectType: (signageTypeId: string) => void;
  onSelectSubType: (signageTypeId: string, subTypeId: string) => void;
  onAddSubType: (signageTypeId: string, name: string) => void;
  onDeleteSubType: (signageTypeId: string, subTypeId: string) => void;
  onDeleteSignageType: (id: string) => void;
  onEdit: () => void;
  onEditSubType: (subType: SignageSubType) => void;
  onColorChange: (color: string) => void;
  onSubTypeColorChange: (subTypeId: string, color: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingSubType, setIsAddingSubType] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Directly selected as the active placement tool (parent only, no sub-type)
  const isDirectlySelected = selectedSignageTypeId === signageType.id && !selectedSignageSubTypeId;
  // Highlighted because a child sub-type is selected
  const isChildSelected = selectedSignageTypeId === signageType.id && !!selectedSignageSubTypeId;
  const color = getSignageColor(signageType);
  const emoji = getSignageEmoji(signageType.icon);

  const handleAdd = (name: string) => {
    onAddSubType(signageType.id, name);
    setIsAddingSubType(false);
  };

  return (
    <div
      className="mb-1"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Signage Type Header */}
      <div className="relative">
        <button
          onClick={() => {
            if (isEditMode) {
              onSelectType(signageType.id);
              // Auto-expand when selecting
              if (!isExpanded) setIsExpanded(true);
            }
          }}
          disabled={!isEditMode}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
            isEditMode && 'hover:bg-secondary cursor-pointer',
            !isEditMode && 'opacity-60 cursor-default',
            isDirectlySelected && 'bg-secondary ring-1 ring-primary',
            isChildSelected && 'bg-secondary/50'
          )}
        >
          {/* Color picker for signage type */}
          {isEditMode && (
            <div onClick={(e) => e.stopPropagation()}>
              <ColorPicker
                color={signageType.color}
                onChange={onColorChange}
                defaultColor={DEFAULT_FALLBACK_COLOR}
              />
            </div>
          )}
          {!isEditMode && (
            <div
              className="h-5 w-5 rounded-full border border-border"
              style={{ backgroundColor: color }}
            />
          )}
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ backgroundColor: color }}
          >
            <span className="text-sm leading-none">{emoji}</span>
          </div>
          <span className={cn('flex-1 text-left', (isDirectlySelected || isChildSelected) && 'text-foreground font-medium')}>
            {signageType.name}
          </span>
          {/* Show actions on hover, count otherwise */}
          {isEditMode && showActions ? (
            <span className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Edit signage type"
              >
                <Settings className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSignageType(signageType.id);
                }}
                className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                title="Delete signage type"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground mr-1">
              {subTypes.length}
            </span>
          )}
          <span
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 rounded hover:bg-secondary/80 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </span>
        </button>
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
                parentType={signageType}
                isSelected={selectedSignageTypeId === signageType.id && selectedSignageSubTypeId === subType.id}
                isEditMode={isEditMode}
                onSelect={() => onSelectSubType(signageType.id, subType.id)}
                onDelete={() => onDeleteSubType(signageType.id, subType.id)}
                onEdit={() => onEditSubType(subType)}
                onColorChange={(color) => onSubTypeColorChange(subType.id, color)}
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
  onSelectType,
  onSelectSubType,
  onAddSignageType,
  onDeleteSignageType,
  onAddSubType,
  onDeleteSubType,
  onUpdateSignageTypeColor,
  onUpdateSubTypeColor,
  onEditSignageType,
  onEditSubType,
}: {
  signageTypes: SignageType[];
  signageTypesLoading: boolean;
  subTypesByParent: Record<string, SignageSubType[]>;
  subTypesLoading: boolean;
  selectedSignageTypeId: string | null;
  selectedSignageSubTypeId: string | null;
  isEditMode: boolean;
  onSelectType: (signageTypeId: string) => void;
  onSelectSubType: (signageTypeId: string, subTypeId: string) => void;
  onAddSignageType: (data: { name: string; icon?: string; color?: string; autoSubTypes?: string[] }) => void;
  onDeleteSignageType: (id: string) => void;
  onAddSubType: (signageTypeId: string, name: string) => void;
  onDeleteSubType: (signageTypeId: string, subTypeId: string) => void;
  onUpdateSignageTypeColor: (id: string, color: string) => void;
  onUpdateSubTypeColor: (signageTypeId: string, subTypeId: string, color: string) => void;
  onEditSignageType: (signageType: SignageType) => void;
  onEditSubType: (subType: SignageSubType, parent: SignageType) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleAdd = (data: { name: string; icon?: string; color?: string; autoSubTypes?: string[] }) => {
    onAddSignageType(data);
    setIsAddDialogOpen(false);
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
                onSelectType={onSelectType}
                onSelectSubType={onSelectSubType}
                onAddSubType={onAddSubType}
                onDeleteSubType={onDeleteSubType}
                onDeleteSignageType={onDeleteSignageType}
                onEdit={() => onEditSignageType(signageType)}
                onEditSubType={(subType) => onEditSubType(subType, signageType)}
                onColorChange={(color) => onUpdateSignageTypeColor(signageType.id, color)}
                onSubTypeColorChange={(subTypeId, color) => onUpdateSubTypeColor(signageType.id, subTypeId, color)}
              />
            ))
          )}

          {/* Add Signage Type */}
          {isEditMode && (
            <>
              <button
                onClick={() => setIsAddDialogOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-secondary cursor-pointer text-muted-foreground hover:text-foreground border border-dashed border-muted-foreground/30"
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center border border-dashed border-muted-foreground/50">
                  <Plus className="w-4 h-4" />
                </div>
                <span>Add Signage Type</span>
              </button>
              <AddSignageTypeDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onSubmit={handleAdd}
                existingNames={signageTypes.map((t) => t.name)}
              />
            </>
          )}
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
  onUpdateSignageTypeColor,
  onUpdateSignageTypeIcon,
  onUpdateSubTypeColor,
  onRenameSignageType,
  onUpdateSignageTypeNotes,
  onUpdateSignageTypeImage,
  onUpdateSubTypeImage,
  onRenameSubType,
}: AnnotationPanelProps) {
  const dispatch = useAppDispatch();
  const selectedCategory = useAppSelector(selectSelectedCategory);
  const selectedType = useAppSelector(selectSelectedType);
  const selectedSignageTypeId = useAppSelector(selectSelectedSignageTypeId);
  const selectedSignageSubTypeId = useAppSelector(selectSelectedSignageSubTypeId);
  const isEditMode = useAppSelector(selectIsEditMode);

  // Sheet state for editing signage types and sub-types
  const [editingType, setEditingType] = useState<SignageType | null>(null);
  const [editingSubType, setEditingSubType] = useState<{ subType: SignageSubType; parent: SignageType } | null>(null);

  const handleSelect = (category: AnnotationCategory, type: AnnotationType) => {
    dispatch(selectAnnotationType({ category, type }));
  };

  const handleSelectType = (signageTypeId: string) => {
    dispatch(setSelectedSignageTypeId(signageTypeId));
  };

  const handleSelectSubType = (signageTypeId: string, subTypeId: string) => {
    dispatch(setSelectedSignageSubTypeId({ signageTypeId, subTypeId }));
  };

  const handleAddSignageType = async (data: { name: string; icon?: string; color?: string; autoSubTypes?: string[] }) => {
    try {
      const newType = await onCreateSignageType(data.name, data.icon, data.color);
      if (newType) {
        // Auto-create sub-types if specified (e.g. Washroom -> Men, Women)
        if (data.autoSubTypes?.length) {
          for (const subTypeName of data.autoSubTypes) {
            await onCreateSubType(newType.id, subTypeName);
          }
        }
        // After creating, select the new type
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
          onSelectType={handleSelectType}
          onSelectSubType={handleSelectSubType}
          onAddSignageType={handleAddSignageType}
          onDeleteSignageType={handleDeleteSignageType}
          onAddSubType={handleAddSubType}
          onDeleteSubType={handleDeleteSubType}
          onUpdateSignageTypeColor={onUpdateSignageTypeColor}
          onUpdateSubTypeColor={onUpdateSubTypeColor}
          onEditSignageType={setEditingType}
          onEditSubType={(subType, parent) => setEditingSubType({ subType, parent })}
        />

        {/* Coming soon - Barriers */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <div className="opacity-40 pointer-events-none select-none">
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
              <div className="absolute inset-0 cursor-not-allowed" />
            </div>
          </TooltipTrigger>
          <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>
      </div>

      {/* Signage Type Details Sheet */}
      <SignTypeDetailsSheet
        signageType={editingType}
        open={editingType !== null}
        onOpenChange={(open) => { if (!open) setEditingType(null); }}
        onRename={onRenameSignageType}
        onUpdateNotes={onUpdateSignageTypeNotes}
        onUpdateColor={onUpdateSignageTypeColor}
        onUpdateIcon={onUpdateSignageTypeIcon}
        onUpdateImage={onUpdateSignageTypeImage}
        annotationCount={
          editingType
            ? annotations.filter((a) => a.category === 'signage' && a.signageTypeName === editingType.name).length
            : 0
        }
      />

      {/* Sub-Type Details Sheet */}
      <SignSubTypeDetailsSheet
        subType={editingSubType?.subType ?? null}
        parentType={editingSubType?.parent ?? null}
        open={editingSubType !== null}
        onOpenChange={(open) => { if (!open) setEditingSubType(null); }}
        onRename={onRenameSubType}
        onUpdateColor={onUpdateSubTypeColor}
        onUpdateImage={onUpdateSubTypeImage}
        annotationCount={
          editingSubType
            ? annotations.filter(
                (a) =>
                  a.category === 'signage' &&
                  a.signageTypeName === editingSubType.parent.name &&
                  a.signageSubTypeName === editingSubType.subType.name
              ).length
            : 0
        }
      />
    </div>
  );
}

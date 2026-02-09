import { useState } from 'react';
import { Plus, Calendar, Trash2, MoreHorizontal, Edit2, Loader2, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tables } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type Event = Tables<'events'>;

interface EventsPanelProps {
  events: Event[];
  activeEventId: string | null;
  onSelectEvent: (id: string) => void;
  onCreateEvent: (name: string) => void;
  onDeleteEvent: (id: string) => void;
  onRenameEvent: (id: string, name: string) => void;
  onReorderEvents: (reorderedEvents: Event[]) => void;
  loading?: boolean;
}

interface SortableEventItemProps {
  event: Event;
  isActive: boolean;
  onSelect: () => void;
  onStartRename: (event: Event) => void;
  onDelete: (id: string) => void;
  formatDate: (dateString: string) => string;
}

function SortableEventItem({
  event,
  isActive,
  onSelect,
  onStartRename,
  onDelete,
  formatDate,
}: SortableEventItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-1 px-2 py-2 rounded-lg cursor-pointer transition-all',
        isDragging && 'opacity-50 z-50 shadow-lg',
        isActive
          ? 'bg-primary/20 border border-primary/30'
          : 'hover:bg-secondary border border-transparent'
      )}
      onClick={onSelect}
    >
      <button
        className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{event.name}</p>
        <p className="text-xs text-muted-foreground">
          Created {formatDate(event.created_at)}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onStartRename(event)}>
            <Edit2 className="w-4 h-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => onDelete(event.id)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function EventsPanel({
  events,
  activeEventId,
  onSelectEvent,
  onCreateEvent,
  onDeleteEvent,
  onRenameEvent,
  onReorderEvents,
  loading = false,
}: EventsPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [renamingEventId, setRenamingEventId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleCreate = () => {
    if (newEventName.trim()) {
      onCreateEvent(newEventName.trim());
      setNewEventName('');
      setIsCreating(false);
    }
  };

  const handleRename = () => {
    if (renamingEventId && renameValue.trim()) {
      onRenameEvent(renamingEventId, renameValue.trim());
      setRenamingEventId(null);
      setRenameValue('');
    }
  };

  const startRename = (event: Event) => {
    setRenamingEventId(event.id);
    setRenameValue(event.name);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDragEnd = (dragEvent: DragEndEvent) => {
    const { active, over } = dragEvent;
    if (!over || active.id === over.id) return;

    const oldIndex = events.findIndex((e) => e.id === active.id);
    const newIndex = events.findIndex((e) => e.id === over.id);
    const reordered = arrayMove(events, oldIndex, newIndex);
    onReorderEvents(reordered);
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Events
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsCreating(true)}
            disabled={loading}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {events.length} event{events.length !== 1 && 's'}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No events yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Create an event to start annotating floor plans
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={events.map((e) => e.id)}
                strategy={verticalListSortingStrategy}
              >
                {events.map((event) => (
                  <SortableEventItem
                    key={event.id}
                    event={event}
                    isActive={activeEventId === event.id}
                    onSelect={() => onSelectEvent(event.id)}
                    onStartRename={startRename}
                    onDelete={onDeleteEvent}
                    formatDate={formatDate}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </ScrollArea>

      {/* Create Event Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Event name"
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newEventName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Event Dialog */}
      <Dialog open={!!renamingEventId} onOpenChange={() => setRenamingEventId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Event</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Event name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingEventId(null)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

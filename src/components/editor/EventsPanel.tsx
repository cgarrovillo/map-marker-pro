import { useState } from 'react';
import { Plus, Calendar, Trash2, MoreHorizontal, Edit2 } from 'lucide-react';
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
import { FloorPlanEvent } from '@/types/annotations';
import { cn } from '@/lib/utils';

interface EventsPanelProps {
  events: FloorPlanEvent[];
  activeEventId: string | null;
  onSelectEvent: (id: string) => void;
  onCreateEvent: (name: string) => void;
  onDeleteEvent: (id: string) => void;
  onRenameEvent: (id: string, name: string) => void;
}

export function EventsPanel({
  events,
  activeEventId,
  onSelectEvent,
  onCreateEvent,
  onDeleteEvent,
  onRenameEvent,
}: EventsPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [renamingEventId, setRenamingEventId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

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

  const startRename = (event: FloorPlanEvent) => {
    setRenamingEventId(event.id);
    setRenameValue(event.name);
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
          {events.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No events yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Create an event to start annotating floor plans
              </p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className={cn(
                  'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all',
                  activeEventId === event.id
                    ? 'bg-primary/20 border border-primary/30'
                    : 'hover:bg-secondary border border-transparent'
                )}
                onClick={() => onSelectEvent(event.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.annotations.length} annotation
                    {event.annotations.length !== 1 && 's'}
                    {event.image && ' • Has floor plan'}
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
                    <DropdownMenuItem onClick={() => startRename(event)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDeleteEvent(event.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
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

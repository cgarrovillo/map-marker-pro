import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Tables } from '@/integrations/supabase/types';
import { Hash, Tag } from 'lucide-react';

type SignageType = Tables<'signage_types'>;
type SignageSubType = Tables<'signage_sub_types'>;

interface SignSubTypeDetailsSheetProps {
  subType: SignageSubType | null;
  parentType: SignageType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (signageTypeId: string, subTypeId: string, newName: string) => Promise<void>;
  onUpdateColor: (signageTypeId: string, subTypeId: string, color: string) => Promise<void>;
  annotationCount: number;
}

export function SignSubTypeDetailsSheet({
  subType,
  parentType,
  open,
  onOpenChange,
  onRename,
  onUpdateColor,
  annotationCount,
}: SignSubTypeDetailsSheetProps) {
  const [name, setName] = useState('');

  // Ref to hold latest name so the close handler always sees current state
  const nameRef = useRef(name);
  nameRef.current = name;

  // Sync local state when subType changes
  useEffect(() => {
    if (subType) {
      setName(subType.name);
    }
  }, [subType]);

  // Flush any pending name edit before closing
  const flushPendingChanges = useCallback(() => {
    if (!subType || !parentType) return;

    const trimmedName = nameRef.current.trim();
    if (trimmedName && trimmedName !== subType.name) {
      onRename(parentType.id, subType.id, trimmedName);
    }
  }, [subType, parentType, onRename]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      flushPendingChanges();
    }
    onOpenChange(nextOpen);
  }, [flushPendingChanges, onOpenChange]);

  if (!subType || !parentType) return null;

  const parentColor = parentType.color || '#3B82F6';
  const currentColor = subType.color || parentColor;

  const handleNameBlur = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== subType.name) {
      onRename(parentType.id, subType.id, trimmed);
    } else if (!trimmed) {
      setName(subType.name);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setName(subType.name);
      e.currentTarget.blur();
    }
  };

  const handleColorChange = (color: string) => {
    onUpdateColor(parentType.id, subType.id, color);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{subType.name}</SheetTitle>
          <SheetDescription>
            Edit settings for this sub-type. Changes apply to all signs of this sub-type.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Read-only context */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Tag className="h-4 w-4" />
              <span>Parent type: {parentType.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Hash className="h-4 w-4" />
              <span>{annotationCount} sign{annotationCount !== 1 ? 's' : ''} placed</span>
            </div>
          </div>

          <Separator />

          {/* Editable fields */}
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="subtype-name">Name</Label>
              <Input
                id="subtype-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={handleNameKeyDown}
                placeholder="Sub-type name"
              />
              <p className="text-xs text-muted-foreground">
                Press Enter to save, Escape to cancel
              </p>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <ColorPicker
                  color={subType.color}
                  onChange={handleColorChange}
                  defaultColor={parentColor}
                />
                <span className="text-sm text-muted-foreground font-mono">
                  {currentColor}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Inherits from parent type when not set
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

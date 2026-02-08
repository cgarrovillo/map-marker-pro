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
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { SignImageUpload } from './SignImageUpload';
import { Tables } from '@/integrations/supabase/types';
import { Hash } from 'lucide-react';
import { useSignImageUpload } from '@/hooks/useSignImageUpload';

type SignageType = Tables<'signage_types'>;

// Map legacy Lucide icon names to emojis (for pre-migration data)
const LEGACY_ICON_TO_EMOJI: Record<string, string> = {
  Wine: '🚫', Bath: '🚻', Ticket: '🎫', Accessibility: '♿',
};

function resolveEmoji(icon: string | null): string {
  if (!icon) return '📍';
  return LEGACY_ICON_TO_EMOJI[icon] ?? icon;
}

interface SignTypeDetailsSheetProps {
  signageType: SignageType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (id: string, newName: string) => Promise<void>;
  onUpdateNotes: (id: string, notes: string | null) => Promise<void>;
  onUpdateColor: (id: string, color: string) => Promise<void>;
  onUpdateIcon: (id: string, icon: string | null) => Promise<void>;
  onUpdateImage: (id: string, imageUrl: string | null) => Promise<void>;
  annotationCount: number;
}

export function SignTypeDetailsSheet({
  signageType,
  open,
  onOpenChange,
  onRename,
  onUpdateNotes,
  onUpdateColor,
  onUpdateIcon,
  onUpdateImage,
  annotationCount,
}: SignTypeDetailsSheetProps) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [emoji, setEmoji] = useState('');
  const { uploading, uploadImage, deleteImage } = useSignImageUpload();

  // Refs to hold latest local values so the close handler always sees current state
  const nameRef = useRef(name);
  const notesRef = useRef(notes);
  nameRef.current = name;
  notesRef.current = notes;

  // Ref to hold latest emoji so the close handler always sees current state
  const emojiRef = useRef(emoji);
  emojiRef.current = emoji;

  // Sync local state when signageType changes
  useEffect(() => {
    if (signageType) {
      setName(signageType.name);
      setNotes(signageType.notes ?? '');
      setEmoji(resolveEmoji(signageType.icon));
    }
  }, [signageType]);

  // Flush any pending edits before closing
  const flushPendingChanges = useCallback(() => {
    if (!signageType) return;

    const trimmedName = nameRef.current.trim();
    if (trimmedName && trimmedName !== signageType.name) {
      onRename(signageType.id, trimmedName);
    }

    const trimmedNotes = notesRef.current.trim();
    const newNotes = trimmedNotes || null;
    if (newNotes !== (signageType.notes ?? null)) {
      onUpdateNotes(signageType.id, newNotes);
    }

    const currentEmoji = emojiRef.current.trim() || null;
    if (currentEmoji !== (signageType.icon ?? null)) {
      onUpdateIcon(signageType.id, currentEmoji);
    }
  }, [signageType, onRename, onUpdateNotes, onUpdateIcon]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      flushPendingChanges();
    }
    onOpenChange(nextOpen);
  }, [flushPendingChanges, onOpenChange]);

  if (!signageType) return null;

  const currentColor = signageType.color || '#3B82F6';
  const currentImageUrl = signageType.image_url ?? undefined;

  const handleNameBlur = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== signageType.name) {
      onRename(signageType.id, trimmed);
    } else if (!trimmed) {
      setName(signageType.name);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setName(signageType.name);
      e.currentTarget.blur();
    }
  };

  const handleNotesBlur = () => {
    const trimmed = notes.trim();
    const newNotes = trimmed || null;
    if (newNotes !== (signageType.notes ?? null)) {
      onUpdateNotes(signageType.id, newNotes);
    }
  };

  const handleColorChange = (color: string) => {
    onUpdateColor(signageType.id, color);
  };

  const handleImageUpload = async (file: File) => {
    // Delete old file from storage if replacing
    if (currentImageUrl) {
      await deleteImage(currentImageUrl);
    }

    const url = await uploadImage(signageType.id, 'sign-types', file);
    if (url) {
      // Optimistic DB + state update — UI reflects immediately
      await onUpdateImage(signageType.id, url);
    }
  };

  const handleImageRemove = async () => {
    if (currentImageUrl) {
      await deleteImage(currentImageUrl);
      await onUpdateImage(signageType.id, null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{signageType.name}</SheetTitle>
          <SheetDescription>
            Edit settings for this signage type. Changes apply to all signs of this type.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Annotation count */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Hash className="h-4 w-4" />
            <span>{annotationCount} sign{annotationCount !== 1 ? 's' : ''} placed</span>
          </div>

          <Separator />

          {/* Editable fields */}
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="type-name">Name</Label>
              <Input
                id="type-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={handleNameKeyDown}
                placeholder="Signage type name"
              />
              <p className="text-xs text-muted-foreground">
                Press Enter to save, Escape to cancel
              </p>
            </div>

            {/* Emoji Icon */}
            <div className="space-y-2">
              <Label htmlFor="type-emoji">Emoji Icon</Label>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: currentColor }}
                >
                  {emoji || '📍'}
                </div>
                <Input
                  id="type-emoji"
                  value={emoji}
                  onChange={(e) => {
                    // Allow only emoji-length input (grapheme clusters)
                    const val = e.target.value;
                    if ([...val].length <= 2) {
                      setEmoji(val);
                    }
                  }}
                  onBlur={() => {
                    const trimmed = emoji.trim();
                    const newIcon = trimmed || null;
                    if (newIcon !== (signageType.icon ?? null)) {
                      onUpdateIcon(signageType.id, newIcon);
                    }
                  }}
                  placeholder="📍"
                  className="w-20 text-center text-lg"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Choose an emoji to represent this signage type
              </p>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <ColorPicker
                  color={signageType.color}
                  onChange={handleColorChange}
                  defaultColor="#3B82F6"
                />
                <span className="text-sm text-muted-foreground font-mono">
                  {currentColor}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Used as the default color for all sub-types
              </p>
            </div>

            <Separator />

            {/* Sign Image */}
            <div className="space-y-2">
              <Label>Sign Image</Label>
              <p className="text-xs text-muted-foreground">
                Default image for all {signageType.name} signs (sub-types can override)
              </p>
              <SignImageUpload
                imageUrl={currentImageUrl}
                uploading={uploading}
                onUpload={handleImageUpload}
                onRemove={handleImageRemove}
                alt={`${signageType.name} sign`}
              />
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="type-notes">Notes</Label>
              <p className="text-xs text-muted-foreground">
                Shared across all {signageType.name} annotations
              </p>
              <Textarea
                id="type-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder={`Notes for all ${signageType.name} signs...`}
                rows={4}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

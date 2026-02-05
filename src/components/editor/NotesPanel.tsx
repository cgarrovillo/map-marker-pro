import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Annotation } from '@/types/annotations';
import { Tables } from '@/integrations/supabase/types';

type SignageType = Tables<'signage_types'>;

interface NotesPanelProps {
  annotation: Annotation;
  signageType: SignageType | null;
  onUpdateAnnotation: (updates: Partial<Annotation>) => void;
  onUpdateSignageTypeNotes: (id: string, notes: string | null) => void;
}

export function NotesPanel({
  annotation,
  signageType,
  onUpdateAnnotation,
  onUpdateSignageTypeNotes,
}: NotesPanelProps) {
  // Local state for controlled inputs
  const [signageTypeNotes, setSignageTypeNotes] = useState<string>(
    signageType?.notes || ''
  );
  const [annotationNotes, setAnnotationNotes] = useState<string>(
    annotation.notes || ''
  );

  // Sync signage type notes when signageType changes
  useEffect(() => {
    setSignageTypeNotes(signageType?.notes || '');
  }, [signageType?.notes, signageType?.id]);

  // Sync annotation notes when annotation changes
  useEffect(() => {
    setAnnotationNotes(annotation.notes || '');
  }, [annotation.notes, annotation.id]);

  const handleSignageTypeNotesBlur = () => {
    if (!signageType) return;
    const trimmedNotes = signageTypeNotes.trim();
    const newNotes = trimmedNotes || null;
    
    // Only update if changed
    if (newNotes !== signageType.notes) {
      onUpdateSignageTypeNotes(signageType.id, newNotes);
    }
  };

  const handleAnnotationNotesBlur = () => {
    const trimmedNotes = annotationNotes.trim();
    const newNotes = trimmedNotes || undefined;
    
    // Only update if changed
    if (newNotes !== annotation.notes) {
      onUpdateAnnotation({ notes: newNotes });
    }
  };

  return (
    <div className="border-t border-border">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold">Notes</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add notes to this sign
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Signage Type Notes - Only show for ticket types with a signage type */}
        {signageType && annotation.type === 'ticket' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="signage-type-notes" className="text-xs text-muted-foreground">
                {signageType.name} Notes
              </Label>
              <Textarea
                id="signage-type-notes"
                value={signageTypeNotes}
                onChange={(e) => setSignageTypeNotes(e.target.value)}
                onBlur={handleSignageTypeNotesBlur}
                placeholder={`Notes for all ${signageType.name} signs...`}
                className="min-h-[80px] resize-none text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Shared across all {signageType.name} annotations
              </p>
            </div>
            <Separator />
          </>
        )}

        {/* Annotation-specific Notes */}
        <div className="space-y-2">
          <Label htmlFor="annotation-notes" className="text-xs text-muted-foreground">
            Sign Notes
          </Label>
          <Textarea
            id="annotation-notes"
            value={annotationNotes}
            onChange={(e) => setAnnotationNotes(e.target.value)}
            onBlur={handleAnnotationNotesBlur}
            placeholder="Notes specific to this sign..."
            className="min-h-[80px] resize-none text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Specific to this annotation only
          </p>
        </div>
      </div>
    </div>
  );
}

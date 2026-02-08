import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { AssetStatusBadge } from './AssetStatusBadge';
import {
  SIGN_HOLDERS,
  DEFAULT_SIGN_HOLDER,
  ORDER_STATUSES,
} from '@/types/annotations';
import type {
  Annotation,
  OrderStatus,
  SignHolderType,
} from '@/types/annotations';
import { Tables } from '@/integrations/supabase/types';
import { Calendar, ImageIcon, StickyNote } from 'lucide-react';

type SignageTypeRow = Tables<'signage_types'>;

interface AssetDetailSheetProps {
  annotation: Annotation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<void>;
  signageTypes?: SignageTypeRow[];
}

function getDisplayLabel(annotation: Annotation): string {
  if (annotation.label) return annotation.label;
  const parts: string[] = [];
  if (annotation.signageTypeName) parts.push(annotation.signageTypeName);
  if (annotation.signageSubTypeName) parts.push(annotation.signageSubTypeName);
  if (parts.length > 0) return parts.join(' / ');
  return 'Signage Annotation';
}

export function AssetDetailSheet({
  annotation,
  open,
  onOpenChange,
  onUpdateAnnotation,
  signageTypes = [],
}: AssetDetailSheetProps) {
  const [notes, setNotes] = useState('');

  // Sync local state when annotation changes
  useEffect(() => {
    if (annotation) {
      setNotes(annotation.notes ?? '');
    }
  }, [annotation]);

  if (!annotation) return null;

  const effectiveStatus: OrderStatus = annotation.orderStatus ?? 'not_ordered';
  const effectiveHolder: SignHolderType = annotation.signHolder || DEFAULT_SIGN_HOLDER;

  const handleNotesBlur = () => {
    if (notes !== (annotation.notes ?? '')) {
      onUpdateAnnotation(annotation.id, { notes: notes || undefined });
    }
  };

  const handleStatusChange = (value: string) => {
    onUpdateAnnotation(annotation.id, { orderStatus: value as OrderStatus });
  };

  const handleHolderChange = (value: string) => {
    onUpdateAnnotation(annotation.id, {
      signHolder: value as SignHolderType,
    });
  };

  const createdDate = new Date(annotation.createdAt).toLocaleDateString(
    undefined,
    { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{getDisplayLabel(annotation)}</SheetTitle>
          <SheetDescription>
            Edit details for this specific sign placement
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Read-only context */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Placed {createdDate}</span>
          </div>

          {/* Parent signage type notes (read-only) */}
          {(() => {
            const parentType = annotation.signageTypeName
              ? signageTypes.find((t) => t.name === annotation.signageTypeName)
              : undefined;
            if (!parentType?.notes) return null;
            return (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">
                    {parentType.name} Notes
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground bg-secondary/50 rounded-md px-3 py-2 whitespace-pre-wrap">
                  {parentType.notes}
                </p>
              </div>
            );
          })()}

          {/* Sign side image previews */}
          {(annotation.side1?.imageUrl || annotation.side2?.imageUrl) && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Sign Images
              </Label>
              <div className="flex gap-3">
                {annotation.side1?.imageUrl && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Side 1</p>
                    <img
                      src={annotation.side1.imageUrl}
                      alt="Side 1"
                      className="w-24 h-24 object-cover rounded-md border"
                    />
                  </div>
                )}
                {annotation.side2?.imageUrl && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Side 2</p>
                    <img
                      src={annotation.side2.imageUrl}
                      alt="Side 2"
                      className="w-24 h-24 object-cover rounded-md border"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {!annotation.side1?.imageUrl && !annotation.side2?.imageUrl && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              <span>No sign images uploaded</span>
            </div>
          )}

          <Separator />

          {/* Editable fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Holder Type</Label>
              <Select
                value={effectiveHolder}
                onValueChange={handleHolderChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select holder type" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SIGN_HOLDERS) as SignHolderType[]).map(
                    (holder) => (
                      <SelectItem key={holder} value={holder}>
                        {SIGN_HOLDERS[holder].label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Order Status</Label>
              <Select value={effectiveStatus} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue>
                    <AssetStatusBadge status={effectiveStatus} />
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ORDER_STATUSES) as OrderStatus[]).map(
                    (status) => (
                      <SelectItem key={status} value={status}>
                        <AssetStatusBadge status={status} />
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset-notes">Placement Notes</Label>
              <p className="text-xs text-muted-foreground">
                Notes specific to this sign placement only
              </p>
              <Textarea
                id="asset-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Add notes for this specific placement..."
                rows={4}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

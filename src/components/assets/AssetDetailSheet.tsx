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
  SIGN_STATUSES,
  STAND_STATUSES,
} from '@/types/annotations';
import type {
  Annotation,
  SignHolderType,
  SignSide,
  SignStatus,
  StandStatus,
} from '@/types/annotations';
import { Tables } from '@/integrations/supabase/types';
import { Calendar, ImageIcon, StickyNote } from 'lucide-react';

type SignageTypeRow = Tables<'signage_types'>;
type SignageSubTypeRow = Tables<'signage_sub_types'>;

export type DetailSheetMode = 'sign' | 'stand';

interface AssetDetailSheetProps {
  annotation: Annotation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<void>;
  signageTypes?: SignageTypeRow[];
  subTypesByParent?: Record<string, SignageSubTypeRow[]>;
  mode: DetailSheetMode;
}

function formatSideType(side: SignSide | undefined): string | null {
  if (!side?.signageTypeName) return null;
  if (side.signageSubTypeName) return `${side.signageTypeName} / ${side.signageSubTypeName}`;
  return side.signageTypeName;
}

function getSide1Data(annotation: Annotation): SignSide | undefined {
  if (annotation.side1) {
    return {
      ...annotation.side1,
      signageTypeName: annotation.side1.signageTypeName ?? annotation.signageTypeName,
      signageSubTypeName: annotation.side1.signageSubTypeName ?? annotation.signageSubTypeName,
    };
  }
  if (annotation.signageTypeName) {
    return {
      signageTypeName: annotation.signageTypeName,
      signageSubTypeName: annotation.signageSubTypeName,
    };
  }
  return undefined;
}

function getDisplayLabel(annotation: Annotation): string {
  if (annotation.label) return annotation.label;
  const s1 = formatSideType(getSide1Data(annotation));
  const s2 = formatSideType(annotation.side2);
  if (s1 && s2) return `${s1} | ${s2}`;
  if (s1) return s1;
  if (s2) return s2;
  return 'Sign';
}

function resolveSignImage(
  sideData: SignSide | undefined,
  signageTypes: SignageTypeRow[],
  subTypesByParent: Record<string, SignageSubTypeRow[]>,
): string | undefined {
  if (!sideData?.signageTypeName) return undefined;
  const parentType = signageTypes.find((t) => t.name === sideData.signageTypeName);
  if (!parentType) return undefined;
  if (sideData.signageSubTypeName) {
    const subTypes = subTypesByParent[parentType.id] || [];
    const subType = subTypes.find((st) => st.name === sideData.signageSubTypeName);
    if (subType?.image_url) return subType.image_url;
  }
  return parentType.image_url ?? undefined;
}

// ---------------------------------------------------------------------------
// Effective status helpers
// ---------------------------------------------------------------------------

function getEffectiveSignStatus(side: SignSide | undefined, annotation: Annotation): SignStatus {
  if (side?.signStatus) return side.signStatus;
  const legacy = annotation.orderStatus;
  if (!legacy) return 'not_ordered';
  const map: Record<string, SignStatus> = {
    not_ordered: 'not_ordered',
    ordered: 'ordered',
    shipped: 'shipped',
    installed: 'installed',
  };
  return map[legacy] ?? 'not_ordered';
}

function getEffectiveStandStatus(annotation: Annotation): StandStatus {
  if (annotation.standStatus) return annotation.standStatus;
  const legacy = annotation.orderStatus;
  if (!legacy) return 'not_ordered';
  const map: Record<string, StandStatus> = {
    not_ordered: 'not_ordered',
    ordered: 'ordered',
    shipped: 'shipped',
    installed: 'delivered',
  };
  return map[legacy] ?? 'not_ordered';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AssetDetailSheet({
  annotation,
  open,
  onOpenChange,
  onUpdateAnnotation,
  signageTypes = [],
  subTypesByParent = {},
  mode,
}: AssetDetailSheetProps) {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (annotation) {
      setNotes(annotation.notes ?? '');
    }
  }, [annotation]);

  if (!annotation) return null;

  const effectiveHolder: SignHolderType = annotation.signHolder || DEFAULT_SIGN_HOLDER;

  const handleNotesBlur = () => {
    if (notes !== (annotation.notes ?? '')) {
      onUpdateAnnotation(annotation.id, { notes: notes || undefined });
    }
  };

  const createdDate = new Date(annotation.createdAt).toLocaleDateString(
    undefined,
    { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  );

  const side1 = getSide1Data(annotation);
  const side2 = annotation.side2;
  const side1ImageUrl = resolveSignImage(side1, signageTypes, subTypesByParent);
  const side2ImageUrl = resolveSignImage(side2, signageTypes, subTypesByParent);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{getDisplayLabel(annotation)}</SheetTitle>
          <SheetDescription>
            {mode === 'sign'
              ? 'View and edit sign face details'
              : 'View and edit stand details'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Read-only context */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Placed {createdDate}</span>
          </div>

          {/* Parent signage type notes */}
          {(() => {
            const parentNames = new Set<string>();
            if (side1?.signageTypeName) parentNames.add(side1.signageTypeName);
            if (side2?.signageTypeName) parentNames.add(side2.signageTypeName);

            const noteBlocks: React.ReactNode[] = [];
            parentNames.forEach((name) => {
              const parentType = signageTypes.find((t) => t.name === name);
              if (parentType?.notes) {
                noteBlocks.push(
                  <div key={name} className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
                      <Label className="text-xs text-muted-foreground">
                        {parentType.name} Notes
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground bg-secondary/50 rounded-md px-3 py-2 whitespace-pre-wrap">
                      {parentType.notes}
                    </p>
                  </div>,
                );
              }
            });
            return noteBlocks.length > 0 ? <>{noteBlocks}</> : null;
          })()}

          {/* Sign side previews — shown in both modes for context */}
          {(() => {
            const s1Type = formatSideType(side1);
            const s2Type = formatSideType(side2);
            const hasImages = side1ImageUrl || side2ImageUrl;
            const hasTypes = s1Type || s2Type;

            if (!hasImages && !hasTypes) {
              return (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ImageIcon className="h-4 w-4" />
                  <span>No sign images uploaded</span>
                </div>
              );
            }

            return (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Sign Sides
                </Label>
                <div className="flex gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Side 1</p>
                    {s1Type && (
                      <p className="text-xs text-muted-foreground">{s1Type}</p>
                    )}
                    {side1ImageUrl ? (
                      <img
                        src={side1ImageUrl}
                        alt="Side 1"
                        className="w-24 h-24 object-cover rounded-md border"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-md border border-dashed flex items-center justify-center bg-muted/30">
                        <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Side 2</p>
                    {s2Type && (
                      <p className="text-xs text-muted-foreground">{s2Type}</p>
                    )}
                    {side2ImageUrl ? (
                      <img
                        src={side2ImageUrl}
                        alt="Side 2"
                        className="w-24 h-24 object-cover rounded-md border"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-md border border-dashed flex items-center justify-center bg-muted/30">
                        <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <Separator />

          {/* Editable fields — differ by mode */}
          <div className="space-y-4">
            {mode === 'stand' && (
              <>
                <div className="space-y-2">
                  <Label>Stand Type</Label>
                  <Select
                    value={effectiveHolder}
                    onValueChange={(value) =>
                      onUpdateAnnotation(annotation.id, {
                        signHolder: value as SignHolderType,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select stand type" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SIGN_HOLDERS) as SignHolderType[]).map(
                        (holder) => (
                          <SelectItem key={holder} value={holder}>
                            {SIGN_HOLDERS[holder].label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Stand Status</Label>
                  <Select
                    value={getEffectiveStandStatus(annotation)}
                    onValueChange={(value) =>
                      onUpdateAnnotation(annotation.id, {
                        standStatus: value as StandStatus,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>
                        <AssetStatusBadge status={getEffectiveStandStatus(annotation)} />
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STAND_STATUSES) as StandStatus[]).map(
                        (status) => (
                          <SelectItem key={status} value={status}>
                            <AssetStatusBadge status={status} />
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {mode === 'sign' && (
              <>
                {/* Side 1 status */}
                <div className="space-y-2">
                  <Label>Side 1 Status</Label>
                  <Select
                    value={getEffectiveSignStatus(side1, annotation)}
                    onValueChange={(value) => {
                      const current = annotation.side1 ?? {};
                      onUpdateAnnotation(annotation.id, {
                        side1: { ...current, signStatus: value as SignStatus },
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        <AssetStatusBadge status={getEffectiveSignStatus(side1, annotation)} />
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SIGN_STATUSES) as SignStatus[]).map(
                        (status) => (
                          <SelectItem key={status} value={status}>
                            <AssetStatusBadge status={status} />
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Side 2 status (only for 2-sided) */}
                {effectiveHolder === 'sign-pedestal-2' && (
                  <div className="space-y-2">
                    <Label>Side 2 Status</Label>
                    <Select
                      value={getEffectiveSignStatus(annotation.side2, annotation)}
                      onValueChange={(value) => {
                        const current = annotation.side2 ?? {};
                        onUpdateAnnotation(annotation.id, {
                          side2: { ...current, signStatus: value as SignStatus },
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          <AssetStatusBadge
                            status={getEffectiveSignStatus(annotation.side2, annotation)}
                          />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(SIGN_STATUSES) as SignStatus[]).map(
                          (status) => (
                            <SelectItem key={status} value={status}>
                              <AssetStatusBadge status={status} />
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

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

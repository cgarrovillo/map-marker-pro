import { useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AssetStatusBadge } from './AssetStatusBadge';
import { AssetDetailSheet } from './AssetDetailSheet';
import { SIGN_STATUSES, STAND_STATUSES, DESIGN_STATUSES, SIGN_HOLDERS } from '@/types/annotations';
import type { Annotation, SignStatus, StandStatus, DesignStatus } from '@/types/annotations';
import type { SignGroupRow, DesignRow, StandRow, FaceRef } from '@/hooks/useAssetStats';
import { Tables } from '@/integrations/supabase/types';
import { Package } from 'lucide-react';

type SignageTypeRow = Tables<'signage_types'>;
type SignageSubTypeRow = Tables<'signage_sub_types'>;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function EmptyState({ entity }: { entity: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
        <Package className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-lg font-medium text-muted-foreground">No {entity}</p>
      <p className="text-sm text-muted-foreground/70 mt-1">
        Place sign annotations on the canvas to see them here
      </p>
    </div>
  );
}

function formatType(typeName?: string, subTypeName?: string): string {
  if (!typeName) return '-';
  if (subTypeName) return `${typeName} / ${subTypeName}`;
  return typeName;
}

// ---------------------------------------------------------------------------
// SignTable (grouped rows with quantity)
// ---------------------------------------------------------------------------

interface SignTableProps {
  rows: SignGroupRow[];
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<void>;
}

/** Bulk-update signStatus for every face in the group. */
function bulkUpdateSignStatus(
  faces: FaceRef[],
  newStatus: SignStatus,
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<void>,
) {
  // Deduplicate by annotation ID and batch the updates
  const byAnnotation = new Map<string, FaceRef[]>();
  for (const f of faces) {
    const arr = byAnnotation.get(f.annotationId) ?? [];
    arr.push(f);
    byAnnotation.set(f.annotationId, arr);
  }

  for (const [annotationId, refs] of byAnnotation) {
    const updates: Partial<Annotation> = {};
    for (const ref of refs) {
      const sideKey = ref.side === 1 ? 'side1' : 'side2';
      // We merge per-side; since the annotation update is a shallow merge,
      // we build the side object here. The caller's update handler should
      // handle merging nested objects.
      (updates as Record<string, unknown>)[sideKey] = { signStatus: newStatus };
    }
    onUpdateAnnotation(annotationId, updates);
  }
}

export function SignTable({ rows, onUpdateAnnotation }: SignTableProps) {
  if (rows.length === 0) {
    return <EmptyState entity="signs" />;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Signage Type</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead className="w-[80px] text-center">Qty</TableHead>
            <TableHead className="w-[180px]">Status</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="font-medium">
                {formatType(row.signageTypeName, row.signageSubTypeName)}
              </TableCell>
              <TableCell>{row.directionLabel ?? '-'}</TableCell>
              <TableCell className="text-center font-medium">{row.quantity}x</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Select
                  value={row.status}
                  onValueChange={(value) =>
                    bulkUpdateSignStatus(row.faces, value as SignStatus, onUpdateAnnotation)
                  }
                >
                  <SelectTrigger className="w-[150px] h-8 border-none bg-transparent p-0 focus:ring-0">
                    <SelectValue>
                      <AssetStatusBadge status={row.status} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SIGN_STATUSES) as SignStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        <AssetStatusBadge status={s} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                {row.notes ?? '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DesignTable
// ---------------------------------------------------------------------------

interface DesignTableProps {
  rows: DesignRow[];
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<void>;
}

/** Bulk-update designStatus for every face in the group. */
function bulkUpdateDesignStatus(
  faces: FaceRef[],
  newStatus: DesignStatus,
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<void>,
) {
  const byAnnotation = new Map<string, FaceRef[]>();
  for (const f of faces) {
    const arr = byAnnotation.get(f.annotationId) ?? [];
    arr.push(f);
    byAnnotation.set(f.annotationId, arr);
  }

  for (const [annotationId, refs] of byAnnotation) {
    const updates: Partial<Annotation> = {};
    for (const ref of refs) {
      const sideKey = ref.side === 1 ? 'side1' : 'side2';
      (updates as Record<string, unknown>)[sideKey] = { designStatus: newStatus };
    }
    onUpdateAnnotation(annotationId, updates);
  }
}

export function DesignTable({ rows, onUpdateAnnotation }: DesignTableProps) {
  if (rows.length === 0) {
    return <EmptyState entity="designs" />;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Signage Type</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead className="w-[180px]">Status</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="font-medium">
                {formatType(row.signageTypeName, row.signageSubTypeName)}
              </TableCell>
              <TableCell>{row.directionLabel ?? '-'}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Select
                  value={row.designStatus}
                  onValueChange={(value) =>
                    bulkUpdateDesignStatus(row.faces, value as DesignStatus, onUpdateAnnotation)
                  }
                >
                  <SelectTrigger className="w-[150px] h-8 border-none bg-transparent p-0 focus:ring-0">
                    <SelectValue>
                      <AssetStatusBadge status={row.designStatus} />
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DESIGN_STATUSES) as DesignStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        <AssetStatusBadge status={s} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                {row.notes ?? '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StandTable (unchanged — one row per annotation)
// ---------------------------------------------------------------------------

interface StandTableProps {
  rows: StandRow[];
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<void>;
  signageTypes?: SignageTypeRow[];
  subTypesByParent?: Record<string, SignageSubTypeRow[]>;
}

export function StandTable({
  rows,
  onUpdateAnnotation,
  signageTypes = [],
  subTypesByParent = {},
}: StandTableProps) {
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const selectedAnnotation = selectedAnnotationId
    ? rows.find((r) => r.annotationId === selectedAnnotationId)?.annotation ?? null
    : null;

  const handleRowClick = useCallback(
    (annotation: Annotation, e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-radix-select-trigger]') || target.closest('[role="listbox"]')) {
        return;
      }
      setSelectedAnnotationId(annotation.id);
      setSheetOpen(true);
    },
    [],
  );

  if (rows.length === 0) {
    return <EmptyState entity="stands" />;
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">Label</TableHead>
              <TableHead>Stand Type</TableHead>
              <TableHead className="w-[180px]">Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.annotationId}
                className="cursor-pointer"
                onClick={(e) => handleRowClick(row.annotation, e)}
              >
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell>{SIGN_HOLDERS[row.holderType].label}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={row.status}
                    onValueChange={(value) => {
                      onUpdateAnnotation(row.annotationId, {
                        standStatus: value as StandStatus,
                      });
                    }}
                  >
                    <SelectTrigger className="w-[150px] h-8 border-none bg-transparent p-0 focus:ring-0">
                      <SelectValue>
                        <AssetStatusBadge status={row.status} />
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(STAND_STATUSES) as StandStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          <AssetStatusBadge status={s} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                  {row.notes ?? '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AssetDetailSheet
        annotation={selectedAnnotation}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdateAnnotation={onUpdateAnnotation}
        signageTypes={signageTypes}
        subTypesByParent={subTypesByParent}
        mode="stand"
      />
    </>
  );
}

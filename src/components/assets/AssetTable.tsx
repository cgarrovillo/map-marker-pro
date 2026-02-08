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
import { SIGN_STATUSES, STAND_STATUSES, SIGN_HOLDERS } from '@/types/annotations';
import type { Annotation, SignStatus, StandStatus } from '@/types/annotations';
import type { SignRow, StandRow } from '@/hooks/useAssetStats';
import { Tables } from '@/integrations/supabase/types';
import { Package } from 'lucide-react';

type SignageTypeRow = Tables<'signage_types'>;
type SignageSubTypeRow = Tables<'signage_sub_types'>;

// ---------------------------------------------------------------------------
// Empty state (shared)
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

// ---------------------------------------------------------------------------
// SignTable
// ---------------------------------------------------------------------------

interface SignTableProps {
  rows: SignRow[];
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<void>;
  signageTypes?: SignageTypeRow[];
  subTypesByParent?: Record<string, SignageSubTypeRow[]>;
}

function formatType(typeName?: string, subTypeName?: string): string {
  if (!typeName) return '-';
  if (subTypeName) return `${typeName} / ${subTypeName}`;
  return typeName;
}

export function SignTable({
  rows,
  onUpdateAnnotation,
  signageTypes = [],
  subTypesByParent = {},
}: SignTableProps) {
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Keep the selected annotation in sync with the live rows so the sheet
  // always reflects the latest data (e.g. after a notes edit).
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
    return <EmptyState entity="sign faces" />;
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">Label</TableHead>
              <TableHead>Signage Type</TableHead>
              <TableHead className="w-[180px]">Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={`${row.annotationId}-s${row.side}`}
                className="cursor-pointer"
                onClick={(e) => handleRowClick(row.annotation, e)}
              >
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell>{formatType(row.signageTypeName, row.signageSubTypeName)}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={row.status}
                    onValueChange={(value) => {
                      const sideKey = row.side === 1 ? 'side1' : 'side2';
                      const currentSide = row.annotation[sideKey] ?? {};
                      onUpdateAnnotation(row.annotationId, {
                        [sideKey]: { ...currentSide, signStatus: value as SignStatus },
                      });
                    }}
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

      <AssetDetailSheet
        annotation={selectedAnnotation}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdateAnnotation={onUpdateAnnotation}
        signageTypes={signageTypes}
        subTypesByParent={subTypesByParent}
        mode="sign"
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// StandTable
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

  // Keep the selected annotation in sync with the live rows so the sheet
  // always reflects the latest data (e.g. after a notes edit).
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

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
import { SIGN_HOLDERS, DEFAULT_SIGN_HOLDER, ORDER_STATUSES } from '@/types/annotations';
import type { Annotation, OrderStatus, SignSide } from '@/types/annotations';
import { Tables } from '@/integrations/supabase/types';
import { Package } from 'lucide-react';

type SignageTypeRow = Tables<'signage_types'>;
type SignageSubTypeRow = Tables<'signage_sub_types'>;

interface AssetTableProps {
  annotations: Annotation[];
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<void>;
  signageTypes?: SignageTypeRow[];
  subTypesByParent?: Record<string, SignageSubTypeRow[]>;
}

function formatSideType(side: SignSide | undefined): string {
  if (!side?.signageTypeName) return '-';
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
  if (s1 !== '-' && s2 !== '-') return `${s1} | ${s2}`;
  if (s1 !== '-') return s1;
  if (s2 !== '-') return s2;
  return 'Unnamed Sign';
}

function getHolderLabel(annotation: Annotation): string {
  const holder = annotation.signHolder || DEFAULT_SIGN_HOLDER;
  return SIGN_HOLDERS[holder].label;
}

export function AssetTable({ annotations, onUpdateAnnotation, signageTypes = [], subTypesByParent = {} }: AssetTableProps) {
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleRowClick = useCallback(
    (annotation: Annotation, e: React.MouseEvent) => {
      // Don't open sheet if clicking inside the status Select dropdown
      const target = e.target as HTMLElement;
      if (target.closest('[data-radix-select-trigger]') || target.closest('[role="listbox"]')) {
        return;
      }
      setSelectedAnnotation(annotation);
      setSheetOpen(true);
    },
    []
  );

  const handleStatusChange = (annotationId: string, newStatus: OrderStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateAnnotation(annotationId, { orderStatus: newStatus });
  };

  // Keep the selected annotation in sync with the annotations array
  // so the sheet reflects updates made via the inline status dropdown
  const syncedAnnotation = selectedAnnotation
    ? annotations.find((a) => a.id === selectedAnnotation.id) ?? null
    : null;

  if (annotations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
          <Package className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-muted-foreground">No signage assets</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Place sign annotations on the canvas to see them here
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Label</TableHead>
              <TableHead>Side 1 Type</TableHead>
              <TableHead>Side 2 Type</TableHead>
              <TableHead>Holder</TableHead>
              <TableHead className="w-[180px]">Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {annotations.map((annotation) => {
              const effectiveStatus: OrderStatus = annotation.orderStatus ?? 'not_ordered';

              return (
                <TableRow
                  key={annotation.id}
                  className="cursor-pointer"
                  onClick={(e) => handleRowClick(annotation, e)}
                >
                  <TableCell className="font-medium">
                    {getDisplayLabel(annotation)}
                  </TableCell>
                  <TableCell>{formatSideType(getSide1Data(annotation))}</TableCell>
                  <TableCell>{formatSideType(annotation.side2)}</TableCell>
                  <TableCell className="text-sm">{getHolderLabel(annotation)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={effectiveStatus}
                      onValueChange={(value) =>
                        onUpdateAnnotation(annotation.id, { orderStatus: value as OrderStatus })
                      }
                    >
                      <SelectTrigger className="w-[150px] h-8 border-none bg-transparent p-0 focus:ring-0">
                        <SelectValue>
                          <AssetStatusBadge status={effectiveStatus} />
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ORDER_STATUSES) as OrderStatus[]).map((status) => (
                          <SelectItem key={status} value={status}>
                            <AssetStatusBadge status={status} />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {annotation.notes ?? '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AssetDetailSheet
        annotation={syncedAnnotation}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUpdateAnnotation={onUpdateAnnotation}
        signageTypes={signageTypes}
        subTypesByParent={subTypesByParent}
      />
    </>
  );
}

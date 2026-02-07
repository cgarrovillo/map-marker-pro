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
import { SIGN_HOLDERS, ORDER_STATUSES } from '@/types/annotations';
import type { Annotation, OrderStatus } from '@/types/annotations';
import { Package } from 'lucide-react';

interface AssetTableProps {
  annotations: Annotation[];
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<void>;
}

function getDisplayLabel(annotation: Annotation): string {
  if (annotation.label) return annotation.label;
  const parts: string[] = [];
  if (annotation.signageTypeName) parts.push(annotation.signageTypeName);
  if (annotation.signageSubTypeName) parts.push(annotation.signageSubTypeName);
  if (parts.length > 0) return parts.join(' - ');
  return 'Unnamed Sign';
}

function getHolderLabel(annotation: Annotation): string {
  if (!annotation.signHolder) return 'Unassigned';
  return SIGN_HOLDERS[annotation.signHolder].label;
}

export function AssetTable({ annotations, onUpdateAnnotation }: AssetTableProps) {
  const handleStatusChange = (annotationId: string, newStatus: OrderStatus) => {
    onUpdateAnnotation(annotationId, { orderStatus: newStatus });
  };

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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Label</TableHead>
            <TableHead>Signage Type</TableHead>
            <TableHead>Sub-Type</TableHead>
            <TableHead>Holder</TableHead>
            <TableHead className="w-[180px]">Status</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {annotations.map((annotation) => {
            const effectiveStatus: OrderStatus = annotation.orderStatus ?? 'not_ordered';

            return (
              <TableRow key={annotation.id}>
                <TableCell className="font-medium">
                  {getDisplayLabel(annotation)}
                </TableCell>
                <TableCell>{annotation.signageTypeName ?? '-'}</TableCell>
                <TableCell>{annotation.signageSubTypeName ?? '-'}</TableCell>
                <TableCell className="text-sm">{getHolderLabel(annotation)}</TableCell>
                <TableCell>
                  <Select
                    value={effectiveStatus}
                    onValueChange={(value) =>
                      handleStatusChange(annotation.id, value as OrderStatus)
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
  );
}

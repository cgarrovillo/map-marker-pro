import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SignStatus, StandStatus } from '@/types/annotations';
import { SIGN_STATUSES, STAND_STATUSES } from '@/types/annotations';

type AssetStatus = SignStatus | StandStatus;

const statusStyles: Record<AssetStatus, string> = {
  in_design:
    'bg-purple-500/15 text-purple-500 border-purple-500/25 hover:bg-purple-500/15',
  not_ordered:
    'bg-muted text-muted-foreground border-muted-foreground/20 hover:bg-muted',
  ordered:
    'bg-blue-500/15 text-blue-500 border-blue-500/25 hover:bg-blue-500/15',
  shipped:
    'bg-amber-500/15 text-amber-500 border-amber-500/25 hover:bg-amber-500/15',
  delivered:
    'bg-teal-500/15 text-teal-500 border-teal-500/25 hover:bg-teal-500/15',
  installed:
    'bg-green-500/15 text-green-500 border-green-500/25 hover:bg-green-500/15',
};

// Merged label lookup — sign statuses are a superset so they cover all keys
const STATUS_LABELS: Record<AssetStatus, string> = {
  ...Object.fromEntries(
    Object.entries(STAND_STATUSES).map(([k, v]) => [k, v.label]),
  ),
  ...Object.fromEntries(
    Object.entries(SIGN_STATUSES).map(([k, v]) => [k, v.label]),
  ),
} as Record<AssetStatus, string>;

interface AssetStatusBadgeProps {
  status: AssetStatus;
  className?: string;
}

export function AssetStatusBadge({ status, className }: AssetStatusBadgeProps) {
  return (
    <Badge className={cn(statusStyles[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

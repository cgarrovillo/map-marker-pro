import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types/annotations';
import { ORDER_STATUSES } from '@/types/annotations';

const statusStyles: Record<OrderStatus, string> = {
  not_ordered:
    'bg-muted text-muted-foreground border-muted-foreground/20 hover:bg-muted',
  ordered:
    'bg-blue-500/15 text-blue-500 border-blue-500/25 hover:bg-blue-500/15',
  shipped:
    'bg-amber-500/15 text-amber-500 border-amber-500/25 hover:bg-amber-500/15',
  installed:
    'bg-green-500/15 text-green-500 border-green-500/25 hover:bg-green-500/15',
};

interface AssetStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function AssetStatusBadge({ status, className }: AssetStatusBadgeProps) {
  return (
    <Badge className={cn(statusStyles[status], className)}>
      {ORDER_STATUSES[status].label}
    </Badge>
  );
}

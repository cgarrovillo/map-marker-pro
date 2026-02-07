import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { ORDER_STATUSES, SIGN_HOLDERS } from '@/types/annotations';
import type { AssetFilters as AssetFiltersType } from '@/hooks/useAssetStats';
import type { OrderStatus, SignHolderType } from '@/types/annotations';

interface AssetFiltersProps {
  filters: AssetFiltersType;
  onFiltersChange: (filters: AssetFiltersType) => void;
  signageTypeNames: string[];
}

const defaultFilters: AssetFiltersType = {
  search: '',
  status: 'all',
  signageType: 'all',
  holderType: 'all',
};

function hasActiveFilters(filters: AssetFiltersType): boolean {
  return (
    filters.search !== '' ||
    filters.status !== 'all' ||
    filters.signageType !== 'all' ||
    filters.holderType !== 'all'
  );
}

export function AssetFilters({ filters, onFiltersChange, signageTypeNames }: AssetFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by label, type, or notes..."
          value={filters.search}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
          className="pl-9"
        />
      </div>

      <Select
        value={filters.status}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, status: value as OrderStatus | 'all' })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {(Object.keys(ORDER_STATUSES) as OrderStatus[]).map((status) => (
            <SelectItem key={status} value={status}>
              {ORDER_STATUSES[status].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.signageType}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, signageType: value })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Signage Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {signageTypeNames.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.holderType}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, holderType: value as SignHolderType | 'all' })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Holder Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Holders</SelectItem>
          {(Object.keys(SIGN_HOLDERS) as SignHolderType[]).map((holder) => (
            <SelectItem key={holder} value={holder}>
              {SIGN_HOLDERS[holder].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters(filters) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange(defaultFilters)}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}

export { defaultFilters };

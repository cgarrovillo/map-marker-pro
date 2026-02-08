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
import { SIGN_STATUSES, STAND_STATUSES, SIGN_HOLDERS } from '@/types/annotations';
import type { SignStatus, StandStatus, SignHolderType } from '@/types/annotations';
import type { SignFilters, StandFilters } from '@/hooks/useAssetStats';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const defaultSignFilters: SignFilters = {
  search: '',
  status: 'all',
  signageType: 'all',
};

export const defaultStandFilters: StandFilters = {
  search: '',
  status: 'all',
  standType: 'all',
};

// ---------------------------------------------------------------------------
// Sign Filters
// ---------------------------------------------------------------------------

interface SignFiltersProps {
  filters: SignFilters;
  onFiltersChange: (filters: SignFilters) => void;
  signageTypeNames: string[];
}

function hasActiveSignFilters(filters: SignFilters): boolean {
  return (
    filters.search !== '' ||
    filters.status !== 'all' ||
    filters.signageType !== 'all'
  );
}

export function SignFilterBar({ filters, onFiltersChange, signageTypeNames }: SignFiltersProps) {
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
          onFiltersChange({ ...filters, status: value as SignStatus | 'all' })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {(Object.keys(SIGN_STATUSES) as SignStatus[]).map((status) => (
            <SelectItem key={status} value={status}>
              {SIGN_STATUSES[status].label}
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

      {hasActiveSignFilters(filters) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange(defaultSignFilters)}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stand Filters
// ---------------------------------------------------------------------------

interface StandFiltersProps {
  filters: StandFilters;
  onFiltersChange: (filters: StandFilters) => void;
}

function hasActiveStandFilters(filters: StandFilters): boolean {
  return (
    filters.search !== '' ||
    filters.status !== 'all' ||
    filters.standType !== 'all'
  );
}

export function StandFilterBar({ filters, onFiltersChange }: StandFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by label or notes..."
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
          onFiltersChange({ ...filters, status: value as StandStatus | 'all' })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {(Object.keys(STAND_STATUSES) as StandStatus[]).map((status) => (
            <SelectItem key={status} value={status}>
              {STAND_STATUSES[status].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.standType}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, standType: value as SignHolderType | 'all' })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Stand Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stands</SelectItem>
          {(Object.keys(SIGN_HOLDERS) as SignHolderType[]).map((holder) => (
            <SelectItem key={holder} value={holder}>
              {SIGN_HOLDERS[holder].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveStandFilters(filters) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange(defaultStandFilters)}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}

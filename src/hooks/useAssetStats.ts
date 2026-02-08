import { useMemo } from 'react';
import { DEFAULT_SIGN_HOLDER } from '@/types/annotations';
import type { Annotation, OrderStatus, SignHolderType } from '@/types/annotations';

export interface AssetFilters {
  search: string;
  status: OrderStatus | 'all';
  signageType: string; // signageTypeName or 'all'
  holderType: SignHolderType | 'all';
}

export interface AssetStats {
  total: number;
  byStatus: Record<OrderStatus, number>;
  byHolder: Record<SignHolderType, number>;
}

function getEffectiveStatus(annotation: Annotation): OrderStatus {
  return annotation.orderStatus ?? 'not_ordered';
}

function getEffectiveHolder(annotation: Annotation): SignHolderType {
  return annotation.signHolder || DEFAULT_SIGN_HOLDER;
}

export function useAssetStats(annotations: Annotation[], filters: AssetFilters) {
  // Filter to signage annotations only
  const signageAnnotations = useMemo(
    () => annotations.filter((a) => a.category === 'signage'),
    [annotations]
  );

  // Compute stats from all signage annotations (unfiltered)
  const stats: AssetStats = useMemo(() => {
    const byStatus: Record<OrderStatus, number> = {
      not_ordered: 0,
      ordered: 0,
      shipped: 0,
      installed: 0,
    };
    const byHolder: Record<SignHolderType, number> = {
      'sign-pedestal-1': 0,
      'sign-pedestal-2': 0,
    };

    for (const a of signageAnnotations) {
      byStatus[getEffectiveStatus(a)]++;
      byHolder[getEffectiveHolder(a)]++;
    }

    return {
      total: signageAnnotations.length,
      byStatus,
      byHolder,
    };
  }, [signageAnnotations]);

  // Get unique signage type names for filter options
  const signageTypeNames = useMemo(() => {
    const names = new Set<string>();
    for (const a of signageAnnotations) {
      if (a.signageTypeName) {
        names.add(a.signageTypeName);
      }
    }
    return Array.from(names).sort();
  }, [signageAnnotations]);

  // Apply filters
  const filteredAnnotations = useMemo(() => {
    return signageAnnotations.filter((a) => {
      // Search filter
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchesLabel = a.label?.toLowerCase().includes(query);
        const matchesNotes = a.notes?.toLowerCase().includes(query);
        const matchesType = a.signageTypeName?.toLowerCase().includes(query);
        const matchesSubType = a.signageSubTypeName?.toLowerCase().includes(query);
        if (!matchesLabel && !matchesNotes && !matchesType && !matchesSubType) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== 'all') {
        if (getEffectiveStatus(a) !== filters.status) return false;
      }

      // Signage type filter
      if (filters.signageType !== 'all') {
        if (a.signageTypeName !== filters.signageType) return false;
      }

      // Holder type filter
      if (filters.holderType !== 'all') {
        if (a.signHolder !== filters.holderType) return false;
      }

      return true;
    });
  }, [signageAnnotations, filters]);

  return {
    stats,
    signageTypeNames,
    filteredAnnotations,
    signageAnnotations,
  };
}

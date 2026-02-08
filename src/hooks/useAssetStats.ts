import { useMemo } from 'react';
import { DEFAULT_SIGN_HOLDER } from '@/types/annotations';
import type {
  Annotation,
  SignHolderType,
  SignStatus,
  StandStatus,
  SignSide,
} from '@/types/annotations';

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface SignFilters {
  search: string;
  status: SignStatus | 'all';
  signageType: string; // signageTypeName or 'all'
}

export interface StandFilters {
  search: string;
  status: StandStatus | 'all';
  standType: SignHolderType | 'all';
}

// ---------------------------------------------------------------------------
// Row types (denormalised for table rendering)
// ---------------------------------------------------------------------------

export interface SignRow {
  /** Parent annotation id */
  annotationId: string;
  /** Which side of the pedestal: 1 or 2 */
  side: 1 | 2;
  /** Display label, e.g. "My Sign (Side 1)" */
  label: string;
  signageTypeName: string | undefined;
  signageSubTypeName: string | undefined;
  status: SignStatus;
  notes: string | undefined;
  /** Reference to the parent annotation for updates */
  annotation: Annotation;
}

export interface StandRow {
  annotationId: string;
  label: string;
  holderType: SignHolderType;
  status: StandStatus;
  notes: string | undefined;
  annotation: Annotation;
}

// ---------------------------------------------------------------------------
// Stats types
// ---------------------------------------------------------------------------

export interface SignStats {
  total: number;
  byStatus: Record<SignStatus, number>;
}

export interface StandStats {
  total: number;
  byStatus: Record<StandStatus, number>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEffectiveSignStatus(side: SignSide | undefined, annotation: Annotation): SignStatus {
  // Per-side status takes priority, then fall back to legacy orderStatus mapping
  if (side?.signStatus) return side.signStatus;
  const legacy = annotation.orderStatus;
  if (!legacy) return 'in_design';
  // Map legacy OrderStatus → SignStatus (best-effort)
  const map: Record<string, SignStatus> = {
    not_ordered: 'in_design',
    ordered: 'ordered',
    shipped: 'shipped',
    installed: 'installed',
  };
  return map[legacy] ?? 'in_design';
}

function getEffectiveStandStatus(annotation: Annotation): StandStatus {
  if (annotation.standStatus) return annotation.standStatus;
  const legacy = annotation.orderStatus;
  if (!legacy) return 'not_ordered';
  const map: Record<string, StandStatus> = {
    not_ordered: 'not_ordered',
    ordered: 'ordered',
    shipped: 'shipped',
    installed: 'delivered', // best-effort: "installed" → "delivered" for stands
  };
  return map[legacy] ?? 'not_ordered';
}

function getEffectiveHolder(annotation: Annotation): SignHolderType {
  return annotation.signHolder || DEFAULT_SIGN_HOLDER;
}

/** Resolve side-1 data, falling back to root-level fields for old annotations. */
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

function formatSideType(side: SignSide | undefined): string | null {
  if (!side?.signageTypeName) return null;
  if (side.signageSubTypeName) return `${side.signageTypeName} / ${side.signageSubTypeName}`;
  return side.signageTypeName;
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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAssetStats(
  annotations: Annotation[],
  signFilters: SignFilters,
  standFilters: StandFilters,
) {
  // Filter to signage annotations only
  const signageAnnotations = useMemo(
    () => annotations.filter((a) => a.category === 'signage'),
    [annotations],
  );

  // -----------------------------------------------------------------------
  // Explode into sign rows (one per face)
  // -----------------------------------------------------------------------

  const allSignRows: SignRow[] = useMemo(() => {
    const rows: SignRow[] = [];
    for (const a of signageAnnotations) {
      const holder = getEffectiveHolder(a);
      const sides = holder === 'sign-pedestal-2' ? 2 : 1;
      const baseLabel = getDisplayLabel(a);

      // Side 1
      const s1 = getSide1Data(a);
      rows.push({
        annotationId: a.id,
        side: 1,
        label: sides === 2 ? `${baseLabel} (Side 1)` : baseLabel,
        signageTypeName: s1?.signageTypeName,
        signageSubTypeName: s1?.signageSubTypeName,
        status: getEffectiveSignStatus(s1, a),
        notes: a.notes,
        annotation: a,
      });

      // Side 2 (only for 2-sided holders)
      if (sides === 2) {
        const s2 = a.side2;
        rows.push({
          annotationId: a.id,
          side: 2,
          label: `${baseLabel} (Side 2)`,
          signageTypeName: s2?.signageTypeName,
          signageSubTypeName: s2?.signageSubTypeName,
          status: getEffectiveSignStatus(s2, a),
          notes: a.notes,
          annotation: a,
        });
      }
    }
    return rows;
  }, [signageAnnotations]);

  // -----------------------------------------------------------------------
  // All stand rows (one per annotation)
  // -----------------------------------------------------------------------

  const allStandRows: StandRow[] = useMemo(() => {
    return signageAnnotations.map((a) => ({
      annotationId: a.id,
      label: getDisplayLabel(a),
      holderType: getEffectiveHolder(a),
      status: getEffectiveStandStatus(a),
      notes: a.notes,
      annotation: a,
    }));
  }, [signageAnnotations]);

  // -----------------------------------------------------------------------
  // Stats (unfiltered)
  // -----------------------------------------------------------------------

  const signStats: SignStats = useMemo(() => {
    const byStatus: Record<SignStatus, number> = {
      in_design: 0,
      ordered: 0,
      shipped: 0,
      delivered: 0,
      installed: 0,
    };
    for (const r of allSignRows) {
      byStatus[r.status]++;
    }
    return { total: allSignRows.length, byStatus };
  }, [allSignRows]);

  const standStats: StandStats = useMemo(() => {
    const byStatus: Record<StandStatus, number> = {
      not_ordered: 0,
      ordered: 0,
      shipped: 0,
      delivered: 0,
    };
    for (const r of allStandRows) {
      byStatus[r.status]++;
    }
    return { total: allStandRows.length, byStatus };
  }, [allStandRows]);

  // -----------------------------------------------------------------------
  // Signage type names for filter dropdowns (from sign rows)
  // -----------------------------------------------------------------------

  const signageTypeNames = useMemo(() => {
    const names = new Set<string>();
    for (const r of allSignRows) {
      if (r.signageTypeName) names.add(r.signageTypeName);
    }
    return Array.from(names).sort();
  }, [allSignRows]);

  // -----------------------------------------------------------------------
  // Filtered sign rows
  // -----------------------------------------------------------------------

  const filteredSignRows = useMemo(() => {
    return allSignRows.filter((r) => {
      if (signFilters.search) {
        const q = signFilters.search.toLowerCase();
        const matches =
          r.label.toLowerCase().includes(q) ||
          r.signageTypeName?.toLowerCase().includes(q) ||
          r.signageSubTypeName?.toLowerCase().includes(q) ||
          r.notes?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (signFilters.status !== 'all' && r.status !== signFilters.status) return false;
      if (signFilters.signageType !== 'all' && r.signageTypeName !== signFilters.signageType) return false;
      return true;
    });
  }, [allSignRows, signFilters]);

  // -----------------------------------------------------------------------
  // Filtered stand rows
  // -----------------------------------------------------------------------

  const filteredStandRows = useMemo(() => {
    return allStandRows.filter((r) => {
      if (standFilters.search) {
        const q = standFilters.search.toLowerCase();
        const matches =
          r.label.toLowerCase().includes(q) ||
          r.notes?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (standFilters.status !== 'all' && r.status !== standFilters.status) return false;
      if (standFilters.standType !== 'all' && r.holderType !== standFilters.standType) return false;
      return true;
    });
  }, [allStandRows, standFilters]);

  return {
    signStats,
    standStats,
    signageTypeNames,
    filteredSignRows,
    filteredStandRows,
    signageAnnotations,
  };
}

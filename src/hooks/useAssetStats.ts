import { useMemo } from 'react';
import { DEFAULT_SIGN_HOLDER, SIGN_DIRECTIONS } from '@/types/annotations';
import type {
  Annotation,
  DesignStatus,
  SignDirection,
  SignHolderType,
  SignSide,
  SignStatus,
  StandStatus,
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

export interface DesignFilters {
  search: string;
  status: DesignStatus | 'all';
  signageType: string; // signageTypeName or 'all'
}

// ---------------------------------------------------------------------------
// Internal face type (one per physical sign face)
// ---------------------------------------------------------------------------

interface FaceRecord {
  annotationId: string;
  side: 1 | 2;
  signageTypeName: string | undefined;
  signageSubTypeName: string | undefined;
  direction: SignDirection | undefined;
  signStatus: SignStatus;
  designStatus: DesignStatus;
  notes: string | undefined;
  annotation: Annotation;
}

// ---------------------------------------------------------------------------
// Row types (exposed for table rendering)
// ---------------------------------------------------------------------------

/** A face reference used for bulk updates. */
export interface FaceRef {
  annotationId: string;
  side: 1 | 2;
}

/** Signs tab: grouped by (type, sub-type, direction). */
export interface SignGroupRow {
  /** Stable key for React rendering. */
  key: string;
  signageTypeName: string | undefined;
  signageSubTypeName: string | undefined;
  direction: SignDirection | undefined;
  directionLabel: string | undefined;
  quantity: number;
  status: SignStatus;
  notes: string | undefined;
  faces: FaceRef[];
}

/** Designs tab: grouped identically to signs but with design-specific status. */
export interface DesignRow {
  key: string;
  signageTypeName: string | undefined;
  signageSubTypeName: string | undefined;
  direction: SignDirection | undefined;
  directionLabel: string | undefined;
  designStatus: DesignStatus;
  notes: string | undefined;
  faces: FaceRef[];
}

/** Stands tab: one row per annotation (unchanged from before). */
export interface StandRow {
  annotationId: string;
  label: string;
  holderType: SignHolderType;
  orientation: number | undefined;
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

export interface DesignStats {
  total: number;
  byStatus: Record<DesignStatus, number>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEffectiveSignStatus(side: SignSide | undefined, annotation: Annotation): SignStatus {
  if (side?.signStatus) return side.signStatus;
  const legacy = annotation.orderStatus;
  if (!legacy) return 'not_ordered';
  const map: Record<string, SignStatus> = {
    not_ordered: 'not_ordered',
    ordered: 'ordered',
    shipped: 'shipped',
    installed: 'installed',
  };
  return map[legacy] ?? 'not_ordered';
}

function getEffectiveDesignStatus(side: SignSide | undefined): DesignStatus {
  return side?.designStatus ?? 'not_started';
}

function getEffectiveStandStatus(annotation: Annotation): StandStatus {
  if (annotation.standStatus) return annotation.standStatus;
  const legacy = annotation.orderStatus;
  if (!legacy) return 'not_ordered';
  const map: Record<string, StandStatus> = {
    not_ordered: 'not_ordered',
    ordered: 'ordered',
    shipped: 'shipped',
    installed: 'delivered',
  };
  return map[legacy] ?? 'not_ordered';
}

function getEffectiveHolder(annotation: Annotation): SignHolderType {
  return annotation.signHolder || DEFAULT_SIGN_HOLDER;
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

/** Build a stable group key from design-defining attributes. */
function groupKey(
  typeName: string | undefined,
  subTypeName: string | undefined,
  direction: SignDirection | undefined,
  notes: string | undefined,
): string {
  return `${typeName ?? ''}||${subTypeName ?? ''}||${direction ?? ''}||${notes ?? ''}`;
}

// ---------------------------------------------------------------------------
// Grouping helper
// ---------------------------------------------------------------------------

/**
 * Groups face records by (type, sub-type, direction).
 * Faces whose parent annotation has notes get their own row.
 */
function groupFaces<T>(
  faces: FaceRecord[],
  buildRow: (key: string, first: FaceRecord, faces: FaceRef[]) => T,
): T[] {
  const map = new Map<string, { first: FaceRecord; refs: FaceRef[] }>();

  for (const f of faces) {
    // Faces with annotation-level notes break out
    const k = groupKey(f.signageTypeName, f.signageSubTypeName, f.direction, f.notes);
    const existing = map.get(k);
    if (existing) {
      existing.refs.push({ annotationId: f.annotationId, side: f.side });
    } else {
      map.set(k, {
        first: f,
        refs: [{ annotationId: f.annotationId, side: f.side }],
      });
    }
  }

  const rows: T[] = [];
  for (const [k, { first, refs }] of map) {
    rows.push(buildRow(k, first, refs));
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAssetStats(
  annotations: Annotation[],
  signFilters: SignFilters,
  standFilters: StandFilters,
  designFilters: DesignFilters,
) {
  // Filter to signage annotations only
  const signageAnnotations = useMemo(
    () => annotations.filter((a) => a.category === 'signage'),
    [annotations],
  );

  // -----------------------------------------------------------------------
  // Explode into face records (one per physical sign face)
  // -----------------------------------------------------------------------

  const allFaces: FaceRecord[] = useMemo(() => {
    const records: FaceRecord[] = [];
    for (const a of signageAnnotations) {
      const holder = getEffectiveHolder(a);
      const sides = holder === 'sign-pedestal-2' ? 2 : 1;

      const s1 = getSide1Data(a);
      records.push({
        annotationId: a.id,
        side: 1,
        signageTypeName: s1?.signageTypeName,
        signageSubTypeName: s1?.signageSubTypeName,
        direction: s1?.direction,
        signStatus: getEffectiveSignStatus(s1, a),
        designStatus: getEffectiveDesignStatus(s1),
        notes: a.notes,
        annotation: a,
      });

      if (sides === 2) {
        const s2 = a.side2;
        records.push({
          annotationId: a.id,
          side: 2,
          signageTypeName: s2?.signageTypeName,
          signageSubTypeName: s2?.signageSubTypeName,
          direction: s2?.direction,
          signStatus: getEffectiveSignStatus(s2, a),
          designStatus: getEffectiveDesignStatus(s2),
          notes: a.notes,
          annotation: a,
        });
      }
    }
    return records;
  }, [signageAnnotations]);

  // -----------------------------------------------------------------------
  // Grouped sign rows (Signs tab)
  // -----------------------------------------------------------------------

  const allSignGroupRows: SignGroupRow[] = useMemo(
    () =>
      groupFaces(allFaces, (key, first, faces) => ({
        key,
        signageTypeName: first.signageTypeName,
        signageSubTypeName: first.signageSubTypeName,
        direction: first.direction,
        directionLabel: first.direction ? SIGN_DIRECTIONS[first.direction]?.label : undefined,
        quantity: faces.length,
        status: first.signStatus,
        notes: first.notes,
        faces,
      })),
    [allFaces],
  );

  // -----------------------------------------------------------------------
  // Grouped design rows (Designs tab)
  // -----------------------------------------------------------------------

  const allDesignRows: DesignRow[] = useMemo(
    () =>
      groupFaces(allFaces, (key, first, faces) => ({
        key,
        signageTypeName: first.signageTypeName,
        signageSubTypeName: first.signageSubTypeName,
        direction: first.direction,
        directionLabel: first.direction ? SIGN_DIRECTIONS[first.direction]?.label : undefined,
        designStatus: first.designStatus,
        notes: first.notes,
        faces,
      })),
    [allFaces],
  );

  // -----------------------------------------------------------------------
  // Stand rows (one per annotation — unchanged)
  // -----------------------------------------------------------------------

  const allStandRows: StandRow[] = useMemo(() => {
    return signageAnnotations.map((a) => ({
      annotationId: a.id,
      label: getDisplayLabel(a),
      holderType: getEffectiveHolder(a),
      orientation: a.orientation,
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
      not_ordered: 0,
      ordered: 0,
      shipped: 0,
      delivered: 0,
      installed: 0,
    };
    for (const r of allSignGroupRows) {
      byStatus[r.status] += r.quantity;
    }
    const total = allSignGroupRows.reduce((sum, r) => sum + r.quantity, 0);
    return { total, byStatus };
  }, [allSignGroupRows]);

  const designStats: DesignStats = useMemo(() => {
    const byStatus: Record<DesignStatus, number> = {
      not_started: 0,
      in_design: 0,
      completed: 0,
    };
    for (const r of allDesignRows) {
      byStatus[r.designStatus]++;
    }
    return { total: allDesignRows.length, byStatus };
  }, [allDesignRows]);

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
  // Signage type names for filter dropdowns
  // -----------------------------------------------------------------------

  const signageTypeNames = useMemo(() => {
    const names = new Set<string>();
    for (const f of allFaces) {
      if (f.signageTypeName) names.add(f.signageTypeName);
    }
    return Array.from(names).sort();
  }, [allFaces]);

  // -----------------------------------------------------------------------
  // Filtered sign group rows
  // -----------------------------------------------------------------------

  const filteredSignGroupRows = useMemo(() => {
    return allSignGroupRows.filter((r) => {
      if (signFilters.search) {
        const q = signFilters.search.toLowerCase();
        const matches =
          r.signageTypeName?.toLowerCase().includes(q) ||
          r.signageSubTypeName?.toLowerCase().includes(q) ||
          r.directionLabel?.toLowerCase().includes(q) ||
          r.notes?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (signFilters.status !== 'all' && r.status !== signFilters.status) return false;
      if (signFilters.signageType !== 'all' && r.signageTypeName !== signFilters.signageType) return false;
      return true;
    });
  }, [allSignGroupRows, signFilters]);

  // -----------------------------------------------------------------------
  // Filtered design rows
  // -----------------------------------------------------------------------

  const filteredDesignRows = useMemo(() => {
    return allDesignRows.filter((r) => {
      if (designFilters.search) {
        const q = designFilters.search.toLowerCase();
        const matches =
          r.signageTypeName?.toLowerCase().includes(q) ||
          r.signageSubTypeName?.toLowerCase().includes(q) ||
          r.directionLabel?.toLowerCase().includes(q) ||
          r.notes?.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (designFilters.status !== 'all' && r.designStatus !== designFilters.status) return false;
      if (designFilters.signageType !== 'all' && r.signageTypeName !== designFilters.signageType) return false;
      return true;
    });
  }, [allDesignRows, designFilters]);

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
    designStats,
    signageTypeNames,
    filteredSignGroupRows,
    filteredDesignRows,
    filteredStandRows,
    signageAnnotations,
  };
}

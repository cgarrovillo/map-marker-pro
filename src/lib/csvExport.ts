import type { SignGroupRow, DesignRow, StandRow } from '@/hooks/useAssetStats';
import {
  SIGN_STATUSES,
  DESIGN_STATUSES,
  STAND_STATUSES,
  SIGN_HOLDERS,
} from '@/types/annotations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape a value for CSV (wrap in quotes if it contains comma, quote, or newline). */
function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsvString(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCsv).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsv).join(','));
  return [headerLine, ...dataLines].join('\n');
}

function downloadCsv(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Format helpers (match what the tables display)
// ---------------------------------------------------------------------------

function formatType(typeName?: string, subTypeName?: string): string {
  if (!typeName) return '';
  if (subTypeName) return `${typeName} / ${subTypeName}`;
  return typeName;
}

// ---------------------------------------------------------------------------
// Export functions
// ---------------------------------------------------------------------------

export function exportSignTableCsv(rows: SignGroupRow[], filename = 'signs.csv') {
  const headers = ['Signage Type', 'Direction', 'Qty', 'Status', 'Notes'];
  const data = rows.map((row) => [
    formatType(row.signageTypeName, row.signageSubTypeName),
    row.directionLabel ?? '',
    String(row.quantity),
    SIGN_STATUSES[row.status]?.label ?? row.status,
    row.notes ?? '',
  ]);
  downloadCsv(toCsvString(headers, data), filename);
}

export function exportDesignTableCsv(rows: DesignRow[], filename = 'designs.csv') {
  const headers = ['Signage Type', 'Direction', 'Status', 'Notes'];
  const data = rows.map((row) => [
    formatType(row.signageTypeName, row.signageSubTypeName),
    row.directionLabel ?? '',
    DESIGN_STATUSES[row.designStatus]?.label ?? row.designStatus,
    row.notes ?? '',
  ]);
  downloadCsv(toCsvString(headers, data), filename);
}

export function exportStandTableCsv(rows: StandRow[], filename = 'stands.csv') {
  const headers = ['Label', 'Stand Type', 'Status', 'Notes'];
  const data = rows.map((row) => [
    row.label,
    SIGN_HOLDERS[row.holderType]?.label ?? row.holderType,
    STAND_STATUSES[row.status]?.label ?? row.status,
    row.notes ?? '',
  ]);
  downloadCsv(toCsvString(headers, data), filename);
}

/**
 * Minimal CSV serialiser. Excel opens CSV natively; a UTF-8 BOM is prepended so
 * characters render correctly. Numbers/strings only — nested objects are JSON-encoded.
 */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (!rows.length) return '﻿';
  const cols = columns ?? Object.keys(rows[0]).filter((k) => k !== 'id');
  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = cols.join(',');
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(',')).join('\n');
  return `﻿${header}\n${body}`;
}

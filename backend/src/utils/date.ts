export const now = (): Date => new Date();

export function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Inclusive [start, end] for a named range used by dashboards. */
export function rangeDates(range: 'today' | 'week' | 'month'): { start: Date; end: Date } {
  const end = endOfDay();
  const start = new Date();
  if (range === 'today') start.setHours(0, 0, 0, 0);
  else if (range === 'week') { start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0); }
  else { start.setDate(1); start.setHours(0, 0, 0, 0); }
  return { start, end };
}

export const dateOnly = (d: Date): string => d.toISOString().slice(0, 10);

/** Is a due date overdue relative to now (ignoring time)? */
export function isOverdue(dueDate: Date | null | undefined): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < startOfDay();
}

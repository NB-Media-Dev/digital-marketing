/** Human-friendly codes, e.g. TSK-8F3A21. Uniqueness enforced by DB constraints. */
export function code(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${rand}`;
}

/**
 * Coerces a backend coordinate (number or Prisma Decimal serialized as a
 * string) to a finite number. Returns null for missing or invalid values.
 */
export function toFiniteCoord(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

/** Every string reachable from a content object, depth-first. */
export function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).flatMap(collectStrings);
  return [];
}

/** Returns a reason when a string breaks the site's copy rules, null otherwise. */
export function forbiddenCopy(s: string): string | null {
  if (s.includes('—')) return 'em dash';
  if (/<date>|\bTODO\b|\bTBD\b|lorem ipsum/i.test(s)) return 'placeholder left in copy';
  if (/would love to join|dream job|please consider/i.test(s)) return 'pleading tone';
  return null;
}

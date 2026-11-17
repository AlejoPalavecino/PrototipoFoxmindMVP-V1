export function normalizeClassroomCode(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 48) return;
  if (value.length === 24 && /^[\w-]{24}$/.test(value)) return value;
  const grouped = value.replace(/ /g, '');
  if (grouped.length === 6 && /^[0-9]{6}$/.test(grouped)) return grouped;
}


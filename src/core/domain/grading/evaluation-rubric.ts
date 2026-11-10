export interface EvaluationCriterion { name: string; description: string; weight: number }
export type EvaluationRubric = EvaluationCriterion[];

/** Empty is allowed for existing activities. A configured rubric must total exactly 100%. */
export function parseEvaluationRubric(input: unknown): EvaluationRubric {
  const invalid = (): never => { throw new Error('INVALID_EVALUATION_RUBRIC'); };
  if (!Array.isArray(input) || input.length > 12) return invalid();
  const names = new Set<string>();
  const criteria = input.map((value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
    const row = value as Record<string, unknown>;
    if (Object.keys(row).some(key => !['name', 'description', 'weight'].includes(key))
      || typeof row.name !== 'string' || typeof row.description !== 'string' || typeof row.weight !== 'number') return invalid();
    const name = row.name.trim(), description = row.description.trim(), key = name.normalize('NFKC').toLocaleLowerCase('es');
    if (!name || name.length > 120 || description.length > 1000 || /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(name + description)
      || !Number.isInteger(row.weight) || row.weight < 1 || row.weight > 100 || names.has(key)) return invalid();
    names.add(key);
    return { name, description, weight: row.weight };
  });
  if (criteria.length && criteria.reduce((total, criterion) => total + criterion.weight, 0) !== 100) return invalid();
  return criteria;
}

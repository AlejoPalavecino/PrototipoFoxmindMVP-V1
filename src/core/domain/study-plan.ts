export interface CurriculumUnit { name: string; topics: { name: string }[] }
export type CurriculumWarning = 'PARTIAL_STRUCTURE' | 'DOCX_IMAGES_OMITTED';
export interface ExtractedCurriculum { units: CurriculumUnit[]; warnings: CurriculumWarning[] }

export class InvalidExtractionInput extends Error {
  readonly code = 'INVALID_INPUT';
  constructor() { super('INVALID_INPUT'); }
}
export function invalidInput(): never { throw new InvalidExtractionInput(); }
export function strictObject(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalidInput();
  const source = value as Record<string, unknown>;
  if (Object.keys(source).length !== keys.length || keys.some(key => !Object.hasOwn(source, key))
    || Object.keys(source).some(key => !keys.includes(key))) return invalidInput();
  return source;
}
function name(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || [...value].length > 120
    || /[\u0000-\u001f\u007f-\u009f]/u.test(value)) return invalidInput();
  return value.trim();
}
export function parseCurriculumUnits(value: unknown): CurriculumUnit[] {
  if (!Array.isArray(value) || !value.length || value.length > 100) return invalidInput();
  const units = value.map((entry: unknown) => {
    const unit = strictObject(entry, ['name', 'topics']);
    if (!Array.isArray(unit.topics) || !unit.topics.length || unit.topics.length > 100) return invalidInput();
    return { name: name(unit.name), topics: unit.topics.map((topic: unknown) => ({
      name: name(strictObject(topic, ['name']).name),
    })) };
  });
  if (units.reduce((sum, unit) => sum + unit.topics.length, 0) > 500) return invalidInput();
  return units;
}
export function parseExtractedCurriculum(value: unknown): ExtractedCurriculum {
  const source = strictObject(value, ['units', 'warnings']);
  if (!Array.isArray(source.warnings) || source.warnings.length > 2
    || source.warnings.some(warning => warning !== 'PARTIAL_STRUCTURE' && warning !== 'DOCX_IMAGES_OMITTED')
    || new Set(source.warnings).size !== source.warnings.length) return invalidInput();
  return { units: parseCurriculumUnits(source.units), warnings: source.warnings as CurriculumWarning[] };
}

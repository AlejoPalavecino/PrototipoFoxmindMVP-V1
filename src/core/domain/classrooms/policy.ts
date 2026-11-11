import { CLASSROOM_COVER_KEYS, isClassroomCoverKey } from './cover.ts';
export type ClassroomErrorCode =
  | 'INVALID_INPUT'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'INVITATION_BATCH_NOT_FOUND'
  | 'ENROLLMENT_UNAVAILABLE'
  | 'SERVICE_UNAVAILABLE';
export class ClassroomError extends Error {
  readonly code: ClassroomErrorCode;
  constructor(code: ClassroomErrorCode) {
    super(code);
    this.code = code;
  }
}
export const fail = (code: ClassroomErrorCode): never => {
  throw new ClassroomError(code);
};
export const uuid = (x: unknown): x is string =>
  typeof x === 'string' &&
  /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(x);
const coverLabels = ['Explorar', 'Crear', 'Descubrir', 'Literatura', 'Matemática', 'Biología', 'Sociedad', 'Ciencias', 'Creatividad', 'General'];
export const covers = CLASSROOM_COVER_KEYS.map((key, index) => ({ key, label: coverLabels[index], color: '#e99e5a' }));
export interface CurriculumUnit {
  name: string;
  topics: { name: string }[];
}
export interface DraftPayload {
  name?: string;
  subject?: string;
  division?: string;
  academicYear?: number;
  timezone?: string;
  coverKey?: string;
  planFileId?: string;
  units?: CurriculumUnit[];
}
export function object(value: unknown, keys: string[]): Record<string, any> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !keys.includes(k))
  )
    fail('INVALID_INPUT');
  return value as Record<string, any>;
}
export function text(value: unknown, max: number, required = true): string {
  if (
    typeof value !== 'string' ||
    /[\u0000-\u001f\u007f-\u009f]/u.test(value) ||
    [...value].length > max ||
    (required && !value.trim())
  )
    fail('INVALID_INPUT');
  return (value as string).trim();
}
export function draftPayload(input: unknown, publish: boolean): DraftPayload {
  const keys = [
    'name',
    'subject',
    'division',
    'academicYear',
    'timezone',
    'coverKey',
    'planFileId',
    'units',
  ];
  const source = object(input, keys),
    out: DraftPayload = {};
  for (const key of ['name', 'subject', 'division'] as const) {
    if (publish || source[key] !== undefined)
      out[key] = text(source[key], key === 'division' ? 60 : 120, publish);
  }
  if (publish || source.academicYear !== undefined) {
    if (
      !Number.isInteger(source.academicYear) ||
      source.academicYear < 1 ||
      source.academicYear > 9999
    )
      fail('INVALID_INPUT');
    out.academicYear = source.academicYear;
  }
  if (publish || source.timezone !== undefined) {
    out.timezone = text(source.timezone, 100, publish);
    if (publish && /^[+-]/.test(out.timezone)) fail('INVALID_INPUT');
    if (publish)
      try {
        new Intl.DateTimeFormat('es', { timeZone: out.timezone }).format();
      } catch {
        fail('INVALID_INPUT');
      }
  }
  if (publish || source.coverKey !== undefined) {
    if (!isClassroomCoverKey(source.coverKey)) fail('INVALID_INPUT');
    out.coverKey = source.coverKey;
  }
  if (source.planFileId !== undefined) {
    if (!uuid(source.planFileId)) fail('INVALID_INPUT');
    out.planFileId = source.planFileId;
  }
  if (publish || source.units !== undefined) {
    if (
      !Array.isArray(source.units) ||
      source.units.length > 100 ||
      (publish && !source.units.length)
    )
      fail('INVALID_INPUT');
    out.units = source.units.map((u: unknown) => {
      const unit = object(u, ['name', 'topics']);
      if (
        !Array.isArray(unit.topics) ||
        unit.topics.length > 100 ||
        (publish && !unit.topics.length)
      )
        fail('INVALID_INPUT');
      return {
        name: text(unit.name, 120, publish),
        topics: unit.topics.map((t: unknown) => ({
          name: text(object(t, ['name']).name, 120, publish),
        })),
      };
    });
    if (out.units!.reduce((count, unit) => count + unit.topics.length, 0) > 500)
      fail('INVALID_INPUT');
  }
  return out;
}

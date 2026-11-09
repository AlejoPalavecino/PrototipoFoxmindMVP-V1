import { isClassroomCoverKey } from './classroom-cover.ts';
export class StudyError extends Error {
    readonly code: string;
    constructor(code: string) { super(code); this.code = code; }
}
export function studyFail(code: string): never { throw new StudyError(code); }
export function studyId(value: unknown): string { if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value))
    studyFail('INVALID_INPUT'); return value; }
export function studyRevision(value: unknown): string { if (typeof value !== 'string' || !/^([1-9]\d{0,14})$/u.test(value))
    studyFail('INVALID_INPUT'); return value; }
export function studyObject(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value))
    studyFail('INVALID_INPUT'); return value as Record<string, unknown>; }
export function studyText(value: unknown, max = 120, empty = false): string { if (typeof value !== 'string' || Array.from(value.trim()).length > max || (!empty && !value.trim()))
    studyFail('INVALID_INPUT'); return value.trim(); }
export interface StudyUnit {
    id: string;
    title: string;
    topics: {
        id: string;
        title: string;
    }[];
}
export interface FolderFields {
    name: string;
    academicYear: number;
    bannerKey: string;
    units: StudyUnit[];
    linkedClassroomId: string | null;
    planFileId: string | null;
}
export function validateFolder(value: unknown, active: boolean): FolderFields {
    const p = studyObject(value);
    if (Object.keys(p).some(k => !['name', 'academicYear', 'bannerKey', 'units', 'linkedClassroomId', 'planFileId'].includes(k)))
        studyFail('INVALID_INPUT');
    const name = studyText(p.name ?? '', 120, !active), academicYear = p.academicYear ?? new Date().getUTCFullYear(), bannerKey = p.bannerKey ?? 'general';
    if (!Number.isInteger(academicYear) || Number(academicYear) < 1 || Number(academicYear) > 9999 || !isClassroomCoverKey(bannerKey))
        studyFail('INVALID_INPUT');
    if (!Array.isArray(p.units ?? []) || (p.units as unknown[] | undefined)?.length! > 100)
        studyFail('INVALID_INPUT');
    const seen = new Set<string>();
    const units = (p.units as unknown[] ?? []).map(raw => { const u = studyObject(raw); const id = studyId(u.id); if (seen.has(id))
        studyFail('INVALID_INPUT'); seen.add(id); if (Object.keys(u).some(k => !['id', 'title', 'topics'].includes(k)) || !Array.isArray(u.topics) || u.topics.length > 200)
        studyFail('INVALID_INPUT'); return { id, title: studyText(u.title, 120, !active), topics: u.topics.map(raw => { const t = studyObject(raw); const id = studyId(t.id); if (Object.keys(t).some(k => !['id', 'title'].includes(k)) || seen.has(id))
            studyFail('INVALID_INPUT'); seen.add(id); return { id, title: studyText(t.title, 120, !active) }; }) }; });
    if (active && (p.planFileId == null || !units.length || units.some(u => !u.topics.length)))
        studyFail('INVALID_INPUT');
    return { name, academicYear: Number(academicYear), bannerKey: String(bannerKey), units, linkedClassroomId: p.linkedClassroomId == null ? null : studyId(p.linkedClassroomId), planFileId: p.planFileId == null ? null : studyId(p.planFileId) };
}


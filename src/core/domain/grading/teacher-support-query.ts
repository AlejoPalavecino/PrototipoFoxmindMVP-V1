import { contractUuid } from '../classrooms/contract-values.ts';

/** Shared by the API and its same-origin proxy. The roster view always belongs to a single classroom. */
export function parseTeacherSupportQuery(params: URLSearchParams) {
  for (const key of params.keys()) {
    if (!['page', 'classroomId', 'roster'].includes(key) || params.getAll(key).length !== 1) throw new Error('INVALID_INPUT');
  }
  const classroomId = params.get('classroomId');
  const page = params.get('page') ?? '1';
  const roster = params.get('roster');
  if (classroomId !== null && !contractUuid(classroomId)) throw new Error('INVALID_INPUT');
  if (!/^[1-9][0-9]{0,6}$/.test(page) || Number(page) > 1_000_000) throw new Error('INVALID_INPUT');
  if (roster !== null && (roster !== 'true' || !classroomId)) throw new Error('INVALID_INPUT');
  return { classroomId, page: Number(page), roster: roster === 'true' };
}

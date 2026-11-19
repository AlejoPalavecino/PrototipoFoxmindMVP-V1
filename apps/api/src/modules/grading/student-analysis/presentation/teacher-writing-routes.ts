import type { AcademicRoute } from '../../../../../../../src/core/contracts/academic-http.ts';
import { fail, uuid } from '../../../../../../../src/core/domain/classrooms/policy.ts';
import type { TeacherWritingService } from '../application/teacher-writing-service.ts';

export type TeacherWritingHttpOperations = Pick<TeacherWritingService, 'getTeacherWriting' | 'startTeacherWriting' | 'getTeacherWritingEvidence'>;

export function createTeacherWritingRoute(operations: TeacherWritingHttpOperations): AcademicRoute {
  return { order: 15, async handle({ request, path, method, headers, exact }) {
    const writing = path[1] === 'members' && path[3] === 'support' && path[4] === 'writing';
    const evidence = path.length === 7 && path[5] === 'evidence';
    if (!writing || (path.length !== 5 && !evidence)) return { handled: false };
    if (!uuid(path[0]) || !uuid(path[2]) || headers['x-attempt-editor'] !== undefined ||
      headers['x-attempt-epoch'] !== undefined) return fail('INVALID_INPUT');
    if (evidence) {
      if (method !== 'GET' || !uuid(path[6])) return fail('INVALID_INPUT');
      return { handled: true, value: await operations.getTeacherWritingEvidence(request, path[0], path[2], path[6]) };
    }
    if (method === 'GET') return { handled: true, value: await operations.getTeacherWriting(request, path[0], path[2]) };
    if (method !== 'POST') return fail('INVALID_INPUT');
    exact([]);
    return { handled: true, value: await operations.startTeacherWriting(request, path[0], path[2]) };
  } };
}

import type { AcademicRoute } from '../../../../../../../src/core/contracts/academic-http.ts';
import { parseTeacherSupportQuery } from '../../../../../../../src/core/domain/grading/teacher-support-query.ts';
import { fail, uuid } from '../../../../../../../src/core/domain/classrooms/policy.ts';
import type { TeacherSupportService } from '../application/teacher-support.ts';

export type TeacherSupportHttpOperations = Pick<TeacherSupportService, 'listTeacherSupport' | 'getTeacherSupport' | 'getTeacherSupportEvidence'>;

export function createTeacherSupportRoute(operations: TeacherSupportHttpOperations): AcademicRoute {
  return {
    order: 15,
    async handle({ request, method, path, search, headers }) {
      const list = path.length === 1 && path[0] === 'teacher-support';
      const member = path[1] === 'members' && path[3] === 'support' &&
        (path.length === 4 || (path.length === 6 && path[4] === 'evidence'));
      if (!list && !member) return { handled: false };
      if (method !== 'GET' || headers['x-attempt-editor'] !== undefined || headers['x-attempt-epoch'] !== undefined) return fail('INVALID_INPUT');
      if (list) {
        let query: ReturnType<typeof parseTeacherSupportQuery>;
        try { query = parseTeacherSupportQuery(search); } catch { return fail('INVALID_INPUT'); }
        return { handled: true, value: await operations.listTeacherSupport(request, query) };
      }
      if (!uuid(path[0]) || !uuid(path[2]) || (path.length === 6 && !uuid(path[5]))) return fail('INVALID_INPUT');
      const value = path.length === 4 ? await operations.getTeacherSupport(request, path[0], path[2])
        : await operations.getTeacherSupportEvidence(request, path[0], path[2], path[5]);
      return { handled: true, value };
    },
  };
}

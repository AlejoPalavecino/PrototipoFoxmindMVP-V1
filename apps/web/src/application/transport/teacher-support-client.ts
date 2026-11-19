import type { ClassroomClient } from '../../../../../src/core/contracts/academic-client.ts';
import type { TeacherWritingAnalysis } from '../../../../../src/core/contracts/teacher-writing.ts';
import type { TeacherSupportEvidence, TeacherSupportList, TeacherSupportRecord } from '../../../../../src/core/contracts/teacher-support.ts';

export function createTeacherSupportClient(api: Pick<ClassroomClient, 'call'>) {
  const memberPath = (classroomId: string, studentId: string) =>
    `/${encodeURIComponent(classroomId)}/members/${encodeURIComponent(studentId)}/support`;
  return {
    list(classroomId: string | null, page: number, signal?: AbortSignal, roster = false) {
      const query = new URLSearchParams({ page: String(page) });
      if (classroomId) query.set('classroomId', classroomId);
      if (roster) query.set('roster', 'true');
      return api.call<TeacherSupportList>('/teacher-support?' + query.toString(), 'GET', undefined, signal);
    },
    record(classroomId: string, studentId: string, signal?: AbortSignal) {
      return api.call<TeacherSupportRecord>(memberPath(classroomId, studentId), 'GET', undefined, signal);
    },
    writing(classroomId: string, studentId: string, signal?: AbortSignal) {
      return api.call<TeacherWritingAnalysis>(memberPath(classroomId, studentId) + '/writing', 'GET', undefined, signal);
    },
    requestWriting(classroomId: string, studentId: string, signal?: AbortSignal) {
      return api.call<TeacherWritingAnalysis>(memberPath(classroomId, studentId) + '/writing', 'POST', {}, signal);
    },
    writingEvidence(classroomId: string, studentId: string, attemptId: string, signal?: AbortSignal) {
      return api.call<TeacherSupportEvidence>(memberPath(classroomId, studentId) + '/writing/evidence/' + encodeURIComponent(attemptId), 'GET', undefined, signal);
    },
    evidence(classroomId: string, studentId: string, attemptId: string, signal?: AbortSignal) {
      return api.call<TeacherSupportEvidence>(
        memberPath(classroomId, studentId) + '/evidence/' + encodeURIComponent(attemptId), 'GET', undefined, signal,
      );
    },
  };
}

export type TeacherSupportClient = ReturnType<typeof createTeacherSupportClient>;

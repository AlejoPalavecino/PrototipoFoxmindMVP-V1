import type { TeacherWritingAnalysis } from '../../../../../src/core/contracts/teacher-writing.ts';
import type { TeacherSupportEntry, TeacherSupportEvidence, TeacherSupportList, TeacherSupportRecord } from '../../../../../src/core/contracts/teacher-support.ts';

export type SupportStudent = Pick<TeacherSupportEntry, 'classroomId' | 'studentId' | 'firstName' | 'lastName'> & {division?:string; email?:string};

export interface TeacherWritingReader {
  writing(classroomId:string,studentId:string,signal?:AbortSignal):Promise<TeacherWritingAnalysis>;
  requestWriting(classroomId:string,studentId:string,signal?:AbortSignal):Promise<TeacherWritingAnalysis>;
}
export interface TeacherSupportReader extends Partial<TeacherWritingReader> {
  writingEvidence?(classroomId:string,studentId:string,attemptId:string,signal?:AbortSignal):Promise<TeacherSupportEvidence>;
  list(classroomId: string | null, page: number, signal?: AbortSignal, roster?: boolean): Promise<TeacherSupportList>;
  record(classroomId: string, studentId: string, signal?: AbortSignal): Promise<TeacherSupportRecord>;
  evidence(classroomId: string, studentId: string, attemptId: string, signal?: AbortSignal): Promise<TeacherSupportEvidence>;
}

export function supportAccessEnded(error: unknown) {
  const status = (error as {status?: number} | null)?.status;
  return status === 401 || status === 403 || status === 404;
}

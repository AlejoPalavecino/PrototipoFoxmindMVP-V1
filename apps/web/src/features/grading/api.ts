import type { ClassroomClient } from '../../../../../src/core/contracts/academic-client.ts';
import type { GradeCorrectionsOperations, GradingAiReviewOperations, GradingEditingOperations, GradingProgressOperations, GradingPublicationOperations, GradingResultsOperations, StudentSummaryOperations } from './model/grading-operations.ts';

export type { GradeCorrectionsOperations, GradingAiApplication, GradingAiDecision, GradingAiJob, GradingAiReviewOperations, GradingEditingOperations, GradingProgressOperations, GradingPublicationOperations, GradingResultsOperations, StudentSummary, StudentSummaryFinding, StudentSummaryOperations } from './model/grading-operations.ts';
export type GradingTransport = Pick<ClassroomClient, 'call'>;
export type GradingFileTransport = Pick<ClassroomClient, 'call' | 'fileUrl'>;

export function createGradingEditingApi(transport: GradingFileTransport, roomId: string, attemptId: string): GradingEditingOperations {
  const path = `/${roomId}/attempts/${attemptId}/grading`;
  return {
    load: signal => transport.call(path, 'GET', undefined, signal),
    save: (input, signal) => transport.call(path, 'POST', input, signal),
    fileUrl: id => transport.fileUrl(id),
  };
}
export function createGradingPublicationApi(transport: GradingTransport, roomId: string, attemptId: string): GradingPublicationOperations {
  return { publish: (revision, signal) => transport.call(`/${roomId}/attempts/${attemptId}/publish-grade`, 'POST', { revision, confirm: true }, signal) };
}
export function createGradingAiReviewApi(transport: GradingTransport, roomId: string, attemptId: string): GradingAiReviewOperations {
  const path = `/${roomId}/attempts/${attemptId}/grading-ai`;
  return {
    load: signal => transport.call(path, 'GET', undefined, signal),
    apply: (jobId, input, signal) => transport.call(`${path}/${jobId}/apply`, 'POST', input, signal),
    discard: (jobId, input, signal) => transport.call(`${path}/${jobId}/discard`, 'POST', input, signal),
  };
}
export function createGradeCorrectionsApi(transport: GradingTransport, roomId: string, attemptId: string): GradeCorrectionsOperations {
  const path = `/${roomId}/attempts/${attemptId}/grade-corrections`;
  return {
    load: signal => transport.call(path, 'GET', undefined, signal),
    correct: (input, signal) => transport.call(path, 'POST', input, signal),
  };
}
export function createGradingResultsApi(transport: GradingFileTransport, roomId: string, attemptId: string): GradingResultsOperations {
  return {
    load: signal => transport.call(`/${roomId}/attempts/${attemptId}/result`, 'GET', undefined, signal),
    fileUrl: id => transport.fileUrl(id),
  };
}
export function createGradingProgressApi(transport: GradingTransport, roomId: string): GradingProgressOperations {
  return { load: (studentId, signal) => transport.call(studentId ? `/${roomId}/members/${studentId}/progress` : `/${roomId}/progress`, undefined, undefined, signal) };
}
export function createStudentSummaryApi(transport: GradingTransport, roomId: string, studentId: string): StudentSummaryOperations {
  return { load: signal => transport.call(`/${roomId}/members/${studentId}/ai-summary`, undefined, undefined, signal) };
}

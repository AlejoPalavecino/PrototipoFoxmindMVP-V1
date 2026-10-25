export type Participation = 'study' | 'teach' | 'mixed' | 'none';
export const HOME_MODULES = ['pending', 'review', 'feedback', 'agenda', 'queries', 'materials', 'classrooms'] as const;
export type HomeModuleName = typeof HOME_MODULES[number];
export type HomeRole = 'teacher' | 'student';
export type HomeActivityType = 'ASSIGNMENT' | 'QUESTIONNAIRE' | 'EVALUATION';
export interface HomeRoom {
  id: string; name: string; division: string; subject: string;
  role: HomeRole; coverKey: string; archived: boolean; timeZone: string;
}
export type HomeTarget =
  | { kind: 'classroom'; classroomId: string; section: 'plan' }
  | { kind: 'activity'; classroomId: string; activityId: string }
  | { kind: 'submissions'; classroomId: string; activityId: string; filter: 'unpublished' }
  | { kind: 'grade'; classroomId: string; activityId: string; attemptId: string; gradeId: string }
  | { kind: 'wall'; classroomId: string; postId: string }
  | { kind: 'material'; classroomId: string; materialId: string }
  | { kind: 'create-activity' | 'upload-material' | 'publish-notice'; classroomId: string }
  | { kind: 'private-event'; eventId: string; occurrenceId: string; date: string };
export interface HomeItem { id: string; title: string; target: HomeTarget }
export interface PendingItem extends HomeItem {
  classroom: HomeRoom; activityType: HomeActivityType;
  state: 'first-submission' | 'resubmission'; attemptId: string | null;
  deadlineAt: string | null; reception: 'open' | 'closed'; late: boolean;
}
export interface ReviewItem extends HomeItem {
  classroom: HomeRoom; activityType: HomeActivityType;
  needsReview: number; readyToPublish: number; oldestSubmittedAt: string;
}
export interface FeedbackItem extends HomeItem {
  classroom: HomeRoom; activityType: HomeActivityType; attemptNumber: number;
  finalGrade: string; publishedAt: string; changedAt: string; availability: 'available';
}
export interface QueryItem extends HomeItem { classroom: HomeRoom; updatedAt: string }
export interface MaterialItem extends HomeItem { classroom: HomeRoom; publishedAt: string; extension: string }
export interface AgendaItem extends HomeItem {
  source: 'PRIVATE_EVENT' | 'ACADEMIC_DEADLINE'; startAt: string | null;
  date: string; timeZone: string; allDay: boolean; classroom: HomeRoom | null;
}
export interface ClassroomItem extends HomeItem { classroom: HomeRoom }
export type HomePage<T> =
  | { status: 'ready'; items: T[]; totalItems: number | null; nextCursor: string | null }
  | { status: 'error'; code: 'SERVICE_UNAVAILABLE'; retryable: true }
  | { status: 'not-applicable' };
export interface HomeModules {
  pending: HomePage<PendingItem>;
  review: HomePage<ReviewItem> & { totals?: { attempts: number; needsReview: number; readyToPublish: number } };
  feedback: HomePage<FeedbackItem>; agenda: HomePage<AgendaItem>; queries: HomePage<QueryItem>;
  materials: HomePage<MaterialItem>; classrooms: HomePage<ClassroomItem>;
}
export interface HomeResponse {
  version: 1; subjectId: string; generatedAt: string; timeZone: string; participation: Participation;
  memberships: { study: number; teach: number; archived: number };
  setup: { drafts: number; invitations: number }; modules: HomeModules;
}
export interface HomeQuery { timeZone: string }
export interface HomePageQuery extends HomeQuery { module: HomeModuleName; cursor: string | null }
export interface HomeModuleResponse<M extends HomeModuleName = HomeModuleName> {
  subjectId: string; generatedAt: string; module: M; page: HomeModules[M];
}
export class HomeError extends Error {
  readonly code: 'INVALID_INPUT' | 'FORBIDDEN' | 'SERVICE_UNAVAILABLE';
  constructor(code: HomeError['code']) { super(code); this.code = code; }
}

import type { TeacherSupportEntry, TeacherSupportEvidence, TeacherSupportList, TeacherSupportObservation, TeacherSupportRecord } from '../../../../../../../src/core/contracts/teacher-support.ts';
import { parseEvaluationRubric } from '../../../../../../../src/core/domain/grading/evaluation-rubric.ts';
import { parseRubricMarks } from '../../../../../../../src/core/domain/grading/rubric-marks.ts';
import type { Actor, ClassroomAccess, Transaction } from '../../../classrooms/public.ts';
import { fail, uuid } from '../../../classrooms/public.ts';
import { performance } from '../../domain/progress-calculation.ts';
import { supportPriority } from '../../domain/teacher-support-policy.ts';

export interface SupportFacts extends Omit<TeacherSupportEntry, 'priority'> {
  oldestDays: number;
  expected: number;
  delivered: number;
}

export interface SupportGrade {
  activityId: string;
  attemptId: string;
  title: string;
  grade: string;
  feedback: string | null;
  rubric: unknown;
  marks: unknown;
}

export interface TeacherSupportRepository {
  evaluationTime(tx: Transaction): Promise<Date>;
  classrooms(tx: Transaction, teacherId: string): Promise<TeacherSupportList['classrooms']>;
  facts(tx: Transaction, teacherId: string, classroomIds: string[], studentId: string | null, now: Date): Promise<SupportFacts[]>;
  grades(tx: Transaction, classroomId: string, studentId: string): Promise<SupportGrade[]>;
  evidence(tx: Transaction, classroomId: string, studentId: string, attemptId: string): Promise<Omit<TeacherSupportEvidence, 'timeZone'> | null>;
}

const pageSize = 20;
const order = { high: 0, medium: 1, low: 2, insufficient: 3 };
const collator = new Intl.Collator('es');
const oldestDeadline = (entry: TeacherSupportEntry) => entry.pending[0] ? Date.parse(entry.pending[0].deadlineAt) : 0;

function supportEntry({ expected: _expected, delivered, oldestDays, ...student }: SupportFacts): TeacherSupportEntry {
  return { ...student, priority: supportPriority({ pendingCount: student.pending.length, oldestDays, recentDelivered: delivered }) };
}

function publishedObservation(row: SupportGrade): TeacherSupportObservation | null {
  const { activityId, attemptId, title, feedback } = row;
  const strengths: string[] = [], improvements: string[] = [];
  const rubric = parseEvaluationRubric(row.rubric ?? []);
  const assessed = parseRubricMarks(row.marks).flatMap(mark =>
    mark.score !== null && rubric[mark.criterionIndex] ?
      [{ name: rubric[mark.criterionIndex].name, score: Number(mark.score) }] : []);
  const lowest = Math.min(...assessed.map(criterion => criterion.score));
  const highest = Math.max(...assessed.map(criterion => criterion.score));
  const revisit = lowest < highest ? assessed.find(criterion => criterion.score === lowest) : undefined;
  for (const { name, score } of assessed) {
    const scoreLabel = `${score.toLocaleString('es-AR')}/10`;
    if (score === 10) strengths.push(`${name} · Puntaje máximo (${scoreLabel})`);
    if (score === lowest && lowest < highest) improvements.push(`${name} · Menor puntaje de esta rúbrica (${scoreLabel})`);
  }
  if (!feedback?.trim() && !strengths.length && !improvements.length) return null;
  const nextStep = feedback?.trim() && revisit ?
    `En la próxima entrega, revisen juntos «${revisit.name}». Después, comparen cómo aplicó ese criterio en los dos trabajos.` : null;
  return { activityId, attemptId, title, feedback, strengths: strengths.slice(0, 3), improvements: improvements.slice(0, 3), nextStep };
}

export class TeacherSupportService {
  constructor(
    private readonly access: Pick<ClassroomAccess, 'run' | 'classroom'>,
    private readonly repository: TeacherSupportRepository,
    private readonly readSharedStrategies: (tx: Transaction, audience: { teacherId: string; classroomId: string; studentId: string }) => Promise<TeacherSupportRecord['sharedStrategies']>,
  ) {}

  listTeacherSupport(request: unknown, query: { classroomId: string | null; page: number; roster: boolean }): Promise<TeacherSupportList> {
    return this.access.run(request, false, async (tx, actor) => {
      if (actor.account_role !== 'teacher') return fail('FORBIDDEN');
      const classrooms = await this.repository.classrooms(tx, actor.id);
      const classroomId = query.classroomId?.toLowerCase();
      const classroomIds = classrooms.filter(room => !classroomId || room.id === classroomId).map(room => room.id);
      if (classroomId && !classroomIds.length) return fail('FORBIDDEN');
      const facts = classroomIds.length ?
        await this.repository.facts(tx, actor.id, classroomIds, null, await this.repository.evaluationTime(tx)) : [];
      const items = facts.map(supportEntry);
      const counts = { high: 0, medium: 0, low: 0 };
      for (const item of items) if (item.priority !== 'insufficient') counts[item.priority]++;
      const visible = items.filter(item => query.roster || item.priority !== 'insufficient');
      visible.sort((left, right) => order[left.priority] - order[right.priority]
        || oldestDeadline(left) - oldestDeadline(right)
        || collator.compare(left.lastName, right.lastName) || collator.compare(left.firstName, right.firstName)
        || left.classroomId.localeCompare(right.classroomId) || left.studentId.localeCompare(right.studentId));
      const start = (query.page - 1) * pageSize;
      classrooms.sort((left, right) => collator.compare(left.name, right.name) || collator.compare(left.division, right.division));
      return { classrooms, counts, items: visible.slice(start, start + pageSize), total: visible.length, page: query.page, pageSize };
    });
  }

  private async activeMember(tx: Transaction, actor: Actor, classroomId: string, studentId: string) {
    if (actor.account_role !== 'teacher' || !uuid(studentId)) return fail('FORBIDDEN');
    const room = await this.access.classroom(tx, actor, classroomId, false, true);
    if (room.archived_at) return fail('FORBIDDEN');
    const evaluatedAt = await this.repository.evaluationTime(tx);
    const [student] = await this.repository.facts(tx, actor.id, [classroomId], studentId, evaluatedAt);
    if (!student) return fail('FORBIDDEN');
    return { student, evaluatedAt };
  }

  getTeacherSupport(request: unknown, classroomId: string, studentId: string): Promise<TeacherSupportRecord> {
    return this.access.run(request, false, async (tx, actor) => {
      const { student, evaluatedAt } = await this.activeMember(tx, actor, classroomId, studentId);
      const grades = await this.repository.grades(tx, classroomId, studentId);
      const sharedStrategies = await this.readSharedStrategies(tx, { teacherId: actor.id, classroomId, studentId });
      const observations = grades.slice().reverse().flatMap(row => {
        const observation = publishedObservation(row);
        return observation ? [observation] : [];
      }).slice(0, 3);
      return {
        ...supportEntry(student), completion: { expected: student.expected, delivered: student.delivered },
        performance: performance(grades.map(row => row.grade)),
        grades: grades.map(({ activityId, title, grade }) => ({ activityId, title, grade })),
        sharedStrategies, observations, evaluatedAt: evaluatedAt.toISOString(),
      };
    });
  }

  getTeacherSupportEvidence(request: unknown, classroomId: string, studentId: string, attemptId: string): Promise<TeacherSupportEvidence> {
    return this.access.run(request, false, async (tx, actor) => {
      const { student } = await this.activeMember(tx, actor, classroomId, studentId);
      if (!uuid(attemptId)) return fail('FORBIDDEN');
      const evidence = await this.repository.evidence(tx, classroomId, studentId, attemptId);
      if (!evidence) return fail('FORBIDDEN');
      return { ...evidence, timeZone: student.timeZone };
    });
  }
}

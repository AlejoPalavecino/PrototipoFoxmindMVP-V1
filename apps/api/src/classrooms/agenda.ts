import { AgendaError, agendaId, localMinuteAt, parseAgendaRange } from '../../../../src/core/domain/index.ts';
import type { AcademicAgendaPort, AcademicDeadline, AgendaActor, AgendaTarget } from '../../../../src/core/domain/index.ts';
import { receptionPolicy } from './attempt-policy.ts';
import { hasAgendaTarget, readAcademicAgenda } from './agenda-query.ts';
import type { AgendaAcademicRow, AgendaTransaction } from './agenda-query.ts';

function academicDeadline(row: AgendaAcademicRow, now: Date): AcademicDeadline | null {
  const { deadline } = receptionPolicy(row.general_deadline, row.individual_deadline, false, now);
  if (!deadline) return null;
  return {
    kind: 'ACADEMIC_DEADLINE',
    id: row.id,
    target: { classroomId: row.classroom_id, activityId: row.id },
    classroomName: row.classroom_name,
    title: row.title,
    activityType: row.activity_type,
    role: row.role,
    deadlineAt: deadline.toISOString(),
    timeZone: row.timezone,
    pending: row.role === 'teacher' || row.attempt_status !== 'SUBMITTED',
    resubmission: row.role === 'student' && (row.attempt_number ?? 0) > 1,
  };
}

async function deadlines(tx: AgendaTransaction, actor: AgendaActor) {
  const rows = await readAcademicAgenda(tx, actor.userId);
  const result = rows.map(row => academicDeadline(row, new Date(actor.now)))
    .filter((row): row is AcademicDeadline => row !== null);
  return result.sort((a, b) => a.deadlineAt.localeCompare(b.deadlineAt) || a.id.localeCompare(b.id));
}

async function resolveTarget(tx: AgendaTransaction, actor: AgendaActor,
  target: AgendaTarget): Promise<AgendaTarget | null> {
  const classroomId = agendaId(target.classroomId);
  const activityId = target.activityId === null ? null : agendaId(target.activityId);
  return await hasAgendaTarget(tx, actor.userId, classroomId, activityId)
    ? { classroomId, activityId } : null;
}

export function createAcademicAgenda(tx: AgendaTransaction, actor: AgendaActor): AcademicAgendaPort {
  return {
    async list(input) {
      const range = parseAgendaRange(input);
      return (await deadlines(tx, actor)).filter(row => {
        const date = localMinuteAt(Date.parse(row.deadlineAt), range.timeZone).slice(0, 10);
        return date >= range.startDate && date < range.endDateExclusive;
      });
    },
    async upcoming(limit) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new AgendaError('INVALID_INPUT');
      return (await deadlines(tx, actor))
        .filter(row => row.pending && Date.parse(row.deadlineAt) > Date.parse(actor.now))
        .slice(0, limit);
    },
    resolveTarget: target => resolveTarget(tx, actor, target),
  };
}

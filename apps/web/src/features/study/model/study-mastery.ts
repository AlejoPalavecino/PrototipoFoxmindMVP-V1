import type { StudyDetail } from './study-contracts.ts';

export type TopicMastery = { level: 0 | 1 | 2 | 3; evidence: number };

/**
 * Three-step mastery per topic, derived only from finalized practices the client already holds.
 * Without scored questions for the topic the level stays 0 ("Sin practicar"); nothing is guessed.
 */
export function studyTopicMastery(practices: StudyDetail['practices'], topicId: string): TopicMastery {
  let total = 0, evidence = 0;
  for (const practice of practices) {
    if (practice.status !== 'FINALIZED') continue;
    const rows = (practice.result as { questions?: unknown } | undefined)?.questions;
    if (!Array.isArray(rows)) continue;
    for (const row of rows as { topicId?: unknown; score?: unknown }[]) {
      if (row && row.topicId === topicId && typeof row.score === 'number') {
        total += row.score;
        evidence += 1;
      }
    }
  }
  if (!evidence) return { level: 0, evidence };
  const average = total / evidence;
  return { level: average >= 0.8 ? 3 : average >= 0.5 ? 2 : 1, evidence };
}

export function studyMasteryLabel(mastery: TopicMastery): string {
  return mastery.level ? `Dominio: ${mastery.level} de 3` : 'Sin practicar';
}

/** The next review session that already has a calendar event, if the folder exposes one. */
export function studyNextReview(detail: Pick<StudyDetail, 'exams' | 'scheduledReviewSessions'>, now = Date.now()) {
  const scheduled = new Set((detail.scheduledReviewSessions ?? []).map((item) => item.sessionId));
  let best: { startAt: string; timeZone: string; title: string; minutes: number; topicId: string } | undefined;
  for (const exam of detail.exams ?? []) {
    for (const session of exam.sessions) {
      const start = Date.parse(session.startAt);
      if (!scheduled.has(session.id) || !Number.isFinite(start) || start < now) continue;
      if (!best || start < Date.parse(best.startAt))
        best = { startAt: session.startAt, timeZone: exam.timeZone, title: session.title, minutes: session.minutes, topicId: session.topicId };
    }
  }
  return best;
}

export function studyReviewWhen(startAt: string, timeZone: string): string {
  try {
    const date = new Date(startAt);
    const day = new Intl.DateTimeFormat('es-AR', { weekday: 'long', timeZone }).format(date);
    const time = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(date);
    return `${day.charAt(0).toUpperCase()}${day.slice(1)} ${time}`;
  } catch {
    return new Date(startAt).toLocaleString('es-AR');
  }
}

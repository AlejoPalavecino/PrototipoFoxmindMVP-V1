import { planExam, type GeneratedReviewSession, type StudyTopic } from '../../../../../../../src/core/domain/study/engine.ts';
import { studyFail, studyObject, studyText } from '../../../../../../../src/core/domain/study/folders.ts';
import type { StudyReviewRequest } from '../../../../../../../src/core/domain/study/review.ts';

export function prepareReviewPlan(value: unknown, topics: StudyTopic[]) {
  const review = studyObject(value);
  if (Object.keys(review).some(field => !['examAt', 'timeZone', 'availability'].includes(field)) ||
    !Array.isArray(review.availability) || review.availability.length < 2 || review.availability.length > 5)
    return studyFail('INVALID_INPUT');
  const request: StudyReviewRequest = {
    examAt: studyText(review.examAt, 100),
    timeZone: studyText(review.timeZone, 100),
    availability: review.availability.map(slot => {
      const window = studyObject(slot);
      if (Object.keys(window).some(field => field !== 'start' && field !== 'minutes') || typeof window.minutes !== 'number')
        return studyFail('INVALID_INPUT');
      return { start: studyText(window.start, 100), minutes: window.minutes };
    }),
  };
  try {
    const schedule = planExam({ ...request, topics, now: new Date().toISOString(), minutesPerTopic: 1, sessionCount: request.availability.length });
    return { request: { ...request, availability: schedule.sessions.map(({ startAt, minutes }) => ({ start: startAt, minutes })) }, schedule };
  } catch {
    return studyFail('INVALID_INPUT');
  }
}

export function applyGeneratedReviewSessions(
  plan: ReturnType<typeof prepareReviewPlan>, proposals: GeneratedReviewSession[] | undefined, newId: () => string,
) {
  if (!proposals || proposals.length !== plan.schedule.sessions.length) return studyFail('AI_UNAVAILABLE');
  return plan.schedule.sessions.map((session, index) => {
    const { title, topicIds, activity } = proposals[index]!;
    return { ...session, title, topicIds, activity, id: newId(), reminderMinutes: null };
  });
}

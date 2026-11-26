/** Folder-level progress for the study collection: how many topics have scored evidence and which one needs the most work. */
export type StudyTopicRef = { id: string; title: string };
export type StudyScoreRow = { topicId: string; score: number | null };
export type StudyFolderProgress = { topics: number; practicedTopics: number; weakestTopic?: StudyTopicRef };

/** Same threshold the rail uses for «logrado»: an average of 0.8 or more is not a weak topic. */
const MASTERED = 0.8;

/**
 * Only finalized, scored answers count (development answers awaiting feedback have no score), and only for topics
 * still in the folder. Nothing is inferred for topics without evidence.
 */
export function studyFolderProgress(topics: StudyTopicRef[], scores: StudyScoreRow[]): StudyFolderProgress {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const row of scores) {
    if (typeof row.score !== 'number' || !Number.isFinite(row.score)) continue;
    const entry = totals.get(row.topicId) ?? { sum: 0, count: 0 };
    entry.sum += row.score;
    entry.count += 1;
    totals.set(row.topicId, entry);
  }
  let practicedTopics = 0, weakest: { topic: StudyTopicRef; average: number } | undefined;
  for (const topic of topics) {
    const entry = totals.get(topic.id);
    if (!entry) continue;
    practicedTopics += 1;
    const average = entry.sum / entry.count;
    if (average < MASTERED && (!weakest || average < weakest.average)) weakest = { topic, average };
  }
  return { topics: topics.length, practicedTopics, ...(weakest ? { weakestTopic: { id: weakest.topic.id, title: weakest.topic.title } } : {}) };
}

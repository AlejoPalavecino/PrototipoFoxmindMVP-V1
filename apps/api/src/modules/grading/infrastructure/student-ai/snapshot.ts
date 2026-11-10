import { createHash } from 'node:crypto';
import { createStudentAiEvidence, type StudentAiEvidence, type StudentAiProgress } from '../../../../../../../src/core/domain/index.ts';

import type { StudentProgress, StudentSnapshot, PrivateReference } from '../../application/student-snapshot.ts';
export type { StudentProgress, StudentSnapshot, PrivateReference } from '../../application/student-snapshot.ts';
export function studentSnapshot(progress: StudentProgress): StudentSnapshot | null {
  const evidence = createStudentAiEvidence(progress);
  if (!evidence) return null;
  const references = progress.activities.map((activity, index) => ({ ref: `A${index + 1}`, activityId: activity.id }));
  const hash = createHash('sha256').update(JSON.stringify({ evidence, references })).digest('hex');
  return { evidence, references, hash };
}

export function sameReferences(snapshot: StudentSnapshot, stored: unknown): boolean {
  return Array.isArray(stored) && stored.length === snapshot.references.length
    && stored.every((item, index) => item && typeof item === 'object' && Object.keys(item).length === 2
      && item.ref === snapshot.references[index]?.ref && item.activityId === snapshot.references[index]?.activityId);
}
export function displayReferences(snapshot: StudentSnapshot, stored: unknown, progress: StudentProgress) {
  if (!sameReferences(snapshot, stored)) return null;
  const titles = new Map(progress.activities.map(activity => [activity.id, activity.title]));
  if (titles.size !== snapshot.references.length) return null;
  const result = snapshot.references.map(({ ref, activityId }) => ({ ref, title: titles.get(activityId) }));
  return result.every(item => typeof item.title === 'string') ? result : null;
}

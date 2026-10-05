import type { Submission, SubmissionRepository } from '../model/Submission';
import { createSubmissionFixtures } from './submissionFixtures';

// Sole session owner. Exported only for the mockData live-binding compatibility bridge.
export let submissions = createSubmissionFixtures();

export const replaceSubmissions = (replacement: Submission[]): void => {
  submissions = replacement;
};

export const submissionRepository: SubmissionRepository = {
  read: () => submissions,
  replace: replaceSubmissions,
};

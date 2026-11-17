import * as application from '../application/attempt-access.ts';
import { repository } from './attempt-access-repository.ts';
export type { AttemptRow, Obligation, AttemptAccessRepository } from '../application/attempt-access.ts';
export const resolveAttemptContext = application.resolveAttemptContext.bind(null,repository);
export const assertAttemptWrite = application.assertAttemptWrite.bind(null,repository);

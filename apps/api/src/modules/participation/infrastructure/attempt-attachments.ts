import {createAttemptAttachments as create} from '../application/attempt-attachments.ts';
import {repository} from './attempt-attachments-repository.ts';
export function createAttemptAttachments(facts:Parameters<typeof create>[0]){return create(facts,repository)}

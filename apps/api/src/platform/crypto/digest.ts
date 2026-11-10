import { createHash } from 'node:crypto';
export const digest = (x: string) => createHash('sha256').update(x).digest('hex');

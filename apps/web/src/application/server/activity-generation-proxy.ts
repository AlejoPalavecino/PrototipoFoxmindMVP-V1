import { parseStartActivityGeneration, parseRegenerateActivityGeneration, parseApplyActivityGeneration } from '../../../../../src/core/domain/activities/activity-generation-request.ts';

export function generationSchema(path: string, value: unknown): boolean {
  try {
    if (path.endsWith('/apply')) parseApplyActivityGeneration(value);
    else if (path.endsWith('/regenerate')) parseRegenerateActivityGeneration(value);
    else parseStartActivityGeneration(value);
    return true;
  } catch { return false; }
}

import { parseStartActivityGeneration, parseApplyActivityGeneration } from '../../../../src/core/domain/index.ts';

export function generationSchema(path: string, value: unknown): boolean {
  try {
    if (path.endsWith('/apply')) parseApplyActivityGeneration(value);
    else if (path.endsWith('/regenerate')) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
      const { acknowledgePossibleCharge, ...request } = value as Record<string, unknown>;
      if (typeof acknowledgePossibleCharge !== 'boolean') return false;
      parseStartActivityGeneration(request);
    } else parseStartActivityGeneration(value);
    return true;
  } catch { return false; }
}

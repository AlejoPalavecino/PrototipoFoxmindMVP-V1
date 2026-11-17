import type { MutableRefObject } from 'react';

export type AttemptExitRef = MutableRefObject<{
  dirty: boolean;
  busy: boolean;
  save?: () => Promise<void>;
} | null>;

import { createSessionCsrfSource } from '../../../shared/http/csrf.ts';

/** One CSRF token for the study screens; account mutations in this tab drop it. */
export const studyCsrf = createSessionCsrfSource();

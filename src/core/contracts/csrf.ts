/**
 * Source of the API's CSRF token for a browser client. The token is derived from the session, so a
 * client may keep it until the API answers CSRF_INVALID or the session changes in this tab.
 */
export interface CsrfTokenSource {
  token(signal?: AbortSignal): Promise<string>;
  invalidate(): void;
}

/** Window event that account mutations dispatch when the session may have rotated in this tab. */
export const sessionChangedEvent = 'foxmind:session-changed';

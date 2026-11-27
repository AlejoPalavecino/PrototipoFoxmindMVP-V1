import { parseGradingView, parsePublishedGradeResult, parseGradeCorrectionsView } from '../../../../../src/core/domain/grading/grading-output.ts';
import { parseNotificationPage } from '../../../../../src/core/domain/home/notifications.ts';

/** Existing academic facade validation; the generic HTTP transport has no domain registry. */
export function decodeAcademicResponse(path: string, value: unknown): unknown {
  if (/\/attempts\/[^/]+\/(?:grading|publish-grade)$/.test(path)) return parseGradingView(value);
  if (/\/attempts\/[^/]+\/grade-corrections$/.test(path)) return parseGradeCorrectionsView(value);
  if (/\/attempts\/[^/]+\/result$/.test(path)) return parsePublishedGradeResult(value);
  if (/\/notifications\/page(?:\?|$)/.test(path)) return parseNotificationPage(value);
  return value;
}

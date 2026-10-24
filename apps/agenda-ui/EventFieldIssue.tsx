import type { DraftField, DraftIssue } from './event-draft-types.ts';

export function fieldAria(issues: readonly DraftIssue[], field: DraftField) {
  return issues.some(issue => issue.field === field)
    ? { 'aria-invalid': true as const, 'aria-describedby': `agenda-error-${field}` } : {};
}
export function FieldIssue({ issues, field }: { issues: readonly DraftIssue[]; field: DraftField }) {
  const issue = issues.find(item => item.field === field);
  return issue ? <p className="agenda-field-error" id={`agenda-error-${field}`}>{issue.message}</p> : null;
}

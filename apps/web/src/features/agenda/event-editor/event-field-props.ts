import type { DraftIssue, EventDraft } from './event-draft-types.ts';

export type EventFieldProps = { draft: EventDraft; onChange: (draft: EventDraft) => void; issues: readonly DraftIssue[] };

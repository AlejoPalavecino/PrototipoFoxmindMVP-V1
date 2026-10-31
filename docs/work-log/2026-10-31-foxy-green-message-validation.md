# Foxy invalid messages — 2026-10-31

Status: in progress. Preserve text for C0/C1 and definitive invalid responses; preserve uncertain idempotent intent.

Status: completed. Workspace rejects prohibited C0/C1 before dispatch and preserves input; controller returns accepted/uncertain/invalid, releases pending only for definitive INVALID_INPUT and preserves identical intent on uncertainty. UI clears only accepted/uncertain original text and preserves edits typed meanwhile.

Checks: RED observed; workspace/controller suites PASS 26; `npx tsc --project apps/web/tsconfig.json --noEmit` PASS; lint:boundaries PASS. Full web build deliberately skipped to avoid disrupting concurrent visual QA as instructed. No real provider/data.

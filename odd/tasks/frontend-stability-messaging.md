# Frontend Stability and Messaging Isolation

## Objective
Restore a trustworthy test baseline and isolate direct conversations and composer context.

## Authorization and constraints
User approved baseline diagnosis and messaging isolation only.
No URL routing, performance work, redesign, pinned filtering, backend/authentication, live AI, dependency additions, publishing without explicit permission. User explicitly requested work-unit commits after verification.
Preserve existing untracked .env.example and unrelated odd task documents.
Branch: fix/frontend-stability-messaging.
Base commit: 958b889f9341bdc41ad47ddd9ee9a7d7d3d778af.
Existing Judgment Day remains escalated; this block does not resolve unrelated findings.

## Scope
Baseline: newline-sensitive prefix and literal assertions in four study generation test files.
Messaging: SharedMessagingHub and messageSending with focused sidebar/store regression tests. Follow-up also updates existing classroomInvitationCard.test.ts and messageComposer.test.ts regression expectations affected by the authorized behavior change; preserve bounded card/composer output and callback coverage.
Channels retain existing behavior; direct conversation membership is independently required before role policy.

## Tasks
- [x] S1: Make prefix and literal assertions in four study tests CRLF/LF independent without weakening exact content, type-import or single-import checks. Status: verified; committed; see evidence below.
- [x] S2: Isolate direct conversation visibility, initial/prop-driven/updated active selection, and sending; clear reply and attachment on actual conversation changes. Status: independently verified; committed; see evidence below.
- [x] S3: Run independent applicable checks, inspect native review mode and follow its current provider route if enabled, report coverage and remaining issues. Status: verified with explicit browser limitation.

## Acceptance and checks
S1: Observe existing RED; normalize CRLF only in in-memory source comparison operands (prefix and extracted literals); retain exact content checks; focused GREEN and npm test.
S2: Add regression tests before behavior changes; observe RED for unauthorized sender/list selection and composer isolation where deterministic coverage is available; then GREEN. No unauthorized send mutations/effects. Authorized DMs and channels retain behavior.
S3: npm run lint, npm test, npm run build; independent source/readback checks for interaction wiring not exercised by SSR.
Browser checks pending: package has no browser runner; SSR does not execute effects. Never claim mounted interaction coverage from source assertions.
Work-unit commits (explicitly authorized):
- S1: 55ab090afddf871ea745b7cc395ee76262a730fe — test(study): make source assertions newline independent.
- S2: 3ac8d867683d0804f9eaafe621d751b80e4fa534 — fix(messaging): isolate direct conversations and composer context.
- Feature record delivery is a separate docs commit.

## Verification evidence
Previous baseline: npm run lint passed; npm test 315 total, 311 passed, 4 failed.
Read-only scout confirmed exact type imports use CRLF; failures require LF in source-prefix assertions.
No source writes before this document and its memory mirror.
S1 first patch: four assertion-local changes, focused 16/20 passed before and after; npm test 311/315 passed; types passed. Prefix failures resolved but masked literal comparisons still fail for CRLF/LF. S1 remained in_progress after this first attempt.

S1 follow-up: focused 20/20 passed; npm test 315/315 passed; npm run lint passed. Four test files, 8 additions/8 deletions, normalization only in comparison operands. Native ASSESS unassessable due to intended-untracked declaration; high-risk independent verifier confirmed focused 20/20, types passed, exact comparison intent preserved and no unexpected mutations.

S2 first implementation: 4 messaging files +191/-49; RED focused 36/45, GREEN 45/45; lint passed. Full suite 306/320 passed, 14 failed: twelve legacy whole-hub invitation hashes and two historical send/non-composer byte-equality checks. S2 remains in_progress. Derived follow-up surfaces include classroomInvitationCard.test.ts and messageComposer.test.ts, preserving their card/composer behavior checks instead of obsolete whole-hub equality.

S2 follow-up: expanded focused 66/66, full npm test 321/321, lint passed. Two additional test files +140/-52; cumulative S2 six files +331/-101. Historical whole-hub equality replaced with bounded card/composer coverage, not blindly regenerated hashes. Native inspect ready with untracked excluded, tracked candidate tree 1e52fc2846638598d97a01268490a35b65e76816. Native ASSESS remains unassessable; independent verifier required.

S3 independent verification: npm run lint passed; npm test 321/321; npm run build passed; git diff --check clean. No scoped regression found; no unexpected visible mutations, ignored dist outputs only. Ten tracked files +339/-109.
Build warning: main JS 1,963.87 kB (gzip 514.13 kB), CSS 178.99 kB (gzip 22.76 kB); minified JS exceeds 500 kB. Performance work remains out of scope.
Native review review-a85f9012a7deb56a approved, exact acknowledgement completed, authority burned for target sha256:155f07c7c539093541e566f756f64c2fdbf7248584c9543165204ff736fd4b29. Informational R3-transition-coverage at SharedMessagingHub.tsx:88; no correction route offered. This is not delivery authority or resolution of historical full-frontend Judgment Day.

## Progress and next step
Authorized block implemented and independently checked. Browser-mounted prop/store/thread transition checks remain not performed; no installed runner or dependency added. User requested commits and authorized the next block: URL navigation and route-level lazy loading. S1/S2 committed; no push/PR. Next block is in read-only mapping before its own ODD task document and source changes.
Parent owns this document, memory mirror and task transitions.

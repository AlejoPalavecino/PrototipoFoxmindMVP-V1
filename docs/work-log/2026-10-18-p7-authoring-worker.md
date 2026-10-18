# P7 T1 authoring — partial, proof needs coordinator disposition

- Agent / role: bounded ODD implementation worker.
- Session or task ID: `/root/p7_authoring`; session ID unavailable.
- Date: 2026-10-18.
- Branch / worktree: `codex/p7-activities`, managed p4-p3-integration worktree.
- Starting commit: `b4829e2e198a185f96a0ad0914b8ba2b7200c9d0`.
- Phase and detailed tasks: P7, [T1 / S1,S3](../../odd/tasks/p7-activities.md).
- Status: blocked.

## Request and scope

Implement only coherent teacher authoring/private drafts/explicit publication, three activity types, strict classroom revision/auth/locks, instruction files, safe student projections, timezone-aware deadlines and the actual Activities UI. Later eligibility/attempts/submissions/scoring/notifications are not this unit. Parent owns Git, roadmap, task mirror and final integration.

## Work performed

- Loaded all four injected skills (`paths-injected`) and read task/spec/work-record context.
- Inspected actual initial Git state: only parent roadmap and untracked task/coordinator records existed; preserved.
- Engram canonical project resolved to `prototipofoxmindmvp-v1`; no authoritative session ID supplied.
- Added `ActivityAuthoringService` on the existing Wall/Library/Plan/Invitation chain, with exact revision/operation inputs, teacher authority, classroom serialization, draft/publication/withdrawal, explicitly constructed student DTOs and separate metadata/deadline mutation paths that preserve post-start question identities.
- Added IANA-zone minute/DST resolution and required explicit ambiguous-time offsets. Added exact activity-targeted ready instruction links and active same-classroom material validation, without changing existing plan/material file request shapes.
- Added actual Activities list/editor/preview in the existing shell, three activity/question types, truthful invalid-unsaved drafts, publication confirmation and classroom-zone deadline controls. Later attempt/submission/notification/P8 behavior remains outside T1.
- Added tests and the authoring guide. The coherent behavior/UI/test/doc unit exceeds the advisory 400-line heuristic; it was not compressed or stripped of tests to meet that heuristic. Parent owns the delivery strategy and commits.

## Verification

- Initial RED: `node --test --test-concurrency=1 tests/p7-authoring-client.test.mjs tests/p7-authoring-time.test.mjs`: exit 1, 0/2 PASS (missing upload method and time helper). `node --test --test-concurrency=1 tests/p7-authoring.test.mjs`: exit 1, 0/2 PASS (missing public service behavior).
- First `node scripts/build-api.mjs`: exit 0, Prisma generation and API TypeScript compilation within unchanged 30 seconds.
- Required combined focused command: exit 1, 10 PASS / 3 FAIL including root. Two fixture defects: `assert.rejects` received a synchronously throwing call rather than an async function, and controlled departure omitted mandatory `ended_by_id`. Both were corrected without changing product behavior. A separate strict-type RED exposed array coercion in the new parser; strict string validation corrected it.
- Targeted `node --test --test-concurrency=1 tests/p7-authoring.test.mjs`: exit 0, 10 PASS, owned PostgreSQL cleanup exit 0. The unchanged client/HTTP/proxy/time tests retain their original 4 PASS; no invented final combined-sweep result.
- Required classrooms-ui TypeScript, web TypeScript (`--noEmit --incremental false`) and production Next build: exit 0 before and after the bounded accessibility correction. Fresh API build after parser correction: exit 0, unchanged 30-second budget.
- Required affected P6 Plan/Library/Muro/notifications and P5 host/HTTP/session/proxy/client suite: exit 0, 61 PASS / 0 FAIL, owned database cleanup exit 0. No unrelated P3.3 baseline pipeline rerun.
- First actual integration: exit 1, 0 PASS / 2 FAIL including root / 3 dependent SKIP. Real P3 accounts/classroom/P4 setup succeeded; first authoring UI step could not resolve the exact unit label because wrapping select labels included their option text. The bounded correction adds explicit existing-text `aria-label` to the same select family, preserving visible copy/options, rather than weakening selectors or widening timeouts. Owned process/resource cleanup failures: 0. Retained scratch: `C:/Users/alejo/AppData/Local/Temp/foxmind-p7-authoring-uUCJM7`.
- Same-budget actual journey targeted rerun: exit 1, 3 PASS / 2 FAIL including root / 0 SKIP. The original exact-unit-label blocker is closed by the first PASS. Actual assignment/DST/private scanned instructions, preview-without-attempt, explicit publication, student consultation, all three question types in questionnaire/evaluation editors, invalid-unsaved UI and safe student DTO checks passed. The last previously unrun subtest passed denial guards, data restart equality, selected Activities visibility at 320px, no horizontal overflow, screenshot and absence of browser page errors, then failed at the archive assertion (line 145): actual HTTP 400 versus expected 200. No response body, CSRF response status or immediately preceding detail status was retained; root cause is unproven. The later archive-mutation and archived-file assertions in that subtest were not executed. Owned process/resource cleanup failures: 0.
- Archive invocation at integration line 145 passes `revision: (await detail()).revision` and `archived: true` directly to the POST. The `detail` helper at line 33 returns the preceding classroom GET response `.body` without asserting its HTTP status; there is no separate retained revision variable. The `api` helper obtains CSRF using `/api/v1/auth/csrf`, includes its token only for an OK response, JSON-serializes the supplied body, and fetches the same-origin archive URL. Missing revision, admission failure or product failure must not be inferred from the observed 400 alone. No further source correction or journey/API probe followed the coordinator's stop instruction.

```js
const detail = async () => (await api(page, 'GET', `/classrooms/${roomId}`)).body;
assert.equal((await api(page, 'POST', `/classrooms/${roomId}/archive`, {
  revision: (await detail()).revision, archived: true,
})).status, 200);
```
- Second retained scratch: `C:/Users/alejo/AppData/Local/Temp/foxmind-p7-authoring-1V6NoE`, containing `activities-320.png`. Worker deleted no scratch.
- Isolated raw-Git-blob baseline differential against `b4829e2e198a185f96a0ad0914b8ba2b7200c9d0`: both child exits 0 and identical stdout SHA-256 `bb0b38e1c7ebc2ad8350d2a48d774b2b25d0c58eeea2521c29cb00861376cf89` for old draft/plan/material client shapes and 24 old shared proxy routes. Overall comparison exit 1 because scratch had no module-type metadata: Node emitted `MODULE_TYPELESS_PACKAGE_JSON` warnings with different process IDs and baseline/candidate paths (469 versus 470 stderr bytes). Read-only stderr inspection confirmed those warnings. Stderr equality therefore remains incomplete; no final differential PASS is claimed and no preparation correction/reprobe followed the coordinator's stop instruction. Retained raw source/stdout/stderr scratch: `C:/Users/alejo/AppData/Local/Temp/foxmind-p7-authoring-differential-37sHtn`.
- Preparation reads for nonexistent guessed `plan-policy.ts`, `p6-wall-http.test.mjs`, `tests/helpers`, `module.ts`, `authorization.ts` and `p6-teaching-integration.test.mjs` returned not-found; actual paths were then found by bounded search. These were read-only preparation misses, not passing checks.

## Commits and outcomes

No Git mutation is authorized for this worker.

## Handoff

First unfinished task: coordinator disposition of the newly observed archive-400 proof gap, then bounded diagnostic/proof if authorized. Preserve all failed evidence; do not infer admission or product root cause. Stderr-clean baseline differential also remains incomplete. Full T1 acceptance and full P7 acceptance are not claimed. All changed paths stay inside the delegated surfaces; parent roadmap/task/coordinator files are untouched by this worker. No Git commit, remote operation, dependency change, retained-data mutation or native review was performed.

Risk: items 1–4 (persistent relational content, authorization, existing shared routes/projections and classroom-serialized authoring).

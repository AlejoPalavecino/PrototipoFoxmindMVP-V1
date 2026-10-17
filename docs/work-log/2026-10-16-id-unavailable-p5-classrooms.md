# P5 isolated classrooms — in progress

- Agent / role: Codex P5 coordinator and implementation writer.
- Session or task ID: unavailable; no authoritative runtime identity supplied.
- Date: 2026-10-16, America/Buenos_Aires.
- Branch / worktree: codex/p5-classrooms / C:/Users/alejo/.codex/worktrees/foxmind-p5-classrooms/ProtipoFoxMind.
- Starting commit: 767174bc61f2fc3a80c3937c4a0519b1b90523e0, exact user-approved P4 checkpoint.
- Phase/spec: P5; [tasks](../../odd/tasks/p5-classrooms.md), [spec](../foxmind-v1-functional-spec.md) sections 2–6, 11, 14–15.
- Status: in_progress.

## Request and scope

"Bien, creá el worktree de P5 desde ese checkpoint de P4 y continuá con el diseño e implementación de toda P5, sin tocar P3 ni P4. La integración encadenada la hacemos después."

Implement isolated classroom creation/private drafts, required plan promotion and units/topics, cover catalog/fixed timezone, scoped roles, invitation/code enrollment and explicit preview/acceptance, membership history/departure/removal/reentry and archive/reactivation, matching reusable UI and isolated public-service verification. P3 and P4 source and original worktrees are protected. Integration with the final P3 shell and chained merge/publication remain deferred.

## Work performed

Inspected original and P4 Git/checkpoints, roadmap/work protocol/spec/visual index and inherited P4 promotion/access/store ports. Original P3 has active modifications; P4 advanced after 767174b, so P5 intentionally pins the agreed checkpoint. Created/attached managed foxmind-p5-classrooms worktree through Codex and created codex/p5-classrooms. Inherited status/authority is historical: no P3/P4 completion or old native consent inferred. No registered runtime identity: no Engram writes attempted.

## Verification

Observed git status/log/worktree commands exit0. Exact P4 checkpoint observed. Runtime gentle-ai4.2.0 help inspected; candidate reviews require their own consent, no inherited consent. Functional RED/GREEN, owned real persistence/services, browser proof and review disposition will be recorded as observed. No behavior implemented or tests run at record creation.

## Commits and outcomes

P5-A policy: observed initial missing-module RED3FAIL, then `node --test tests/p5-policy.test.mjs`3PASS. Rules exercise incomplete/publication validation, Unicode/codepoint limits, nested unknown fields and signed actor-bound/expiring/tamper-resistant preview tokens. P5-B initial persistence tests missing-service RED after successful owned migration/replay/status/drift and cleanup0; implemented durable draft behavior then observed6PASS (five subcases plus fixture). No real file publication acceptance yet; safe-looking UUID rejection only. New P5-owned paths and additive migrations only; no P3/P4 source or historical migrations edited.

First unit rollback: remove policy/tests plus this P5 task/record only; no public runtime exists at this policy boundary, so runtime harness N/A. Later persistence unit owns its real PostgreSQL proof. No native/independent approval claimed; candidate review consent is separate.

## Handoff

First unfinished: freeze P5 contracts/acceptance and meaningful RED, then persistence/domain slices, invitation delivery, opt-in transport and reusable UI; observe real isolated tests and report review/integration limits explicitly. Shared roadmap changed only after reconciling the final isolated checkpoint; full phase exit stays pending deferred integration.

## Implementation evidence update

Policy work-unit d977361 observed. Initial strict build failed TS2366 on catch return; corrected explicit return, subsequent fresh Prisma generation/strict build0. Persistent tests initially used source TS and hit inherited parameter-property strip-only incompatibility; changed service imports to freshly compiled output, no P3 mail source changed. Initial enrollment12FAIL includes eleven missing behavior/call-order failures and a synchronous assertion-harness failure (not all meaningful domain RED). Corrected async public validation; real-SQL enrollment suite12PASS. Full focused policy/draft/enrollment/delivery run27PASS, each owned database cleanup0 and seven migration replay/status/drift checks inside fixtures.

Delivery first missing-worker RED; first implementation4PASS/2FAIL included parent and a fixture-selection mistake (reactivated old job still scheduled later). Corrected fixture due time, also rechecked due/attempt bounds under job lock to prevent concurrent workers bypassing backoff. Subsequent full focused run27PASS. Real SMTP not yet verified, injected sender tests do not claim it. HTTP missing-module RED then opt-in HTTP5PASS with actual loopback requests/admission/privacy/shape checks. No native or independent approval.

P5-B rollback: core/contracts/drafts, P5-only migration/schema revision, owned database fixture and draft tests. Forward rollback must preserve any existing data; no automatic migration deletion on applied databases. Database fixture rejects external URL input and owns a random tmpfs container with a matching ownership label before cleanup. This isolates P3/P4 services.

## P5 complete isolated candidate — writer verification

Implementation commits observed: ad3b554 (private drafts/publication),26df627 (confirmed enrollment/retained membership),c43c494 (encrypted durable invitation delivery),b335aa8 (optional transport). New teacher-only existing submission/grade summaries retain former-student history and exclude drafts; P6/P7/P8 authoring is not implemented by these read models.

Actual `node scripts/test-p5.mjs` passed: fresh API generation/build0; strict UI typecheck0; isolated Vite bundle0;37focused checks PASS;9actual HTTP/SQL/S3/ClamAV/captured-SMTP checks PASS,46total. Each SQL fixture replayed/deployed the seven inherited+P5 migrations, checked status and schema drift with exit0; real runtime migration status/drift also0. Real clean PDF publication, immutable custody promotion, actual authorized byte download/digest, explicit code enrollment, preserved seeded submitted-attempt history, actual Mailpit capture/reentry, archive writes denied, revoked-session denial and real invalid-file publication rollback observed. Fixture sessions are synthetic; not final P3 acceptance. SQL/S3/ClamAV/inbox cleanup all reported0 after these completed runs. Full npm audit0, including dev dependencies.

Retained real-run failures: first runtime run5PASS/4FAIL including parent: invalid seeded published-activity fixture lacked required unit/topic links, causing the dependent mail case to fail; revoked file access denied safely but fixture bridge returned503 because it threw ClassroomError across P4's FileError port. Second run6PASS/3FAIL: error-class mapping corrected, but fixture still lacked unit/topic. Corrected actual curriculum linkage in the fixture, then observed separate combined enrollment/runtime24PASS; later full runner46PASS. These are distinct runs, not retroactively green original checks. Added meaningful fixed-offset timezone RED1FAIL/2PASS → GREEN3PASS. Added quoted-recipient resend/list RED (lowercased local-part) → GREEN with decryption of the generation-bound original mailbox; delivery failure status now explicit in teacher UI. Partial timezone editing remains bounded/private until publish validates it. Removed silent500-row list truncation.

Browser writer proof used a named agent-browser session against the actual isolated host. Created classroom via four steps, uploaded a real PDF and observed actual approved status, published units/topics, issued/captured a real local invitation, switched synthetic account and explicitly accepted. Student saw names-only classmates; departure removed access; same code rejected reentry in the same dialog. A different first-time account saw minimal preview, then explicitly confirmed. Teacher saw departed student history and empty actual submission summary, archived the classroom and saw disabled edit controls/reactivate action. Backend tests separately exercised reactivation. Browser console errors command returned no errors.

Rendered widths375/320 both had scrollWidth equal viewport width on observed classroom/history views. Selected default axe checks: classmates35passes/0violations/0incomplete; summary dialog18passes/0violations/0incomplete; code confirmation20passes/0violations/1incomplete (three contrast nodes could not be determined across overlay); archived settings35passes/0violations/1incomplete (clipped horizontal tab contrast). Initial tag-filtered axe call returned all zero counts and is not counted as a successful audit. No exhaustive accessibility/performance claim. Screenshots stayed in local agent-browser output and were visually inspected; repository screenshots remain reference-only. Representative inspected captures: screenshot-1792199468795.png (desktop classmates),screenshot-1792199474249.png (375px classmates),screenshot-1792199504345.png (320px),screenshot-1792199533887.png (archived320px), under C:/Users/alejo/.agent-browser/tmp/screenshots/.

The first browser host was interrupted through exec control-C: process exit1 bypassed JS cleanup, leaving four owned fixture containers/network. Inspected exact names/owner labels, removed only the four matching owned resources/network, then removed that fixture's two credential/config files. Empty subsequent P5 container inventory observed. Added explicit Enter shutdown to preview and documented Windows control-C limitation. Normal automated runtime cleanup0 is already verified; Enter shutdown will be checked separately. Vite warns standalone fixture bundling drops use-client semantics; source directives remain for later Next.js integration, no Next.js build claimed.

Test-first limits: the initial missing-module/method checks are preparation RED, not exhaustive behavioral RED. The additional summary read, UI components, runtime helper and several edge guards did not each have a pre-implementation behavioral failing check; no blanket TDD compliance claimed. The client adapter test first ran after its source existed and passed; browser journeys are postimplementation writer verification. No independent reviewer ran, no native approval/waiver exists. Native mode/status read-only showed RDD on/global and an existing shared active authority; it is not this candidate's consent and was not mutated. Missing registered runtime ID still prohibits agent-attributed Engram writes; no write attempted.

Additional inherited regression attempt: dependency/contracts17PASS and mailbox1failed-to-load because its separate .build/p33-mail output was not generated by the general API build. This is a check prerequisite failure, not a mailbox behavior regression; generating that existing tsconfig output and rerunning is next. The mixed PowerShell command's final exit0 came from later status/help, not the failed test; retain the actual17PASS/1FAIL result.

Review sizes/rollback: keep UI/runtime/backend scopes as cohesive local commits. The UI dependency lock is generated838insertions/26deletions plus small package additions; report the overage, never compress it to fit400. No publication or size exception inferred. Remove P5-only UI/preview paths to roll back those units; remove only P5 job types via an explicit future data decision, never broad shared-background-job cleanup. No P3/P4 source changes or application route installation.

# Classroom activity AI — independent local verification completed

- Agent / role: activity_independent_verify / independent verifier
- Session or task ID: /root/activity_independent_verify
- Date: 2026-10-25
- Branch / worktree: codex/classroom-activity-ai / classroom-activity-ai/ProtipoFoxMind
- Starting commit: af48e698aa575733e60a9e900875075dda77e138
- Phase and detailed task/spec links: [activity AI and multi-topic](../../odd/tasks/classroom-activity-ai.md), mandatory DoT and V1 live acceptance
- Status: completed

## Request and scope

Independent local verification after GREEN, using one dedicated ego(lite) TaskSpace and the coordinator-owned disposable `_test` runtime with synthetic provider and data. No real Gemini calls, retained configuration/data, source/test edits, Git publication or deployment. Own this record and `.test-artifacts/activity-independent-*` only.

## Work performed

Read AGENTS.md, roadmap, work-record protocol, feature contract, GREEN worker records and complete installed ego-browser guide v2.1.0. Fixture origin observed as `http://127.0.0.1:51859`. Credentials remain confined to the explicit untracked fixture and browser login; they are excluded from this record.

## Verification

Initial frozen-runtime browser proof (not final-source acceptance): teacher login; manual TP saved/reopened with ordered two topics, approved PDF and DOCX plus linked Library material. Generation opened with jobs0, explicit sources/Word acknowledgement; a generation survived immediate page reload and reopened READY with jobs1. Dirty TP edits survived explicit regeneration and successor READY; replacement gate offered Reemplazar/Conservar, and Conservar applied the original edits to one private DRAFT in the habitual editor. Mixed questionnaire requested 1 development + 1 single-choice + 1 multiple-choice and returned exact editable mix with points/keys. No real Gemini call.

Inspected actual PNGs `manual-desktop.png`, `sources-390.png`, `sources-320.png`, `review-tp-1440.png`, `review-tp-390.png`, `review-tp-320.png`. Mobile document/body scroll widths equal390/320, fields/buttons visible; offscreen classroom tabs remain inside their intentional horizontally scrolling navigation. Tab from Objetivo focuses Nivel del grupo. Mobile long textarea content uses its own scroll, with no page overflow.

Defect observed and reported to coordinator: current job polling displays Lista para revisar and proposal while Generaciones recientes still labels that same job En cola. Reproduced for regenerated TP and questionnaire (round24/29), pending batch correction/recheck.

Additional observed proof: all three generated types reached APPLIED and opened habitual editable DRAFT, observed typed job list in `job-types.json`. Quiz preserved changed2.50points, selection key and PARTIAL rule; evaluation preserved3.25points. Manual questionnaire/evaluation each saved a hand-authored development question without changing generation count. Quiz publication required separate Publicar → Confirmar publicación. Student real login list returned exactly one published activity; generation list/source/job/draft detail returned403; published detail returned200 without private key/proposal/context properties (`student-isolation.json`). Student explicitly started, answered all three question types, saved and submitted; receipt confirmed first attempt/time, locked responses and pending correction. One notification appeared after publication.

Inherited advisory: immediate post-submit outer session still read Borrador confirmado/no entregado while nested receipt/read-only response had updated. Actualizar estado confirmado corrected outer state to Entregado/solo consulta. `receipt-state.json` after refresh confirms staleDraft:false, receipt:true, readOnly:true. `git hash-object` equals `git rev-parse af48e69:path` for AttemptSession.tsx (`8d06c3cdf1f39fa132fc5509ac9ca215ea33f968`) and QuestionnaireAttempt.tsx (`6b671bf3c4083ae4b949a94e0c0fca9b54d80f88`); no feature diff in these components or attempt hooks. No regression demonstrated. The screenshot named `receipt-stale-session.png` shows read-only submitted content, but does not show the contradictory outer label; do not treat it as pixel proof of that label. Snapshot round50 is the observed contradictory evidence.

Inspected quiz review PNGs1440/390/320 and student-question390/320: controls/keys/read-only response layout remain within viewport. All12captured PNGs inspected (manual1+sources2+TPreview3+quizreview3+student2+receipt1). Native device/Safari/real-Gemini acceptance is outside scope. No automated final-source suite or SQL acceptance claimed yet.

Initial no-double-count proof: student Mi progreso renders100%,1of1expected activities delivered, pending0, on-time1 and one follow-up row; no published grade. Saved `student-progress.txt` plus inspected `student-progress.png` (13thPNG). Own read-only `docker exec foxmind-p4-8eaa6b1dcbf1c6d3-db psql -U postgres -d activity_ai_test -At` queries returned the published questionnaire `4582750b-f4c2-4670-aaa6-995f422aed56|QUESTIONNAIRE|PUBLISHED|2|1` (topic links/eligibilities) and `1|1` (attempts/submitted). Exact disposable container/database scope was supplied by coordinator; no Docker env/private configuration read. Grade/Agenda once-only proof remains pending final fixture (initial quiz deadline null, so zero Agenda entries is not acceptance evidence).

Coordinator reported batch fixes pending after blind reviews, including source replay staleness, unknown-outcome gate, historical unit FK, full-topic projections, input-limit HTTP code and UI context/polling. Source freeze/build/restart required. Old runtime shared Next assets were replaced during coordinated build; round53 profile navigation started before that notification and subsequently timed out, excluded from product verdict. No new old-runtime UI operations after notification.

## Mandatory DoT matrix at initial handoff

| DoT | Independently observed initial proof | Remaining final proof |
|---|---|---|
|1 manual and AI-off | TP PDF/DOCX + manual questionnaire/evaluation saved; no extra generation | AI-off automated/final-source rerun |
|2 sources/limits | Explicit plan PDF + Library DOCX, real upload approval and Word acknowledgement/read report | unsupported/oversize/inaccessible/digest/aggregate/insufficient tests |
|3 types/mix/edit | ASSIGNMENT, QUESTIONNAIRE, EVALUATION APPLIED; exact1/1/1mix, points/key/PARTIAL edited | final compiled candidate typed3 recheck |
|4 recovery/regeneration | reload/reopen jobs1 READY; dirty edits preserved through successor and guarded replacement | corrected recent-list consistency final |
|5 idempotency/atomicity | apply opens a single private DRAFT | concurrent/replay/response-loss tests |
|6 boundaries/staleness | student403 for job/catalog/draft; no unpublished list content | teacher/archive/foreign/stale/post-attempt tests |
|7 provider/runtime/billing | controlled synthetic provider only; no Google calls | failure/fencing/shared admission/budget final tests |
|8 publication/privacy | explicit publish dialog, notification1, student DTO/preview no private keys, actual submitted answers/receipt | publication revalidation AI-off and result privacy tests |
|9 once-only counting | topics2/eligibility1/attempt1submitted1; progress1of1 | history/submission alltopics, grade/Agenda once-only final |

Prepared ignored `run-final-suite.mjs` for one serial independent activity-suite run under330seconds, no build, with sanitized TAP/summary and SHA256 manifest checked before/after. Not executed before coordinator freeze/lock.

## Frozen candidate independent proof — 2026-10-25

Coordinator froze production/tests at tree `01d1bea0029376fe7f56c3d66b65572488fa2898`, built API/Next, and supplied fresh disposable runtime `http://127.0.0.1:54153`, room `df1464ff-8453-4433-8a78-17df78735fb1`, exec session16878. Reused Space3/p1. No private configuration or real provider calls.

- `node .test-artifacts/activity-independent-2026-10-25/run-final-suite.mjs`: exit0;104PASS/0FAIL/0SKIP/0cancel in66.8seconds,19activity files serial,330second bound. Sanitized TAP, stderr, summary and SHA256source/tests manifest saved. `changedInputs:[]` before/after. Includes actual authenticated host/CSRF, full approved document reader, strict adapter/domain, concurrency/idempotency, durable lifecycle, shared budgets, aggregate limits, AI-disabled publication revalidation, all-topic DB/history/submission associations, review regressions, unknown-outcome acknowledgement and migration inventory. This proof belongs to01d1, not a later silently changed candidate.
- Final runtime repeated all three types: ASSIGNMENT, QUESTIONNAIRE, EVALUATION APPLIED to exactly3activities; TP/EVALDRAFT, quizPUBLISHED after separate confirmation. Exact1development/1single/1multiple mixed quiz; edited2.50points, selection key, PARTIALrule persisted. Final actual PDF+DOCX read report and Word acknowledgement observed. Source/catalog opening did not generate. Dirty TP title/consigna survived successorREADY and Conservar gate, applied original edited proposal; both recent and current job labels nowREADY. Saved `final-owned.json`, `final-tp-ready.txt`, `final-tp-applied.txt`.
- Corrected curricular context rendered on activity cards as La luz·Exposición·Contraste in order. An extra harness assertion expected those labels in the AI proposal-only preview; the specified A05 test targets the habitual ActivityPreview, so no product defect inferred from that overassertion. Final card and habitual preview are checked separately.
- Final student real login:403generation list/catalog/job/draft,200published list with exactly1item and200safe published detail without correct keys/rules/context/job/proposal fields. Actual explicit start, answers to all3question types, confirmed submission, refresh and read-only receipt passed. `final-submitted.txt`, `final-student-privacy-agenda.json` retain sanitized proof.
- Set future quiz deadline through authenticated normal API (200), then explicit UI publication. Ego `fill()` changed native datetime DOM value without updating React state and Verificar hora stayed disabled; this is recorded as browser-automation limitation, not accepted native date entry or a feature defect. Subsequent deadline card showed27Oct2026,12:00UTC; API persisted exactinstant.
- Agenda returned exactly1academic deadline for the2topic quiz, pendingtrue before submission and pendingfalse after; `final-agenda-submitted.json`. Student progress displayed100%,1of1expected delivered,on-time1,pending0 and one row (`final-progress.txt`). Manual review saved2.50development points plus4choice points, calculated10.00 and explicitly published grade. Teacher progress then showed100%,1/1delivered and average10.00 for1student (`final-grade-published.txt`). No automated AI grading.
- Coordinator subsequently authorized a two-line hook-only delta and regression test: final2 tree `7d47529b560902f82411a53e2f7fc4ebe90ef94e`, preventing recovery bootstrap from selecting historicalUNKNOWN after a newer successful successor. `git diff --stat 01d1 7d475` confirms only hook and regression file changed (26insertions/3deletions, of which production2lineschanged). Backend/schema/provider/other UI paths unchanged from104baseline. Tester targeted20PASS and both scoped review2APPROVED are attributed in their records. This verifier independently reran only the four relevant UI/recovery files in `run-ui2-delta.mjs`:20PASS/0FAIL/0SKIP/0cancel,10.15seconds,exit0,unchangedInputs[], preserving the104baseline attribution.

Own final read-only SQL on exact coordinator-supplied `foxmind-p4-15f26ed96cec653c-db`, `activity_ai_test`: publishedquiz `eecd6ffc-21ee-4bbc-85ae-013aee145d11` has2topiclinks,1student_activity,1attempt,1submitted,1grade; gradepublished1/final10.00. Event counts ACTIVITY_PUBLISHED1/GRADE_PUBLISHED1/SUBMISSION_RECEIVED1. Saved `final-sql-proof.json`. No credential/envread. Coordinator cleared to stop16878after SQL; no ongoing browser mutation.

Additional harness failures: round57 overasserted curricular labels in AIproposal preview; round62 native datetime fill/change limitation; round65 awaited numericdateformat but card renders27oct2026. No repeated consumption from these failed assertions. All remaining authorized operations used synthetic fixtures.

## Last rebuilt UI confirmation

Coordinator rebuilt Next for exact7d475 source and recreated only the owned synthetic preview: `http://127.0.0.1:50800`, session63684, room `c976987d-9c01-4493-8680-542ee99fc310`. SameSpace3/p1. Real teacher login and mount, PDF+DOCXselection/Wordacknowledgement, generatedTPREADY with current/recent states consistent, edited title, apply→DRAFT,save,close/reopen all passed. Draft card displays La luz·Exposición·Contraste. Opening/mounting did not generate; one explicit latest-provider request.

Actual latest PNGs `last-editor-1440.png`, `last-editor-390.png`, `last-editor-320.png` inspected: no layout clipping/overlap; document widths1425within1440,390,320. Normal single-line input/textarea internal scrolling remains. Cleared emulation after captures. Exported inspected1440/390PNGcopies and [evidence index](evidence/2026-10-25-activity-ai/README.md), without credentials or real student data. Total16actual PNGs inspected across initial/final work; selected images have current rebuilt-bundle proof.

`node .test-artifacts/activity-independent-2026-10-25/check-final-inputs.mjs`: exit0; SHA256 comparison with104baseline differs only in `apps/classrooms-ui/use-activity-generation.ts` and `tests/activity-unknown-start.test.mjs`, exactly the targeted20covered delta. No further backend/schema/provider/otherUIbytes changed. DoT1–9 local proof is satisfied by104baseline +20delta + real flows/SQL above; final3types and metric/grade/Agenda proof is intentionally retained against unchanged backend bytes instead of repeated after the hook-only rebuild.

Nonblocking limitations remain explicit: no real Gemini, physicaldevice/Safari, native datetime entry acceptance, deployment or remote publication; inherited immediate post-submit outer-label advisory corrects by refresh and unchanged baseline components. No unresolved feature defect demonstrated after scoped corrections.

## Final DoT disposition

| DoT | Local result and observed evidence |
|---|---|
|1 manual/AI-off | PASS: real manual TP PDF/DOCX plus manual quiz/evaluation; final104includes AI-disabled generated-draft publication guard and UI/manual contracts |
|2 source grounding | PASS: final live private PDF+DOCXread/Wordwarning;104reader/source-limit/adapter cases cover unavailable/changed/unsupported/aggregate/insufficient paths |
|3 types/editing | PASS: three actual generated types APPLIED, exactquizmix, changedpoints/key/PARTIAL persisted; latestUI2TP saved/reopened |
|4 recovery/regeneration | PASS: actual reload/recovery without duplicatejob, dirty original survives successorREADY/replacementgate; fixed recent-state label;20delta covers historicalUNKNOWN and currentUNKNOWN bootstrap |
|5 idempotency/atomicity | PASS:104durable start/apply/replay/concurrent-claim tests; real apply creates3drafts for3types with no automaticpublication |
|6 boundaries/staleness | PASS:104authenticated host/CSRF/teacher/archive/foreign/stale/replay/postparticipation/topicDB tests; actual student403x4andpublishedonly1 |
|7 runtime/billing | PASS:104invalid/missing/providerunknown/expiredlease/lateoutput/shutdown/sharedquota-budget/sourcepreflight tests; controlledprovider only |
|8 publication/privacy | PASS: separate UI activity/gradeconfirmation, safe preview/student DTO, actual attemptsubmit/receipt, SQLexactly1publication/grade/submissionnotification |
|9 once-only projections | PASS: live2topicquiz gives1eligibility/attempt/submitted/grade, progress1of1andaverage10.00; Agenda1pendingtrue→false;104history/submissionDTOalltopics tests |

Coordinator inspected exported desktop/mobile PNGs through view_image and accepted their captured layout scope. `round-77.mjs` finished Space3 exactly once with keep[p1],exit0. The retained page is authenticated teacher at `http://127.0.0.1:50800/mis-aulas`, saved private TP editor; device emulation cleared. No browser operations after finish. Runtime remains coordinator-owned and active.

Record structural verification: `check-record.mjs` exit0,5local links checked,0missing; scoped `git diff --check` exit0 (only Git LF→CRLF advisory). Engram session-summary attempted once at final handoff but blocked by PreToolUse because authoritative Codex host session resolution could not be confirmed. No memory persistence claimed and no duplicate retry; repository evidence remains complete.

Harness failures retained: round02 waited for `/home` although successful login redirects `/profile`; round07 sought absent Crear actividad (UI provides direct two choices); round10 awaited nonexistent Guardar borrador; round19/23 waited for incorrect recovery/replacement wording; round30 passed a CSS root to subtree snapshot, which requires a ref, after all edits/captures/preview extraction had succeeded; round33/45 expected incorrect Publicado/Entregar wording (actual Publicada/Enviar respuestas). One read search addressed absent `tests/ai-local-database.mjs` and Windows globs literally; corrected to actual classroom-ai-database helper/rg -g. These are harness/read failures, not product defects. No repeated generation was triggered by these waits.

Engram current project resolves to `prototipofoxmindmvp-v1`; initial lookups under the directory spelling were unavailable and corrected. No independent acceptance yet.

## Commits and outcomes

No commits by this verifier. Runtime/build ownership belongs to coordinator. No source/test edits.

## Handoff

Independent local verification is complete. Last runtime is `http://127.0.0.1:50800` (coordinator-owned session63684); earlier51859/54153are historical, stopped by coordinator. Space3finished with retainedp1authenticated teacher in saved TP editor, emulation cleared. First next action: coordinator reconciles this record/evidence into roadmap and performs the authorized local commit/delivery workflow. No unresolved verifier blocker. Coordinator owns Git; no main integration/push/PR/deployment authorized here. No source/test edits or commits by this verifier.

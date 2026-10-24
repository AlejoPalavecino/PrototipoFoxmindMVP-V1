# Real Gemini complete flow — extraction blocked; manual fallback passed

- Agent / role: /root coordinator
- Task ID: /root
- Date: 2026-10-24
- Branch / worktree: codex/classroom-gemini; isolated classroom-gemini worktree
- Starting commit: bf2adb2
- Status: completed (verification/reporting); full AI flow blocked by provider400
- Phase / task: [classroom AI extraction](../../odd/tasks/classroom-ai-extraction.md)

## Request and scope

User explicitly requested a complete real Gemini test using the example PDF: extraction, edit units/topics, confirm, create classroom, report problems. This authorizes the provider request and browser takeover for this synthetic test. Preserve current user data and unrelated resources, never read private key files or log credentials. No production changes authorized by this verification alone.

## Work and handoff

Existing real-provider preview remains running in interactive session91683, platform http://127.0.0.1:60092 and inbox http://127.0.0.1:52602, model gemini-3.5-flash-lite. Explorer dispatched for read-only continuity; test_runner /root/real_gemini_browser owns browser verification and its own record. Resume existing ego Space5. No memory writes: registered runtime identity unavailable.

First unfinished action: actual browser registration/session, PDF upload, observed real generation and complete classroom creation. Earlier setup did not call Google; no extraction success claimed yet.

## Attributed bootstrap

- Read-only explorer /root/real_smoke_bootstrap inspected roadmap, feature task, setup/work-record continuity and Git. HEAD bf2adb28148971b7331af5fe5d6f5450929bbc37 on codex/classroom-gemini. Engram current_project/context/search read project prototipofoxmindmvp-v1, historical context only; no writes or registration workaround.
- Explorer's sandbox Git status failed although other read commands worked. Coordinator reran git status --short --branch with scoped escalation: PASS, correct branch and only this own new smoke work record untracked. This is a sandbox boundary; no repository repair needed. No unrelated changes, secrets, services or browser actions by explorer.
- Browser owner /root/real_gemini_browser resumed Space5, observed no active session and started synthetic registration. Actual provider request still pending at this checkpoint. No explorer record file written by read-only role; this is its attributed report persisted by coordinator.

## Observed real-provider result

- Verification execution completed with a blocking product integration failure. Full AI extraction/apply/create acceptance FAILED; manual fallback is separately PASS.
- Coordinator took over Space5 after the verifier's partial handoff. Confirmed the same synthetic account using keyboard, recovered its password internally and logged in. No fixture credentials persisted. Pointer click on the verification submit reported a paragraph intercept; keyboard focus+Enter succeeded. This is a possible interaction/automation issue, not a proven layout root cause. A later session returned to sign-in; cause not proven; recovery restored the same account and its saved draft. No private user account was used.
- PDF plan-sintetico.pdf uploaded, security scanner approved it, autosave completed and automatic extraction job was observed FAILED / AI_UNAVAILABLE / retryable true via its authenticated GET. Draft929d3036-d78b-4aaf-8afa-1b3107341e80, job9f5d6aa3-c2f8-47db-8dda-ae4ba1b08b72. UI said automatic extraction unavailable and offered manual continuation. No user retry button was pressed.
- Targeted diagnostic backend processes consumed the key internally, never exposing it: standalone Gemini countTokens PDF PASS561; exact adapter count PASS627. Two diagnostic generation requests using the real adapter and PDF returned HTTP400, generic message 'Request contains an invalid argument.' One application job plus two diagnostic generations were attempted; application error alone does not expose its provider HTTP status. Diagnostics are outside application usage ledger; actual Google billing was not queried or claimed zero. No successful proposal or output units returned.
- Gemini credentials/model accepted countTokens; this does not prove generateContent or its schema is valid. No automatic paid retries. No source/test changes made to force a successful test.

## Attributed read-only diagnosis

/root/gemini_400_analysis (architect), persisted by coordinator: inspected adapter, response, schema and installed SDK2.31.0. Offline serialization check exit0 with fetch blocked and request transport intercepted showed PDF/base64 and schema transmitted intact; automaticContinuation, abort and HTTP options do not leak into JSON. No Google calls, browser, secrets or writes by architect.

No cause of HTTP400 is demonstrated. Leading hypothesis: schema arrays allow100units ×100topics; installed genai.d.ts warns large maxItems in nested arrays may produce400 INVALID_ARGUMENT. CountTokens sends contents only, so627token PASS does not validate schema. This also differs from the feature contract asking to count schema; relevance to400 is unproven. Proposed next experiment, NOT executed: same request with a copy of schema without maxItems, keeping server business validation. Do not claim this change fixes the problem before differential proof and test-first repair.

## Manual continuation, editing, creation and persistence

- Selected Continue manually in the same failed draft. Added the PDF curriculum by hand, renamed La luz to La luz — edición docente, renamed Exposición to Exposición manual, added Práctica de iluminación, retained Composición, and added La cámara with Apertura and Velocidad.
- Review displayed approved PDF, two units/five topics and explicit Create aula. Confirmed creation: UI Aula creada, classroom36a135ce-4401-427f-bbd2-240583b45f6c, title Fotografía · Gemini real. Title identifies the test; its content was entered manually after provider failure, not generated by AI.
- Plan UI and authenticated detail GET returned HTTP200 with exactly those two units/five topics. Reload showed persisted classroom card; reopened it and Plan again showed edited unit/topic content. A final redundant probe used an incorrect double-classrooms URL and returned404: a harness route error, not product failure. Earlier correct detail GET and post-reload UI remain the actual persistence evidence.
- Screenshot created-manual-plan.png successfully captured and coordinator viewed it. It shows desktop classroom header, Plan tab and top of Plan panel; it does not cover the lower unit list, AI editor or mobile. Earlier unavailable capture history remains valid; full visual exit condition is still pending.
- Space5 handed off after final observation; platform and owned services remain running for user. No cleanup claim, no unrelated resources touched. Sanitized evidence: C:/Users/alejo/.codex/visualizations/2026/10/23/01a16946-df9f-7480-9ec1-7395f6c888b3/gemini-real-smoke/result.json and screenshot. No keys, tokens, join codes, passwords or raw prompts recorded here.

## Handoff and delivery boundary

First unfinished product action: reproduce/minimize generateContent400, add a failing regression for the confirmed cause, repair adapter/schema and repeat real AI extraction → edit → apply → publish. This task requested verification/reporting; no production repair is included. Manual fallback acceptance does not close the AI task. No functional regression suite rerun for documentation-only results; browser/API/real-provider diagnostics above are observed checks. No remote publication or deployment.

## Final documentation review and checks

- Reviewer /root/gemini_setup_review returned APPROVED / LGTM_SIN_HALLAZGOS after read-only inspection of both smoke records and roadmap/feature diffs. Persisted by coordinator. No secrets observed; failure, manual fallback, unconfirmed cause and visual/cleanup limits are distinguished. Reviewer did not run tests, browser or Google calls.
- Coordinator git diff --check PASS; three newly referenced document targets exist (node link check exit0). Four documentation paths are the only changes; no source/tests/private files modified. Rollback boundary is these two new records and the scoped roadmap/feature evidence updates. Local documentation commit only; no push.

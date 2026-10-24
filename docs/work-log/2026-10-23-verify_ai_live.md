# Classroom AI live verification — in progress

- Agent / role: verify_ai_live / independent UI and API verification.
- Session or task ID: /root/verify_ai_live.
- Date: 2026-10-23.
- Branch / worktree: `codex/classroom-gemini`, `C:/Users/alejo/.codex/worktrees/classroom-gemini/ProtipoFoxMind`.
- Starting commit: `ed06f885bfbf08725024013a7a45c9a3a723cfc7`.
- Phase and detailed task/spec links: [Classroom AI extraction](../../odd/tasks/classroom-ai-extraction.md), [functional specification](../foxmind-v1-functional-spec.md).
- Status: in_progress.

## Request and scope

Independently verify the live Next.js/API/PostgreSQL/S3/scanner/Mailpit flow using an owned synthetic account and synthetic provider. Exercise PDF approval, automatic extraction, editable proposal, explicit application, persistence, explicit classroom creation, and DOCX/mobile when possible. Do not read secrets, use retained data, change production/tests, or claim a real Gemini call. Owned edit surfaces are this record and `.test-artifacts/ai-live/verify-*` QA scripts/captures.

## Work performed

- Read repository instructions, record protocol, feature design and live runtime helper.
- Observed current branch/commit and pre-existing uncommitted implementation; preserved it.
- Read the ego-browser skill and complete CLI usage guide v2.1.0.
- Coordinator-owned runtime ready at `http://127.0.0.1:60479` with owned inbox `http://127.0.0.1:65235`; synthetic provider only.
- Created dedicated ego Space 4, `FoxMind AI verify 2026-10-23`, with page `p1`.
- Registered and verified only `verify.ai.1792769691861@example.test`; consumed only its captured inbox messages. Observed verified-session transition to sign-in, recovered this synthetic account to obtain reusable login, then logged in normally. No session/TTL policy was changed and this transition is not classified as a defect.
- Created draft `6f1a92a6-7aa1-4cab-8e5e-21d8d3f055fb`, approved PDF `dbf534e0-b2c8-404d-92c2-25abf1ce7c1f`, and observed automatic extraction route request plus fallback message.
- Reopened draft and independently confirmed the same failure with active verified session and CSRF: extraction POST returns 404 NOT_FOUND. Reported reproduction to coordinator.
- Coordinator subsequently reported the cause as missing new-route whitelist entries in the Next.js classroom proxy. This attribution is the coordinator's source inspection; this verifier's independent proof is the 404 and UI fallback. Dependent QA paused per coordinator while RED/fix and other review corrections proceed.
- Confirmed manual unit/topic editing and autosave remain available after failure. Draft revision 8 preserves `Unidad manual conservada` / `Tema manual conservado`; publishedClassroomId remains null and owned classroom lists are empty.

## Verification

- `git branch --show-current` → `codex/classroom-gemini`; `git rev-parse HEAD` → starting commit above.
- `ego-browser skill` → exit 0, full guide including end marker.
- `ego-browser nodejs -e` loading `verify-round-01.mjs` through `verify-round-26.mjs` exercised the real browser. Successful and failed attempts are retained as QA scripts; no product code or tests changed.
- PDF upload → `Aprobado para usar`: PASS. Automatic POST presence recorded from browser resource timing: PASS. Successful proposal extraction: FAIL before correction; same-origin POST with active verified session and CSRF returned 404 (`verify-api-21.json`).
- API proof in `.test-artifacts/ai-live/verify-api-18.json`, `verify-api-20.json`, `verify-api-21.json`, `verify-api-26.json`. These contain owned synthetic records only, no credentials/tokens.
- Manual fallback/autosave and no premature publication: PASS (`verify-api-26.json`, UI snapshot round 26).
- Captures unavailable so far: Page.captureScreenshot timed out with the tool's unchanged native 20-second limit via ordinary screenshot, fromSurface:false CDP, and raw screenshot after clear metrics/bring-to-front. No valid screenshot is claimed. Snapshot/DOM interactions and API calls remain functional.
- A stale-ref attempt after raw CDP and an ambiguous duplicate login-link selector were verifier automation errors, observed and recovered in the same Space. No user-facing product defect is inferred from them.
- Gemini real smoke remains outside this synthetic runtime proof.
- Engram write was attempted and blocked by PreToolUse: host session is not registered. Coordinator was informed; no identity was invented and no subsequent memory writes attempted.

## Commits and outcomes

No commit authored by this verifier.

## Handoff

First unfinished action: after coordinator fixes the extraction route and refreshes the owned runtime, reopen the existing PDF draft in the same Space and check proposal editing/application/persistence/creation, manual-content protection, DOCX and mobile. Capture proof requires recovering browser screenshot capability without changing limits.

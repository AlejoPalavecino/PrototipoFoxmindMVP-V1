# Real Gemini activity launcher — ready for independent verification

- Agent / role: gemini_real_launcher / runtime infrastructure
- Session or task ID: /root/gemini_real_launcher
- Date: 2026-10-25
- Branch / worktree: codex/classroom-activity-ai; classroom-activity-ai/ProtipoFoxMind
- Starting commit: 3c74eb61eeeb4457c89ef19c86ca1c9436999f54
- Phase and detailed task/spec links: ../activity-ai.md; ../../odd/tasks/classroom-activity-ai.md
- Status: completed

## Request and scope
Prepare isolated real Gemini activity runtime using existing authorized private AI settings in process only, real product adapters, synthetic endpoint-created teacher/student and scanned PDF/DOCX. No product/test/Git edits, retained service/config mutation, publication or deployment. Never expose provider key/configuration, never copy key to fixture/environment of frontend. Coordinator owns Git and shared documentation. Runtime readiness completes this task; generated-content acceptance belongs to independent verifier.

## Work performed
Read roadmap/work-record protocol, activity/classroom AI guides, owned controlled launcher/service/seed helpers and documented canonical launcher. Original loader paths identified through code only. Only the original .env.gemini.key.local AI_API_KEY and allowlisted AI settings from .env.gemini.runtime.local are consumed internally; no values printed or copied. Both files exist; keyConfigured/settingsValid true. Applying clean-architecture skill for separated loader/runtime composition; consulted Prisma7 and node-postgres primary documentation through Context7.

Created scripts/activity-ai-real-configuration.mjs (30 lines), scripts/activity-ai-real-runtime.mjs (70 lines), scripts/activity-ai-real-live.mjs (79 lines). The launcher invokes createApplication(configuration) with zero provider overrides, uses existing owned P4/Mailpit service and synthetic endpoint seed helpers, verifies the owned migration target/history/schema and checks zero AI startup jobs/usage. Frontend receives only the OS allowlist plus NODE_ENV/NEXT_TELEMETRY_DISABLED/FOXMIND_API_ORIGIN. No provider credential enters process.env or frontend. Errors use fixed categories and numeric status only. Existing P4 helper creates/removes its own standard ignored foxmind-p4 resource configuration folder; activity fixtures/metadata live only in the separate ignored activity-ai-real directory.

Coordinator explicitly granted build lock and confirmed the prior controlled runtime stopped with cleanup0 before fresh builds. No other retained service was touched. Session62354 remains running for verifier; it is not a child360s test assertion process.

## Verification
- node --check scripts/activity-ai-real-live.mjs; corresponding runtime/configuration syntax checks: exit0.
- Internal loadRealAi preflight: sourceFilesExist=true, keyConfigured=true, settingsValid=true; no configuration/credential values emitted.
- node scripts/build-api.mjs: Prisma generation0 and API TypeScript compilation0 within original shared30s policy.
- Fresh Next16.4.2 production build with safe OS environment: exit0, types/build/routes passed within180s budget.
- node node_modules/typescript/bin/tsc --noEmit -p apps/api/tsconfig.json: exit0.
- git diff --check: exit0. Repository declares no linter command; no linter execution claimed.
- Owned activity_ai_real_test: Prisma migrate deploy0, migrate diff --exit-code0, finished migration history exactly14.
- Real endpoint synthetic registration/verification/classroom/enrollment/private PDF plan/DOCX material upload and publication seed: completed.
- After seed: classroom_curriculum_extractions0, activity_ai_generations0, ai_usage_daily0. No Google call at startup/seed; no generated-content result claimed by this agent.

## Commits and outcomes
No commits by this agent. Only launcher/helper files and this attributed record changed by this agent; concurrent coordinator/verifier records and roadmap changes belong to them.

## Handoff
Independent verifier and coordinator notified before any provider action. URL http://127.0.0.1:60976; inbox http://127.0.0.1:60966. Model gemini-3.5-flash-lite; realProvider=true. Synthetic browser fixture .test-artifacts/activity-ai-real/browser-fixture.json contains credentials only for these synthetic actors; keep it ignored. Owned database activity_ai_real_test, container foxmind-p4-1b2938620928e9b5-db; owned S3/scanner share the same prefix. Use read-only SQL via docker exec -u postgres on this exact container, never a retained database. No further Next build while this runtime uses .next.

Stop via Enter to exec session62354 or creating ignored marker .test-artifacts/activity-ai-real/stop-41348. API/Next close first, then existing withMailpit/withP4Services verify owner labels and remove only their resources. Cleanup code is inherited and inspected; teardown has not yet been executed for this still-active verification session. First remaining action: verifier performs explicitly authorized activity generations and records browser/API/SQL evidence; coordinator owns later cleanup and integration decisions.

## Follow-up — failed first real job and owned orphan cleanup

Coordinator authorized cleanup and API rebuild after the independently observed first real TP job failed AI_UNAVAILABLE before dispatch (usage0); product diagnosis/fix and adapter10PASS/review evidence belong to coordinator and their assigned agents, not this launcher task. No retry/provider call performed here.

- Actual session62354 was unavailable (`Unknown process id`); CIM confirmed PID41348 absent, no children of41348, and no listener60976. Stop marker existed. Therefore the observed orphaning follows lost supervisor execution; no evidence of a polling/stop-file code defect. Cause of supervisor termination itself is unproven.
- Exact P4 owner labels verified before force-removing only foxmind-p4-1b2938620928e9b5-db/-s3/-scan and owner-labelled network foxmind-p4-1b2938620928e9b5. No P4 persistent volumes existed.
- Exact Mailpit container foxmind-mail-test-d3d85073-fbf4-4154-bce2-471aa8753b40 and its -data volume labels both matched d3d85073-fbf4-4154-bce2-471aa8753b40 before removal. Owned orphan cleanup failures0. Subsequent container/network/volume listings for these exact identities were empty.
- Fresh node scripts/build-api.mjs after coordinator backend fix: Prisma generation0, API TypeScript compilation0 within original30s policy. git diff --check0 (line-ending advisories for coordinator-owned product/test files only).
- No launcher changes or runtime workaround, no Next rebuild, no private configuration reread or Google call in this follow-up. Old fixture/metadata is historical and unavailable.

Superseding handoff: per coordinator instruction, do not restart from the child. Coordinator must run node scripts/activity-ai-real-live.mjs in their own controlled exec session, retaining supervision and waiting for fresh URL/fixture and startup0 before releasing verifier. Original old stop-41348 is PID-specific and will not match a fresh process. Coordinator owns current runtime lifecycle; no still-active session is claimed by this record after cleanup.

# Crear aula exploration — completed

- Agent / role: /root/wizard_explorer, read-only.
- Session or task ID: /root/wizard_explorer.
- Persisted by: /root coordinator from final report.
- Date: 2026-10-28.
- Branch / worktree: codex/inicio-reference-astra; isolated foxmind-inicio-astra/ProtipoFoxMind.
- Starting commit: 7a742de70c766bea3e5557566dc341b9c2ff9742; initial tree clean.
- Phase/task: [Crear aula reference](2026-10-28-root-wizard-reference.md), existing P5.
- Status: completed (static exploration only).

## Findings

Wizard.tsx owns four steps, upload, draft payload,650ms queued autosave/revision/failure latch, explicit save-before-exit and save-before-publication. Preserve all. Payload supports basic metadata, existing cover key, approved file and units/topics; no pasted plan or file-size metadata. Current catalog has seven covers plus historical-key support. Use city labels without changing IANA values or post-publication immutability.

PlanExtraction/use-plan-extraction/extraction-client automatically analyze approved saved plans. READY is a separate proposal; application/replacement requires explicit review/consent. Cancellation/source changes reject stale responses. Shared queue keeps mutations ordered. General data and approved PDF/DOCX are required; units need named topics. Fieldset busy states and beforeunload protection must remain.

Classrooms.tsx reduces sidebar navigation while a draft is open; preserve that safe-exit boundary. New styling should have a wizard-only marker. Existing platform-polish fixture cannot verify all four steps: its draft catchall mishandles extraction response types, publication fails deliberately and upload is disabled. Use a typed in-memory fixture with explicit route order.

## Observed checks and limits

Read actual Git status/SHA/branch, spec §5, P5 task and integration records and direct wizard dependencies with Get-Content/rg. AST command `ast-grep run -p 'useEffect($$$)' -l tsx apps/classrooms-ui/Wizard.tsx --json=compact` exit0, four effects. Two rg PowerShell glob attempts failed and were corrected with -g. Proposed docs/functional-spec.md is absent; real file is docs/foxmind-v1-functional-spec.md.

Engram current_project/context/search reads succeeded for prototipofoxmindmvp-v1; historical context only. No memory writes, suite execution, browser, DB, Docker, secrets, private environment files or commits. No screenshot comparison claimed by explorer.

Candidate pure suites (inspect before execution): classroom-ai-ui.test.mjs, p5-policy.test.mjs, classroom-zones.test.mjs. Legacy integration suites are not approved for this frontend validation.

## Handoff

Coordinator/architect define bounded presentation and meaningful new interactions; test_runner builds four-step synthetic fixture and RED cases before worker changes. No explorer-authored source or commit.

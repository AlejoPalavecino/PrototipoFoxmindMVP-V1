# Main and recovered-source readiness — passed

- Agent / role / task: /root/main_gemini_readiness_verify / test_runner
- Persisted by: /root coordinator; date2026-10-24
- Worktree / branch: integrate-classroom-gemini / main; startupf1e5964
- Scope: [classroom AI](../../odd/tasks/classroom-ai-extraction.md) plus Agenda runtime readiness
- Status: completed

Independent node .test-artifacts/main-gemini-20261024/verify/readiness.test.mjs exited0:31checksPASS at17:27:23UTC. Main52171 sign-in/agenda/mis-aulas200, classroom/Agenda APIs401 without session, inbox52169readyz200. Recovered60061 sign-in/mis-aulas200, classroomAPI401, inbox49493readyz200. Main history12/schema38tables, recovered history10/schema37tables; strict current checksums passed. Informational counts2users/4classrooms/4drafts in each, not assumed immutable after manual tests.

Four owned containers running/persistent, three owned volumes, scannerPONG and scanner/mailhealthy passed. Static source inspection confirms both launchers use the original key path and Next OS allowlist/backend origin without AI credentials. Private/key/proof paths ignored by Git. StartupHEADf1e5964 and productdiffempty observed. Sanitized proof/result remain ignored under verify/readiness.test.mjs and verify/readiness-result.test.json.

Initial harness probes used wrong API prefixes and table name; corrected against actual code, retained in the ignored verification history. They are not product failures. No services/browser/login/Google requests, data mutations or private values output by this verifier. Original37-table/4-object equivalence is attributed to root's earlier clone/recovery proof. This certifies readiness, not a new visual or paid E2E acceptance. Handoff: leave both apps running for user; root stores result and local documentation commit.

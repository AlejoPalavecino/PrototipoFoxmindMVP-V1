# Foxy publication runtime P3D4 — 2026-10-31

Status: in progress. Compose provider-independent publication worker with durable queue, authority, file bridge, renderer and completion.
Completed: compose publication queue, authority, lazy durable file bridge, isolated PDF renderer and completion independently of text configuration; lifecycle initializes and drains both workers. Tests publication-runtime/runtime/publication-worker PASS 15; api:build and lint:boundaries PASS. Prior runtime tests were updated by test owner for two independent timers. Actual end-to-end recovery with PostgreSQL and file service in compiled host still needs verification; no real credentials/provider/data.

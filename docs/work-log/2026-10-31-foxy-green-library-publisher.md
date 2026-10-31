# Library transactional publisher E1 — 2026-10-31

Status: in progress. Extract shared library publish under caller transaction; no migration or global uniqueness.
Completed: shared caller-transaction publisher validates teacher classroom/revision, curriculum, authorized ready file and prior references including tombstones, then inserts and increments once. LibraryService publish delegates while preserving {revision}; generic library formats and custody rules unchanged, no schema/global uniqueness. Synthetic PostgreSQL publisher suite PASS 4, P6 library/plan PASS 16, api:build and lint:boundaries PASS, git diff --check PASS. No real data, provider or deployment.

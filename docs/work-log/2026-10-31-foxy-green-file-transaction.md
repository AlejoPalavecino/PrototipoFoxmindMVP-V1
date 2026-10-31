# File transactional begin P0 — 2026-10-31

Status: in progress. Extract upload reservation in caller transaction with unchanged validation, authorization and quotas.

Status: completed. beginInTransaction uses caller transaction and identical authorization/quota/custody path; begin snapshots scope and intent before waiting and delegates. FileStore.usage normalizes returned bigint because pg synthetic adapter supplies strings; this also prevents string concatenation from bypassing quota checks.

Checks: transaction tests PASS 3 (synthetic PostgreSQL); file policy and document reader regressions PASS 20; api:build and lint:boundaries PASS. Initial run failed usage string and quota rejection; both resolved by normalization and suite passed. No storage/provider/retained database used.

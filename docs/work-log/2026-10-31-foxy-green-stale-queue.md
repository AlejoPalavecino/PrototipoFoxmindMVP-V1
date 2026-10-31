# Foxy stale publication queue — 2026-10-31

Status: in progress. Exclude stale source before acquiring publication lease.
Completed: queue excludes deleted conversations, revision-mismatched resources and revoked source-classroom ownership, preserving eligible jobs. RED 4 reproduced; full allocator suite PASS 12, api:build PASS, lint:boundaries PASS. Initial build failed TS6053 due concurrent Prisma generation; coordinator confirmed collision and isolated rerun passed. Synthetic PostgreSQL only.

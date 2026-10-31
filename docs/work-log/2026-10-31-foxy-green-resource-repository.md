# Foxy private resource repository — 2026-10-31

Status: in progress. Scope resource persistence and idempotent CAS, no publication; fetch origin exit 0, synthetic PostgreSQL only.

Status: completed. One private resource per READY turn, ownership enforced through composite FKs and queries; edits use request-hash replay and CAS with recorded original result. Limits title 200 and markdown 50000 code points. No answer mutation or library publication. git fetch origin exit 0.

Checks: isolated PostgreSQL repository suite PASS 3 after migration update; api:build PASS; lint:boundaries PASS; Prisma migrate diff synthetic DB versus schema exit 0 (no difference). Initial build failed Prisma one-to-one composite uniqueness, added unique; initial diff showed FK naming mismatch, fixed relation maps. No retained DB, provider or deployment. Schema requires independent review of migrations and lifecycle integration.

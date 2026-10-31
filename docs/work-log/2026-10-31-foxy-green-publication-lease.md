# Foxy publication lease queue P3D2 — 2026-10-31

Status: in progress. Fenced renew/release and shared capacity with active file processing leases.
Implemented fenced renew/release and shared publication/P4 capacity. Queue tests PASS 4, allocator regression PASS 12, api:build and lint:boundaries PASS. Review pending: concurrent P4 custody transition may race release/reclaim because lease check is not serialized on classroom lock; coordinator informed. Synthetic PostgreSQL only, no worker or real provider.

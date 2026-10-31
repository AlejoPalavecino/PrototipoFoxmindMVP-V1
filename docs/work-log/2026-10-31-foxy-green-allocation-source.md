# Foxy allocation source revalidation — 2026-10-31

Status: in progress. Snapshot lease and artifact, lock and revalidate source ownership and revision inside allocation transaction.
Completed: immutable copies of lease/artifact taken before first await; transaction locks classrooms in ID order and validates destination, source ownership, conversation not deleted and resource revision before reserving. Allocator suite PASS 8 on synthetic PostgreSQL; api:build and lint:boundaries PASS. No retained DB or provider.

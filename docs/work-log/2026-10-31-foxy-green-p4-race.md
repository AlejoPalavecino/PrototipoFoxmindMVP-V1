# Foxy P4 uncommitted custody race — 2026-10-31

Status: in progress. Serialize publication queue and file reception through classroom and shared advisory lock.
Completed: claim discovers candidate before locking target classroom, then admission advisory and fresh capacity/custody checks before publication update; release takes same lock order. File upload authority takes advisory after scope lock, revalidates; guarded storage.put reauthorizes after transaction commit, and bridge retains single-receive bound. Race RED reproduced and GREEN; files/queue/allocator suite PASS 20; files/queue rerun PASS 8; api:build and lint:boundaries PASS. Synthetic PG/storage/scanner only.

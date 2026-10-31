# Library publisher lightweight revision — 2026-10-31

Status: in progress. Remove drafts composition dependency and accept canonical int64 revision internally.
Completed: internal revision accepts canonical 0..int64 max; max itself returns CONFLICT because it cannot advance. Removed drafts composition import; native public barrel import works. Publisher snapshots all input before first await. RED revision and mutation confirmed; publisher/P6 library/plan suite PASS 23; native barrel import, api:build, lint:boundaries PASS. No DB retained.

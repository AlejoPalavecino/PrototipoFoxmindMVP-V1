# Foxy publication private PDF reader E3D — 2026-10-31

Status: in progress. Current authorization before and after bounded file I/O, historical READY/PUBLISHED review, no HTTP.
Completed: current teacher/source/destination authorization and durable PDF proof in UoW before/after FileService.read outside transaction. Published requires live bound material; archive is allowed; descriptor changes or altered bytes deny. Returns bounded bytes and constant safe headers only. Synthetic PG suite PASS 3 incl real FileService and fake storage; api:build and lint:boundaries PASS. Route/proxy wiring and expanded races remain pending; no real provider/data.

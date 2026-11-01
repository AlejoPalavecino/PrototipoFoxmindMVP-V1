# Raster publication cleanup

- Agent / role: /root/green_management / slice_worker
- Session ID: /root/green_management
- Date: 2026-11-01
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Status: in_progress

## Scope
Correct discarded raster publication P4 cleanup without touching private visual source. Reviewer reproduced PDF-only filter and unremoved P4 object after quiet lease; RED pending. Preserve ownership, digest, reference and lease fences.

## Implementation and evidence
Replaced PDF-only binding filter in publication-cleanup.ts with explicit TEXT/PDF and VISUAL/PNG-JPEG descriptor branches; validates publication snapshot digest/size/MIME/dimensions/producer and destination-file extension, retaining ownership, custody, reference and lease fences. Does not inspect or remove private visual source. PNG PG cleanup test passed after natural lease expiry (~90s), including private source and charge preserved. API build and boundaries passed. Legacy PDF wrong-extension case passed; old size-mismatch fixture initially failed due new immutable-artifact guard and was corrected by test runner, who reports GREEN without disabling guard. JPEG test and independent review pending; no real S3/ClamAV or retained-data operations.
JPEG real-lease PostgreSQL cleanup passed according to independent test_runner: P4 copy deleted and cleanup DONE, private asset/charge preserved. Architecturally relevant limitations unchanged; review pending.
Independent reviewer reports LGTM and two additional PostgreSQL crash-fixture cases: PNG/JPEG delete exactly P4 copy once, preserve DISCARDED private source/key/charge; no live lease shortened. Host wiring assessment: application.ts supplies only text provider/configuration; visual environment/profile/quota wiring, Gemini DIAGRAM adapter and host IMAGE factory with bounded transport remain absent. No provider calls, credential reads or real storage access were made.

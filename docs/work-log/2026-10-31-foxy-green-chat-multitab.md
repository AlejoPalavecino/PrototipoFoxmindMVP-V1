# Foxy multi-tab polling transfer — 2026-10-31

Status: in progress. RED reproduced when a newer running turn appears while an older poll is in flight.

Status: completed. After a poll resolves, active turn is derived from the merged state and polling transfers serially to a newer running turn discovered in another tab. RED observed; controller suite PASS 16; web:build and lint:boundaries PASS. No real data/provider.

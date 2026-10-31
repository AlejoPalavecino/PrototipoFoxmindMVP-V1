# Foxy controller terminal race — 2026-10-31

Status: in progress. Old terminal read must not clear a newer accepted active turn.

Status: completed. Terminal receipt read only merges its own result and no longer clears a newer active receipt. RED observed; full controller test suite PASS 13, web:build PASS, lint:boundaries PASS. UI integration remains independently unverified; no real provider/data.

# Foxy publication reader revalidation errors — 2026-10-31

Status: in progress. Bind full descriptor, revalidate read failures, sanitize storage errors.
Completed: descriptor binds source/destination/resource/conversation/artifact metadata; on FileService.read errors re-resolve current authorization and binding before safe error mapping, preserving auth codes and denying deleted material opaquely. Successful and invalid-byte paths re-resolve too. Three RED reproduced; reader suite PASS 6 with synthetic PG and real FileService; api:build and boundaries PASS. Independent review pending.

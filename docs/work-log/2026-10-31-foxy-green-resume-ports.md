# Foxy publication resume ports — 2026-10-31

Status: in progress. Authorized existingFile and storage-free inspection under real file access and DB clock.
Completed: existingFile verifies capability and lease before returning null or issuing a fresh opaque file capability. inspect uses FileStore authorization and DB time, classifies READY/RECEIVABLE/BUSY/UNAVAILABLE without storage reads; removed blobs are separately authorized before UNAVAILABLE. RED observed; authority/files complete suites PASS 14; targeted tests PASS 4 after additional digest check; api:build and lint:boundaries PASS. No real provider/data.

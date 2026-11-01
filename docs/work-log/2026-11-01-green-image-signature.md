# Image signature bound — GREEN

- Agent: /root/signature_green; session ID unavailable; branch codex/foxy-ai.
- Scope: replace per-signature 64 KiB cap with accumulated UTF-8 signature budget of 16 MiB; reject non-string signatures as PART_SHAPE. Opaque signatures are not stored or logged. HTTP response bound remains unchanged.
- Changed apps/api/src/ai/foxy-image-response.ts only; tests owned by test_runner.
- `node --experimental-transform-types --test --test-reporter=dot apps/api/src/ai/foxy-image-signature.test.mjs apps/api/src/ai/foxy-image-diagnostic.test.mjs apps/api/src/ai/foxy-image-adapter.test.mjs`: 18 PASS. `npm run api:build --silent` and `npm run lint:boundaries --silent`: exit 0.
- No provider calls or secret reads. Actual prior rejection may also have been non-string; diagnosis grouped both conditions. Independent review and authorized live validation remain.
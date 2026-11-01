# Image live validation — response-parser diagnosis

- Agent / role: /root/image_diagnosis / architect.
- Session ID unavailable; task identity /root/image_diagnosis.
- Date: 2026-11-01; branch codex/foxy-ai; starting commit 37ff23e1681ec7f91b4aac511c35d161739bc8ea.
- Scope: diagnose IMAGE INVALID_AI_OUTPUT without additional provider calls, secret inspection or production edits.
- Status: completed (diagnosis and instrumentation design only; live cause unconfirmed).
- ESTADO_DISENO: LISTO_PARA_TDD_RED for safe parser diagnostics; no broad validation relaxation.

## Observed evidence and root classification

Coordinator observed one authorized smoke run: IMAGE INVALID_AI_OUTPUT; DIAGRAM OK with four nodes. scripts/foxy-provider-smoke.mjs:19 prints only the sanitized code and retains no response. The rejected response cannot be reconstructed from this output. No credential file or real response was inspected in this task; no additional provider call was made.

The image adapter calls parseGeminiFoxyImageResponse only after generateContent resolves (foxy-image-adapter.ts:46). This parser is the source of the observed INVALID_AI_OUTPUT code; SDK/status/preflight failures map differently. Therefore generation reached response validation, but the presence of a usable generated image is NOT established. imageUsage only returns a value or null and cannot produce this code. Missing usage is not a supported cause of this rejection.

Triage class: E (exact rejection condition unknown) within response compatibility; confirmed C subproblem (all parser gates collapse to an undiagnosable code). Do not call a speculative format change a root-cause fix. A model refusal, truncated output or ambiguous result is a legitimate rejection rather than necessarily a parser bug.

## Offline findings and hypotheses

Parser gates include one candidate, STOP finish reason, no prompt block, at most64 parts, strict Part-field allowlist, one data variant, signature length <=65536, text <=65536UTF8bytes, canonical padded base64, PNG/JPEG signature and at most10MiB, exactly one non-thought final image.

| Hypothesis | Evidence | Confidence for this live response |
| --- | --- | --- |
| Provider returned text-only, blocked/MAX_TOKENS output or multiple final images | Explicit parser rejects and existing tests cover them | Possible, not observed |
| Legitimate metadata rejected | Installed SDK2.31.0 Part includes optional partMetadata/mediaResolution; candidate converter preserves content directly. Parser rejects either extra field | Compatibility risk reproduced offline, not observed live |
| Signature too large or signature-only part | Signature is documented opaque base64 with no 64KiB limit found. Parser has that local limit; standalone signature also fails data-union check | Possible; official signature-only example is streaming, while this request is nonstreaming; do not assume equivalence |
| Payload/MIME/base64/signature/size incompatible | Strict parser branches all map to same code | Possible, not observed |
| Missing/inconsistent usage | imageUsage returns null after successful parse | Excluded as source of INVALID_AI_OUTPUT |
| Deadline, rate limit, HTTP status failure or invalid preflight | Adapter maps those to distinct sanitized codes | Excluded by current code path, barring external mutation |

Offline probe (Node transform-types, no network) used synthetic9-byte PNG-signature payload: baseline accepted; each of partMetadata, mediaResolution, signature-only part, signature65537, null promptFeedback and MAX_TOKENS returned INVALID_AI_OUTPUT. These probes identify gates, not the real response shape. The PNG is a parser fixture, not a decodable image proof.

Primary documentation checked through Context7 /googleapis/js-genai/v2.31.0 and official Google pages: [SDK Part](https://github.com/googleapis/js-genai/blob/v2.31.0/docs/interfaces/types.Part.html), [REST Part](https://ai.google.dev/api/generate-content), [image thought signatures](https://ai.google.dev/gemini-api/docs/generate-content/image-generation), [GenerateContent signatures](https://ai.google.dev/gemini-api/docs/generate-content/thought-signatures). Signatures are opaque metadata attached to output parts; their size is not a public image-content fact. No document establishes that the actual failed response used any problematic shape above.

## ESTRATEGIA_EQUIPO_Y_SUPUESTOS

One response-validation cluster, one small diagnostics slice, preserving existing public code and rejection policy. test_runner owns tests, slice_worker owns parser and smoke output only, reviewer audits sanitization. No DB, domain, UI, additional state or duplicate parser. Do not persist provider text, bytes, signatures, IDs, arbitrary keys, headers, URLs, prompts or raw JSON. Keep existing outer16MiB response cap and image custody validation.

## CONTRATOS_Y_PLAN_POR_SLICE

1. In foxy-image-response.ts keep code INVALID_AI_OUTPUT, attach an internal allowlisted reason to parser failures: RESPONSE_SHAPE, PROMPT_BLOCKED, CANDIDATE_COUNT, FINISH_REASON, PART_SHAPE, PART_FIELDS, SIGNATURE_LIMIT, DATA_VARIANT, TEXT_LIMIT, MIME, BASE64, BYTE_LIMIT, RASTER_SIGNATURE, MISSING_FINAL_IMAGE, MULTIPLE_FINAL_IMAGES. Reason identifies the FIRST rejecting branch in the same validation pass; no parallel diagnostic parser.
2. Optional bounded details may contain numeric candidate/part counts, rejected part index, signature/base64 length and an allowlisted finish-reason token or OTHER. Clamp counters; never print arbitrary provider strings or unknown key names. If identifying unexpected fields is essential, use predefined boolean categories plus hasOtherFields, not key strings. Existing client-facing serializers must keep returning only the public code.
3. scripts/foxy-provider-smoke.mjs may log only a fixed diagnostic reason and validated/clamped numbers. Never log error.message, cause, stack or the SDK response. Make mode selection explicit so a later IMAGE-only investigation cannot regenerate DIAGRAM already verified. No diagnostic path may dispatch a second generation automatically.
4. After offline review of this patch, a new separately authorized IMAGE-only call is needed to observe the actual reason. The earlier live image call cannot be replayed or diagnosed retroactively. No repeat is included in this task. No validation gates should be relaxed until the specific shape and security semantics are known.

## CRITERIOS_DE_TEST_DOT

- Every rejection branch retains INVALID_AI_OUTPUT and emits one allowlisted reason; hostile metadata/text cannot enter diagnostics or public error JSON.
- Valid image/ancillary thought fixtures remain accepted; current zero/multiple-final-image, URL/tool/SVG, safety and size rejections remain rejected.
- Long signature/metadata synthetic fixtures classify rejection without serializing values; usage-null alone still succeeds.
- SDK injected fetch with synthetic response proves exact diagnostic branch, one generation call, ticket consumed and no retry.
- Smoke mode selection runs only the requested modality; absent live authorization refuses before environment read/network. Do not rerun paid tests merely to test logging.

## Verification and handoff

Observed existing parser+adapter suite:21 tests PASS via node --experimental-transform-types --test --test-reporter=dot apps/api/src/ai/foxy-image-response.test.mjs apps/api/src/ai/foxy-image-adapter.test.mjs (exit0). Offline gate probe exit0. git diff --check passed. First rg glob on Windows failed harmlessly; used explicit paths afterward. No production/test edit, credentials, memory write or provider call.

Next: coordinator assigns diagnostics RED/GREEN and independent review; only then arrange a newly authorized IMAGE-only test if needed. The four-node live DIAGRAM result is adapter/schema proof, not rendered-image or publication proof. Do not rerun that successful modality during image investigation.
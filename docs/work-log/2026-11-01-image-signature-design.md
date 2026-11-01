# IMAGE signature compatibility — bounded correction design

- Agent / role: /root/signature_arch / architect; runtime session ID unavailable.
- Date: 2026-11-01; branch codex/foxy-ai; starting commit 5d2c932160e4d95d325fa5b704d1995d4bccba31.
- Scope: design a narrow correction after the second authorized IMAGE smoke returned INVALID_AI_OUTPUT (SIGNATURE_LIMIT). No production/test edit, secret inspection or provider call.
- Status: completed (design only).
- ESTADO_DISENO: LISTO_PARA_TDD_RED.

## Diagnosis and evidence

Triage bucket C: response-compatibility cluster, specifically a locally invented limit on opaque transport metadata. The installed @google/genai 2.31.0 Part declaration (dist/genai.d.ts:12970) defines thoughtSignature as an optional opaque base64 string, reusable in subsequent requests; it specifies no 64 KiB maximum. The converter retains the string, and this single-shot Foxy adapter neither reuses nor exposes it. Do not treat this as content requiring decoding, rendering or storage.

The current parser emits SIGNATURE_LIMIT for TWO conditions: non-string metadata OR string length greater than 65536. Thus the observed live diagnostic identifies this gate, but proves neither the exact type nor length. No response was retained. An offline probe confirmed: a synthetic final PNG with signature length65536 is accepted; length65537 and object-valued signature both reject with the same diagnostic. No real signature or image was inspected.

Production transport already limits the ENTIRE response body to 16,777,216 bytes in foxy-image-bounded-fetch.ts. This includes JSON, base64 image, text and signatures. Preserve that cap, abort/deadline handling, redirect refusal and one attempt. The final decoded image remains limited to 10,485,760 bytes and all existing raster/candidate/safety rules remain in force. Do not widen the outer response limit merely to accommodate signatures.

## ESTRATEGIA_EQUIPO_Y_SUPUESTOS

Keep one small parser correction in the existing adapter boundary. No domain contract, database, state, flags or new factory. test_runner owns RED, worker owns parser, reviewer audits the diff. No shared roadmap changes by children. Existing worktree and unrelated edits must be preserved.

Reversible technical assumption: a string signature that fits the existing response budget can be ignored safely for this single-shot generation. We do not promise that every provider response fits 16 MiB. Responses over that cap remain unavailable by policy. The live error is not yet a proof of successful final image decoding/custody.

## CONTRATOS_Y_PLAN_POR_SLICE

Only apps/api/src/ai/foxy-image-response.ts needs behavior changes, plus focused tests. Keep the function signature and returned ImageResponse unchanged.

1. Replace the per-part 65536-character signature cap with an accumulated UTF-8 signature budget of 16,777,216 bytes across all parts.
2. A defined signature must still be a string. Non-string values reject with existing PART_SHAPE, preserving public code/message INVALID_AI_OUTPUT. This prevents SIGNATURE_LIMIT from conflating type and size in future safe diagnostics.
3. Reject a string whose code-unit length exceeds the budget before byteLength; then calculate Buffer.byteLength(signature,'utf8') without copying/decoding it. Add only if bytes <= remaining signature budget; otherwise reject SIGNATURE_LIMIT. This aggregate check is defense for direct/injected parser use. Production combined wire body remains more strictly bounded by transport.
4. Never return, persist, log, hash or base64-decode the signature; accept empty string as before. No regex or recursive processing. Do not accept signature-only parts, add SDK fields to the Part allowlist or relax the exactly-one-data-variant rule in this slice.
5. Keep signature diagnostics non-enumerable and allowlisted. No live output contents, unbounded lengths, signatures or error causes are printed. IMAGE-only smoke and no retry behavior stay intact.

## CRITERIOS_DE_TEST_DOT

- RED: synthetic valid final PNG with opaque ASCII signature length65537 and 1 MiB must succeed and return only bytes/MIME/usage; signature absent/empty still succeeds. The current parser rejects both long fixtures.
- Boundary: accumulated ASCII signature bytes exactly16MiB accepted by pure parser; one byte above rejected SIGNATURE_LIMIT. This pure-parser boundary fixture intentionally cannot fit the actual wire response once image/JSON is added; do not call it production acceptance.
- Aggregate: multiple individually allowed signatures whose total exceeds16MiB reject. UTF-8 signatures must use byte counts, with multibyte data crossing the boundary rejected even if code-unit count is lower. Type null/object/number rejects PART_SHAPE; no details leak through JSON(error).
- Existing text64KiB, parts64, canonical base64, decoded10MiB, MIME/signature, no/multiple final image, safety/finish/tool/URL restrictions remain unchanged.
- Injected installed SDK plus bounded fetch: combined body <=16MiB with signature>64KiB succeeds; combined body>16MiB is aborted/rejected before parser, with no retry. No real credentials or network needed.
- Run focused parser/diagnostic/adapter/bounded-fetch suites, API build and boundary check. No DB or browser work is required for metadata-only parser correction.
- A future paid IMAGE validation is a separate action under the coordinator's user authorization; this design makes zero provider calls. First confirm offline correctness and review; do not count offline compatibility as a real image PASS.

## Observed verification and handoff

Read the actual parser, bounded transport, provider factory and installed SDK2.31.0. Offline boundary probe exited0. First guessed bounded-fetch filename was absent; resolved actual foxy-image-bounded-fetch.ts with rg. A Windows wildcard rg path failed harmlessly, then explicit paths were used. No production/test changes, credentials, memory writes or network/provider calls.

Contract sent to /root/signature_red and coordinator. Next: RED on these exact bounds, narrow GREEN parser patch and independent review. A new live call is not part of this architectural task.
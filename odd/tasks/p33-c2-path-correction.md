# P3.3 C2 — Bounded TypeScript probe correction
Correct only the failed receipt discovery's treatment of directory/file existence probes. The previous failed checks remain failures; this is a separately human-authorized correction, not an automatic replay.

## Specs

S1. User continuation verbatim: "Review the delivered subagent output and continue." Human selected verbatim "Autorizar la corrección acotada — recomendado" (authorize-bounded-c2-path-probe-correction) after the explicit proposal: "Corregir el rechazo de consultas de directorios, conservar las restricciones de lectura y ejecutar una sola comprobación de los 11 controles existentes."
S2. Preserve existing main P3.3 S1–S7, C2 contracts and all eleven checks. No actual reads/traversal outside project, symlink or sensitive-file permission, weaker flags/assertions, dependencies, root build/integration or adoption of the package alias. Existing synthetic fixture path remains .test-artifacts/p33-d2-plan-c2-mvb4asm3/; preserve existing files without deletion.

## Tasks

- R1 | S1–S2 | bounded worker corrects TypeScript metadata-probe handling, self-reviews and runs the existing eleven checks exactly once | dropped | mvb4z1xw-4-sfqs partial: outside metadata probes rejected without filesystem access, sole check exit1/3PASS8FAIL/12486.2906ms. New output-discovery assertion prevents proof. Correction scope exhausted; needs human disposition, not another automatic test.
- R2 | S1–S2 | parent reviews returned result and reconciles C2; continue C3 only on applicable passing self-proof | dropped | parent reviewed record/source, recorded missing proof; C3 prohibited until human chooses new scope. No build/alias/verification adopted.

## Log

L3. Worker mvb4z1xw-4-sfqs returned partial after exactly one check: exit1/3PASS8FAIL/12486.2906ms. Current diagnostic: "Error: Debug Failure. False expression: Expected fileName to be present in command line" from TypeScript getOutputFileNames; native Windows separators are a source-supported explanation, not a verified fix. Parent read the exact source/report and ran no further checks. Existing dependency-hash cost and generation-input stability are still unproven, not new correction scope. Recommend deciding whether to replace this auxiliary receipt/cache with straightforward strict build-once test orchestration rather than another open-ended tool-repair sequence; no retirement/removal performed without approval.

L1. Original user continuation verbatim: "Review the delivered subagent output and continue."
L2. Human explicitly selected "Autorizar la corrección acotada — recomendado" (authorize-bounded-c2-path-probe-correction). Prior combined attempts each exit1/3PASS8FAIL. Current known cause is TypeScript automatic ambient type ancestor discovery invoking directoryExists outside the project, rejected by safe path handling. Existence queries can be answered absent without reading external directories; actual reads must remain guarded. No unrelated performance/cache redesign or new generation-lifecycle changes are authorized by this narrow correction.

L4. User verbatim "si" authorized replacing the auxiliary receipt/cache design. This narrow repair task is superseded/dropped, not completed and not a passing result. Replacement tracked in p33-build-once.md.

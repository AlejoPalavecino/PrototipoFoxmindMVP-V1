# P9 full-V1 acceptance matrix

Baseline: accepted main53a798670a0415aafc469fd3c2bf2276e2f0055f. Scope: all170 acceptance rows in [functional specification section15](foxmind-v1-functional-spec.md), lines761-930. No production deployment or retained-data mutation.

## Evidence semantics

Every source acceptance row appears exactly once below, preserving its scenario and expected result. Family membership links reusable tests, not a blanket PASS. Row cells now separate inherited accepted P3-P8 evidence, reached P9 own assertions, and pending independent reconciliation. Prior accepted records keep their exact historical source/proof scope. Final closure must link exact observed candidate commands/assertions or explicitly retain an unavailable gap; a filename, policy-only test or screenshot alone is not runtime acceptance. Do not weaken an expected result to fit a fixture.

Shared API30s/Next180s/actual330s-child360s remain. Long work is split into coherent bounded groups, never silent timeout expansion. Real PostgreSQL/storage/ClamAV/Mailpit fixtures are owned and disposable. No p4-local retained project/credentials. Baseline native outbox unavailable remains advisory, not PASS.

## Families and required joined proof

### G01 — Inicio, mixed roles and navigation

Reusable fixtures: [tests/p5-integration.test.mjs](../tests/p5-integration.test.mjs), [tests/p6-mobile-navigation.test.mjs](../tests/p6-mobile-navigation.test.mjs).

P9 proof: New Inicio real mixed-role/empty/notification/current-membership/mobile and guarded continuation proof. Status: inherited assertions and reached P9 own scope are indexed below; independent reconciliation pending.

### G02 — Classroom drafts, metadata and roster constraints

Reusable fixtures: [tests/p5-policy.test.mjs](../tests/p5-policy.test.mjs), [tests/p5-drafts.test.mjs](../tests/p5-drafts.test.mjs), [tests/p5-enrollment.test.mjs](../tests/p5-enrollment.test.mjs), [tests/p5-integration.test.mjs](../tests/p5-integration.test.mjs).

P9 proof: Map exact existing assertions and connect real lifecycle, retaining draft/privacy/rejection invariants. Status: inherited assertions and reached P9 own scope are indexed below; independent reconciliation pending.

### G03 — Identity, tokens, passwords and verification gates

Reusable fixtures: [scripts/test-p33-t2.mjs](../scripts/test-p33-t2.mjs), [scripts/test-p3-browser.mjs](../scripts/test-p3-browser.mjs).

P9 proof: Supported native identity groups and real captured-email flow; no direct owned-runner bypass. Status: inherited assertions and reached P9 own scope are indexed below; independent reconciliation pending.

### G04 — Membership, invitations, archive and current/history

Reusable fixtures: [tests/p5-enrollment.test.mjs](../tests/p5-enrollment.test.mjs), [tests/p5-delivery.test.mjs](../tests/p5-delivery.test.mjs), [tests/p5-integration.test.mjs](../tests/p5-integration.test.mjs), [tests/p8-progress.test.mjs](../tests/p8-progress.test.mjs), [tests/p8-progress-integration.test.mjs](../tests/p8-progress-integration.test.mjs).

P9 proof: Joined explicit enrollment/removal/re-entry/archive/restart with unchanged rejection hashes. Status: inherited assertions and reached P9 own scope are indexed below; independent reconciliation pending.

### G05 — Authoring, criteria, organization and preview

Reusable fixtures: [tests/p7-authoring.test.mjs](../tests/p7-authoring.test.mjs), [tests/p7-authoring-integration.test.mjs](../tests/p7-authoring-integration.test.mjs), [tests/p7-questionnaire-overview-integration.test.mjs](../tests/p7-questionnaire-overview-integration.test.mjs), [tests/p7-consultation-integration.test.mjs](../tests/p7-consultation-integration.test.mjs).

P9 proof: Keep content locks and actual preview/start/publication boundaries in joined proof. Status: inherited assertions and reached P9 own scope are indexed below; independent reconciliation pending.

### G06 — Attempts, reopening, editor authority and practical receipt

Reusable fixtures: [tests/p7-history.test.mjs](../tests/p7-history.test.mjs), [tests/p7-history-integration.test.mjs](../tests/p7-history-integration.test.mjs), [tests/p7-participation.test.mjs](../tests/p7-participation.test.mjs), [tests/p7-practical-integration.test.mjs](../tests/p7-practical-integration.test.mjs).

P9 proof: Real resubmission/prefill/history/current effective grade and stale-editor denial. Status: inherited assertions and reached P9 own scope are indexed below; independent reconciliation pending.

### G07 — Private files, capacity, scan, quotas and cleanup

Reusable fixtures: [tests/p4-file-policy.test.mjs](../tests/p4-file-policy.test.mjs), [tests/p4-content.test.mjs](../tests/p4-content.test.mjs), [tests/p4-cleanup-worker.test.mjs](../tests/p4-cleanup-worker.test.mjs), [tests/p4-integration.test.mjs](../tests/p4-integration.test.mjs), [tests/p7-practical.test.mjs](../tests/p7-practical.test.mjs).

P9 proof: Separate policy proof from real five maximum-size files with sufficient owned quota; actual scan/private bytes/outage/recovery/restart/cleanup. Status: inherited assertions and reached P9 own scope are indexed below; independent reconciliation pending.

### G08 — Library immutable material and associations

Reusable fixtures: [tests/p6-library.test.mjs](../tests/p6-library.test.mjs), [tests/p6-library-integration.test.mjs](../tests/p6-library-integration.test.mjs), [tests/p7-authoring.test.mjs](../tests/p7-authoring.test.mjs).

P9 proof: Actual student material consumption through authorized persisted file links. Status: inherited assertions and reached P9 own scope are indexed below; independent reconciliation pending.

### G09 — Autosave, retry, restoration and incomplete submission

Reusable fixtures: [tests/p7-questionnaire-autosave.test.mjs](../tests/p7-questionnaire-autosave.test.mjs), [tests/p7-questionnaire-integration.test.mjs](../tests/p7-questionnaire-integration.test.mjs), [tests/p7-questionnaire-recovery-integration.test.mjs](../tests/p7-questionnaire-recovery-integration.test.mjs).

P9 proof: Positive confirmed persistence versus dirty/error/manual retry, no falsely saved UI. Status: inherited assertions and reached P9 own scope are indexed below; independent reconciliation pending.

### G10 — Eligibility and completion denominators

Reusable fixtures: [tests/p7-participation.test.mjs](../tests/p7-participation.test.mjs), [tests/p8-progress.test.mjs](../tests/p8-progress.test.mjs), [tests/p8-progress-integration.test.mjs](../tests/p8-progress-integration.test.mjs).

P9 proof: Joined current/history eligibility and first-confirmed deduplicated receipt. Status: inherited assertions and reached P9 own scope are indexed below; independent reconciliation pending.

### G11 — Timezone, deadlines, receipt and punctuality

Reusable fixtures: [tests/p7-authoring-time.test.mjs](../tests/p7-authoring-time.test.mjs), [tests/p7-participation.test.mjs](../tests/p7-participation.test.mjs), [tests/p7-practical-timing-integration.test.mjs](../tests/p7-practical-timing-integration.test.mjs), [tests/p8-progress.test.mjs](../tests/p8-progress.test.mjs).

P9 proof: Retain exact receipt snapshots and deterministic timing boundaries; no policy or clock edits to manufacture PASS. Status: inherited assertions and reached P9 own scope are indexed below; independent reconciliation pending.

### G12 — Scoring, private/published results, correction and averages

Reusable fixtures: [tests/p8-scoring.test.mjs](../tests/p8-scoring.test.mjs), [tests/p8-grading.test.mjs](../tests/p8-grading.test.mjs), [tests/p8-publication.test.mjs](../tests/p8-publication.test.mjs), [tests/p8-corrections.test.mjs](../tests/p8-corrections.test.mjs), [tests/p8-progress-calculation.test.mjs](../tests/p8-progress-calculation.test.mjs), [scripts/test-p8-integration.mjs](../scripts/test-p8-integration.mjs).

P9 proof: All-type lifecycle, exact points/rounding/zero/private state/lower replacement/audit/current means and visible per-question feedback. Status: inherited assertions and reached P9 own scope are indexed below; independent reconciliation pending.

### G13 — Teaching-plan versions and taught progress

Reusable fixtures: [tests/p6-plan.test.mjs](../tests/p6-plan.test.mjs), [tests/p6-plan-integration.test.mjs](../tests/p6-plan-integration.test.mjs).

P9 proof: Actual plan version and independent teacher-only taught-state transitions. Status: inherited assertions and reached P9 own scope are indexed below; independent reconciliation pending.

### G14 — Muro identity, order and moderation

Reusable fixtures: [tests/p6-wall.test.mjs](../tests/p6-wall.test.mjs), [tests/p6-wall-integration.test.mjs](../tests/p6-wall-integration.test.mjs).

P9 proof: Actual classroom wall and current-scope notification consumption in joined flow. Status: inherited assertions and reached P9 own scope are indexed below; independent reconciliation pending.

### G15 — Academic notification scopes and safe destinations

Reusable fixtures: [tests/p6-notifications.test.mjs](../tests/p6-notifications.test.mjs), [tests/p7-notifications.test.mjs](../tests/p7-notifications.test.mjs), [tests/p7-notifications-integration.test.mjs](../tests/p7-notifications-integration.test.mjs), [tests/p8-publication-integration.test.mjs](../tests/p8-publication-integration.test.mjs), [tests/p8-corrections-integration.test.mjs](../tests/p8-corrections-integration.test.mjs).

P9 proof: Server-authorized open/read, role and current target checks, no unrequested academic email. Status: inherited assertions and reached P9 own scope are indexed below; independent reconciliation pending.

## Exact acceptance rows

I-Gxx means inherited accepted evidence plus candidate assertion-source index below, not a new row PASS. H/J/P/C are only the exact own assertions in their attributed reports; every unexercised alternative remains inherited/unconfirmed until final reconciliation. IP (**independent pending**) is intentionally not PASS.

| ID | Spec line | Families | Scenario | Expected outcome | P9 evidence |
|---|---|---|---|---|---|
| V1-001 | 761 | G01 | Account teaches and studies in different classrooms | Group Mis Aulas and Home classroom summaries under `Enseño` and `Estudio`, without a global role switch. | [I-G01](#i-g01); [H: scoped Home/navigation own proof](p9-home.md#own-home-proof--all-groups-observed-across-bounded-runs); **independent pending** |
| V1-002 | 762 | G02 | Teacher completes classroom creation with missing required data, no plan or no unit/topic | Reject completion without publishing the classroom; an incomplete private draft may be saved. | [I-G02](#i-g02); No new own row assertion; **independent pending** |
| V1-003 | 763 | G02 | Teacher completes classroom data | Accept free-text Materia/División, allow duplicate classroom names, require selection from predefined cover illustrations and offer no cover upload. | [I-G02](#i-g02); No new own row assertion; **independent pending** |
| V1-004 | 764 | G02 | Teacher resumes an unfinished classroom creation | Restore their private draft without granting other users access or enrolling students. | [I-G02](#i-g02); No new own row assertion; **independent pending** |
| V1-005 | 765 | G02, G13 | Teacher updates classroom metadata or study plan in an active classroom | Allow the confirmed metadata edits; create a new plan-file version and retain previous versions; keep the timezone fixed. | [I-G02](#i-g02), [I-G13](#i-g13); No new own row assertion; [P: version/NEXT scoped proof](work-log/2026-10-19-p9-plan-diagnostic-worker.md); **independent pending** |
| V1-006 | 766 | G02, G13 | Teacher tries to delete a topic with links or a non-pending state, or a nonempty/linked unit | Reject without deleting associated materials, activities or progress. Allow deletion only for an unused pending topic or an empty unlinked unit. | [I-G02](#i-g02), [I-G13](#i-g13); No new own row assertion; [P: version/NEXT scoped proof](work-log/2026-10-19-p9-plan-diagnostic-worker.md); **independent pending** |
| V1-007 | 767 | G02 | Enrollment fails because of invalid code, existing membership or wrong invited account | Show a generic notice and remain in the form without redirecting, duplicating membership or accepting another account's invitation. | [I-G02](#i-g02); No new own row assertion; **independent pending** |
| V1-008 | 768 | G03 | User sets a password of 15, 16, 128 or 129 characters | Reject 15/129 and accept the length of 16/128, subject to the other authentication checks. | [I-G03](#i-g03); No new own row assertion; **independent pending** |
| V1-009 | 769 | G03 | User reuses a consumed verification/recovery link or one superseded by resend | Reject it without changing verification/password state. Verification expires after one hour and recovery after 15 minutes; classroom invitation validity remains seven days. | [I-G03](#i-g03); No new own row assertion; **independent pending** |
| V1-010 | 770 | G03 | User requests another verification/recovery message before the 60-second wait | Reject the premature resend without issuing a replacement; recovery responses do not disclose account existence. | [I-G03](#i-g03); No new own row assertion; **independent pending** |
| V1-011 | 771 | G03 | Password recovery succeeds | Close previous sessions; do not silently retain their authentication. | [I-G03](#i-g03); No new own row assertion; **independent pending** |
| V1-012 | 772 | G05 | Teacher saves an activity draft and later publishes it | Keep the draft private without student notifications; only publication grants eligible student visibility and triggers the new-activity event. | [I-G05](#i-g05); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-013 | 773 | G05 | Teacher creates a TP instruction | Require observations, a PDF/DOCX instruction file or both; reject an entirely missing instruction. | [I-G05](#i-g05); No new own row assertion; **independent pending** |
| V1-014 | 774 | G05 | Student confirms a TP with no attachments | Allow only if the teacher did not require attachments; otherwise reject without creating a submitted attempt. | [I-G05](#i-g05); No new own row assertion; **independent pending** |
| V1-015 | 775 | G05 | Teacher creates a choice question with fewer than two options, wrong single-choice key count or fewer than two multiple-choice correct options | Reject the invalid question without publishing an invalid activity. | [I-G05](#i-g05); No new own row assertion; **independent pending** |
| V1-016 | 776 | G06 | Teacher enables another attempt | Prefill previous answers/attachments, preserve the original and leave the new attempt ungraded. | [I-G06](#i-g06); No new own row assertion; **independent pending** |
| V1-017 | 777 | G06 | User opens attempt history with an unfinished reopened attempt | List all attempts newest first; do not turn the draft into a submission or replace the prior effective grade. | [I-G06](#i-g06); No new own row assertion; **independent pending** |
| V1-018 | 778 | G06, G12 | Student requests the published-grade correction audit | Deny audit access while still showing the corrected published grade and its notification; the complete audit is teacher-only. | [I-G06](#i-g06), [I-G12](#i-g12); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-019 | 779 | G06 | Student formally rejoins after departure/removal | Preserve previous obligations and history; absence-created open/undated activities become expected, while already expired ones need teacher authorization and a future individual deadline. Merely not logging in is not departure. | [I-G06](#i-g06); No new own row assertion; **independent pending** |
| V1-020 | 780 | G14 | Muro author is displayed | Show first/last name and automatic initials, not email, public-profile access or avatar-upload controls. | [I-G14](#i-g14); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-021 | 781 | G07 | Student prepares five valid 50 MB attachments and sufficient quota exists | Permit up to 250 MB total without an extra aggregate cap, subject to scanning and the other submission rules. | [I-G07](#i-g07); [C: five50M capacity/sixth allocation boundary](work-log/2026-10-20-p9-binary-capacity-worker.md#observed-single-capacity-execution); **independent pending** |
| V1-022 | 782 | G07 | Upload cleanup processes abandoned data | Clean only incomplete uploads after 24 h inactivity; retain confirmed drafts, historical submissions and linked files. | [I-G07](#i-g07); No new own row assertion; **independent pending** |
| V1-023 | 783 | G07 | Future local setup is functionally verified | Use containerized PostgreSQL/S3-compatible storage/test inbox/real scanner with frontend/backend on the host; test captured email flows and real scanning without an external email provider or a simulated pass. | [I-G07](#i-g07); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-024 | 784 | G02 | Text is exactly at its configured character maximum, exceeds it, or is whitespace-only in a required field | Accept the boundary length, reject excess/required whitespace with validation errors and never silently truncate. Apply the per-field maxima in section 5. | [I-G02](#i-g02); No new own row assertion; **independent pending** |
| V1-025 | 785 | G01 | Same account teaches in A and studies in B | Teacher capabilities apply in A only; B exposes student permissions. | [I-G01](#i-g01); No new own row assertion; **independent pending** |
| V1-026 | 786 | G02 | Classroom is created | Its creator is the sole teacher; V1 provides no co-teacher or ownership-transfer operation. | [I-G02](#i-g02); No new own row assertion; **independent pending** |
| V1-027 | 787 | G02 | Teacher tries to enroll as a student in their own classroom | Reject enrollment without creating another membership or changing their teacher role. | [I-G02](#i-g02); No new own row assertion; **independent pending** |
| V1-028 | 788 | G02 | Registered user with verified email creates a classroom | No teacher-approval step; creator becomes teacher of that classroom. | [I-G02](#i-g02); No new own row assertion; **independent pending** |
| V1-029 | 789 | G04 | Teacher archives a classroom | Preserve membership and classroom records, make it read-only, and do not publish pending grades. | [I-G04](#i-g04); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-030 | 790 | G04 | User tries to join, publish, submit or modify an archived classroom | Deny the write without changing classroom records; consultation remains subject to existing role permissions. | [I-G04](#i-g04); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-031 | 791 | G04 | Teacher reactivates a classroom | Restore normal operation without resetting deadlines, attempts, content locks or grades. | [I-G04](#i-g04); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-032 | 792 | G04 | User requests permanent classroom deletion in V1 | Do not provide or perform permanent deletion. | [I-G04](#i-g04); No new own row assertion; **independent pending** |
| V1-033 | 793 | G04 | Student leaves or teacher removes the student | Remove classroom access while preserving submissions, grades and conversations; the teacher retains academic-history access. | [I-G04](#i-g04); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-034 | 794 | G04 | Former student tries to rejoin using the classroom code or an old invitation | Reject re-entry without a new teacher-issued invitation and explicit acceptance. | [I-G04](#i-g04); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-035 | 795 | G04 | Former student accepts a new teacher-issued invitation | Permit re-entry subject to verification and classroom-state checks; reuse their preserved records without duplicating memberships, submissions or grades. | [I-G04](#i-g04); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-036 | 796 | G04 | Student leaves or is removed while current metrics are displayed | Exclude their records from current class averages and current totals, but preserve a separate teacher-accessible history. | [I-G04](#i-g04); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-037 | 797 | G04 | Active student averages are 8 and 6; the second student leaves and later rejoins | Current class average changes from 7 to 8, then back to 7 on re-entry, using the same preserved grades without duplication. | [I-G04](#i-g04); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-038 | 798 | G03 | Unverified account signs in | Show the verification screen with verification, resend and sign-out actions; no classroom access. | [I-G03](#i-g03); No new own row assertion; **independent pending** |
| V1-039 | 799 | G03 | Unverified account requests classroom creation, code joining, invitation acceptance or classroom content | Deny the classroom operation without changing membership or classroom data. | [I-G03](#i-g03); No new own row assertion; **independent pending** |
| V1-040 | 800 | G03 | Invited account verifies its email | Classroom access remains subject to membership; invitation acceptance is still explicit. | [I-G03](#i-g03); No new own row assertion; **independent pending** |
| V1-041 | 801 | G04 | Verified user enters a valid classroom code for first-time enrollment | Show classroom name, subject, division, academic year and teacher; do not enroll until explicit confirmation. | [I-G04](#i-g04); No new own row assertion; **independent pending** |
| V1-042 | 802 | G04 | User confirms first-time code enrollment into an active classroom | Enroll without an additional teacher-approval step, while enforcing no duplicates, no own-class student role and no code-based re-entry after departure/removal. | [I-G04](#i-g04); No new own row assertion; **independent pending** |
| V1-043 | 803 | G04 | User cancels code-enrollment confirmation | Do not create membership or grant classroom-content access. | [I-G04](#i-g04); No new own row assertion; **independent pending** |
| V1-044 | 804 | G04 | Teacher issues or resends an email invitation | Give it seven days of validity from issuance/resend; keep no duplicate pending invitations for the same classroom and recipient. | [I-G04](#i-g04); No new own row assertion; **independent pending** |
| V1-045 | 805 | G04 | User tries to accept an expired or revoked invitation | Reject enrollment without creating membership or granting classroom access. | [I-G04](#i-g04); No new own row assertion; **independent pending** |
| V1-046 | 806 | G04 | Teacher regenerates the classroom code | Invalidate the previous code and preserve already enrolled students' memberships. | [I-G04](#i-g04); No new own row assertion; **independent pending** |
| V1-047 | 807 | G04 | User tries the previous code after regeneration | Do not accept it for enrollment or create membership. | [I-G04](#i-g04); No new own row assertion; **independent pending** |
| V1-048 | 808 | G04 | Invited person registers and verifies email | Invitation remains pending; membership starts only after explicit acceptance. | [I-G04](#i-g04); No new own row assertion; **independent pending** |
| V1-049 | 809 | G02 | Student opens Compañeros | Names only, no per-person actions or academic/private information. | [I-G02](#i-g02); No new own row assertion; **independent pending** |
| V1-050 | 810 | G08 | Student opens Biblioteca | Associated and extra materials are available read-only; upload/edit/delete is denied. | [I-G08](#i-g08); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-051 | 811 | G08 | Teacher tries to overwrite a published Library file | Reject replacement of its contents; corrections require a new material. | [I-G08](#i-g08); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-052 | 812 | G08 | Teacher tries to delete a Library material linked to an activity | Reject deletion without modifying the material or its links. | [I-G08](#i-g08); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-053 | 813 | G05, G08 | Teacher changes activity material links before/after the first student attempt | Allow changes before the first attempt; reject adding, removing or replacing links afterward. | [I-G05](#i-g05), [I-G08](#i-g08); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-054 | 814 | G08 | Teacher deletes an unlinked Library material | Require explicit confirmation before deletion. | [I-G08](#i-g08); No new own row assertion; **independent pending** |
| V1-055 | 815 | G07 | Study plan or instruction file is uploaded | Accept only the approved PDF/Word formats within the 20 MB per-file cap and subject to security validation. | [I-G07](#i-g07); No new own row assertion; **independent pending** |
| V1-056 | 816 | G07 | Library or student-submission file is uploaded | Enforce the approved format list and 50 MB per-file cap; files remain private and subject to security validation. | [I-G07](#i-g07); No new own row assertion; **independent pending** |
| V1-057 | 817 | G07 | Student tries to submit more than 5 files | Reject the invalid submission without creating a submitted attempt. | [I-G07](#i-g07); [C: five50M capacity/sixth allocation boundary](work-log/2026-10-20-p9-binary-capacity-worker.md#observed-single-capacity-execution); **independent pending** |
| V1-058 | 818 | G07 | Audio/video file is uploaded directly | Reject as outside the approved V1 file allowlist. | [I-G07](#i-g07); No new own row assertion; **independent pending** |
| V1-059 | 819 | G07, G09 | Student answers before submitting | Draft persistence is represented truthfully; save failures are not shown as success. | [I-G07](#i-g07), [I-G09](#i-g09); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-060 | 820 | G07 | Authorized user opens a PDF or JPG/JPEG/PNG file | Offer preview where browser support permits it, with authorized download as an alternative. | [I-G07](#i-g07); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-061 | 821 | G07 | Authorized user opens a Word, PowerPoint, Excel or ZIP file | Provide download only; do not require or imply a custom in-browser viewer in V1. | [I-G07](#i-g07); No new own row assertion; **independent pending** |
| V1-062 | 822 | G07 | User lacks permission for a private file | Deny both preview and download; knowing the file identity must not grant access. | [I-G07](#i-g07); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-063 | 823 | G07 | User uploads a file whose real content/type does not match the allowed format | Reject it; renaming its extension does not bypass validation. | [I-G07](#i-g07); No new own row assertion; **independent pending** |
| V1-064 | 824 | G07 | Uploaded file is awaiting validation or security scanning | Keep it private and unavailable for preview, download or inclusion in a submitted delivery. | [I-G07](#i-g07); No new own row assertion; **independent pending** |
| V1-065 | 825 | G07 | Encrypted or password-protected file cannot be inspected | Reject the file rather than bypassing inspection. | [I-G07](#i-g07); No new own row assertion; **independent pending** |
| V1-066 | 826 | G07 | Security scanning fails or is unavailable | Do not approve the file by default or grant preview/download/submission access. | [I-G07](#i-g07); No new own row assertion; **independent pending** |
| V1-067 | 827 | G07 | Classroom storage usage is calculated | Include plans, materials, all preserved submission attempts and uploaded draft attachments in the classroom quota. | [I-G07](#i-g07); No new own row assertion; **independent pending** |
| V1-068 | 828 | G07 | Classroom storage quota is exhausted | Block new uploads with an explanatory reason, without automatically deleting history or preventing authorized access to already enabled files. | [I-G07](#i-g07); No new own row assertion; **independent pending** |
| V1-069 | 829 | G07 | Numerical classroom quota is configured before deployment | Choose its GB value using the hosting and budget decision; do not infer a default amount from this specification. | [I-G07](#i-g07); No new own row assertion; **independent pending** |
| V1-070 | 830 | G07 | Teacher uploads a study plan or practical-assignment instructions | Allow only `.pdf` and `.docx`, subject to the 20 MB per-file cap and content/security validation. | [I-G07](#i-g07); No new own row assertion; **independent pending** |
| V1-071 | 831 | G07 | User uploads Library material or a file-based submission | Allow only `.pdf`, `.docx`, `.pptx`, `.xlsx`, `.jpg`, `.jpeg`, `.png` and `.zip`, subject to the confirmed size/count limits and validation. | [I-G07](#i-g07); No new own row assertion; **independent pending** |
| V1-072 | 832 | G07 | User uploads a legacy or macro-enabled Office format | Reject `.doc`, `.ppt`, `.xls`, `.docm`, `.pptm` and `.xlsm` without publishing material or creating a submitted attempt. | [I-G07](#i-g07); No new own row assertion; **independent pending** |
| V1-073 | 833 | G08 | Teacher creates or organizes a Library material | Allow no association, unit only, or unit plus a topic belonging to that unit. | [I-G08](#i-g08); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-074 | 834 | G05, G08 | Teacher creates or reassociates an activity | Require both a unit and a topic belonging to that unit for every activity type. | [I-G05](#i-g05), [I-G08](#i-g08); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-075 | 835 | G05, G08 | Teacher selects a topic without its unit or with a different unit | Reject the association without saving an invalid relationship or altering the existing association. | [I-G05](#i-g05), [I-G08](#i-g08); No new own row assertion; **independent pending** |
| V1-076 | 836 | G05, G08 | Teacher edits a published Library material's display name or unit/topic | Allow organization changes without replacing its file or changing the identities of linked materials; archived classrooms remain read-only. | [I-G05](#i-g05), [I-G08](#i-g08); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-077 | 837 | G05 | Teacher corrects an activity title or unit/topic after participation starts | Allow organizational corrections without altering work requirements, locked content or recorded attempts/grades; archived classrooms remain read-only. | [I-G05](#i-g05); No new own row assertion; **independent pending** |
| V1-078 | 838 | G05 | Teacher edits activity observations after the first student attempt | Reject the change and preserve the existing observations, since they are part of the locked instructions. | [I-G05](#i-g05); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-079 | 839 | G06 | Student opens the same attempt in another tab or device | Provide read-only consultation until the student explicitly transfers editing control. | [I-G06](#i-g06); No new own row assertion; **independent pending** |
| V1-080 | 840 | G06 | Student transfers editing control | Load the last confirmed draft, warn that other-session unconfirmed changes are not transferred, and make the previous editor read-only without creating or submitting an attempt. | [I-G06](#i-g06); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-081 | 841 | G06 | Previous editor tries to save or submit after control was transferred | Reject the stale editor's mutation on the server without overwriting saved answers or creating a submission. | [I-G06](#i-g06); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-082 | 842 | G06 | Student selects or uploads a practical-assignment attachment | Show the actual upload state and keep the draft private; do not create a submitted attempt. | [I-G06](#i-g06); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-083 | 843 | G06 | Student reopens a practical-assignment draft | Recover confirmed uploaded attachments, not merely selected or incomplete files. | [I-G06](#i-g06); No new own row assertion; **independent pending** |
| V1-084 | 844 | G06 | Student removes or replaces a draft attachment | Allow it before submission subject to active-editor, classroom-state and file-limit rules; preserve previous submitted attempts. | [I-G06](#i-g06); No new own row assertion; **independent pending** |
| V1-085 | 845 | G06 | Practical-assignment attachments are incomplete, failed or awaiting validation | Do not allow submission until all included attachments are fully uploaded and validated. | [I-G06](#i-g06); No new own row assertion; **independent pending** |
| V1-086 | 846 | G06 | Student confirms practical-assignment submission with uploaded and validated attachments | Apply the complete-server-receipt deadline policy and lock attachments on successful submission. | [I-G06](#i-g06); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-087 | 847 | G09 | Student changes questionnaire or evaluation answers | Attempt autosave after two seconds without changes and when changing questions; only confirmed persistence may display saved. | [I-G09](#i-g09); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-088 | 848 | G09 | Answer autosave fails | Show an error, retain answers on screen and allow retry without creating a submission. | [I-G09](#i-g09); No new own row assertion; **independent pending** |
| V1-089 | 849 | G09 | Student reopens a questionnaire or evaluation attempt | Restore the last confirmed saved draft; do not promise recovery of offline/unconfirmed changes after closing or reloading. | [I-G09](#i-g09); No new own row assertion; **independent pending** |
| V1-090 | 850 | G09 | Answer draft is saved successfully | Do not submit the activity or publish a result. | [I-G09](#i-g09); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-091 | 851 | G10 | Student first joins a classroom with earlier activities | Permit consultation; count undated activities and those not yet expired at enrollment as expected work. | [I-G10](#i-g10); No new own row assertion; **independent pending** |
| V1-092 | 852 | G10 | Activity had already expired when a student first joined | Keep it consultation-only by default, even if general late submissions are allowed; do not count it as that student's missed or expected work. | [I-G10](#i-g10); No new own row assertion; **independent pending** |
| V1-093 | 853 | G10 | Teacher enables a new student's first submission for a previously expired activity | Require a future individual deadline, add the activity to that student's expected work and keep other students' deadlines unchanged. | [I-G10](#i-g10); No new own row assertion; **independent pending** |
| V1-094 | 854 | G10 | Former student rejoins | Preserve prior history without treating re-entry as a first-enrollment reset or duplicating records. | [I-G10](#i-g10); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-095 | 855 | G10 | Student has two expected activities and three confirmed attempts for just one of them | Count one delivered activity out of two (50% completion), not three deliveries; correction/publication is not required to count the submission. | [I-G10](#i-g10); No new own row assertion; **independent pending** |
| V1-096 | 856 | G10 | Teacher enables a resubmission for an already delivered activity | Keep it counted as delivered and show the pending resubmission separately. | [I-G10](#i-g10); No new own row assertion; **independent pending** |
| V1-097 | 857 | G10 | Classroom completion is calculated | Count each currently enrolled student's eligible activity once in expected totals and at most once in received totals. | [I-G10](#i-g10); No new own row assertion; **independent pending** |
| V1-098 | 858 | G10 | No activities are expected for the selected student/classroom scope | Show `Sin actividades pendientes de seguimiento` without a percentage. | [I-G10](#i-g10); No new own row assertion; **independent pending** |
| V1-099 | 859 | G10 | All expected activities have a confirmed submission and the expected count is positive | Show full completion, not the zero-expected empty state. | [I-G10](#i-g10); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-100 | 860 | G06 | Student submits an activity | One initial submission is accepted; subsequent student changes are blocked until teacher reopens. | [I-G06](#i-g06); No new own row assertion; **independent pending** |
| V1-101 | 861 | G11 | Teacher tries to change the timezone of an existing classroom | Reject the change without modifying the timezone or existing deadline instants. | [I-G11](#i-g11); No new own row assertion; **independent pending** |
| V1-102 | 862 | G11 | Teacher enters a local deadline time that does not exist due to a seasonal clock change | Reject the time and request another; do not silently move it or save a deadline. | [I-G11](#i-g11); No new own row assertion; **independent pending** |
| V1-103 | 863 | G11 | Teacher enters a local deadline time that occurs twice due to a seasonal clock change | Show both occurrences with UTC offsets and require explicit selection before saving; do not select one automatically. | [I-G11](#i-g11); No new own row assertion; **independent pending** |
| V1-104 | 864 | G11 | Complete submission reaches the server at 17:59:59 for an 18:00 deadline | Accept as on time, subject to the other submission rules. | [I-G11](#i-g11); No new own row assertion; **independent pending** |
| V1-105 | 865 | G11 | Complete submission reaches the server at 18:00:00 or later for an 18:00 deadline | Accept as late only if late submissions are allowed; otherwise reject without creating a submitted attempt. | [I-G11](#i-g11); No new own row assertion; **independent pending** |
| V1-106 | 866 | G11 | Student presses Send or starts uploading before 18:00, but the complete submission arrives at or after 18:00 | Apply the late/closed policy using complete server receipt, not click time, upload start or the device clock. | [I-G11](#i-g11); No new own row assertion; **independent pending** |
| V1-107 | 867 | G11 | Teacher adds a general deadline after an initially undated activity has started | Reject the change without modifying the activity or prior submissions. | [I-G11](#i-g11); No new own row assertion; **independent pending** |
| V1-108 | 868 | G11 | Teacher changes late-submission policy after the first student attempt | Allow closing-at-expiration to become late-allowed; reject the reverse without changing the policy or prior submissions. | [I-G11](#i-g11); No new own row assertion; **independent pending** |
| V1-109 | 869 | G11 | Individual resubmission deadline is June 20 and a subsequent general extension reaches June 25 | Apply June 25 to new submissions by that student; preserve prior attempts' recorded timeliness. | [I-G11](#i-g11); No new own row assertion; **independent pending** |
| V1-110 | 870 | G11 | Individual resubmission deadline is June 25 and a subsequent general extension reaches June 20 | Keep June 25 for that student; do not shorten the individual deadline. | [I-G11](#i-g11); No new own row assertion; **independent pending** |
| V1-111 | 871 | G09 | Student attempts to submit an incomplete questionnaire or evaluation | Show the unanswered-question count, warn of zero points for blanks and require explicit confirmation. | [I-G09](#i-g09); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-112 | 872 | G09 | Student cancels incomplete-submission confirmation | Keep answers in the editable draft; do not create a submitted attempt. | [I-G09](#i-g09); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-113 | 873 | G09 | Student confirms an incomplete submission | Accept the submission with zero points for unanswered questions, subject to teacher review/publication; do not treat never-submitted activities as zero. | [I-G09](#i-g09); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-114 | 874 | G06 | Teacher reopens an attempt | Student can prepare a new attempt; previous attempts remain preserved. A new deadline, when supplied, applies only to that student. | [I-G06](#i-g06); No new own row assertion; **independent pending** |
| V1-115 | 875 | G06 | Teacher reopens without a new individual deadline | Apply the activity's general deadline in effect at submission time and its late-submission policy. | [I-G06](#i-g06); No new own row assertion; **independent pending** |
| V1-116 | 876 | G11 | Teacher creates a classroom | Suggest the browser timezone and allow the teacher to choose another. | [I-G11](#i-g11); No new own row assertion; **independent pending** |
| V1-117 | 877 | G11 | Users in different device timezones view a deadline | Show the same classroom-local deadline with its timezone identified, backed by one UTC instant. | [I-G11](#i-g11); No new own row assertion; **independent pending** |
| V1-118 | 878 | G11 | No student has started and teacher edits the general deadline | Permit a date change or removal. | [I-G11](#i-g11); No new own row assertion; **independent pending** |
| V1-119 | 879 | G11 | At least one student has started and teacher edits an existing general deadline | Permit extensions only; reject an earlier date or removal without changing existing data. | [I-G11](#i-g11); No new own row assertion; **independent pending** |
| V1-120 | 880 | G11 | Teacher extends the general deadline after submissions exist | Preserve previously recorded timeliness; use the effective deadline for new submissions unless an individual deadline applies. | [I-G11](#i-g11); No new own row assertion; **independent pending** |
| V1-121 | 881 | G11 | Reception has closed at expiration and teacher enables another attempt | Require a future individual deadline; do not reopen a closed reception without it. | [I-G11](#i-g11); No new own row assertion; **independent pending** |
| V1-122 | 882 | G11 | New attempt is submitted under an individual deadline | Evaluate its timeliness against that deadline without changing other students' deadlines or previous attempts' timeliness states. | [I-G11](#i-g11); No new own row assertion; **independent pending** |
| V1-123 | 883 | G05 | First student starts an attempt | Lock the activity's instructions, questions, options, answer key, points and scoring rules for everyone. | [I-G05](#i-g05); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-124 | 884 | G05 | Student presses Comenzar on a questionnaire or evaluation | Start the attempt and apply the activity content lock. | [I-G05](#i-g05); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-125 | 885 | G05 | Student first opens a practical assignment's detail | Start the attempt and apply the content lock, but do not mark work as submitted or increment received-submission counts. | [I-G05](#i-g05); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-126 | 886 | G05 | Teacher previews an activity | Do not start a student attempt or activate the content lock. | [I-G05](#i-g05); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-127 | 887 | G05 | Teacher tries to change locked content after an attempt has started | Reject the change without modifying existing content, attempts or grades; changing these elements requires a new activity. | [I-G05](#i-g05); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-128 | 888 | G12 | New attempt exists but its grade is not published | Keep the previous published grade effective, if there is one; do not count the activity twice. | [I-G12](#i-g12); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-129 | 889 | G12 | Teacher publishes a new attempt's grade | Replace the effective grade with the newly published grade, including when it is lower. | [I-G12](#i-g12); No new own row assertion; **independent pending** |
| V1-130 | 890 | G12 | Published grade 6 is followed by an unpublished new attempt, then publication of grade 8 | Average uses 6 until publication, then 8; both attempts remain in history. | [I-G12](#i-g12); No new own row assertion; **independent pending** |
| V1-131 | 891 | G12 | Published grade 8 is followed by a newly published attempt graded 6 | Average uses 6, not the highest historical grade 8. | [I-G12](#i-g12); No new own row assertion; **independent pending** |
| V1-132 | 892 | G11 | Activity has no deadline | Submission is never labeled late solely from elapsed time. | [I-G11](#i-g11); No new own row assertion; **independent pending** |
| V1-133 | 893 | G11 | Deadline passes | Permit-late or close-reception policy is respected, including the agreed time boundary. | [I-G11](#i-g11); No new own row assertion; **independent pending** |
| V1-134 | 894 | G12 | Partial scoring: 2 of 3 correct options, 6 points, no incorrect selection | 4 points. | [I-G12](#i-g12); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-135 | 895 | G12 | Partial scoring includes an incorrect option | 0 for that question; no penalty applied to other questions. | [I-G12](#i-g12); No new own row assertion; **independent pending** |
| V1-136 | 896 | G12 | Exact scoring misses a correct option or adds an incorrect one | 0 for that question. | [I-G12](#i-g12); No new own row assertion; **independent pending** |
| V1-137 | 897 | G12 | Development answer is submitted | Teacher assigns points/feedback; no AI grading. | [I-G12](#i-g12); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-138 | 898 | G12 | Calculated final grade or resulting average is exactly 8.345 | Round half up to 8.35 and display `8,35`; do not round per-question intermediate calculations. | [I-G12](#i-g12); No new own row assertion; **independent pending** |
| V1-139 | 899 | G12 | Published grade or resulting average is 8.5 | Display `8,50` with a decimal comma and two decimal places. | [I-G12](#i-g12); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-140 | 900 | G12 | Teacher prepares a practical-assignment correction | Provide one manual 0–10 overall grade and a separate optional overall-feedback field; keep the correction private until publication. | [I-G12](#i-g12); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-141 | 901 | G12 | Teacher publishes a valid practical-assignment grade with feedback | Release the grade and overall feedback together to the student. | [I-G12](#i-g12); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-142 | 902 | G12 | Teacher publishes a valid practical-assignment grade without feedback | Allow publication; overall feedback is optional and a grade of zero is valid. | [I-G12](#i-g12); No new own row assertion; **independent pending** |
| V1-143 | 903 | G12 | Student views a published grade or average | Show the numeric result and applicable teacher feedback without automatically labeling it `Aprobado` or `Desaprobado` or applying a universal passing threshold. | [I-G12](#i-g12); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-144 | 904 | G13 | Teacher selects a different topic as `Siguiente` | Make the previous next topic `Pendiente` and keep at most one next topic across the classroom. | [I-G13](#i-g13); No new own row assertion; [P: version/NEXT scoped proof](work-log/2026-10-19-p9-plan-diagnostic-worker.md); **independent pending** |
| V1-145 | 905 | G13 | Teacher marks the current next topic `Dado` | Keep it taught and leave no next topic selected; do not advance automatically. | [I-G13](#i-g13); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); [P: version/NEXT scoped proof](work-log/2026-10-19-p9-plan-diagnostic-worker.md); **independent pending** |
| V1-146 | 906 | G13 | Teacher corrects a topic state in an active classroom | Allow the manual correction, including undoing `Dado`, without altering grades or submitted attempts. | [I-G13](#i-g13); No new own row assertion; [P: version/NEXT scoped proof](work-log/2026-10-19-p9-plan-diagnostic-worker.md); **independent pending** |
| V1-147 | 907 | G13 | Student tries to change topic states | Deny the change and preserve the plan states. | [I-G13](#i-g13); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); [P: version/NEXT scoped proof](work-log/2026-10-19-p9-plan-diagnostic-worker.md); **independent pending** |
| V1-148 | 908 | G14 | Classroom Muro is displayed | Show text publications newest first and each thread's text replies oldest first; provide no attachments, reactions, pinning or private messaging in V1. | [I-G14](#i-g14); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-149 | 909 | G14 | Author edits or removes their own Muro content | Allow only with current classroom access and in an active classroom; removal requires confirmation. | [I-G14](#i-g14); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-150 | 910 | G14 | Teacher moderates a student's Muro content | Allow removal with confirmation, not rewriting the student's text. | [I-G14](#i-g14); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-151 | 911 | G14 | Parent publication is removed | Keep a removed-content marker and preserve other authors' replies in the thread. | [I-G14](#i-g14); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-152 | 912 | G14 | Student tries to edit or remove another author's Muro content | Deny the change without altering that content or its replies. | [I-G14](#i-g14); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-153 | 913 | G15 | Student receives academic notifications | Include teacher notices, new activities, deadline changes, published/corrected grades, reopened attempts and replies to their own publications, scoped to their classroom access. | [I-G15](#i-g15); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-154 | 914 | G15 | Teacher receives academic notifications | Include new submissions, student queries and replies to the teacher's own publications, scoped to the classroom they teach. | [I-G15](#i-g15); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-155 | 915 | G15 | User opens the notification center | List notifications newest first and offer marking them as read; do not email every academic event. | [I-G15](#i-g15); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-156 | 916 | G15 | User opens a notification after losing access to its classroom or target | Deny unauthorized target access; the notification does not restore membership or grant private-record access. | [I-G15](#i-g15); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-157 | 917 | G12 | Teacher has not published a grade | Student does not receive it as a final result. | [I-G12](#i-g12); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-158 | 918 | G12 | Teacher publishes a questionnaire/evaluation result | Show that student's submitted answers, per-question earned points, final grade and teacher feedback only; TP publication uses its overall grade/feedback policy. | [I-G12](#i-g12); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-159 | 919 | G12 | Student views a published result | Do not automatically expose the full answer key, unselected correct options or other students' answers/grades. Teacher feedback may explain the solution. | [I-G12](#i-g12); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-160 | 920 | G12 | Teacher corrects a published grade | Require a reason, preserve old/new grades with timestamp and actor in a teacher-only audit, notify the student and recalculate averages using the corrected effective grade. | [I-G12](#i-g12); No new own row assertion; **independent pending** |
| V1-161 | 921 | G12 | Teacher tries to correct a published grade without a reason | Reject the correction without changing grades, history or averages. | [I-G12](#i-g12); No new own row assertion; **independent pending** |
| V1-162 | 922 | G12 | Teacher corrects a published grade | Preserve the student's answers and the locked activity content/scoring criteria; do not count another grade for the same activity. | [I-G12](#i-g12); No new own row assertion; **independent pending** |
| V1-163 | 923 | G12 | Notes 8 and 6 are published, another is pending | Student average is 7; pending work is not zero. | [I-G12](#i-g12); No new own row assertion; **independent pending** |
| V1-164 | 924 | G12 | One student has notes 10 and 10; another has one note 4 | Classroom average is 7: mean of individual averages 10 and 4, not pooled mean 8. | [I-G12](#i-g12); No new own row assertion; **independent pending** |
| V1-165 | 925 | G12 | No published grades exist | Show a no-grades state. | [I-G12](#i-g12); No new own row assertion; **independent pending** |
| V1-166 | 926 | G12 | Calculated final grade is 6.666… | Publish 6.67 after summing unrounded question scores. | [I-G12](#i-g12); No new own row assertion; **independent pending** |
| V1-167 | 927 | G12 | Average is calculated | Use published grades and round only the resulting average to two decimal places. | [I-G12](#i-g12); No new own row assertion; **independent pending** |
| V1-168 | 928 | G05, G12 | Teacher tries to create an empty evaluation or a question with zero/negative available points | Reject the invalid evaluation without creating it. | [I-G05](#i-g05), [I-G12](#i-g12); No new own row assertion; **independent pending** |
| V1-169 | 929 | G12 | Student earns zero points on a question or zero as the final grade | Permit a genuine zero result; do not confuse it with invalid available points or a missing grade. | [I-G12](#i-g12); [J: scoped assertions/explicit exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md#exact-observed-assertions-and-matrix-projection); **independent pending** |
| V1-170 | 930 | G01 | Mobile width is narrow | Content reflows without shrinking desktop tables; global navigation remains reachable. | [I-G01](#i-g01); [H: scoped Home/navigation own proof](p9-home.md#own-home-proof--all-groups-observed-across-bounded-runs); **independent pending** |

## Explicit coverage constraints

- V1 capacity row781: five valid maximum-size files require sufficient configured quota and real upload/scan/private-byte proof. Existing policy tests do not establish250MB runtime capacity. The common fixture100000000-byte quota is not enough; observed capacity used the explicit P9-owned300000000 option including prior usage, preserving the shared default and production policy. The real capacity own proof is retained below; independent closure remains pending. Forecast bytes/resources before any new authorized execution.
- Inicio is now implemented with eleven own-proof groups; final independent acceptance remains pending. This is not permission to redesign existing flows. Reuse the role-correct server classroom list and safe notification-open operation; no global role switch. Ordinary sign-in remains profile; only exact Inicio continuation is additive.
- Actual start200 followed by refresh429 is a known baseline recovery seam, not a new reproduced defect. A new test must require truthful UI and positive admitted recovery before claiming success.
- Operator keys/origins/quotas, service ownership and synthetic pilot preparation must be documented without secrets. Real participants, retained database operations and deployment are not authorized.

## Verification ledger

Initial structural check retained: all170 source rows map to15 families, unique IDs, all referenced fixture paths exist. Current own proof is recorded below, not converted to independent/full-row PASS. Update this ledger and exact row evidence after observed applicable proof; preserve failures/skips/unavailable checks and candidate identities.

## P9 scoped own-proof ledger — Independent closure pending

The original170 scenarios and expected outcomes are unchanged; the six-column evidence cells are now explicit. These observations are scoped own proof, not blanket row/family acceptance; final independent reconciliation belongs to T6.

- T3 first joined teaching remainder, questionnaire, evaluation, practical and membership commands passed once: [attributed exact coverage and exclusions](work-log/2026-10-19-p9-teaching-remainder-worker.md). No approved command was replayed to obtain capacity proof.
- V1-021/G07: [one binary positive capacity execution](work-log/2026-10-20-p9-binary-capacity-worker.md) passed five exact50000000-byte distinct private attachments, APPROVED/CLEAN/ready/digest/download gates, exact250MB quota usage, explicit receipt and actual data restart. Owned300M quota includes existing usage; shared100M default unchanged.
- V1-057 count-boundary evidence in the same command: a valid4096-byte sixth allocation returned409/UPLOAD_CONFLICT despite sufficient remaining quota, preserving all existing attachments and full academic hash. This is the observed allocation boundary, not an invented additional six-file submit test.
- Repeated-text ZIP rejection diagnostics remain historical negative/stress evidence; they are not positive capacity or malware verdicts. Current positive files are independently decoded valid educational PCM assets within stored ZIPs, not direct audio uploads or a change to the V1 allowlist.
- T4 scoped service own proof: [attributed recovery record](work-log/2026-10-20-p9-failure-recovery-worker.md) proves DB-CSRF/noanswerPOST/dirtymanualretry and storage/scannerfailedfile cancel/newintent/privatehash recovery. L67 single restored-Docker SMTP proof passed exit0/151554ms/native1PASS0FAIL0SKIP at unchanged330/360: real queued200, failureattempt1, natural60s retryCOMPLETEDattempt2, intended captured recipient/link, truthful UI/public reentry, academic/membership unchanged and exact Mailpit identity/ports. Nativeprocess/ownedcleanup0/0,836protected hashes/builds25-30 unchanged. Historical first locator failure and L65 pre-runtime Docker failure remain attributed; no whole-family independent status inferred.

## Inherited assertion and source index

The accepted baseline is main `53a798670a0415aafc469fd3c2bf2276e2f0055f`; P9 implementation checkpoint is `3f0af33d6a56c3fae36d6138778ea3048c4fb7ea`. These references identify assertion sources to inspect, not 170 newly executed cases. The final verifier must resolve each row against its exact expected alternatives, accepted report and candidate diff. An unmatched required alternative is **missing proof**, never implied by family membership.

### I-G01

Inherited accepted records: [P5](work-log/2026-10-18-p5-verify-final.md), [P6](work-log/2026-10-18-p6-verify-final.md). Candidate assertion sources: [`tests/p5-integration.test.mjs:34`](../tests/p5-integration.test.mjs#L34), [`tests/p6-mobile-navigation.test.mjs:9`](../tests/p6-mobile-navigation.test.mjs#L9).

### I-G02

Inherited accepted records: [P5](work-log/2026-10-18-p5-verify-final.md), [P6](work-log/2026-10-18-p6-verify-final.md). Candidate assertion sources: [`tests/p5-policy.test.mjs:14`](../tests/p5-policy.test.mjs#L14), [`tests/p5-drafts.test.mjs:7`](../tests/p5-drafts.test.mjs#L7), [`tests/p5-enrollment.test.mjs:7`](../tests/p5-enrollment.test.mjs#L7), [`tests/p5-integration.test.mjs:34`](../tests/p5-integration.test.mjs#L34).

### I-G03

Inherited accepted records: [P3](work-log/2026-10-17-p3-verify-final.md). Candidate assertion sources: [`scripts/test-p33-t2.mjs:1`](../scripts/test-p33-t2.mjs#L1), [`scripts/test-p3-browser.mjs:1`](../scripts/test-p3-browser.mjs#L1).

### I-G04

Inherited accepted records: [P5](work-log/2026-10-18-p5-verify-final.md), [P8](work-log/2026-10-18-p8-independent-verify.md). Candidate assertion sources: [`tests/p5-enrollment.test.mjs:7`](../tests/p5-enrollment.test.mjs#L7), [`tests/p5-delivery.test.mjs:6`](../tests/p5-delivery.test.mjs#L6), [`tests/p5-integration.test.mjs:34`](../tests/p5-integration.test.mjs#L34), [`tests/p8-progress.test.mjs:9`](../tests/p8-progress.test.mjs#L9), [`tests/p8-progress-integration.test.mjs:13`](../tests/p8-progress-integration.test.mjs#L13).

### I-G05

Inherited accepted records: [P7](work-log/2026-10-18-p7-verify-final.md). Candidate assertion sources: [`tests/p7-authoring.test.mjs:8`](../tests/p7-authoring.test.mjs#L8), [`tests/p7-authoring-integration.test.mjs:12`](../tests/p7-authoring-integration.test.mjs#L12), [`tests/p7-questionnaire-overview-integration.test.mjs:13`](../tests/p7-questionnaire-overview-integration.test.mjs#L13), [`tests/p7-consultation-integration.test.mjs:10`](../tests/p7-consultation-integration.test.mjs#L10).

### I-G06

Inherited accepted records: [P7](work-log/2026-10-18-p7-verify-final.md), [P8](work-log/2026-10-18-p8-independent-verify.md). Candidate assertion sources: [`tests/p7-history.test.mjs:12`](../tests/p7-history.test.mjs#L12), [`tests/p7-history-integration.test.mjs:22`](../tests/p7-history-integration.test.mjs#L22), [`tests/p7-participation.test.mjs:5`](../tests/p7-participation.test.mjs#L5), [`tests/p7-practical-integration.test.mjs:22`](../tests/p7-practical-integration.test.mjs#L22).

### I-G07

Inherited accepted records: [P4](work-log/2026-10-18-p4-verify-final.md), [P7](work-log/2026-10-18-p7-verify-final.md). Candidate assertion sources: [`tests/p4-file-policy.test.mjs:13`](../tests/p4-file-policy.test.mjs#L13), [`tests/p4-content.test.mjs:8`](../tests/p4-content.test.mjs#L8), [`tests/p4-cleanup-worker.test.mjs:6`](../tests/p4-cleanup-worker.test.mjs#L6), [`tests/p4-integration.test.mjs:12`](../tests/p4-integration.test.mjs#L12), [`tests/p7-practical.test.mjs:5`](../tests/p7-practical.test.mjs#L5).

### I-G08

Inherited accepted records: [P6](work-log/2026-10-18-p6-verify-final.md), [P7](work-log/2026-10-18-p7-verify-final.md). Candidate assertion sources: [`tests/p6-library.test.mjs:11`](../tests/p6-library.test.mjs#L11), [`tests/p6-library-integration.test.mjs:11`](../tests/p6-library-integration.test.mjs#L11), [`tests/p7-authoring.test.mjs:8`](../tests/p7-authoring.test.mjs#L8).

### I-G09

Inherited accepted records: [P7](work-log/2026-10-18-p7-verify-final.md). Candidate assertion sources: [`tests/p7-questionnaire-autosave.test.mjs:15`](../tests/p7-questionnaire-autosave.test.mjs#L15), [`tests/p7-questionnaire-integration.test.mjs:25`](../tests/p7-questionnaire-integration.test.mjs#L25), [`tests/p7-questionnaire-recovery-integration.test.mjs:10`](../tests/p7-questionnaire-recovery-integration.test.mjs#L10).

### I-G10

Inherited accepted records: [P7](work-log/2026-10-18-p7-verify-final.md), [P8](work-log/2026-10-18-p8-independent-verify.md). Candidate assertion sources: [`tests/p7-participation.test.mjs:5`](../tests/p7-participation.test.mjs#L5), [`tests/p8-progress.test.mjs:9`](../tests/p8-progress.test.mjs#L9), [`tests/p8-progress-integration.test.mjs:13`](../tests/p8-progress-integration.test.mjs#L13).

### I-G11

Inherited accepted records: [P7](work-log/2026-10-18-p7-verify-final.md), [P8](work-log/2026-10-18-p8-independent-verify.md). Candidate assertion sources: [`tests/p7-authoring-time.test.mjs:4`](../tests/p7-authoring-time.test.mjs#L4), [`tests/p7-participation.test.mjs:5`](../tests/p7-participation.test.mjs#L5), [`tests/p7-practical-timing-integration.test.mjs:11`](../tests/p7-practical-timing-integration.test.mjs#L11), [`tests/p8-progress.test.mjs:9`](../tests/p8-progress.test.mjs#L9).

### I-G12

Inherited accepted records: [P8](work-log/2026-10-18-p8-independent-verify.md). Candidate assertion sources: [`tests/p8-scoring.test.mjs:9`](../tests/p8-scoring.test.mjs#L9), [`tests/p8-grading.test.mjs:7`](../tests/p8-grading.test.mjs#L7), [`tests/p8-publication.test.mjs:7`](../tests/p8-publication.test.mjs#L7), [`tests/p8-corrections.test.mjs:7`](../tests/p8-corrections.test.mjs#L7), [`tests/p8-progress-calculation.test.mjs:6`](../tests/p8-progress-calculation.test.mjs#L6), [`scripts/test-p8-integration.mjs:1`](../scripts/test-p8-integration.mjs#L1).

### I-G13

Inherited accepted records: [P6](work-log/2026-10-18-p6-verify-final.md). Candidate assertion sources: [`tests/p6-plan.test.mjs:8`](../tests/p6-plan.test.mjs#L8), [`tests/p6-plan-integration.test.mjs:9`](../tests/p6-plan-integration.test.mjs#L9).

### I-G14

Inherited accepted records: [P6](work-log/2026-10-18-p6-verify-final.md). Candidate assertion sources: [`tests/p6-wall.test.mjs:8`](../tests/p6-wall.test.mjs#L8), [`tests/p6-wall-integration.test.mjs:9`](../tests/p6-wall-integration.test.mjs#L9).

### I-G15

Inherited accepted records: [P6](work-log/2026-10-18-p6-verify-final.md), [P7](work-log/2026-10-18-p7-verify-final.md), [P8](work-log/2026-10-18-p8-independent-verify.md). Candidate assertion sources: [`tests/p6-notifications.test.mjs:8`](../tests/p6-notifications.test.mjs#L8), [`tests/p7-notifications.test.mjs:11`](../tests/p7-notifications.test.mjs#L11), [`tests/p7-notifications-integration.test.mjs:21`](../tests/p7-notifications-integration.test.mjs#L21), [`tests/p8-publication-integration.test.mjs:23`](../tests/p8-publication-integration.test.mjs#L23), [`tests/p8-corrections-integration.test.mjs:29`](../tests/p8-corrections-integration.test.mjs#L29).

## Current finite closure gaps

- SMTP natural retry/captured intended recipient own proof is complete: L67 single restored-Docker SMTP proof passed exit0/151554ms/native1PASS0FAIL0SKIP at unchanged330/360: real queued200, failureattempt1, natural60s retryCOMPLETEDattempt2, intended captured recipient/link, truthful UI/public reentry, academic/membership unchanged and exact Mailpit identity/ports. Nativeprocess/ownedcleanup0/0,836protected hashes/builds25-30 unchanged. [Attributed record](work-log/2026-10-20-p9-failure-recovery-worker.md). Final independent acceptance remains pending.
- Whole-feature S1-S7 independent Sol/xhigh reconciliation and fresh preparation/builds/probes remain pending. See [the finite verification plan](p9-verification-plan.md). No final PASS, main merge/push or deployment is claimed here.
- Baseline native outbox unavailable and retained P4-local helper unavailable remain advisories, not PASS; do not run or repair them merely to make the ledger green.


## First independent frozen-candidate outcome

[Fresh Sol/xhigh Verify](work-log/2026-10-20-p9-finite-independent-verify.md) reconciled all170 exact outcomes/266 source references and retained capacity/service/SMTP evidence, plus fresh bounded builds/units/differentials. Mandatory active proof is incomplete: secondaccount capturedverification prerequisite failed within existing10s, cause unproven. Homeclassroom assertions and downstream scanner/joined/SMTP probes were not executed. Explicit fresh-scope gaps:V1-001,023,025,038,039,056,062,064,066,157,158,159,170. These are missing samples, not13demonstrated productdefects. Preserve all row distinctions; no wholeP9PASS or mainpublication.

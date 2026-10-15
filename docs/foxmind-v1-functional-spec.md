# FoxMind V1 functional specification

FoxMind is a web platform for independent courses and training. This document consolidates the product decisions confirmed in the conversation. It authorizes neither application implementation nor deployment; the current deliverable is documentation only.

## Reading guide

- **Confirmed** means explicitly requested or accepted by the user.
- **Open** means not decided; a screenshot, example or recommendation does not settle it.
- Interface labels remain in Spanish. Specification prose is in English.
- Confirmed written decisions take precedence over generated screenshots.
- See [Visual reference index](visual-reference-index.md) for the supplied images.

## 1. Scope and exclusions

### Confirmed

- Initial audience: independent courses and training.
- Two classroom roles: teacher (`Docente`) and student (`Alumno`).
- One account may teach in some classrooms and study in others.
- V1 includes classrooms, invitations, plans, materials, activities, submissions, grading, classroom conversations and progress.
- Questionnaires and evaluations are answered inside FoxMind, not only through file submissions.
- AI is deferred until after the platform has been validated.

### Outside the confirmed V1 scope

- AI assistants, generated plans/questions, AI grading and student tutors.
- Google sign-in.
- Configurable grade weights by activity type.
- Configurable passing thresholds and automatic pass/fail classification.
- Additional notification preferences and visual personalization settings.
- An administrator role for approving teachers: classroom creation does not require approval.

No institutional administration, payments, rankings, streaks or certificates were approved. They must not be inferred from educational dashboard conventions.

## 2. Accounts, roles and permissions

### Confirmed

- Any registered user can create a classroom without prior authorization.
- The creator is the classroom's sole teacher, not a teacher globally.
- V1 does not support co-teachers or classroom ownership transfers.
- A user cannot be both teacher and student in the same classroom; the sole teacher cannot enroll as a student in their own classroom.
- A user joins other classrooms as a student through an invitation or code.
- Teacher permissions in one classroom do not grant access to another classroom's management or students' records.
- Profile information must not present an exclusive global teacher/student role.
- Email verification is required before classroom use: creating, joining, accepting invitations or accessing classroom content.

| Capability | Teacher in that classroom | Student in that classroom |
|---|---|---|
| Invite students | Yes | No |
| See enrolled students | Yes | Names only in `Compañeros` |
| Open an individual student's submission/grade summary | Yes | No |
| Create activities | Yes | No |
| Submit work or answer an activity | Not specified as a teacher capability | Own work only |
| Upload Library material | Yes | No |
| Consult/download Library material | Yes | Yes |
| Mark plan topics as taught/next | Yes | Read-only |
| Publish notices | Yes | Not a student capability |
| Publish classroom queries and replies | Classroom conversations supported | Yes |
| Grade and publish results | Yes | No |
| See classroom-wide progress | Yes | No |
| See personal progress | Can inspect student summaries | Own results only |
| Archive/reactivate the classroom | Yes | No |
| Leave the classroom as a student | Not applicable to the sole teacher | Yes |
| Remove an enrolled student | Yes | No |

Removing teacher buttons from a student view is not sufficient: implementation must enforce classroom-scoped permissions on the server.

### Confirmed classroom lifecycle

- In V1, a teacher may archive and reactivate their classroom. Permanent classroom deletion is not available.
- An archived classroom is read-only for both teachers and students, subject to their existing access permissions.
- Archiving preserves membership, materials, conversations, attempts/submissions and grades; it does not publish pending grades or expose private records.
- While archived, the classroom accepts no new members, publications, submissions or modifications. Reactivation is the teacher-controlled exception to this read-only state.
- Reactivation restores normal operation without automatically resetting or extending any deadline. Existing content locks, attempt history and effective-grade rules remain in effect.

### Confirmed student departure and removal policy

- A student may leave a classroom, and its teacher may remove an enrolled student.
- Neither action deletes the student's prior submissions, grades or classroom conversations.
- The former student loses access to the classroom; the teacher retains access to their academic history.
- Rejoining requires a new teacher-issued invitation and explicit acceptance. The classroom code cannot bypass a previous departure or removal, and an invitation from before that departure is not a new invitation.
- Membership changes must also respect the archived classroom's read-only state; this policy does not override the archive/reactivation restrictions.

Current progress and the separate teacher-accessible student history follow the confirmed membership rules in section 11.

## 3. Registration and invitations

### Confirmed access

- Email and password registration/sign-in.
- Email verification.
- Password recovery.
- No Google sign-in in V1.

### Confirmed unverified-account policy

An unverified account may sign in, but sees the email-verification screen. That screen allows verifying the email, resending the verification message or signing out.

Until verification succeeds, the account cannot create classrooms, join through a code, accept invitations or access classroom content. The same boundary applies regardless of the enrollment path and must be enforced on the server, not only through navigation visibility.

This policy does not enroll an invited user automatically after verification: explicit invitation acceptance is still required.

### Confirmed invitation flow

Teachers may invite students by email or share a classroom code. A platform invitation remains pending until accepted.

For an invited person without an account:

1. Receive an email informing them of the invitation.
2. Register using the invited email address.
3. Verify that email address.
4. See the pending invitation in FoxMind.
5. Explicitly accept it to join the classroom.

Registration or verification alone does not enroll the person.

### Confirmed first-time code enrollment

1. A user with verified email enters a classroom code.
2. If the code is valid and the classroom is active, show a preview containing the classroom name, subject, division, academic year and teacher.
3. The user explicitly confirms enrollment. No additional teacher approval is required.

The preview does not grant access to classroom content or other members' records before enrollment. Do not create duplicate memberships. The classroom's teacher cannot enroll as a student in their own classroom.

After leaving or being removed, a new teacher-issued invitation must be accepted instead; a code is not a re-entry bypass. Codes shown in the references, such as `FOX-7K2M`, are fictional examples, not an agreed format or actual access credentials.

### Confirmed invitation and code lifecycle

- Email invitations expire seven days after issuance.
- The teacher may resend an invitation, renewing its seven-day validity without creating duplicate pending invitations for the same classroom and recipient.
- The teacher may revoke an invitation before it is accepted. Expired or revoked invitations do not grant enrollment.
- A classroom code has no fixed automatic expiration: it is usable while the classroom is active and the teacher has not regenerated it.
- The teacher may regenerate the code, invalidating the previous code without affecting already enrolled students.
- These controls do not bypass verified-email, explicit-acceptance, archive or invitation-only re-entry restrictions.

### Confirmed enrollment error handling

For invalid codes, existing membership or an invitation opened with the wrong account, show a generic notice and remain in the form without redirecting. Do not create or duplicate membership, change roles or disclose private classroom records. An invitation can only be accepted by the account with the invited email address.

### Confirmed authentication security policy

- Passwords must contain 16–128 characters.
- Email-verification links expire after one hour; password-recovery links expire after 15 minutes. These are distinct from classroom invitations, which remain valid for seven days.
- Verification and recovery links are single-use. Resending requires a minimum 60-second wait and invalidates the previous link for the same purpose.
- Apply abuse protection to authentication and resend flows. Recovery responses must not disclose whether an account exists.
- Successful password recovery closes previous sessions.

### Confirmed P3.1 account/session policies

- Sessions expire after 30 minutes without activity and have a maximum absolute lifetime of 12 hours. Activity renews the inactivity deadline, not the absolute deadline.
- Changing a password from the profile closes the user's other sessions and renews the current session. This is distinct from password recovery, which closes all previous sessions.
- Registration using an already registered email receives a generic response that does not reveal account existence. It must not overwrite the existing account or its password, grant enrollment, or silently accept an invitation.

The local email-delivery approach is defined in section 14. Concrete anti-abuse thresholds and token implementation are technical configuration, not authorization to weaken these rules.

## 4. Navigation

### Confirmed

Global navigation uses a **top bar**, not a persistent left sidebar:

- FoxMind identity.
- `Inicio`.
- `Mis Aulas`.
- Notifications access.
- Profile menu with `Mi Perfil` / `Configuración`.

Inside a classroom:

| Teacher tabs | Student tabs |
|---|---|
| Alumnos | Compañeros |
| Actividades | Actividades |
| Plan | Plan |
| Muro | Muro |
| Biblioteca | Biblioteca |
| Progreso | Mi Progreso |

Mobile uses compact global navigation and horizontally scrollable classroom tabs. The active tab must remain discoverable. Evaluation-taking uses a reduced header, not the full classroom chrome.

### Adaptations required by the later role decision

- `Mis Aulas` must support both `Crear aula` and `Unirse con código` for the same account.
- Earlier exclusively teacher/student global screenshots are visual examples, not an exclusive-role account model.
- Both `Mis Aulas` and classroom summaries on `Inicio` use two blocks: `Enseño` and `Estudio`. No global role switch is provided.

### Confirmed V1 notifications

- Provide an in-platform notification center, ordered newest first, with an option to mark notifications as read.
- Notify students about teacher notices, new activities, deadline changes, published or corrected grades, reopened attempts and replies to their own publications.
- Notify the classroom teacher about new submissions, student queries and replies to the teacher's own publications.
- Notifications are classroom-role scoped: the same account may receive student events from one classroom and teacher events from another, without gaining a global role.
- Do not send an email for every academic event. Email remains available for invitations, verification and password recovery; additional notification preferences remain outside V1.
- Opening a notification must enforce current classroom and target-record permissions. A notification does not restore revoked access or expose another student's private academic records.

## 5. Classroom creation

### Confirmed data

| Field | Meaning |
|---|---|
| Nombre | Classroom name |
| Materia | Subject or area |
| División | Group or cohort, such as `Grupo A` |
| Ciclo lectivo | Calendar/academic year, such as `2026`, not educational level |
| Zona horaria | Classroom timezone, suggested from the browser and selectable by the teacher during creation |
| Plan de estudio | Uploaded PDF or Word document |
| Unidades y temas | Units containing their corresponding topics |

Use `Ciclo lectivo` instead of the ambiguous `Año` in the final interface. Keep `División`; its meaning was clarified, but renaming it was not approved.

The agreed design flow is:

1. `Datos generales`.
2. `Plan de estudio`.
3. `Unidades y temas`.
4. `Revisión`, then `Crear aula`.

The teacher manually details units and topics. No automatic extraction or AI generation is included. Invitations occur after classroom creation.

### Confirmed creation requirements and drafts

- All classroom data fields above are required to complete creation, including `División`, the plan file and at least one unit containing at least one topic. The plan uses the approved PDF/DOCX formats and file-security rules.
- `Materia` and `División` are free-text fields, not catalog selectors.
- The teacher chooses a cover from predefined illustrations. V1 does not allow uploading a classroom cover image.
- Preserve unfinished creation as a private, recoverable draft. An incomplete creation draft is not a published classroom and cannot be used to enroll students.
- Required text must contain more than whitespace. Apply the text limits below without silently truncating input. Classroom names need not be unique.

### Confirmed classroom settings and plan maintenance

- The teacher may edit classroom name, subject, division and academic year after creation. The timezone remains fixed.
- Updating the study-plan file creates a new version; preserve previous versions rather than overwriting them. Plan-file changes do not rewrite activity instructions, attempts or grades.
- Teachers may add, rename and reorder units/topics.
- A topic may be deleted only while `Pendiente` and without linked materials or activities. A unit may be deleted only when empty and without links. Do not cascade-delete linked records.
- These changes respect the archived classroom's read-only restriction.

### Confirmed text validation limits

| Field | Maximum characters |
|---|---|
| First name; last name | 80 each |
| Classroom name; subject; unit name; topic name | 120 each |
| Division | 60 |
| Activity title; material title | 200 each |
| Observations; feedback; Muro publication/reply text | 5,000 each |
| Development answer | 20,000 |

Reject over-limit input with a validation error rather than silently cutting it. These limits apply to creation and later edits and do not make optional fields mandatory. Password length follows section 3, not this table.

## 6. Students and classmates

### Confirmed

- Teachers see the students enrolled in their classroom.
- Selecting a student opens a mini summary of submissions and grades.
- Students see only classmates' names in `Compañeros`, with no additional information or per-person actions.
- A student cannot access another student's submissions, grades or progress.

In the Muro, show each author's first and last name with automatically generated initials as the image. Do not expose email, public profiles or avatar-upload controls. Author identity does not expand the names-only `Compañeros` permissions.

## 7. Library

### Confirmed

- Teachers upload educational materials, including PDF, Word and PowerPoint examples.
- Material may be left unassociated as extra/recommended material, associated with a unit only, or associated with a unit and one of its topics.
- A selected topic must belong to the selected unit; a topic cannot be associated without its unit.
- Activities may link to one or more Library materials.
- Students have a `Biblioteca` tab with read-only consultation/download access, including extra material not linked to any activity.
- Students cannot upload, edit or delete Library materials.

### Confirmed file policy

| Use | Allowed extensions | Per-file size limit |
|---|---|---|
| Classroom study plan and practical-assignment instructions | `.pdf`, `.docx` | 20 MB |
| Library materials | `.pdf`, `.docx`, `.pptx`, `.xlsx`, `.jpg`, `.jpeg`, `.png`, `.zip` | 50 MB |
| File-based student submissions | Same as Library materials | 50 MB, at most 5 files per submission |

V1 excludes legacy Office formats (`.doc`, `.ppt`, `.xls`) and macro-enabled Office formats (`.docm`, `.pptm`, `.xlsm`). An allowed filename extension alone is not evidence that a file's contents are valid or safe.

These are private files subject to security validation. ZIP support does not authorize executing archive contents. Direct audio/video file uploads are not included in the approved format list for V1.

### Confirmed file validation and security gating

- Validate file size, allowed extension and actual content/type. Renaming a file to an allowed extension does not make its content valid.
- Keep uploads private and under review until content validation and security scanning have succeeded.
- While validation or scanning is pending, do not allow download, preview or inclusion in a submitted delivery. Apply the same security gate to classroom plans, instructions, Library materials and student attachments.
- Reject encrypted or password-protected files that cannot be inspected, including uninspectable archives.
- A failed or unavailable scan must not approve the file by default; keep it inaccessible until the required checks succeed. A rejected file is not usable material or a submitted attachment.
- This policy does not select a scanner service or authorize installing one. ZIP contents must not be executed.

### Confirmed Library material conservation policy

- Published Library file contents are not overwritten. A correction is uploaded as a new material rather than replacing the existing file.
- A Library material linked to any activity cannot be deleted.
- Activity material links may be changed only before the first student attempt starts. After that, adding, removing or replacing linked materials is blocked.
- An unlinked Library material may be deleted by the teacher with explicit confirmation.

These rules preserve the resources referenced by previous activities and attempts. They do not authorize students to delete Library files or submitted work. Display metadata and unit/topic association editing are separate from replacing file contents or changing activity links.

### Confirmed Library metadata editing

The teacher may edit a published material's display name and unit/topic association. This changes organization, not the published file contents or the identity of materials linked to an activity. The file-conservation and activity-link restrictions above still apply, including after participation starts.

All metadata edits remain subject to the archived classroom's read-only state.

### Confirmed file preview scope

- Offer in-browser previews for PDF and JPG/JPEG/PNG images when supported by the browser, with download as an alternative.
- Word (`.docx`), PowerPoint (`.pptx`), Excel (`.xlsx`) and ZIP files are download-only in V1; no custom viewers for these formats are included.
- Both preview and download require the applicable classroom/record permissions. Files remain private; preview support does not expose other students' submissions or bypass revoked classroom access.
- If a supported-format preview cannot be displayed by the browser, retain authorized download access rather than promising an unavailable viewer.

### Confirmed classroom storage-quota policy

- Apply a configurable storage quota per classroom.
- Count study plans, materials, submissions from every preserved attempt and attachments saved as drafts toward that classroom's stored-file usage.
- When the quota is exhausted, block new uploads and explain the storage-limit reason. Do not automatically delete history or prevent authorized consultation/download of files already enabled by security checks.
- Quota exhaustion does not turn an uploaded draft into a submission or bypass file validation, attempt locks or classroom permissions.
- The numerical quota in GB remains undecided until hosting and budget are defined. This policy does not authorize selecting a paid plan or deploying infrastructure.

### Confirmed aggregate size and upload cleanup

- Do not impose an additional aggregate submission cap: five files of up to 50 MB each permit up to 250 MB in total, subject to available classroom quota.
- Draft attachments whose uploads were confirmed do not expire automatically.
- Automatically clean up only incomplete abandoned uploads after 24 hours of inactivity. Do not use this cleanup to delete confirmed draft files, historical submissions or linked files.

### Technical and deferred items

- Production quota values remain deferred with hosting and budget. Local scanner selection/integration and operational inspection limits will be selected and verified during technical preparation without bypassing the confirmed security gate.

## 8. Activities and submissions

### Confirmed activity types

- `Trabajo práctico`.
- `Cuestionario`.
- `Evaluación`.

Teachers create a named activity and must select both a unit and a topic belonging to that unit. These associations are required for every activity type. Teachers may link Library materials.

A practical-assignment instruction may be written in `Observaciones`, supplied as a PDF/DOCX file, or both; at least one is required. The teacher configures whether student attachments are mandatory. If mandatory, require at least one valid attachment; otherwise, allow an explicitly confirmed submission with no attachments.

Changing an activity or material association must preserve the unit/topic dependency; do not save a topic that belongs to a different selected unit.

Questionnaires and evaluations support development questions and choice questions with one or multiple correct answers, as defined by the teacher. Each choice question requires at least two options: single-choice requires exactly one correct option, and multiple-choice requires at least two correct options.

### Confirmed activity authoring and publication

- Teachers save activities as private drafts and explicitly press `Publicar`. Only published activities are visible to students and trigger new-activity notifications.
- Before the first student attempt, a published activity may be edited or withdrawn. Apply the existing file-conservation rules when changing links.
- After the first student attempt, preserve the activity and its history; this authoring flow does not authorize withdrawal or deletion that bypasses the confirmed content locks.
- The attachment-required setting forms part of the practical assignment's requirements and is locked with its instructions when the first attempt starts.

### Confirmed incomplete submission policy

Students may submit a questionnaire or evaluation with unanswered questions.

- Show how many questions remain unanswered before submission.
- Warn that those unanswered questions earn zero points in the submitted attempt.
- Require explicit confirmation before sending an incomplete attempt.
- If confirmation is canceled, keep the draft editable and do not create a submitted attempt.
- Teacher review and result publication are still required; submitting incomplete work does not publish a grade automatically.

A blank question in a submitted attempt is different from an activity that was never submitted. An unsubmitted activity must not be assigned a numeric zero in averages.

### Drafts and attempts

- Student question answers are saved as drafts before submission.
- Show truthful save states; the UI must not report a successful save when persistence failed.
- Each activity starts with one allowed submission.
- After submission, answers/work are locked against student modification.
- A teacher can enable another attempt or resubmission.
- Previous attempts are preserved rather than overwritten.
- If an earlier attempt has a published grade, that grade remains effective while the new attempt awaits correction or publication.
- Publishing the new attempt's grade replaces the previous effective grade, even when the new grade is lower. Do not automatically select the highest grade.
- Each activity contributes at most one effective published grade to averages, regardless of the number of attempts.
- There is no initial teacher configuration of an arbitrary attempt count.
- Students attach completed work when submitting a practical assignment if the teacher configured attachments as mandatory; optional-attachment assignments may be explicitly submitted without files.
- When another attempt is enabled, prefill the previous attempt's answers or attachments for revision while preserving the original. Do not copy its grade as the new attempt's correction.
- Show all attempts chronologically, newest first. A reopened attempt left unfinished remains a draft/pending resubmission, not a received submission or a zero grade; any previous effective grade and delivered status remain in effect.

`Archivo seleccionado` is not evidence that a file has been submitted. Practical-assignment attachments follow the private draft-upload policy below.

### Confirmed question-answer autosave policy

- For questionnaires and evaluations, attempt to save answers automatically after two seconds without changes and when changing questions.
- Show truthful saving, saved or error states. Only report saved after persistence is confirmed.
- If saving fails, retain the answers on screen and allow the student to retry; do not present the failed save as successful.
- On reopening an attempt, restore the last confirmed saved draft.
- Without connectivity, do not guarantee recovery of unconfirmed changes after closing or reloading. Keeping answers on screen is not a promise of durable offline storage.
- Saving a draft never submits the activity or publishes a result. Submission still requires the existing explicit submission flow.

This policy covers question answers; practical-assignment attachments use the following upload states and persistence rules.

### Confirmed practical-assignment attachment drafts

- Upload attachments as private drafts before submission, showing the actual upload state rather than treating a local file selection as a completed upload.
- On reopening the attempt, recover attachments whose uploads were confirmed. Do not promise recovery of files that were only selected or whose upload did not complete.
- The student may remove or replace draft attachments before submitting, subject to the active-editor, classroom-state and existing file-limit rules.
- Enable submission only after its attachments are fully uploaded and have passed validation. Incomplete, failed or validation-pending uploads are not ready for submission.
- Uploading or recovering an attachment does not submit the work. The student must explicitly confirm submission, and the server must receive the complete submission under the applicable deadline/reception policy.
- After submission, attachments are locked against student modification until the teacher enables another attempt; previous submissions remain preserved.

### Confirmed single-editor attempt policy

- Allow only one active editor per student attempt.
- Opening the same attempt in another tab or device initially provides read-only consultation rather than a second editor.
- The student may explicitly transfer editing control to that tab/device. The previous editor then becomes read-only and cannot save or submit changes to the attempt.
- On transfer, load the last confirmed saved draft and warn that unconfirmed changes from the previous session are not transferred. Do not silently merge or overwrite them.
- Transferring editing control neither creates another attempt nor submits the activity. Existing permissions, attempt locks and deadline rules still apply.
- Enforce the single-editor restriction on the server, not just by hiding editing controls.

### Confirmed editing lock

As soon as any student starts an attempt, the activity's instruction content, teacher observations, questions, answer options, correct answers, available points and scoring rules are locked for all students. An activity must not be graded against changed content after participation has started.

To change these locked elements, the teacher creates a new activity rather than a new editable version of the same activity. This does not authorize deleting or replacing existing attempts or grades.

The confirmed attempt-start events are:

- Questionnaire or evaluation: the student presses `Comenzar`.
- Practical assignment: the student first opens the activity detail containing access to its instructions.
- A teacher's preview does not start a student attempt or activate the lock.

Opening a practical assignment or downloading its instructions is not a submission. The first student detail opening activates the content lock so instructions cannot change while someone prepares work outside FoxMind. Selecting a file is also not a submission.

Linked Library materials are also frozen after the first student attempt, according to section 7. Deadline changes have their own policy and are not settled by the content lock.

### Confirmed activity metadata editing

The teacher may correct an activity's title and change its unit/topic association after participation begins for organizational purposes, without changing the work's requirements. Teacher observations are part of the instructions and remain locked from the first student attempt.

These metadata edits do not authorize changing files, questions, points, scoring rules or linked material identities. They also do not bypass an archived classroom's read-only state.

### Deadlines

- A deadline is optional per activity.
- With a deadline, the teacher chooses either to permit late submissions or close reception at expiration.
- Accepted late submissions are identified as late.
- Without a deadline, a submission is not classified as late.

### Confirmed deadline boundary and submission timestamp

- Teachers specify deadlines with minute precision, interpreted in the classroom timezone.
- A submission is on time only if the server receives the complete submission before the applicable deadline instant.
- At the deadline instant and afterward, the submission is late if late submissions are allowed, or rejected if reception closes at expiration.
- Pressing Send or starting a file upload before the deadline does not reserve an on-time submission. The complete submission must reach the server in time.
- The student's device clock does not determine timeliness.

For a deadline of 18:00 in the classroom timezone, receipt before 18:00:00 is on time; receipt at 18:00:00 or afterward is late or rejected according to the reception policy. Apply this boundary to the applicable general or individual deadline.

### Confirmed classroom timezone policy

- Each classroom has its own timezone.
- During classroom creation, suggest the browser's timezone and let the teacher select another.
- Show deadlines to everyone with the classroom timezone explicitly indicated, rather than silently interpreting the same clock time in each viewer's device timezone.
- Store deadline instants internally in UTC so devices agree on the same moment.

- The teacher selects the timezone during classroom creation; V1 does not allow changing it afterward.
- If a daylight-saving transition makes a selected local time nonexistent, reject that time and ask the teacher to choose another; do not silently shift it.
- If a local time occurs twice, show both occurrences with their UTC offsets and require an explicit choice before saving the deadline; do not choose automatically.

The classroom timezone remains fixed, not its UTC offset: seasonal offset changes follow that timezone's rules. No initial country or default fixed UTC offset has been chosen.

### Confirmed general deadline editing policy

- Before the first student attempt starts, the teacher may change or remove the activity's general deadline.
- Once any student has started, an existing general deadline may only be extended, not brought forward or removed.
- An extension does not retroactively change the recorded on-time/late state of an earlier submission.
- New submissions use the general deadline in effect when they are submitted, unless an individual deadline applies.

- Once any student has started an initially undated activity, a general deadline cannot be added.
- After the first student attempt, the late-submission policy may only become more permissive: the teacher may change from closing reception at expiration to allowing late submissions, but not the reverse.
- These changes do not retroactively reclassify prior submissions.

### Confirmed resubmission deadline policy

When enabling another attempt, the teacher may set a new deadline for that student only. This does not change the deadline for other students.

- Without a new individual deadline, the activity's general deadline and late-submission policy apply. For a new submission, use the general deadline in effect at submission time.
- If reception has already closed because the deadline expired, reopening requires a future individual deadline.
- The new attempt's timeliness is evaluated against its applicable deadline.
- If a subsequent general extension moves the general deadline beyond an existing individual resubmission deadline, apply that later general deadline to the student. Otherwise, preserve the individual deadline. A general extension must not shorten that student's allowed time.
- The previous attempts and their recorded timeliness states are preserved; reopening does not rewrite them.

The existing permit-late versus close-reception policy still applies; reopening is not an unrestricted bypass of reception rules.

For a newly enrolled student, the teacher may also enable a first submission for an activity that had already expired when they joined, using a future individual deadline. This is an initial submission, not an additional attempt after a nonexistent prior submission. The first-enrollment eligibility rules are defined in section 11.

Attempt-history presentation, unfinished reopenings and aggregate upload size are confirmed above and in section 7. Scanner integration and operational limits remain technical preparation work; no file-security bypass is authorized.

## 9. Grading and publication

### Confirmed

- Choice questions are graded automatically using teacher-defined correct answers.
- Development answers are graded manually by the teacher, with points and feedback. Unanswered questions in an explicitly confirmed incomplete submission follow the zero-point rule in section 8; teacher review/publication still applies.
- For multiple-correct-answer questions, the teacher chooses a scoring rule **per question**.
- The teacher reviews and publishes the final grade and feedback.
- Students do not see unpublished grades as final results.
- Grades use a common scale from 0 to 10, allowing decimals.

### Multiple-answer scoring

Let `P` be the points available, `C` the number of correct options and `S` the number of correct options selected.

| Rule | Result |
|---|---|
| Coincidencia exacta | Full points only when all correct options and no incorrect options are selected; otherwise zero for that question. |
| Puntaje parcial, no incorrect option selected | `P × S / C`. |
| Puntaje parcial, any incorrect option selected | Zero for that question. |

There is no deduction from other questions.

Accepted example: a 6-point question has 3 correct options. Selecting 2 correct options and no incorrect ones earns 4 points. Including any incorrect option earns 0 for that question.

Total question points are converted to the 0–10 grade scale. The reference evaluation totals 10 points only as an example; future evaluations are not restricted to 10 available points.

### Confirmed practical-assignment grading

- The teacher assigns one manual overall grade on the 0–10 scale to the practical-assignment submission, respecting the confirmed two-decimal precision and display rules.
- Provide a separate, optional overall-feedback field. Feedback is distinct from the activity's locked instruction observations.
- The teacher prepares the correction privately. Publishing releases the grade and any overall feedback together to the student; do not expose an unpublished correction.
- Overall feedback is not required to publish a valid grade. A published zero remains valid.
- Existing attempt history, effective-grade replacement and audited published-grade correction rules still apply.

### Confirmed student result visibility

After the teacher publishes a questionnaire or evaluation result, the student may see their own submitted answers, points earned per question, final grade and teacher feedback. For practical assignments, publication shows the overall grade and any overall feedback as defined above.

V1 does not automatically reveal the full answer key or correct options the student did not select. The teacher may explain a solution in feedback. This limits automatic disclosure while others may still be working or resubmitting; it is not a promise that teacher-written feedback can never contain a solution.

The student result must not expose other students' answers or grades. Full answer-key release settings are not part of V1.

### Confirmed correction of published grades

The teacher may correct a grade that has already been published for the same attempt.

- Require a reason for the correction.
- Preserve an audit history with the previous grade, new grade, change timestamp and actor. The complete correction audit is visible only to the classroom teacher.
- The student sees the corrected published grade and receives a notification, not access to the correction audit.
- Recalculate averages using the corrected effective grade, retaining the one-grade-per-activity rule.
- Do not modify the student's answers or the activity's locked content and scoring criteria.

This is distinct from publishing a new attempt's grade. Correcting a historical record must not bypass the rule that only one effective published grade per activity contributes to averages.

### Confirmed precision and validation

- Point inputs and grade inputs support up to two decimal places.
- Calculate earned scores without rounding each question's intermediate result. Round the final published grade to two decimal places on the 0–10 scale.
- Calculate averages from those published grades and round only the resulting average to two decimal places.
- Round final published grades and resulting averages using round-half-up: an exact halfway value rounds upward. For example, a calculated `8.345` becomes `8.35`, displayed as `8,35`.
- Display grades and averages in the Spanish UI with a decimal comma and exactly two decimal places, including trailing zeros: `8,50`.
- Evaluations cannot be empty, and each question must have a strictly positive available point value. Zero or negative available points are not allowed.
- An earned score or published grade may still be zero: this validation concerns points available, not a student's performance.

Example: a calculated grade of `6.666…` is published with two decimals and displayed as `6,67`. Do not round per-question partial credit before summing it.

Intermediate numeric representation remains an implementation detail; it must preserve the no-intermediate-rounding rule and reproduce the confirmed round-half-up behavior at exact ties. Display formatting does not authorize accepting manual point/grade inputs with more than two decimal places.

### Confirmed numeric-only grading scope

V1 shows published numeric grades and teacher feedback without automatically assigning `Aprobado` or `Desaprobado`. Do not hard-code a universal passing threshold such as 4, 6 or 7, or infer course approval from an individual grade or average.

Configurable passing criteria and automatic pass/fail classification are deferred beyond V1. This does not change the confirmed grade scale, averages or submission-completion indicators.

## 10. Plan and Muro

### Plan — confirmed

- Both roles can see the classroom units and topics.
- Teachers mark topics already taught and identify what comes next.
- Students consult these states without changing them.
- Teaching progress does not imply individual mastery, attendance or a published grade.

### Confirmed manual topic-state transitions

- Each topic has exactly one state: `Pendiente`, `Siguiente` or `Dado`.
- Multiple topics may be `Dado`, but at most one topic may be `Siguiente` across the classroom. Having no next topic selected is allowed.
- When the teacher selects another topic as `Siguiente`, the previous next topic becomes `Pendiente`.
- Marking the current next topic as `Dado` does not automatically select a replacement; no next topic remains selected until the teacher chooses one.
- The teacher may manually correct topic states, including undoing a taught state. Students can only consult them.
- State changes must respect an archived classroom's read-only restriction and do not alter grades or submitted attempts.

### Muro — confirmed

- Classroom publications with grouped replies, not a chronological chat stream.
- Teachers publish notices; students publish queries.
- Publications and replies are visible to the classroom.
- Each reply belongs to its parent publication.

### Confirmed basic Muro and moderation scope

- V1 supports text publications and grouped text replies only. Attachments, reactions, pinned publications and private messaging are outside V1.
- Order publications newest first; order replies within each thread oldest first.
- Authors may edit or remove their own publications and replies, subject to current classroom access and the archived classroom's read-only restriction.
- The teacher may also remove student-authored publications and replies, but may not rewrite another author's content.
- Removing content requires explicit confirmation and leaves a removed-content marker in the thread structure. Do not cascade-delete other authors' replies when removing a parent publication.
- Moderation does not grant access to other classrooms or alter submissions and grades.

## 11. Progress and averages

### Confirmed

Teacher progress summarizes class grades, submissions on time and late, and related classroom progress. Students see only their own performance.

Keep three concepts separate:

- **Submission completion:** received versus pending work.
- **Academic performance:** published grades.
- **Teaching-plan progress:** topics marked as taught.

### Accepted average rules

1. Individual average: arithmetic mean of the student's published activity grades. Practical assignments, questionnaires and evaluations have equal weight.
2. Classroom average: arithmetic mean of those individual averages, including only currently enrolled students with at least one published grade.
3. Unsubmitted, uncorrected or unpublished work does **not** count as zero.
4. If there are no applicable published grades, display a no-grades state rather than a numeric zero.

Example: published grades 8 and 6 yield 7, regardless of another activity awaiting correction. A published zero is an actual grade and is not the same as a missing grade.

The class average is not a pooled average weighted by each student's number of graded activities.

### Confirmed current-versus-historical membership metrics

- Current classroom indicators use currently enrolled students only.
- Students who left or were removed are excluded from the current class average and current student/submission totals.
- Their records remain available to the teacher in a separate history section; exclusion from current metrics is not deletion.
- If they rejoin through the confirmed invitation flow, reuse their preserved records and include them in current indicators again. Do not duplicate the student, submissions or grades.
- An enrolled student without a published grade still does not contribute a numeric zero to the class average.

### Confirmed first-enrollment activity eligibility

For a student's first enrollment in a classroom:

- They may consult activities that existed before they joined.
- Existing activities without a deadline, or whose deadline was still in the future when they joined, count as expected/pending work until submitted.
- Activities that had already expired when they joined are consultation-only by default. Do not count them as missed work or include them in that student's expected-submission denominator. A general late-allowed policy does not by itself assign these activities to a newly joining student.
- The teacher may explicitly enable a first submission for such an expired activity with a future individual deadline. Once enabled, it becomes expected work for that student and uses the applicable individual-deadline rules.
- This first-enrollment policy must not reset a returning student's preserved history or duplicate prior records; invitation-only re-entry remains required.

### Confirmed activity eligibility after re-entry

- Returning after a voluntary departure or removal preserves the student's previous obligations and history.
- Of activities created during the student's absence from membership, those still open at re-entry or without a deadline become expected work.
- Activities created during that absence which have already expired require explicit teacher authorization with a future individual deadline before becoming expected work.
- This concerns an actual departure/removal followed by re-entry, not merely failing to log in for several days.

### Confirmed submission-completion metrics

- Count each expected activity once per student, not each attempt.
- An activity is delivered when at least one confirmed submission exists, even if it has not yet been graded or its result published. Opening an attempt or saving a draft is not a confirmed submission.
- Enabling another attempt does not erase an existing delivery. Show a pending resubmission as an additional state, without reducing the previous submission-completion count.
- For an individual student, compare delivered expected activities with all activities expected from that student.
- For current classroom completion, divide delivered student/activity pairs by expected student/activity pairs, using only currently enrolled students and each student's eligibility rules. Do not count multiple attempts as multiple received or expected deliveries.
- When the expected count is zero, show `Sin actividades pendientes de seguimiento` without a percentage. This is not the state for a nonempty set of activities that are all delivered; those show full completion.
- Submission completion is separate from academic performance and teaching-plan progress; a delivery neither supplies a grade nor marks a topic as taught.

The published-grade correction audit is teacher-only, as confirmed in section 9; the student sees the corrected grade and receives its notification.

## 12. Mi Perfil / Configuración

### Confirmed V1 scope

- Edit first name and last name.
- Display email without allowing email changes from the profile.
- Change password.
- Sign out.
- No fixed global classroom role.

Additional notification preferences and personalization are deferred. This does not remove functional platform notifications or email invitations.

Changing/uploading avatars, changing email, deleting accounts and other account settings were not approved through the minimal-profile decision. Profile screenshots are not evidence of those capabilities.

## 13. Visual direction and responsive behavior

### Confirmed direction from the local captures

The user supplied 29 screenshots in `docs/references/` as the current visual reference set. See the [local visual reference index](visual-reference-index.md) for the complete linked inventory, screen mapping and functional overrides. Missing captures are not a blocker and do not reopen confirmed product decisions.

- Preserve the original FoxMind fox identity and orange-led, friendly educational style. Do not replace it with a more austere or generic dashboard aesthetic.
- Use an airy pale background, rounded white cards, fine cool-gray borders, soft diffuse shadows, dark bold headings and blue-gray supporting text.
- Keep the rounded global top bar with an orange selected-navigation pill. Classroom pages add a breadcrumb and a cover/title context card with horizontal tabs, highlighted by orange text/icons and an underline.
- Home is the expressive surface: warm peach/orange hero treatment, fox artwork, prominent next action and classroom/news cards. Adapt the separate-role screenshots to the confirmed `Enseño` / `Estudio` blocks.
- Keep management, authoring, correction and evaluation quieter and task-focused while preserving the same rounded component family. No persistent global sidebar is introduced.

### Local visual anchors

| Design concern | Primary local reference |
|---|---|
| Shared classroom shell and management hierarchy | [Teacher Activities](references/Panel%20de%20actividades%20de%20FoxMind.png) |
| Brand-rich student Home | [Student Home](references/Panel%20educativo%20FoxMind%20de%20aprendizaje.png) |
| Teacher greeting, correction queue and classroom cards | [Teacher Home](references/FoxMind_Inicio_Docente_Lucia.png) |
| Classroom cover-card grid | [Mis Aulas](references/Panel%20FoxMind_%20Mis%20aulas%20de%20fotograf%C3%ADa.png) |
| Reduced assessment header, answer rows and question navigator | [Evaluation-taking, desktop](references/Evaluaci%C3%B3n%20de%20iluminaci%C3%B3n%20en%20FoxMind.png) |

### Shared component grammar

- Orange primary actions may use the soft warm gradients/shadows seen in the captures; secondary actions use pale/white outlined surfaces. Global navigation pills and form buttons should remain recognizably different.
- Apply consistent softened corners, spacing and boundaries to cards, fields, upload areas, option rows and dialogs. Preserve readable control labels and visible action hierarchy.
- Use coherent rounded/outline-style icons and pale icon tiles. Peach/lavender/mint activity-type chips are supporting accents, not replacements for the orange brand or automatic pass/fail labels.
- Tables use light headers, restrained separators, status pills and progress bars. Forms group fields into clearly titled sections; the classroom wizard uses numbered steps.
- Focused evaluations use a roomy question area and contextual question navigator. Saving, answered/pending and selection states must reflect real data, not decorative success indicators.
- Keep the user's approved behavior even when an image differs: student Plan is read-only, identities use automatic initials rather than uploaded headshots, grades have two decimals, and account roles remain classroom-scoped. The index lists additional overrides.
- Screenshots are not standalone logo, illustration or cover assets. Prepare the original assets separately; cover selection remains a predefined illustration catalog, not user image upload.

### Responsive rules and evidence limits

The current local captures are wide desktop compositions, including tall full-page forms. No narrow-mobile image is present; do not classify a tall form as a mobile reference.

Preserve the previously confirmed mobile rules: compact global navigation, horizontally scrollable classroom tabs, stacked activity cards instead of squeezed desktop tables, and collapsible question navigation. Reflow the same component system for missing views rather than requiring more screenshots.

### Proposed working tokens, not extracted brand measurements

| Token | Value |
|---|---|
| Primary orange | `#FF8500` |
| Deep orange | `#A94300` |
| Soft orange | `#FFF0DE` |
| Surface | `#FFFFFF` |
| Background | `#F7F8FA` |
| Text | `#30251F` |

These remain implementation starting points, not measured pixel values from the screenshots. Manrope headings and Source Sans 3 body text remain font candidates; the captures establish hierarchy and a rounded sans-serif feel, not an exact font identity. Consolidate tokens, font weights, spacing and radii consistently during design-system implementation.

Accessibility must be verified without discarding the chosen style: contrast (especially text on bright orange), keyboard navigation, visible focus, labeling, touch targets, reduced motion and responsive layouts. Compare representative rendered Home, classroom management, form/dialog and evaluation screens with the local anchors. Static image review is not proof of working behavior, accessibility or visual fidelity of a future frontend.

## 14. Confirmed technology stack

| Layer | Approved choice |
|---|---|
| Web frontend | Next.js, React, TypeScript |
| Styling/components | Tailwind CSS and customized shadcn/ui |
| Backend | NestJS, one modular backend rather than microservices |
| Database | PostgreSQL |
| Data access | Prisma |
| Files | Private S3-compatible object storage |

### Confirmed local-first execution model

- Run PostgreSQL, private S3-compatible storage, a test-email inbox and a real file-security scanner in local containers.
- Run the frontend and backend directly on the developer's machine, not in containers in this initial local setup.
- Exercise verification, recovery and invitations through messages captured in the local test inbox; no external email-delivery provider is required for local verification.
- Do not simulate a successful security scan. Scanner failures or unavailability keep files blocked under section 7.

Concrete tool choices, versions, local operational limits and setup instructions will be selected and verified during technical preparation. Hosting, cloud providers, budget, deployment topology and numerical production quotas are deliberately deferred. Do not add Redis, queues, WebSockets, vector storage or AI infrastructure without a demonstrated need.

Choosing this local model does not authorize installing dependencies, provisioning databases or starting containers.

## 15. Future acceptance checks

These are verification targets for future implementation, **not checks already executed**.

| Scenario | Expected outcome |
|---|---|
| Account teaches and studies in different classrooms | Group Mis Aulas and Home classroom summaries under `Enseño` and `Estudio`, without a global role switch. |
| Teacher completes classroom creation with missing required data, no plan or no unit/topic | Reject completion without publishing the classroom; an incomplete private draft may be saved. |
| Teacher completes classroom data | Accept free-text Materia/División, allow duplicate classroom names, require selection from predefined cover illustrations and offer no cover upload. |
| Teacher resumes an unfinished classroom creation | Restore their private draft without granting other users access or enrolling students. |
| Teacher updates classroom metadata or study plan in an active classroom | Allow the confirmed metadata edits; create a new plan-file version and retain previous versions; keep the timezone fixed. |
| Teacher tries to delete a topic with links or a non-pending state, or a nonempty/linked unit | Reject without deleting associated materials, activities or progress. Allow deletion only for an unused pending topic or an empty unlinked unit. |
| Enrollment fails because of invalid code, existing membership or wrong invited account | Show a generic notice and remain in the form without redirecting, duplicating membership or accepting another account's invitation. |
| User sets a password of 15, 16, 128 or 129 characters | Reject 15/129 and accept the length of 16/128, subject to the other authentication checks. |
| User reuses a consumed verification/recovery link or one superseded by resend | Reject it without changing verification/password state. Verification expires after one hour and recovery after 15 minutes; classroom invitation validity remains seven days. |
| User requests another verification/recovery message before the 60-second wait | Reject the premature resend without issuing a replacement; recovery responses do not disclose account existence. |
| Password recovery succeeds | Close previous sessions; do not silently retain their authentication. |
| Teacher saves an activity draft and later publishes it | Keep the draft private without student notifications; only publication grants eligible student visibility and triggers the new-activity event. |
| Teacher creates a TP instruction | Require observations, a PDF/DOCX instruction file or both; reject an entirely missing instruction. |
| Student confirms a TP with no attachments | Allow only if the teacher did not require attachments; otherwise reject without creating a submitted attempt. |
| Teacher creates a choice question with fewer than two options, wrong single-choice key count or fewer than two multiple-choice correct options | Reject the invalid question without publishing an invalid activity. |
| Teacher enables another attempt | Prefill previous answers/attachments, preserve the original and leave the new attempt ungraded. |
| User opens attempt history with an unfinished reopened attempt | List all attempts newest first; do not turn the draft into a submission or replace the prior effective grade. |
| Student requests the published-grade correction audit | Deny audit access while still showing the corrected published grade and its notification; the complete audit is teacher-only. |
| Student formally rejoins after departure/removal | Preserve previous obligations and history; absence-created open/undated activities become expected, while already expired ones need teacher authorization and a future individual deadline. Merely not logging in is not departure. |
| Muro author is displayed | Show first/last name and automatic initials, not email, public-profile access or avatar-upload controls. |
| Student prepares five valid 50 MB attachments and sufficient quota exists | Permit up to 250 MB total without an extra aggregate cap, subject to scanning and the other submission rules. |
| Upload cleanup processes abandoned data | Clean only incomplete uploads after 24 h inactivity; retain confirmed drafts, historical submissions and linked files. |
| Future local setup is functionally verified | Use containerized PostgreSQL/S3-compatible storage/test inbox/real scanner with frontend/backend on the host; test captured email flows and real scanning without an external email provider or a simulated pass. |
| Text is exactly at its configured character maximum, exceeds it, or is whitespace-only in a required field | Accept the boundary length, reject excess/required whitespace with validation errors and never silently truncate. Apply the per-field maxima in section 5. |
| Same account teaches in A and studies in B | Teacher capabilities apply in A only; B exposes student permissions. |
| Classroom is created | Its creator is the sole teacher; V1 provides no co-teacher or ownership-transfer operation. |
| Teacher tries to enroll as a student in their own classroom | Reject enrollment without creating another membership or changing their teacher role. |
| Registered user with verified email creates a classroom | No teacher-approval step; creator becomes teacher of that classroom. |
| Teacher archives a classroom | Preserve membership and classroom records, make it read-only, and do not publish pending grades. |
| User tries to join, publish, submit or modify an archived classroom | Deny the write without changing classroom records; consultation remains subject to existing role permissions. |
| Teacher reactivates a classroom | Restore normal operation without resetting deadlines, attempts, content locks or grades. |
| User requests permanent classroom deletion in V1 | Do not provide or perform permanent deletion. |
| Student leaves or teacher removes the student | Remove classroom access while preserving submissions, grades and conversations; the teacher retains academic-history access. |
| Former student tries to rejoin using the classroom code or an old invitation | Reject re-entry without a new teacher-issued invitation and explicit acceptance. |
| Former student accepts a new teacher-issued invitation | Permit re-entry subject to verification and classroom-state checks; reuse their preserved records without duplicating memberships, submissions or grades. |
| Student leaves or is removed while current metrics are displayed | Exclude their records from current class averages and current totals, but preserve a separate teacher-accessible history. |
| Active student averages are 8 and 6; the second student leaves and later rejoins | Current class average changes from 7 to 8, then back to 7 on re-entry, using the same preserved grades without duplication. |
| Unverified account signs in | Show the verification screen with verification, resend and sign-out actions; no classroom access. |
| Unverified account requests classroom creation, code joining, invitation acceptance or classroom content | Deny the classroom operation without changing membership or classroom data. |
| Invited account verifies its email | Classroom access remains subject to membership; invitation acceptance is still explicit. |
| Verified user enters a valid classroom code for first-time enrollment | Show classroom name, subject, division, academic year and teacher; do not enroll until explicit confirmation. |
| User confirms first-time code enrollment into an active classroom | Enroll without an additional teacher-approval step, while enforcing no duplicates, no own-class student role and no code-based re-entry after departure/removal. |
| User cancels code-enrollment confirmation | Do not create membership or grant classroom-content access. |
| Teacher issues or resends an email invitation | Give it seven days of validity from issuance/resend; keep no duplicate pending invitations for the same classroom and recipient. |
| User tries to accept an expired or revoked invitation | Reject enrollment without creating membership or granting classroom access. |
| Teacher regenerates the classroom code | Invalidate the previous code and preserve already enrolled students' memberships. |
| User tries the previous code after regeneration | Do not accept it for enrollment or create membership. |
| Invited person registers and verifies email | Invitation remains pending; membership starts only after explicit acceptance. |
| Student opens Compañeros | Names only, no per-person actions or academic/private information. |
| Student opens Biblioteca | Associated and extra materials are available read-only; upload/edit/delete is denied. |
| Teacher tries to overwrite a published Library file | Reject replacement of its contents; corrections require a new material. |
| Teacher tries to delete a Library material linked to an activity | Reject deletion without modifying the material or its links. |
| Teacher changes activity material links before/after the first student attempt | Allow changes before the first attempt; reject adding, removing or replacing links afterward. |
| Teacher deletes an unlinked Library material | Require explicit confirmation before deletion. |
| Study plan or instruction file is uploaded | Accept only the approved PDF/Word formats within the 20 MB per-file cap and subject to security validation. |
| Library or student-submission file is uploaded | Enforce the approved format list and 50 MB per-file cap; files remain private and subject to security validation. |
| Student tries to submit more than 5 files | Reject the invalid submission without creating a submitted attempt. |
| Audio/video file is uploaded directly | Reject as outside the approved V1 file allowlist. |
| Student answers before submitting | Draft persistence is represented truthfully; save failures are not shown as success. |
| Authorized user opens a PDF or JPG/JPEG/PNG file | Offer preview where browser support permits it, with authorized download as an alternative. |
| Authorized user opens a Word, PowerPoint, Excel or ZIP file | Provide download only; do not require or imply a custom in-browser viewer in V1. |
| User lacks permission for a private file | Deny both preview and download; knowing the file identity must not grant access. |
| User uploads a file whose real content/type does not match the allowed format | Reject it; renaming its extension does not bypass validation. |
| Uploaded file is awaiting validation or security scanning | Keep it private and unavailable for preview, download or inclusion in a submitted delivery. |
| Encrypted or password-protected file cannot be inspected | Reject the file rather than bypassing inspection. |
| Security scanning fails or is unavailable | Do not approve the file by default or grant preview/download/submission access. |
| Classroom storage usage is calculated | Include plans, materials, all preserved submission attempts and uploaded draft attachments in the classroom quota. |
| Classroom storage quota is exhausted | Block new uploads with an explanatory reason, without automatically deleting history or preventing authorized access to already enabled files. |
| Numerical classroom quota is configured before deployment | Choose its GB value using the hosting and budget decision; do not infer a default amount from this specification. |
| Teacher uploads a study plan or practical-assignment instructions | Allow only `.pdf` and `.docx`, subject to the 20 MB per-file cap and content/security validation. |
| User uploads Library material or a file-based submission | Allow only `.pdf`, `.docx`, `.pptx`, `.xlsx`, `.jpg`, `.jpeg`, `.png` and `.zip`, subject to the confirmed size/count limits and validation. |
| User uploads a legacy or macro-enabled Office format | Reject `.doc`, `.ppt`, `.xls`, `.docm`, `.pptm` and `.xlsm` without publishing material or creating a submitted attempt. |
| Teacher creates or organizes a Library material | Allow no association, unit only, or unit plus a topic belonging to that unit. |
| Teacher creates or reassociates an activity | Require both a unit and a topic belonging to that unit for every activity type. |
| Teacher selects a topic without its unit or with a different unit | Reject the association without saving an invalid relationship or altering the existing association. |
| Teacher edits a published Library material's display name or unit/topic | Allow organization changes without replacing its file or changing the identities of linked materials; archived classrooms remain read-only. |
| Teacher corrects an activity title or unit/topic after participation starts | Allow organizational corrections without altering work requirements, locked content or recorded attempts/grades; archived classrooms remain read-only. |
| Teacher edits activity observations after the first student attempt | Reject the change and preserve the existing observations, since they are part of the locked instructions. |
| Student opens the same attempt in another tab or device | Provide read-only consultation until the student explicitly transfers editing control. |
| Student transfers editing control | Load the last confirmed draft, warn that other-session unconfirmed changes are not transferred, and make the previous editor read-only without creating or submitting an attempt. |
| Previous editor tries to save or submit after control was transferred | Reject the stale editor's mutation on the server without overwriting saved answers or creating a submission. |
| Student selects or uploads a practical-assignment attachment | Show the actual upload state and keep the draft private; do not create a submitted attempt. |
| Student reopens a practical-assignment draft | Recover confirmed uploaded attachments, not merely selected or incomplete files. |
| Student removes or replaces a draft attachment | Allow it before submission subject to active-editor, classroom-state and file-limit rules; preserve previous submitted attempts. |
| Practical-assignment attachments are incomplete, failed or awaiting validation | Do not allow submission until all included attachments are fully uploaded and validated. |
| Student confirms practical-assignment submission with uploaded and validated attachments | Apply the complete-server-receipt deadline policy and lock attachments on successful submission. |
| Student changes questionnaire or evaluation answers | Attempt autosave after two seconds without changes and when changing questions; only confirmed persistence may display saved. |
| Answer autosave fails | Show an error, retain answers on screen and allow retry without creating a submission. |
| Student reopens a questionnaire or evaluation attempt | Restore the last confirmed saved draft; do not promise recovery of offline/unconfirmed changes after closing or reloading. |
| Answer draft is saved successfully | Do not submit the activity or publish a result. |
| Student first joins a classroom with earlier activities | Permit consultation; count undated activities and those not yet expired at enrollment as expected work. |
| Activity had already expired when a student first joined | Keep it consultation-only by default, even if general late submissions are allowed; do not count it as that student's missed or expected work. |
| Teacher enables a new student's first submission for a previously expired activity | Require a future individual deadline, add the activity to that student's expected work and keep other students' deadlines unchanged. |
| Former student rejoins | Preserve prior history without treating re-entry as a first-enrollment reset or duplicating records. |
| Student has two expected activities and three confirmed attempts for just one of them | Count one delivered activity out of two (50% completion), not three deliveries; correction/publication is not required to count the submission. |
| Teacher enables a resubmission for an already delivered activity | Keep it counted as delivered and show the pending resubmission separately. |
| Classroom completion is calculated | Count each currently enrolled student's eligible activity once in expected totals and at most once in received totals. |
| No activities are expected for the selected student/classroom scope | Show `Sin actividades pendientes de seguimiento` without a percentage. |
| All expected activities have a confirmed submission and the expected count is positive | Show full completion, not the zero-expected empty state. |
| Student submits an activity | One initial submission is accepted; subsequent student changes are blocked until teacher reopens. |
| Teacher tries to change the timezone of an existing classroom | Reject the change without modifying the timezone or existing deadline instants. |
| Teacher enters a local deadline time that does not exist due to a seasonal clock change | Reject the time and request another; do not silently move it or save a deadline. |
| Teacher enters a local deadline time that occurs twice due to a seasonal clock change | Show both occurrences with UTC offsets and require explicit selection before saving; do not select one automatically. |
| Complete submission reaches the server at 17:59:59 for an 18:00 deadline | Accept as on time, subject to the other submission rules. |
| Complete submission reaches the server at 18:00:00 or later for an 18:00 deadline | Accept as late only if late submissions are allowed; otherwise reject without creating a submitted attempt. |
| Student presses Send or starts uploading before 18:00, but the complete submission arrives at or after 18:00 | Apply the late/closed policy using complete server receipt, not click time, upload start or the device clock. |
| Teacher adds a general deadline after an initially undated activity has started | Reject the change without modifying the activity or prior submissions. |
| Teacher changes late-submission policy after the first student attempt | Allow closing-at-expiration to become late-allowed; reject the reverse without changing the policy or prior submissions. |
| Individual resubmission deadline is June 20 and a subsequent general extension reaches June 25 | Apply June 25 to new submissions by that student; preserve prior attempts' recorded timeliness. |
| Individual resubmission deadline is June 25 and a subsequent general extension reaches June 20 | Keep June 25 for that student; do not shorten the individual deadline. |
| Student attempts to submit an incomplete questionnaire or evaluation | Show the unanswered-question count, warn of zero points for blanks and require explicit confirmation. |
| Student cancels incomplete-submission confirmation | Keep answers in the editable draft; do not create a submitted attempt. |
| Student confirms an incomplete submission | Accept the submission with zero points for unanswered questions, subject to teacher review/publication; do not treat never-submitted activities as zero. |
| Teacher reopens an attempt | Student can prepare a new attempt; previous attempts remain preserved. A new deadline, when supplied, applies only to that student. |
| Teacher reopens without a new individual deadline | Apply the activity's general deadline in effect at submission time and its late-submission policy. |
| Teacher creates a classroom | Suggest the browser timezone and allow the teacher to choose another. |
| Users in different device timezones view a deadline | Show the same classroom-local deadline with its timezone identified, backed by one UTC instant. |
| No student has started and teacher edits the general deadline | Permit a date change or removal. |
| At least one student has started and teacher edits an existing general deadline | Permit extensions only; reject an earlier date or removal without changing existing data. |
| Teacher extends the general deadline after submissions exist | Preserve previously recorded timeliness; use the effective deadline for new submissions unless an individual deadline applies. |
| Reception has closed at expiration and teacher enables another attempt | Require a future individual deadline; do not reopen a closed reception without it. |
| New attempt is submitted under an individual deadline | Evaluate its timeliness against that deadline without changing other students' deadlines or previous attempts' timeliness states. |
| First student starts an attempt | Lock the activity's instructions, questions, options, answer key, points and scoring rules for everyone. |
| Student presses Comenzar on a questionnaire or evaluation | Start the attempt and apply the activity content lock. |
| Student first opens a practical assignment's detail | Start the attempt and apply the content lock, but do not mark work as submitted or increment received-submission counts. |
| Teacher previews an activity | Do not start a student attempt or activate the content lock. |
| Teacher tries to change locked content after an attempt has started | Reject the change without modifying existing content, attempts or grades; changing these elements requires a new activity. |
| New attempt exists but its grade is not published | Keep the previous published grade effective, if there is one; do not count the activity twice. |
| Teacher publishes a new attempt's grade | Replace the effective grade with the newly published grade, including when it is lower. |
| Published grade 6 is followed by an unpublished new attempt, then publication of grade 8 | Average uses 6 until publication, then 8; both attempts remain in history. |
| Published grade 8 is followed by a newly published attempt graded 6 | Average uses 6, not the highest historical grade 8. |
| Activity has no deadline | Submission is never labeled late solely from elapsed time. |
| Deadline passes | Permit-late or close-reception policy is respected, including the agreed time boundary. |
| Partial scoring: 2 of 3 correct options, 6 points, no incorrect selection | 4 points. |
| Partial scoring includes an incorrect option | 0 for that question; no penalty applied to other questions. |
| Exact scoring misses a correct option or adds an incorrect one | 0 for that question. |
| Development answer is submitted | Teacher assigns points/feedback; no AI grading. |
| Calculated final grade or resulting average is exactly 8.345 | Round half up to 8.35 and display `8,35`; do not round per-question intermediate calculations. |
| Published grade or resulting average is 8.5 | Display `8,50` with a decimal comma and two decimal places. |
| Teacher prepares a practical-assignment correction | Provide one manual 0–10 overall grade and a separate optional overall-feedback field; keep the correction private until publication. |
| Teacher publishes a valid practical-assignment grade with feedback | Release the grade and overall feedback together to the student. |
| Teacher publishes a valid practical-assignment grade without feedback | Allow publication; overall feedback is optional and a grade of zero is valid. |
| Student views a published grade or average | Show the numeric result and applicable teacher feedback without automatically labeling it `Aprobado` or `Desaprobado` or applying a universal passing threshold. |
| Teacher selects a different topic as `Siguiente` | Make the previous next topic `Pendiente` and keep at most one next topic across the classroom. |
| Teacher marks the current next topic `Dado` | Keep it taught and leave no next topic selected; do not advance automatically. |
| Teacher corrects a topic state in an active classroom | Allow the manual correction, including undoing `Dado`, without altering grades or submitted attempts. |
| Student tries to change topic states | Deny the change and preserve the plan states. |
| Classroom Muro is displayed | Show text publications newest first and each thread's text replies oldest first; provide no attachments, reactions, pinning or private messaging in V1. |
| Author edits or removes their own Muro content | Allow only with current classroom access and in an active classroom; removal requires confirmation. |
| Teacher moderates a student's Muro content | Allow removal with confirmation, not rewriting the student's text. |
| Parent publication is removed | Keep a removed-content marker and preserve other authors' replies in the thread. |
| Student tries to edit or remove another author's Muro content | Deny the change without altering that content or its replies. |
| Student receives academic notifications | Include teacher notices, new activities, deadline changes, published/corrected grades, reopened attempts and replies to their own publications, scoped to their classroom access. |
| Teacher receives academic notifications | Include new submissions, student queries and replies to the teacher's own publications, scoped to the classroom they teach. |
| User opens the notification center | List notifications newest first and offer marking them as read; do not email every academic event. |
| User opens a notification after losing access to its classroom or target | Deny unauthorized target access; the notification does not restore membership or grant private-record access. |
| Teacher has not published a grade | Student does not receive it as a final result. |
| Teacher publishes a questionnaire/evaluation result | Show that student's submitted answers, per-question earned points, final grade and teacher feedback only; TP publication uses its overall grade/feedback policy. |
| Student views a published result | Do not automatically expose the full answer key, unselected correct options or other students' answers/grades. Teacher feedback may explain the solution. |
| Teacher corrects a published grade | Require a reason, preserve old/new grades with timestamp and actor in a teacher-only audit, notify the student and recalculate averages using the corrected effective grade. |
| Teacher tries to correct a published grade without a reason | Reject the correction without changing grades, history or averages. |
| Teacher corrects a published grade | Preserve the student's answers and the locked activity content/scoring criteria; do not count another grade for the same activity. |
| Notes 8 and 6 are published, another is pending | Student average is 7; pending work is not zero. |
| One student has notes 10 and 10; another has one note 4 | Classroom average is 7: mean of individual averages 10 and 4, not pooled mean 8. |
| No published grades exist | Show a no-grades state. |
| Calculated final grade is 6.666… | Publish 6.67 after summing unrounded question scores. |
| Average is calculated | Use published grades and round only the resulting average to two decimal places. |
| Teacher tries to create an empty evaluation or a question with zero/negative available points | Reject the invalid evaluation without creating it. |
| Student earns zero points on a question or zero as the final grade | Permit a genuine zero result; do not confuse it with invalid available points or a missing grade. |
| Mobile width is narrow | Content reflows without shrinking desktop tables; global navigation remains reachable. |

Implementation must also validate forbidden operations through public interfaces and ensure rejection does not modify data. Image review is not a substitute for these functional checks.

## 16. Remaining decisions and implementation boundary

The user's 22-question functional questionnaire is resolved with the selections below. These choices are incorporated into the relevant sections; they are not authorization to implement or install anything.

| Question | Choice | Confirmed decision | Section |
|---|---|---|---|
| Q1 | A | `Enseño` and `Estudio` blocks in Mis Aulas and Home | 4 |
| Q2 | B | All classroom fields, plan and at least one unit/topic required | 5 |
| Q3 | A | Free-text Materia and División | 5 |
| Q4 | B | Teacher selects a predefined illustration; no cover upload | 5 |
| Q5 | A | Private recoverable classroom-creation draft | 5 |
| Q6 | A | Editable classroom metadata and versioned study plan; fixed timezone | 5 |
| Q7 | A | Add/rename/reorder; constrained deletion of unused pending topics and empty units | 5 |
| Q8 | B | Generic enrollment errors; remain in form, no redirect; invited email must match | 3 |
| Q9 | B | 16–128-character password; verification 1 h; recovery 15 min; single-use links and resend controls | 3 |
| Q10 | A | Private activity drafts and explicit publication | 8 |
| Q11 | A | TP instructions as observations, PDF/DOCX or both; at least one | 8 |
| Q12 | B | Teacher configures whether TP attachments are mandatory | 8 |
| Q13 | B | Two or more options; one correct for single-choice, at least two for multiple-choice | 8 |
| Q14 | A | New attempt prefills previous answers/attachments without overwriting original or copying grade | 8 |
| Q15 | B | All attempts newest first; unfinished reopening preserves prior effective result | 8 |
| Q16 | C | Correction audit teacher-only; student gets corrected grade and notice | 9, 11 |
| Q17 | A | Preserve previous obligations; absence-created activities use re-entry eligibility | 11 |
| Q18 | A | Muro full name and automatic initials; no email/public profile/avatar upload | 6 |
| Q19 | A | No extra aggregate cap beyond 5 × 50 MB, subject to quota | 7 |
| Q20 | A | Confirmed drafts do not expire; incomplete abandoned uploads cleaned after 24 h inactivity | 7 |
| Q21 | A | Containerized supporting services; frontend/backend on host; captured local email and real scan | 14 |
| Q22 | A | Moderate text limits, validation errors instead of truncation | 5 |

### Remaining technical preparation and deferred production decisions

- Select concrete local tools/versions and verify scanner integration, inspection limits and resource requirements. These must enforce, not bypass, the functional rules.
- Specify screen layouts and loading/empty/error/confirmation details against these confirmed behaviors during design; screenshots are not functional evidence.
- Hosting, paid plans, budget, cloud providers and numerical production storage quotas are deferred until after local validation.
- The current 29 reference screenshots are present in `docs/references/` and linked from the visual index. Standalone logo/illustration/cover assets remain a separate preparation concern. Missing screenshots do not block design; local references are not evidence of an implemented UI.

Suggested implementation order, not an execution authorization:

1. Accounts, verification, recovery and profile.
2. Classrooms, classroom-scoped permissions and enrollment.
3. Plan, Library and Muro.
4. Activity authoring, answer drafts and submissions.
5. Grading, publication, individual summaries and progress.

**Current completion boundary:** functional specification and visual reference inventory. No application scaffolding, dependency installation, backend, database provisioning, deployment or delivery has been authorized by this document.

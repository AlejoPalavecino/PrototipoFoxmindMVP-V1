# Private teacher correction

P8 T1 adds an exact-scoring private correction workspace for submitted practical assignments, questionnaires and evaluations. It does not publish results, replace the effective grade, notify students or create a published-grade correction audit. Later P8 units own those transitions.

## Teacher workflow

1. Open **Actividades → Ver entregas recibidas → Corregir intento**.
2. Review the preserved submitted answer or private attachment. Objective scores are recomputed by the server from locked answer keys.
3. Enter manual development points or one overall practical-assignment grade, with optional feedback. Empty manual fields remain pending; zero is a valid score.
4. Choose **Guardar corrección privada**. Reload restores the saved correction without publishing it. An archived classroom or already-published grade is read-only here.

## Contracts and precision

| Boundary | Behavior |
|---|---|
| `GET /classrooms/:room/attempts/:attempt/grading` | Current classroom teacher only; submitted attempts only, including former students. Read-only preview never inserts a grade. |
| `POST` on the same path | Classroom revision CAS; private grade only; rejects archive, stale revision and published edits. Strict decimal-string inputs, unknown fields and forged objective points are rejected. |
| Body | `revision`, `overallGrade` (decimal string or null), `questions` (questionId, nullable manual points, optional feedback), optional `overallFeedback`. Non-TP overallGrade must be null; TP questions must be empty. |
| Objective scoring | Exact match or `P × S / C`; any wrong selection gives zero for that question only. No intermediate rounding. |
| Manual values | Canonical unsigned decimal text with at most two decimals; development points cannot exceed available points, TP grades range 0–10. |
| Final preview | Sum exact normalized BigInt fractions, scale to 0–10, round half up once to two decimals. JSON contains decimal/integer strings, never BigInt. Spanish UI shows `8,35` and `8,50`; no automatic pass/fail policy. |
| Pending representation | Additive migration9 makes both question-score columns jointly nullable. NULL/NULL preserves private feedback while pending; 0/1 is an actual zero. Existing finite/integer/nonnegative numerator and positive denominator checks remain. Half-null pairs are rejected. |

Private writes leave answers, scoring keys, files/custodies, receipts/timeliness, effective-grade pointers, audits and notifications unchanged. Students continue to receive the pre-P8 safe history/receipt DTO, not private correction data. The teacher remains authorized for preserved submitted records after a student leaves; current membership is not required for that teacher history.

## Verification and handoff

Focused coverage lives in `tests/p8-scoring.test.mjs`, `tests/p8-grading*.test.mjs` and the real browser/API/SQL/private-file fixture. The attributed [worker record](../../work-log/2026-10-18-p8-t1-private-grading-worker.md) retains exact observed outcomes, historical fixture failures and pending checks.

T2 must explicitly publish a complete correction, reject any pending question pair, atomically maintain one effective grade per student/activity, and construct a safe own-student result DTO. It must not bypass this private-state boundary or reuse the teacher's answer-key-bearing DTO. T3 owns reasoned published-grade changes and teacher-only audit; T4 owns progress.

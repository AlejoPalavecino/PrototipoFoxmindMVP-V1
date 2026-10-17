# Authenticated password change

`POST /api/v1/account/password` accepts only `currentPassword` and `newPassword`.
It requires a persisted verified session, the configured Origin and a fresh
session-bound CSRF token. Passwords retain raw spaces and Unicode code points;
the existing 16–128 code point policy applies to both fields.

The maintained password service verifies and hashes outside the transaction.
The commit then locks the user and rechecks the active session, verification and
the observed password hash. Concurrent logout, recovery or password changes
cannot restore a stale session or credential. Success atomically updates the
hash, revokes all old sessions and creates a replacement current session. Its
cookie and CSRF binding rotate while its original absolute expiry is retained.
Authorized activity renews idle time. No automatic account verification occurs.

The existing password-change budgets count attempted valid requests: 20 per IP
and 5 per user in 15 minutes. Forwarded headers do not change the socket IP.
Wrong current-password proof returns `401 AUTHENTICATION_FAILED`; rejected
requests do not change credentials or rotate sessions. Responses are no-store.

Verification runner: `node scripts/test-p33-password-change.mjs
--group=<core|guards|ip|races>`. Four fixed groups cover 11 public HTTP/SQL cases
using owned temporary PostgreSQL and captured mail. The build-once P3 pipeline
includes every group. Current observed results are recorded in the
[P3 coordinator record](work-log/2026-10-17-id-unavailable-p3-completion.md).

Risk: items 2/4 — credentials, persisted session authorization and concurrent
credential changes. No schema migration or P4/P5 integration is included.

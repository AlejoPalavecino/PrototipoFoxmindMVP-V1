# P6 Muro and personal notifications

Muro provides classroom-visible plain-text publications with grouped replies. The existing account/session, CSRF, classroom membership, archive and optimistic-revision boundaries remain authoritative. This unit adds no activity authoring, grades, private messages, attachments, reactions, pins or academic emails.

## User path

1. Open an enrolled/taught classroom from `Mis Aulas`, then select `Muro`.
2. Teachers use `Publicar aviso`; current students use `Publicar consulta`. The server chooses the publication type from the current classroom relationship, never a submitted global role.
3. Use `Responder publicación` to add a grouped reply. Authors can edit their own text. Authors and the classroom teacher can explicitly confirm removal; a teacher cannot rewrite another author's text.
4. Open `Notificaciones` in the existing application header. Each item supports `Marcar como leída` and `Abrir publicación`. Opening switches to the actual classroom's Muro thread and focuses the publication/reply, rather than navigating to a placeholder URL.

Authors are represented by first/last name and generated initials only. The existing account/profile/logout and classroom-creation flow are retained; no public profile, email disclosure or avatar upload is added.

## HTTP contracts

All paths below are relative to `/api/v1/classrooms`. The Next proxy and API explicitly allow these methods and envelopes; ordinary P3 ingress admission and repeatable transactional identity checks still apply. Mutations require the existing Origin/session-bound CSRF policy.

| Method and path | Body / result |
|---|---|
| `GET /:classroomId/wall` | `{ revision, posts }`; newest publications first, each with oldest-first `replies` |
| `POST /:classroomId/wall` | `{ revision, operation }`; returns the new classroom `{ revision }` |
| `GET /notifications` | Current user's eligible P6 items, newest first, with `readAt` and scoped target IDs |
| `POST /notifications/:notificationId/read` | `{}`; returns `{ read: true }` |
| `POST /notifications/:notificationId/open` | `{}`; marks read and returns `{ classroomId, postId, replyId }` after current permission checks |

`operation` is exactly one of:

```json
{"action":"publish","body":"Plain text\nwith multiple lines"}
{"action":"reply","postId":"<uuid>","body":"Plain text"}
{"action":"editPost","id":"<uuid>","body":"Updated text"}
{"action":"editReply","id":"<uuid>","body":"Updated text"}
{"action":"removePost","id":"<uuid>","confirm":true}
{"action":"removeReply","id":"<uuid>","confirm":true}
```

Unknown/forged keys, wrong shapes, invalid IDs/actions and false/missing confirmations are rejected, not ignored. Input validation uses `INVALID_INPUT` (400), scope/authorship denial uses `FORBIDDEN` (403), and archived/stale/already-removed conflicts use `CONFLICT` (409). Existing trusted identity errors retain their P3 semantics. Transport bounds remain 512 KiB requests, 2 MiB responses and the existing deadlines.

## Data and concurrency rules

| Concern | Rule |
|---|---|
| Plain text | Required, at most 5,000 Unicode code points; LF/CR/tab and literal markup are preserved. Reject empty/whitespace-only text, other C0/C1 controls, unpaired surrogates and overflow. Never trim/truncate or interpret HTML. React escapes text nodes. |
| Stable order | Publications: `created_at DESC, id ASC`. Replies: `created_at ASC, id ASC`. |
| Removal | Keep the row/thread, set `body=NULL`, `removed_at` and server-selected `removed_by_id`; return a `Contenido eliminado` marker. Never cascade-delete replies. |
| Removed parent | No new replies or restoration/editing of the removed publication. Surviving reply authors may still edit/remove their own text; teacher moderation remains possible. This preserves visible history without reopening a removed conversation. |
| Current access | Former/foreign/unverified accounts cannot read or write Muro. Archived classrooms remain readable by current members but all content writes/capabilities are disabled. |
| Concurrent writes | Reuse the existing user/classroom locks and shared classroom revision. A matching revision is required; content, notifications and revision advance commit in one transaction. No P7 editor locking is introduced. |

No Prisma schema or migration is needed: the existing `wall_posts`, `wall_replies` and `notifications` tables already model the behavior. Historical migrations remain unchanged, with the Library migration still the eighth migration.

## P6 notification scope

| Event | Recipients |
|---|---|
| `WALL_NOTICE` | Current students of that classroom, excluding the author |
| `WALL_QUERY` | That classroom's teacher, excluding the author |
| `WALL_REPLY` | Parent publication's author, provided they still teach/belong to the classroom, excluding self-replies |

Insertion uses the same locked content transaction, a current-membership `EXISTS` query and event/target/recipient deduplication. Edits/removals do not create another notification; other thread participants are not implicitly subscribed. Library publication does not create an invented event. Existing invitation/verification/recovery emails are unchanged.

List/read/open validate recipient, current classroom relationship and the P6 target join, including matching the reply to its actual parent. Revoked membership removes old items from the accessible list and denies direct read/open without mutation. Accessible tombstones can still be opened as historical thread markers. Marking a personal notification read is permitted in archived classrooms and does not advance the classroom content revision. Read is idempotent; its first timestamp is retained.

## Verification and remaining acceptance

```powershell
node scripts/build-api.mjs
node --test --test-concurrency=1 tests/p6-wall.test.mjs tests/p6-notifications.test.mjs tests/p6-wall-client.test.mjs
node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json --noEmit
node node_modules/typescript/bin/tsc --project apps/classrooms-ui/tsconfig.json
```

The focused suite exercises owned PostgreSQL, the public domain service, direct API and Next proxy, controlled client transport, and the actual React text renderer. It checks rejected-command persisted-data invariants, transactional notification rollback, role changes across classrooms, tombstones, concurrent revisions and revoked access. Controlled identity injection in domain fixtures is NOT actual P3 authentication acceptance. The coordinator owns real P3/browser/API/SQL/mail/storage/persistence integration and independent whole-P6 verification before publication; see [feature tasks](../../../odd/tasks/p6-teaching.md) and [writer evidence](../../work-log/2026-10-18-p6-wall-implementation.md).

Risk: items 1, 2, 3 and 4 (persisted tombstones/read flags, scoped authorization, new shared transports and serialized revisions).

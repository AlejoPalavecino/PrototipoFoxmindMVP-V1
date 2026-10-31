# P4 file HTTP contract — integrated host

`createFilesHandler(service)` is integrated in the Nest host when the accepted file configuration and session/admission/record bridge are supplied. See the [integrated host guide](../engineering/files/host.md). No anonymous, public, presigned or direct-S3 route exists. The original request is forwarded to the required access adapter.

| Method/path | Input | Success |
|---|---|---|
| POST `/files` | JSON `{scope:{kind,id},purpose,name,bytes,targetId?}` | 201 file status; quota reserved |
| PUT `/files/:id/content` | `application/octet-stream`; exact admitted Content-Length | 200 status after durable validation/clean scan |
| GET `/files/:id` | No body/query | 200 current status |
| GET `/files/:id/content?mode=download` | Optional mode: download or preview | 200 authorized bytes with safe headers |
| GET `/files/usage?kind=classroom&id=…` | Exactly one kind/id; kind also permits draft | 200 usage/quota/available decimal strings |

IDs are UUIDs. Purposes are plan/instructions/material/attachment; instruction/attachment target IDs are mandatory and must resolve to the actual authorized activity/attempt. Draft scope admits only a plan. Unknown fields, duplicate query parameters, compressed bodies, invalid metadata and GET bodies are rejected. Metadata is bounded to 16 KiB; transfers to the admitted count with a 10-second absolute receive deadline and one retained transfer per handler. No unbounded upload queue is accepted.

Status contains id/name/sizeBytes/ready/upload/validation/scan/rejectionCode. It never includes keys, object URLs, credentials, tokens or signature details. Ready requires completed upload and matching approved/clean digest proof. Quarantined files cannot be downloaded or linked. Retry uses identical bytes; it cannot overwrite a file.

All responses use no-store/nosniff. File responses include exact length, RFC 5987 disposition, same-origin resource policy and sandbox CSP. PDF/JPEG/PNG preview may be inline. Office/ZIP always remain attachments, even with mode=preview. Browser download fallback for an unavailable viewer is described in the [web integration guide](../engineering/files/web.md).

Errors are JSON `{error:{code}}`; internal driver/parser/scanner text is never returned.

| HTTP | Codes |
|---|---|
| 400 | INVALID_UPLOAD |
| 403 | FORBIDDEN |
| 404 | NOT_FOUND |
| 409 | FILE_NOT_READY, UPLOAD_CONFLICT, QUOTA_EXCEEDED |
| 413 | FILE_TOO_LARGE |
| 415 | FILE_TYPE_NOT_ALLOWED |
| 422 | FILE_REJECTED |
| 503 | SERVICE_UNAVAILABLE with positive Retry-After |

Quota exhaustion preserves authorized reads. Scanner/storage failure never returns confirmation success or speculatively releases quota. Cleanup is an internal bounded service operation; there is no HTTP cleanup/delete route. Confirmed drafts and history are preserved. Actual P3 cookie/session/CSRF and P5/P7 record controls remain required for integration. See [operations](../private-files.md).
## Bounded response delivery

An installed file handler shares one transfer slot across PUT uploads and GET content responses. Content retrieval holds it until response finish/close/error, including time spent under backpressure. A second transfer receives503 with Retry-After3. A stalled response is destroyed after an absolute30-second output deadline and the slot becomes available again. Install one handler per file service ingress; direct FileService consumers own the lifetime of buffers they retain.

If the client disconnects while the bounded storage read is pending, the handler releases admission when that read settles, without starting another30-second output wait or attempting to send into the destroyed response.

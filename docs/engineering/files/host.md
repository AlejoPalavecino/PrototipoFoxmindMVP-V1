# Private files application host

The API can compose the existing P4 infrastructure with accepted P3 identity. Files remain disabled when `FILES_ENABLED` is absent. Set it to the exact value `1` and provide every setting below to enable `/api/v1/files` and its existing child routes. Malformed or incomplete enabled configuration stops startup.

| Environment setting | Required value |
| --- | --- |
| `FILES_S3_ENDPOINT` | HTTPS endpoint, or HTTP on loopback; no credentials, query, fragment or non-root path |
| `FILES_S3_REGION` | Storage region |
| `FILES_S3_BUCKET` | Private bucket name |
| `FILES_S3_ACCESS_KEY_ID` | Trusted storage access key |
| `FILES_S3_SECRET_ACCESS_KEY` | Trusted storage secret |
| `FILES_SCANNER_HOST` | Loopback ClamD host |
| `FILES_SCANNER_PORT` | Integer from 1 through 65535 |
| `FILES_DRAFT_QUOTA_BYTES` | Explicit nonnegative decimal bigint in bytes, at most PostgreSQL's signed bigint maximum |

There is no production draft-quota default. Classroom quotas remain persisted per classroom. These settings are read from the supplied environment; the module does not read or create environment files, buckets or credentials.

## Authentication and authorization

The host mounts one file handler at `/api/v1` before Nest's ordinary body parser. Express supplies the relative `/files` path while preserving the original request and unread binary PUT stream. Non-file routes continue to the P3 transport and application.

Ingress resolves the real session cookie and calls P3 general admission once per HTTP request, including anonymous, CSRF-denied and otherwise rejected requests. POST and PUT require the exact configured Origin and a CSRF token bound to the active session. No user-ID or global-role headers grant access.

The shared persisted session query reuses the established verifier digest and fixed absolute/idle policy. File authorization reads through the existing `FileTransaction`; it never opens a second independent identity transaction. Repeated authorization has no counters or session-lifetime writes. The existing file store checks the current verified account, locks user before scope, then checks current membership, ownership, archive state and record links. It revalidates after lock waits and external I/O. File reads, polling and rejected requests do not renew either session deadline.

The existing restrictive domain resolver remains installed. Attempt attachment writes are denied until P7 supplies its editor/deadline/count policy. This composition does not implement P5 publication or enrollment, P6 product flows or P7 attempts.

## Errors and lifecycle

File errors include a public request ID matching `X-Request-Id`. Trusted identity rejection preserves 401/403/429 and applicable `Retry-After`; unrelated SQL/storage failures retain sanitized file errors. Responses never include driver errors, session verifiers or storage credentials.

The integrated module shares the application's Prisma and IdentityRuntime providers. It constructs one file service and one nonoverlapping cleanup worker. The root module drains both identity mail and file cleanup before imported Prisma teardown, then closes owned storage resources. Repeated shutdown is idempotent. Application construction failure also closes allocated file infrastructure. Standalone `FilesModule.register(options)` remains supported for isolated callers.

## Checks

After a successful API build:

```powershell
node scripts/build-api.mjs
node --test tests/p4-host.test.mjs tests/p4-session-bridge.test.mjs
```

The focused tests exercise the mounted HTTP boundary with controlled trusted ports, binary preservation, admission/error behavior, transaction-local session semantics and cleanup ownership. They complement the coordinator's real PostgreSQL/S3/ClamAV and P3 regression checks; they do not prove those external services or future product flows.

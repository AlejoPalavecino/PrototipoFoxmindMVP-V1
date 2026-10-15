# Dependency security remediation

The targeted remediation keeps Prisma CLI/client/adapter at7.10.0 and replaces the two vulnerable transitive packages through version-scoped npm overrides. The full audit now reports **0 vulnerabilities**. Writer and independent compatibility checks passed against a fresh lockfile installation. Native candidate review/disposition is the remaining closure step.

## Versions and scope

| Parent branch | Previously resolved | Target override | Reason |
|---|---|---|---|
| `@prisma/config@7.10.0` | `deepmerge-ts@7.1.5` | `8.0.2` | Recursive object graphs could exhaust the JavaScript stack. |
| `prisma@7.10.0` | `mysql2@3.15.3` | `3.24.6` | Cleartext authentication downgrade and unbounded compressed-packet inflation advisories. |

The baseline full audit returned exit1 with four high entries: two affected leaf packages and propagation through Prisma/config. No advisory is hidden or excluded, and Prisma is neither force-downgraded nor replaced with a prerelease.

The deepmerge override crosses a transitive major version deliberately. Version8 changes deep Map merging and some type names; this project uses Prisma's ordinary configuration merger, not custom Map semantics or those renamed type APIs. Compatibility must be checked through the actual CLI configuration path and all existing build/database commands, not assumed from the version number.

## Repeatable checks

```sh
npm run audit:security
npm run test:dependencies
npm run api:build
npm run test:api
npm test
```

`audit:security` runs plain `npm audit`: all installed dependency classes and severities are included, with no `--omit`, exclusions or vulnerability allowlist. A nonzero exit remains a failure; network failure is not a clean result.

`test:dependencies` resolves the exact merger used by `@prisma/config`. It exercises all four affected public merge APIs with ordinary configuration and with the advisory's recursive inputs. Ordinary merge results must remain compatible. The current recursion assertions exclude RangeError/stack-exhaustion failures but accept other exception types; they do not prove recursive-result correctness or strictly deliberate rejection. An unrelated TypeError could pass that assertion. The independent verifier recorded this as a non-blocking test limitation. Actual Prisma configuration loading and existing API/database suites provide project-specific compatibility evidence, not complete upstream or hypothetical MySQL runtime coverage.

Tests use only owned disposable PostgreSQL containers. No schema/migration changes, development data resets or service reconfiguration belong to this dependency fix.

## Observed evidence

- Baseline audit: exit1, four high alerts.
- Before remediation: four ordinary merge tests PASS; four recursion tests FAIL with `RangeError` (exit1).
- Installation and full `audit:security`: exit0,0vulnerabilities (job19).
- Writer regression command: exit0 (job20),8/8dependency tests, api:build,7/7HTTP tests,38/38database contracts, migration replay/status/drift and Prisma runtime smoke PASS.
- Fresh lockfile installation: `npm ci --ignore-scripts --cache .npm-cache`, exit0,0vulnerabilities (job21).
- Independent verification: PASS forR1–R4 on staged snapshotf2816487f1437d49225ccc8a6b82685e5909c10f; audit0, security8/8, build, HTTP7/7 and database38/38 plus migration checks/smoke all exit0, each once. Logs: `.test-artifacts/security-verify-S2KAx5/verifier-{audit,security,build,api,database}.log`.
- Independent limits: MySQL remediation is supported by version/advisory evidence rather than MySQL runtime tests; snapshot identity/preservation evidence supplied by parent; no exhaustive security or production-readiness claim.
- Parent final dependency regression and diff spot checks: PASS. Native candidate disposition: pending.

## Maintenance

These overrides are a temporary compatibility responsibility. Their parent versions are pinned: if Prisma changes its dependency tree, re-evaluate rather than silently extending the overrides. Remove an override only after Prisma itself resolves a corrected version and the complete audit and compatibility suite still pass. Keep the lockfile committed; fresh clones should use `npm ci --ignore-scripts`.

Zero known advisories at one scan is not a guarantee of zero vulnerabilities or production readiness. Re-run the audit as advisories evolve; authentication, classroom authorization, operational hardening and deployment still require their own implementation and verification.

## Primary sources

- [Deepmerge stack exhaustion advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx).
- [Deepmerge8 compatibility changes](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0).
- [MySQL cleartext authentication advisory](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr).
- [MySQL compressed packet inflation advisory](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3).

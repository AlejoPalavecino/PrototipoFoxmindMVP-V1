# P3 web dependencies — completed local installation

- Agent / role: `/root/recovery_verify`, delegated installation (not independent verification).
- Actual task identity: `/root/recovery_verify`.
- Persisted by: parent coordinator `/root`, from the returned report.
- Date: 2026-10-17.
- Branch: `feat/p33-token-flows`; root workspace.
- Starting commit: `0fd271cf4d2b9186b23a12525f1668efd886612f` with retained local work.
- Phase/specs: P3.4, [P3 completion S1–S4](../../odd/tasks/p3-completion.md).
- Status: completed (dependency installation; browser installation separate).

## Scope and changes

Changed root `package.json`, `package-lock.json` and installed dependencies.
Added exact production pins next16.4.2, react/react-dom19.3.1,
class-variance-authority0.7.1, clsx2.1.1 and tailwind-merge3.7.0. Added exact
development pins tailwindcss/@tailwindcss/postcss4.3.3,
@types/react/@types/react-dom19.3.0 and @playwright/test1.64.1.

## Observed checks

- Production installation: actualexit0/78078ms.
- Development installation: actualexit0/24209ms.
- Explicit `npm audit --json`: actualexit0/3380ms, zero vulnerabilities.
- All15 original direct versions preserved; six critical API entrypoint hashes
  match the baseline captured before the final install. No earlier hash
  baseline exists, so this is not a claim about all prior installed bytes.
- Original overrides and scripts unchanged by this actor. Parent later adds
  documented web commands separately.
- Owned npm PIDs46360/6692/44640 exited and absence was verified.

Evidence: `.test-artifacts/p3-install/final-report.json` and separate
production/development/audit streams. Manifest actor delta11added lines;
lockfile1852additions/135deletions.

## Failed attempts and limits

Earlier180/360s attempts timed out during real extraction and had exact owned
process cleanup. They remain failures. Registry access and audit were working;
Next's8690file tarball and measured extraction rate explained the longer
installation-only900s ceiling. The final action completed in78s. No product
deadline, global settings, script approval or credential file was changed.
Existing Prisma allowScripts warnings remain explicit; actual fresh API builds
are separate compatibility evidence.

## Handoff

Root compilation window released. Playwright1.64.1 requires Chromium1248;
existing1223/1234 caches are insufficient. The actor is separately installing
the matching official browser while preserving older caches. No application
acceptance, source verification, commit or publication is inferred here.

## Matching browser outcome

The separate direct Playwright `install chromium` action completed0/235468ms.
It installed official Chromium1248 and headless-shell1248, browser156.0.8078.4,
plus required FFmpeg1013. A process-local garbage-collection skip preserved all
existing1223/1234/FFmpeg1011/winldd1007 caches without a global setting change.
The actual headless about:blank launch/connect/close smoke completed0/9964ms.
Installer37080, smoke25792 and browser44084 exited and absence was verified.
No root manifest, package or source writes occurred in this browser action.
Evidence: `.test-artifacts/p3-browser-install/{install,smoke}.*` and
`smoke-result.json`. Browser availability is not application acceptance.

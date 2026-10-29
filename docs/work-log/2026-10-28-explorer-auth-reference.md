# Login and registration reference — exploration completed

- Agent / role: /root/explorer, read-only bootstrap.
- Task ID: /root/explorer; persisted by /root from its returned report.
- Date: 2026-10-28.
- Branch / worktree: codex/inicio-reference-astra; isolated foxmind-inicio-astra.
- Starting commit: 95c7cb26407ef6bfc77d5faa1ee9c3caf917dfda; clean initially, coordinator record appeared concurrently and was preserved.
- Phase/task: [Selected auth references](2026-10-28-root-auth-reference.md), existing P3 accounts contract.
- Status: completed.

## Inspection and findings

Read instructions, roadmap, work-log protocol, functional spec section 3, account/registration contracts, auth history, components/styles/assets and focused tests. Pages sign-in.tsx and register.tsx render AccountScreen. Presentation lives in account-flow-forms.tsx, account-field.tsx, account-view.ts, account-navbar.tsx and shared-ui/AccountStory.tsx. Preserve AccountStory's non-polished branch for recovery. auth-polish.css and auth-responsive.css are overridden by workspace-account.css and sky-theme.css imported later.

Login sends email/password. Registration sends firstName/lastName/email/password; names are separate required values, maximum 80 Unicode code points each. Passwords remain 16–128 Unicode code points without trimming, normalization or invented symbol constraints. Email stays textual with inputMode=email to support quoted/international mailboxes. Preserve generic registration acceptance, verification flow, bounded next destinations, locks, cooldowns, status focus and post-request password clearing. Password visibility already exists with accessible button semantics.

Forgot-password is supported. Remember-me and OAuth are excluded by current contracts; no terms/privacy routes or acceptance mechanism were found. Do not derive new API fields or dead controls from the visual references.

## Verification and handoff

No tests, build, browser, server, services, edits or commits performed. Engram current/context/search read operations succeeded; no memory writes. Initial guessed paths/globs failed and were corrected using actual file discovery.

Recommend existing p3-web-client, p3-web-proxy and foxmind-3d-flows-account tests, strict web types and isolated build. platform-polish harness renders real AccountScreen with synthetic responses; do not claim authenticated E2E. Legacy visual assumptions in entry-glass-client/folder-platform may predate this task. Two p3-web-client tests require FOXMIND_WEB_TEST_ORIGIN and otherwise skip.

Next: architect defines bounded visual contract; worker implements presentation; test_runner verifies desktop/mobile, focus, toggle, next navigation and controlled state behavior without real account mutation.

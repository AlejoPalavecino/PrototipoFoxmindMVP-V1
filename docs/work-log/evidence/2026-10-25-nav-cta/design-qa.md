# Private navigation and Home entry CTA — visual QA

- final result: passed
- Tester: /root/nav_cta_test; reviewer: /root/nav_cta_review; persisted by coordinator /root, 2026-10-25, main starting297e418. Both child roles are read-only for documentation.
- Scope: existing private navbar/drawer palette and Home Create/Join styling; no product behavior changes. RED N/A for reversible CSS; no implementation-mirroring tests added.

## Rendered proof

Actual Home/AppNavbar/application CSS in the existing isolated typed None fixture harness53271; no real authentication, account, API/database write or public-header visual claim. [Baseline](baseline-1536.png), [final desktop](final-desktop-1536x1024.png), [navigation focus](final-nav-focus-1536x1024.png), [mobile390](final-mobile-390.png), [mobile320](final-mobile-320.png), [drawer390](final-drawer-390.png), [CTA focus](final-cta-focus-1536x706.png) were captured as native browser pixels and inspected.

Final desktop1536×1024, mobile390×844/320×844, drawer390×844; CTA-focus view1536×706 is a focused evidence viewport, not a full-height mobile claim. DPR1.25, root/body CSS zoom1; outline source3px computed2.4px, visible with measured contrast. Exact cause of fractional outline is not attributed. No pixel-identity, physical-device or full-WCAG claim.

Observed navigation18px/600 with24px icons inheriting label color; current state burnt orange/peach and hover warm-neutral. CTA minimum52px, radius16, weight700,24px icons, stacked on small screens. No horizontal overflow at1536/390/320 and no visible overlap/clipped controls. [Metrics and action proof](final-proof.json) preserve actual values.

Independent corrected contrast calculations: inactive9.28:1; active6.15:1; Create6.24:1; Join11.55:1; navigation focus4.15:1; CTA focus5.64:1. Reviewer caught an initial evidence-calculation error that compared a background against white instead of the actual orange/alpha-composited colors. Tester corrected final-proof.json; reviewer recalculated and reread it. Initial overestimated values are not accepted evidence.

## Interaction and regression checks

Create/Join callbacks2/2 correct; drawer navigates Agenda and closes, Escape returns focus to opener and Tab remains inside the modal. Hover and current states remain distinct. Reduced motion yields transition/animation0s. Disabled/busy was not visible in this fixture; static review verifies existing opacity.6 and enabled-only hover without pretending to have a runtime disabled-state test. Public minimal-header preservation is source-scoped, not freshly visually exercised.

Before and after: node --test --test-reporter=dot tests/home-polish-presentation.test.mjs →4PASS/0FAIL each; these are existing state/date/retry checks, not CSS tests. Worker parsed all3CSS leaves with PostCSS8.5.23 and diff-check PASS. Root copied only those leaves into the already isolated current source build and observed final Next production build exit0 within180s, TypeScript1741ms and compile716ms,5.58s command wall; live .next untouched. Inherited multiple-lockfile root advisory remains.

Reviewer personally inspected baseline/final desktop, focus views, both mobile views and drawer, checked final diff/hash freeze and independently recomputed contrast; LGTM_SIN_HALLAZGOS,0findings. Frozen CSS blobs: shared4f05ef33bb549b45572840df7ca41dec7cccd88c, HomeShell41db1631bb89c0af7b6b9191d88b294f6e650c83, HomeLayout195bc2aeeaef529c93824f5cac104930eaac94f7. No TSX/tests/auth/routing/env/schema change.

QA Space qa-nav-cta(id5) finished exactly once with no kept pages. Only own harness PTY20213/listener53271 was stopped; live user52171/API52170 remained intact. Failed Windows-glob reads were retried with directory/-g paths; no product failure was hidden. Runtime identity unavailable; no attributed Engram write performed. Coordinator owns local delivery, without push or deployment.

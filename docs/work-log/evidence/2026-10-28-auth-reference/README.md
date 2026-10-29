# Login/register reference QA — 2026-10-28

final result: passed — bounded synthetic real-component verification.

Agent `/root/test_runner`; starting/final observed HEAD `95c7cb26407ef6bfc77d5faa1ee9c3caf917dfda`, branch `codex/inicio-reference-astra`. [Work record](../../2026-10-28-test_runner-auth-reference.md). Real AccountScreen and application CSS/PostCSS run in an anonymous local fixture at127.0.0.1:53193. No upstream, persistence or real account operation.

## Reference comparison

Both sources and captures were opened together with the image viewer, at original dimensions. The selected cream split composition, orange actions, rounded typography and fox artwork are present. Unsupported OAuth, remember-me, strength meter and legal claims in the supplied mockups were deliberately excluded by the product contract; existing16–128-character policy, recovery and generic verification feedback remain.

| View | Source | Final |
| --- | --- | --- |
| Sign-in887×884 | [Reference](login-reference.png) | [Capture](sign-in-887-final.png) |
| Register885×884 | [Reference](register-reference.png) | [Capture](register-885-final.png) |
| Desktop1440×900 | — | [Sign-in](sign-in-1440-final.png), [register](register-1440-final.png) |
| Mobile | — | [Sign-in320×640](sign-in-320-final.png), [register390×844](register-390-final.png) |

Ego rounds the885px register request to886px; screenshot pixels were not rescaled. Initial captures exposed benefits over the fox's ear/forehead and artwork bands. Final art sizing and compact benefits resolve those P2 findings. Residual P3: the headings and benefits are more compact than the mockup; low-height notebook art has tight clearance near the ear, while text and face remain unobscured. No unresolved P0/P1/P2 issue observed.

## Observed verification

- [Responsive matrix](responsive-final.json):16 states across both references,1440×900,1366×768,1024×768,760×700,390×844,320×640 and640×360. No horizontal overflow or clipped headings/buttons; inputs16px with48px height; interactive targets at least44px within fractional rounding. Story hides at760px and below. Keyboard focus and scroll reachability passed at640×360.
- [Final notebook/source smoke](notebook-final.json): six rechecks after the last CSS change at both references,1024×768 and1366×600;48px fields and reachable submit. Low-height layouts scroll vertically. Notebook images inspected in the temporary artifact directory.
- [Behavior receipts](behavior.json): exact invitation `next` retained through both header links; keyboard password toggle preserves value/FormData with zero submits; required field names/autocomplete intact; generic registration202, safe login401/503, notice focus, password clearing, busy lock and cooldown reset on navigation.
- [State receipts](states.json): loading/session failure/retry,429 Retry-After60 lock, keyboard order and recovery link. The first programmatic focus has no keyboard ring; actual keyboard focus ring was separately verified in the final matrix.
- New navbar tests observed RED2FAIL/1PASS, then GREEN3PASS. Existing baseline18PASS/0FAIL/2opt-in browserSKIP. Coordinator independently reported final21PASS/0FAIL/2opt-in SKIP and isolated production buildPASS.

## Scope and retained preview

Space37 was created for this task and finished once with its result page retained at synthetic sign-in887×884. Old finished Spaces were not reused. A minimized-window capture failure was repaired by coordinator restoring the same Ego window; subsequent screenshots succeeded.

This is frontend fixture evidence, not authenticated backend E2E, provider delivery, physical-device/Safari, native review or native zoom acceptance.640×360 is equivalent CSS reflow only. No secrets or submitted password values are stored in these receipts. Fixture helpers and behavior test remain in the repository for repeatable checks.

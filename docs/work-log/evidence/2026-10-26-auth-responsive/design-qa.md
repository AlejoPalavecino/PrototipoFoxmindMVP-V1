# Authentication viewport adaptation — native QA

- final result: passed
- Tester /root/auth_responsive_test and reviewer /root/auth_responsive_review; persisted by /root from their read-only-role reports, 2026-10-26, main starting32c4750.
- Scope: preserve the approved sign-in/registration design while adapting useful width and height. Actual public routes on live52171, not synthetic HTML or an authenticated/account-mutation fixture.

## Baseline and final matrix

[Login baseline1366×768](baseline-sign-in-1366x768.png) and [registration baseline](baseline-register-1366x768.png) showed document1026px/scene878px, login CTA bottom780.99 outside viewport and registration bottom764.99 nearly flush. Inputs68/58px and heading60.8px did not compact for notebook height.

[Final matrix](final-matrix.json) contains28observations:26exact requested dimensions and2observed902×700 instead of requested901×700. Exact901was not tested;900was. Each route covers1280×720,1366×768,1440×900,1536×864,1366×640,1024×768,900×700,768×1024,390×844,320×640,1536×1024,1920×1080,2560×1440, plus the observed902boundary. Physical notebook/27inch hardware is not inferred from these viewports.

Representative native comparisons: [login1366](final-sign-in-1366x768.png), [register1280](final-register-1280x720.png), [register1366](final-register-1366x768.png), [login1536×864](final-sign-in-1536x864.png), [large1536](final-sign-in-1536x1024.png), [large2560](final-sign-in-2560x1440.png), [mobile320](final-register-320x640.png). Tester inspected14matrix images, focus and password images; reviewer independently inspected six, root two notebook views. Large2560image was downsampled only by the viewer, not the stored native file.

No horizontal overflow/surface overflow across28observations; Fredoka loaded and two panels coupled in split layout. Face and text stay separate in inspected images. Existing style, brand, artwork and large-screen presence remain. Notebook CTA bottoms for login/register are530.89/609.89 at1280×720,535.38/614.38 at1366×768,543.44/622.44 at1440×900,542.21/621.21 at1536×864: fields and primary actions visible initially.

Registration auxiliary/footer content naturally continues below at1280/1366 (document802/806px). Mobile320registration needs vertical scroll to CTA855.35;900×700registration CTA704.65 needs a small scroll. Short1366×640retains both CTA endpoints525.64/604.64. This is natural document scroll, not clipping/hidden controls. Some desktop heights have1–2px rounding scroll; not pixel-identical/full-screen-fit promises.

## Controls and source correction

Inputs remain18–22px, eye48×48, compact CTA54px; mobile follows prior56/64px inputs/actions. The44px minimum claim covers form controls, not inherited inline forgot/account links with smaller line-height. Palette unchanged; contrast was not freshly recalculated. [Keyboard focus](final-keyboard-focus-1280x720.png) is visible blue2.4px in native environment.

Reviewer found compact registration shorthand padding-right overriding the original64px password safe area. Worker changed to padding-block/padding-left, preserving right64; [bounded final proof](password-padding.json) confirms both routes at1366and observed902, eye48×48 inside the field with a long synthetic shown value and no POST. These checks followed the correction; no need to repeat empty-field matrix for a right-padding-only change. No product issue remains open.

[Interactions](interactions.json) verify local eye toggle/aria-pressed, preserved next=/mis-aulas link, keyboard email→password→eye→forgot→CTA and public recovery navigation without submitting account forms. [Closure check](closure-check.json) verifies640×360effective viewport with a temporarily long DOM title; scrolling centres the full CTA in both routes. This is a reflow approximation, not native200%zoom or actual user content. Initial bottom-aligned login result was false by0.35px, preserved as history; later centred result is true rather than silently changing its assertion.

Baseline and final focused command: node --test --test-reporter=dot tests/p3-web-client.test.mjs tests/foxmind-3d-flows-account.test.mjs →8PASS/0FAIL, exit0, after final padding correction. CSS-only RED N/A; no CSS-mirroring tests. Worker web strict TypeScript, PostCSS parse/scope and diff-check PASS; no configured linter. Root final isolated Next build exit0 within180s, TypeScript6.0s/compile17.1s, live .next untouched. Existing external-lockfile advisory persists.

## Attribution, limits and cleanup

Reviewer inspected all3production paths and component inheritance, parsed both leaves, ran diff-check, read matrix/interactions/padding/closure and returned LGTM_SIN_HALLAZGOS,0open findings. It did not execute browser/functional tests itself; those belong to tester, build to root. New selectors remain under entry-auth-polish; navbar/Home/Agenda, JSX, form fields/handlers, validation/API/auth and data remain unchanged.

Failed initial minimized-window capture, loading-before-CTA observation and supplement navigation timeout with committed/interactive document are historical tool/state checks; retries produced valid evidence. No service restart or real account operation. Native200%zoom, exact901px, physical devices and Safari remain unverified; do not claim them as PASS.

Own Space qa-auth-responsive(id7) finished keep[] exactly once, original user page and runtime unchanged. After test-role handoff, root renamed all eight browser helpers from .test.mjs to .mjs to prevent Node test discovery, corrected the two nominal901snapshot filenames and password image to actual902, and updated future artifact naming to measured viewport dimensions. Raw matrix values were not changed. Helpers are historical ego rounds and require an appropriately assigned live Space before reuse.

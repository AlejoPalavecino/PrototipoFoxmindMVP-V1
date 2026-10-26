# Approved authentication screens — visual QA

- final result: passed
- Agent: /root/auth_polish_test, independent tester; persisted by /root from returned report. Read-only reviewer /root/auth_polish_review inspected final images independently.
- Date: 2026-10-25; main base dfe2b849; dedicated ego Space qa-auth-polish(id2), closed exactly once. User's original local preview remains available.
- Targets: [approved sign-in](references/sign-in.png), [approved registration](references/register.png). Existing ZorroH original replaces the generated mark approximation intentionally.

## Final evidence and fidelity

Native browser captures [sign-in desktop](accepted-sign-in-1536.png), [registration desktop](accepted-register-1536.png), [sign-in390](accepted-sign-in-390.png), [registration390](accepted-register-390.png), [sign-in320](accepted-sign-in-320.png), [registration320](accepted-register-320.png). Source and desktop render were opened jointly at1536×1024, DPR1, without resampling; mobile390/320×844 has responsive acceptance, since the source did not define mobile mockups. Source artwork remains a real WebP asset, not a flattened UI screenshot. Labels and controls are real HTML.

Fredoka Auth loaded locally; body Segoe follows existing product system. Split scene/form, page origin y112, panel height878.46, rounded surfaces, approved Spanish copy, empty password fields, original fields/helper/footer all observed. Navy/violet/ivory/orange hierarchy preserved. Eyebrow darkened to#c64711 for≥4.5:1; links6.86:1 and CTA5.91:1 measured. Eye target48×48. Width pairs1521/1521 desktop and390/390,320/320 mobile show no horizontal overflow. No active animation in observed final state.

No actionable P0/P1/P2 remains. P3: slight book-tip crop from asset/panel aspect mismatch; rounded heading weight/body type approximation; approximately2px extra document height at desktop. These do not hide controls. This is faithful visual implementation with explicit small differences, not pixel-for-pixel identity or full accessibility certification.

## Functional checks without account mutation

Both eye controls toggle password/text and aria-pressed while remaining non-submit buttons. Empty submits focus their alert and make no login/register POST; keyboard email→password→eye→forgot→submit shows visible outline. Actual sign-in→register link retains next=/mis-aulas. Forgot-password retains its normal navigation/unpolished presentation; unauthenticated profile retains its guard with no personal data. Final observed error events contained no Runtime exception, Log error or console error. HMR reported no build errors/warnings in the final batch.

[Registration error](accepted-register-desktop-error-1905.png) proves visible desktop alert, not320px mobile error: reviewer found the original filename misleading, root corrected it after checking the actual1905×867dimensions. Focus/error behavior and responsive captures are separate observations. Manifest records actual dimensions of every artifact; earlier names are historical, not acceptance metadata.

Focused command: node --test --test-reporter=spec tests/p3-web-client.test.mjs tests/p3-web-proxy.test.mjs tests/foxmind-3d-flows-account.test.mjs →18total,16PASS,0FAIL,2SKIP,10.262s, exit0. Skips are existing opt-in cooldown navigation and token-document cases. Baseline broader26total/24PASS/2SKIP was not unnecessarily repeated. No new CSS-mirroring tests; RED N/A for reversible presentation. Independent legacy entry-glass-client baseline remains1PASS/3FAIL, as recorded by architect, and is never reported as green.

Loading/cooldown/session-open UI states were not exercised live with a controlled API fixture; source inspection preserves their contracts. No real login, registration, retained account mutation, private configuration read, DB fixture or provider request was used. Native200%zoom, physical devices, Safari and full WCAG conformance were not evaluated.

## Iteration history

Baseline showed small separated artwork/card/navigation and legacy folder tab. Iteration1 exposed inherited pseudo-tab, mobile96px gap, headline wrapping, density and copy/art overlap. Iteration2 corrected those; an attempted contain/translate then introduced visible image bands and was rejected. Final full-bleed top cover, explicit login three-line heading at64px and corrected contrast resolved actionable findings. Earlier final*/baseline PNGs preserve failed/intermediate evidence and are not the accepted target.

Initial native capture failed while the owned browser window was minimized; normalizing that window recovered real captures. The native wrapper could reset emulation, so final Page.captureScreenshot used controlled CDP viewports; no PDF or mock-render substitution. Captures are tool outputs, not source edits by the tester.

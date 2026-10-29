# Login and registration reference contract — ready for implementation

- Agent / role: auth_architect; bounded UX/UI design, product source read-only.
- Session or task ID: /root/auth_architect.
- Date: 2026-10-28.
- Branch / worktree: codex/inicio-reference-astra; foxmind-inicio-astra/ProtipoFoxMind.
- Starting commit: 95c7cb2, observed by git log; root and asset-agent records already untracked and preserved.
- Phase/task/spec: existing P3 account UI refinement; [functional spec §3](../foxmind-v1-functional-spec.md#3-registration-and-invitations), [coordinator scope](2026-10-28-root-auth-reference.md), [roadmap](../implementation-roadmap.md).
- Status: completed (design only; implementation and verification are pending).

## Request and scope

ESTADO_DISENO: LISTO_PARA_TDD_RED.

Match the supplied separate login and registration references with warm cream/orange panels, corresponding fox artwork and functional existing account forms. No backend, session, identity-policy or provider additions. No publication, deployment, retained-data operations or memory writes. The coordinator explicitly permits this agent to write only this design record; product files remain read-only.

Applied sdd-ambiguity-gate, clean-architecture and team-docs-strategy. This is a reversible presentation change in the existing stack; no greenfield interview, new shared domain contract, migration or architecture fork is required. Existing contract answers all material questions.

## Shared presentation contract

1. Scope the new visual treatment exclusively to sign-in/register via the existing entry-auth-polish root. Keep forgot/recover/verify/profile/settings presentation and behavior stable. Reuse AccountStory's polished branch and existing fields; do not fork the authentication controller or duplicate account-client validation.
2. Use a centered composition with cream page background, brand/header above, portrait artwork left and white form right. Desktop panel ratio approximately 53:47, outer radius 24px, subtle warm border and minimal shadow. At the reference scale the illustration is approximately 460x754px; proportional scaling is a target, not an unbreakable minimum height.
3. Header shows the existing fox/FoxMind brand with short teaching/learning tagline, plus opposite-flow prompt and outlined orange link: login offers Crear cuenta; register offers Iniciar sesión. Use supplied registerHref/signInHref to preserve bounded next navigation. Existing authenticated account actions take precedence over anonymous header prompts. Keep mobile header wrapping and all hit targets usable.
4. Use existing local rounded display/body fonts. Headings dark brown, supporting text slate, primary actions burnt orange. Story headline 44–50px at full width (line-height 1.05–1.12), form h1 30–34px, body 15–16px, labels 13–14px. Inputs 46–50px high and primary CTA 48–52px with rounded corners. Form padding approximately 30–36px desktop; title-to-form 24–30px; field gaps 20–24px. Fit smaller notebooks using clamp/height-aware spacing instead of fixed-height clipping.
5. Story copy is HTML layered above decorative imagery, with readable contrast at all widths. Login title: “Tu próximo descubrimiento empieza acá.” with orange final phrase; register: “Un lugar para todas tus ideas.” with orange final phrase. Login description can use “Un espacio donde aprender, enseñar y crecer se hace más simple, más humano y más divertido.” Register uses “Creá tu cuenta y empezá a explorar todo lo que FoxMind tiene para vos.” Avoid rendering letters in the bitmap.
6. Replace the current generic scene only in the polished story with /foxmind-3d/auth-reference/login-{480,960}.webp and register-{480,960}.webp. Use width-aware srcSet/sizes and predictable intrinsic dimensions/aspect ratio. Portrait fox occupies the lower approximately45%; HTML title/benefits occupy the top. Keep fox face/paws visible; do not cover them with a card. Decorative image has empty alt. Shared story copy may retain its existing decorative aria-hidden treatment because the form supplies the real page heading/instructions.
7. Recreate short benefits with small rounded orange/green/lavender/blue icon tiles and translucent cream surfaces. Safe copy: login “Aprendé a tu ritmo”, “Enseñá con más herramientas”, “Herramientas de IA para crear”; registration adds “Organizá tus aulas y actividades”. These are presentation, not clickable controls or personalized-learning/compliance guarantees.
8. The reference contains unsupported controls: omit Google/Microsoft, OAuth separators, Recordarme, terms/privacy placeholders, compliance claims and a password-strength bar. Do not leave dead-looking slots for them. Use the existing honest email-verification note beneath registration; login can retain a brief brand footer. Natural form whitespace is preferable to fabricated functions.

## Forms and states

- Login preserves email/password names, username/current-password autocomplete, POST/auth/login and existing submit handler. Keep password recovery as a real /forgot-password link aligned right below the password field. Main CTA remains Iniciar sesión with arrow and Iniciando sesión… when busy.
- Registration preserves required firstName/lastName, email/password and existing POST/auth/register handler. First/last name share a row when space permits. Keep autocomplete given-name/family-name/email/new-password. Main CTA Crear cuenta/Creando cuenta… and generic success message stay intact.
- Password helper is exactly the existing16–128 policy, allowing spaces and any language. The screenshot's8-character and letter/number requirements are not adopted. No new strength semantics or browser minLength rules that disagree with shared Unicode validation.
- AccountField already implements show/hide. Preserve type=password initially; button type=button, accessible Mostrar/Ocultar name, aria-controls and aria-pressed; toggling must preserve value, focus and FormData payload without submitting. Leading mail/person/lock icons may be added to polished fields only, aria-hidden; retain visible labels and sufficient padding for both leading icon and trailing eye.
- Keep email input type=text with inputMode=email: native type=email can reject supported quoted/international addresses. Do not normalize/case-fold or alter email validation.
- Preserve loading, failed-session retry, focused alert/status message, cooldown, fieldset disabled and aria-busy. Busy/cooldown locks still prevent duplicate submission; show/hide cannot bypass the disabled fieldset. Existing password clearing after submit stays in the controller. Error/success text expands the page naturally without covering submit/navigation.
- Keep existing current-session notice, verify-email redirect, classroom next route and account link behavior. Header and after-form links must use the existing nextAccountHref-derived destinations.

## Responsive acceptance

- At approximately761px and above use split panels, preserving the supplied885px-wide reference composition. Below that threshold prioritize the form and hide the large decorative story; retain brand, title and opposite-flow navigation. Coordinator explicitly selected this reversible breakpoint after comparing the reference.
- At320/390px use16–20px outer/form gutters, no horizontal overflow, no fixed card height, inputs at least16px font, visible focus and natural vertical scroll. Collapse name columns when their available width is too narrow (typically below480px).
- Check1440x900 and1366x768 full composition,1024x768 narrow split,885x884 reference,760x700 transition,390x844 and320x640 mobile, and a desktop200% zoom equivalent. Reference header height is approximately111px and card754px at885px width. Primary CTA should fit a normal notebook initial viewport when possible; long error/success content may scroll. Never shrink controls or crop notices merely to force a screenshot match.
- Keyboard order follows form reading order; Tab reaches recovery, toggle, CTA and opposite-flow links. Focus ring remains visible; no animation required. Any existing motion respects reduced-motion.

## Ownership and DoT handoff

- Coordinator owns shared roadmap, integration, aggregate checks and local commit evidence.
- Asset agent owns only new auth-reference image files and its own record.
- Product worker owns AccountStory.tsx, account-navbar.tsx, account-field.tsx, account-flow-forms.tsx and narrowly scoped account-screen.tsx/account-view.ts presentation edits as needed; owns a dedicated auth-reference.css leaf loaded after workspace.css and its import. Explorer confirmed later workspace-account/sky-theme rules otherwise override auth styling. Scope every rule to auth roots instead of rewriting accumulated unrelated styles. Do not edit authentication handler logic or test files.
- Test runner owns focused new test and fixture files plus its own record. No new tests solely pinning decorative copy, CSS literals or implementation structure. Existing behavior gets regression coverage; new header links are meaningful navigation behavior and can demonstrate RED before implementation.
- Suggested new test file: tests/auth-reference-presentation.test.mjs. Verify anonymous header opposite-flow links preserve provided next hrefs and authenticated actions remain; login/register fields and submit callbacks retain their payload/path; existing toggle flips type/aria-pressed without submit or value loss; other account views retain their existing branch. Prefer component behavior through existing load-ts-module/hookView helpers.
- Focused command after RED implementation: node --test tests/auth-reference-presentation.test.mjs tests/p3-web-client.test.mjs tests/p3-web-proxy.test.mjs tests/foxmind-3d-flows-account.test.mjs. Command is proposed, not executed by design agent. Run strict web types and the coordinator's isolated production build after workers settle.
- Visual QA via ego-browser dedicated Space should exercise both views at the stated widths, toggling a synthetic password, keyboard traversal, loading/busy/disabled, long error/success, recovery and opposite-flow links. Clearly label mocked component fixtures; do not claim authenticated/backend E2E from them.

## Work performed and verification

Read the roadmap checkpoint, work-record protocol, functional spec§3, p33 task context, existing AccountScreen/FlowForms/Field/Story/Navbar/view modules, package scripts and existing account tests. Visually inspected both supplied clipboard references with view_image. The account implementation already has password toggles and required first/last names, and the spec explicitly excludes Google and fixes16–128 passwords.

Observed commands: git status --short showed only the coordinator/asset records; git log -1 showed95c7cb2. Initial docs/functional-spec.md lookup failed because the actual filename is docs/foxmind-v1-functional-spec.md; corrected lookup/read succeeded. Initial apps/web/src/styles search paths were absent; actual account CSS is in apps/shared-ui. These were discovery path mismatches, not product failures. No runtime, test, build or secret-read operation was performed. Documentation design only needs scoped diff/record existence checks; no functional PASS is claimed.

## Commits, outcomes and handoff

No commit authored by this agent. Design record only. First unfinished task: test runner establishes meaningful navigation RED and baseline toggle/payload preservation, then product worker implements this scoped presentation alongside the asset agent. Coordinator reconciles actual test/visual/review evidence before marking implementation complete. No critical decision awaits the user.

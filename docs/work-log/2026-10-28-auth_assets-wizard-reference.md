# Crear aula reference asset catalog and ambient background — completed

- Agent / role: auth_assets, Astra asset worker.
- Session or task ID: /root/auth_assets.
- Date: 2026-10-28.
- Branch / worktree: codex/inicio-reference-astra; C:/Users/alejo/.codex/worktrees/foxmind-inicio-astra/ProtipoFoxMind.
- Starting commit: 7a742de70c766bea3e5557566dc341b9c2ff9742.
- Phase and detailed task/spec links: P5 wizard visual refinement; [coordinator](2026-10-28-root-wizard-reference.md).
- Status: completed.

## Request and scope

Catalog reference assets, reuse existing cover/brand/icon assets, and generate only a very quiet cream/peach/pale-green ambient raster background if no suitable existing equivalent. Deliver1600/960px WebPs under apps/web/public/foxmind-3d/wizard-reference/. Asset-only scope: no source, browser, runtime, tests, memory writes or commits.

## Work performed

Read coordinator record and inspected all four screenshot references. Enumerated public assets and inspected entry-glass/backdrop.webp as candidate for reuse. Existing covers have literature, math, biology, society, science, creative and general WebP variants; preserve these rather than recreate screenshot thumbnails. Existing brand and icon directories cover shared branding and standard UI symbols.

Existing entry-glass/backdrop.webp is a lavender/peach glossy3D scene with substantial waves/spheres; unsuitable for the reference's almost-flat cream background. Other hero/auth scenes contain foxes and decorative environments. Generated one standalone ambient raster through built-in image_gen, no CLI or API key.

Prompt specification: landscape1.56:1, warm near-white cream #fcf8f1, very low contrast organic peach shapes at left edge and upper-right, pale sage at lower-right, center75% nearly flat empty cream; reference used only for background; no UI/text/fox/logos/icons/items. Generated source1566x1005 preserved by tool and copied into ignored .test-artifacts/wizard-reference-assets/ambient-generated.png. No raw originals in public.

### Delivered ambient assets

Paths relative to apps/web/public/foxmind-3d/wizard-reference/:

| Asset | Dimensions | Bytes | Consumer |
| --- | --- | --- | --- |
| ambient-1600.webp | 1600x1027 | 4736 | Wide wizard page background, all four steps |
| ambient-960.webp | 960x616 | 1878 | Smaller wizard page background, all four steps |

Sharp proportionate resize and WebP quality80/effort6; no compositing or drawn replacements. Original tool source: C:/Users/alejo/.codex/generated_images/01a1852c-a530-7d80-9418-39a9a7ec837d/exec-72cd01c2-a449-40e1-86bb-bbee61e6e672.png.

### Reusable cover catalog

All files below already exist under apps/web/public/foxmind-3d/covers/ and remain unchanged. Small variants are320x213; large variants640x427. Consumer: step1 cover picker and step4 selected-cover review.

| Category | Small file / bytes | Large file / bytes |
| --- | --- | --- |
| Literatura | literature-320.webp /10882 | literature-640.webp /26152 |
| Matemática | math-320.webp /8558 | math-640.webp /20380 |
| Biología | biology-320.webp /12610 | biology-640.webp /31142 |
| Sociedad | society-320.webp /10616 | society-640.webp /25380 |
| Ciencia y tecnología | science-320.webp /10186 | science-640.webp /24290 |
| Arte y creatividad | creative-320.webp /9424 | creative-640.webp /23224 |
| General | general-320.webp /8746 | general-640.webp /20784 |

Preserve existing brand/logo-horizontal.svg or current shared branding consumer. Reuse existing icon system and foxmind-3d/icons/{book,file,upload,spark,check,plus,trash,edit,arrow-left,arrow-right}.svg where applicable. Step2 uploader illustration can retain standard upload/file icon; no new raster needed. Step3 units and step4 review are UI structure, not new artwork.

## Verification

Inspected generated original and final960px WebP with view_image: nearly flat cream center, pale peach peripheral forms, pale-green lower-right, no embedded text/UI/fox or unwanted subjects. Sharp metadata/fs stat confirmed dimensions and bytes above; conversion exited0. Center RGB252/249/241 at1600px and251/248/240 at960px are close to requested #fcf8f1. git check-ignore confirmed original archive ignored. Functional tests not needed for static asset additions; final component background scaling/readability remains coordinator/browser-QA responsibility.

## Commits and outcomes

No commit performed; coordinator's untracked work record preserved.

## Handoff

Coordinator notified of delivered ambient paths and reusable cover catalog. Worker should consume the ambient image as decorative background on the wizard page, retain existing logo/icons/covers and verify responsive scaling with all four steps. No source or shared roadmap edits performed. No unresolved asset blocker.

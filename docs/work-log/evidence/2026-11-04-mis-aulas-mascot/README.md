# Mis aulas — personaje consistente

Generado mediante herramienta integrada image_gen, con tres referencias locales inspeccionadas:

1. Edit target: `apps/web/public/foxmind-3d/classrooms-reference/hero-wide-1600.webp`.
2. Referencia de identidad Agenda: `apps/web/public/foxmind-3d/agenda-reference/agenda-hero-1600.webp`.
3. Referencia de identidad Inicio vigente: `apps/web/public/foxmind-3d/hero/foxy-warm-640.webp`.

Fuente generada conservada en `C:/Users/alejo/.codex/generated_images/01a1a48c-f4df-7ea2-8f25-98ac7e55e264/exec-b05e4c1e-a33d-4789-ba64-82aa39ff66fc.png`. El resultado incluyó bandas blancas externas; exportación con Sharp de la región panorámica `{left:0,top:203,width:2170,height:320}`, redimensionada a 480×71, 960×142 y 1600×236, WebP calidad 88. No se retocó el personaje después de la generación. Recursos consumidos por la aplicación: `apps/web/public/foxmind-3d/classrooms-reference/hero-consistent-{480,960,1600}.webp`. Originales anteriores intactos.

## Prompt aplicado

Use case: identity-preserve. Asset: ultra-wide panoramic background illustration for the existing FoxMind Mis aulas screen. Image 1 is the EDIT TARGET, a 1600x236 panoramic landscape with a small fox seated near 68% of the width, books, leaves and pale cream/apricot hills. Images 2 and 3 are CHARACTER IDENTITY REFERENCES from Agenda and Inicio. Replace ONLY the fox character of image 1 with the SAME recognizable character as references 2 and 3. Match the broad rounded white cheek patches and short round muzzle, broad head, brown oval eyes with cream sclera (not huge anime eyes), dark chocolate round nose, distinctive orange forehead tufts, brown eyebrows, large ears with dark tips, chunky brown paws and white chest, plush smooth 3D clay-like orange coat, big orange tail with cream tip. Preserve seated waving pose and green backpack from the target so it is still an educational scene. Keep face/character proportions and rendering consistent with the reference character; do not invent a new fox. Preserve target composition and panorama, pale open negative space on the entire LEFT 52% for HTML text, fox and books entirely between x=58%-78%, far right 15% unobstructed for HTML button. Keep fox fully visible ears to feet with generous margins above ears and below feet; it must be small enough for a shallow 6.78:1 banner. Match existing warm soft sunlight, illustrated hills and foliage. Keep all original background scene and books as close as possible. OUTPUT ULTRA-WIDE PANORAMA aspect 6.78:1, ideally 1600x236 or larger same ratio. This is the background artwork only. NO lettering, UI, text, badges, buttons, watermarks, frames. Do not change the face to a realistic animal or thin-muzzled cartoon. Identity references override the existing fox's facial appearance.

## Verificación

`ego-escritorio.png`, `ego-tablet.png` y `ego-banner.png`: capturas nuevas en Ego Lite, TaskSpace 3, datos sintéticos y componentes reales; no backend autenticado. La semejanza del personaje es una valoración visual, pendiente de aprobación del usuario.

Chequeo reproducible: iniciar `node docs/work-log/evidence/2026-11-04-mis-aulas-header/preview.mjs` y ejecutar `node docs/work-log/evidence/2026-11-04-mis-aulas-mascot/browser-check.mjs`. Las capturas restantes y `metrics.json` proceden de Chromium/Playwright en seis anchos; no confundirlas con las capturas Ego. El diseño móvil conserva la regla previa de ocultar la ilustración en pantallas estrechas.

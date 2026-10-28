# Pulido visual integral — contrato previo a implementación

- Agent / role: astra_visual_design / arquitectura de presentación.
- Session or task ID: `/root/astra_visual_design`.
- Date: 2026-10-28.
- Branch / worktree: `main`, checkout original `C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind`.
- Starting commit: `fa3ce749f9bd9e8011dcf71a155e061a9f1e73ca`.
- Phase and detailed task/spec links: pulido transversal posterior a P0–P9; [roadmap](../implementation-roadmap.md), [guía 3D](../foxmind-3d.md), [contrato histórico](../../odd/tasks/foxmind-3d-migration.md).
- Status: completed (contrato de diseño; implementación no iniciada).

## Request and scope

Preparar un contrato concreto de pulido visual para toda la plataforma, conservando imágenes y disposición actuales. Se permiten eliminar textos o botones redundantes cuando no se pierdan capacidades, estados ni avisos necesarios. Esta delegación solo autoriza este registro: sin implementación, pruebas RED, roadmap, runtime, datos retenidos, publicación ni secretos. No se interpreta la confirmación histórica de migración 3D como confirmación L3 para el nuevo trabajo.

## Work performed

Leídos AGENTS raíz/web, protocolo de registros, roadmap actual, guía/contrato histórico 3D, especificación funcional §§4,12,13, skills sdd-ambiguity-gate, clean-architecture, team-docs-strategy y engram-memory. Inspeccionadas las cuatro referencias de imágenes suministradas (Mis aulas, Inicio, Agenda, Plan). Git observado en main/fa3ce749 con árbol limpio antes de crear este registro. El archivo parcial sugerido `2026-10-28-visual_polish_design.md` no existe al inspeccionar; no se altera registro ajeno.

Fuentes inspeccionadas: `apps/shared-ui/index.ts`, `foxmind-3d.css`, sus hojas tokens/shell/controls/account, `auth-polish.css`, `folders-account.css`; `apps/classrooms-ui/foxmind-classrooms.css`, hojas classroom-cards/workspace/learning y home/layout/shell; `apps/agenda-ui/index.ts`, `foxmind-agenda.css`; `apps/web/pages/_app.tsx`; entradas de los harness visuales Home/Agenda, scripts de package y nombres de suites. No se inspeccionaron datos privados ni configuración de los runtimes activos.

## Estado, hallazgos y contrato visual

**ESTADO_DISENO: LISTO_PARA_CONFIRMACION_L3.** DoR técnico completo; falta confirmar ejecución aislada y sustitución puntual del navegador de QA. No hay una decisión abierta de estilo ni un motivo para cambiar stack/DB. El requisito L3 de AGENTS es «sugiere git worktree y espera confirmación humana antes de pasar a Fase RED». La confirmación histórica 3D no se reutiliza.

Hallazgos de fuente, no auditoría de píxeles actuales:

1. `foxmind-3d-tokens.css` conserva Trebuchet, tinta `#202522`, muted `#5b6260` y bordes gris verdoso. Inicio, Agenda y auth corrigen localmente a Fredoka/azul oscuro. Aulas, interiores y cuenta heredan la base anterior; la incoherencia tiene una causa compartida corregible.
2. `foxmind-home-shell.css` modifica el shell solo cuando existe Home, fijando sidebar232/padding248 y toolbar80; `foxmind-3d-shell.css` usa sidebar fluido y toolbar72 en las demás rutas. Consolidar sus medidas comunes elimina saltos entre pantallas sin cambiar navegación ni estructura.
3. Los controles se redefinen con radios11/12/16, alturas44/48/52/56 y varios naranjas/focos. Mantener variantes explícitas por jerarquía, no igualar una celda de calendario y un CTA grande.
4. Fredoka se declara hoy en `auth-polish.css`, aunque Inicio y Agenda también lo consumen. `_app.tsx` carga capas legacy→3D→módulos→auth. La fuente y tokens deben pertenecer a la base común; retirar solo overrides efectivamente redundantes, sin reordenar toda la cascada ni borrar estilos históricos.
5. Las cuatro referencias establecen superficies blancas, fondo crema, títulos redondeados oscuros, líneas finas, naranja principal y chips pastel. El buscador global de los mockups no existe como servicio: mantener la búsqueda local de aulas y accesos reales. Las métricas o unidades de ejemplo no se inventan.

Contrato de presentación:

- Conservar logo original, catálogo, selección de portadas, archivos de imagen y recortes actuales salvo ajuste de encuadre necesario para evitar texto sobre arte. Sidebar/drawer, orden de bloques, columnas, héroes, pestañas, formularios y jerarquía funcional mantienen su estructura. No reemplazar imágenes ni crear assets nuevos.
- Base única: fondo `#fcfaf7`, superficie blanca, tinta `#080b30`, texto secundario `#53649b`, bordes suaves `#e2e5f0`, naranja `#ff782d`/hover`#f2691c`, peach`#fff0e5`, lavender`#e9e3fa`; success/danger conservan semántica. Valores propuestos verificables, no mediciones extraídas de screenshots. Color de enlace/foco se elige por contraste comprobado, no por copiar el píxel más claro.
- Fredoka local para títulos/puntos de énfasis, pesos600–700; Segoe UI para lectura y formularios. Titulares32–52, secciones24–30, tarjetas20–24, cuerpo16–18, metadatos14–16, con line-height1.4–1.55 en lectura. No extender Fredoka a textos académicos largos ni conservar pesos850 sintéticos heredados en títulos nuevos.
- Escala de espaciado4/8/12/16/24/32; campos/radios12, cards20, dialogs24; CTA principal16/altura48–52, secundarios12/altura44–48. Una acción principal por grupo de tarea; otras outline o textuales. Mantener botones destructivos diferenciados, disabled/busy distinguibles, labels visibles y foco de3px.
- Inicio conserva hero/colas/miniagenda y sus ocho variantes. Mis aulas conserva grilla3/2/1, filtros/búsqueda, portadas y acciones de crear/unirse. Interior conserva cabecera/arte/tabs/Plan de dos columnas, y aplica la misma escala a Biblioteca, Muro, miembros, wizard, IA, actividad, entrega, corrección y progreso. Perfil/Configuración y auth auxiliares reciben la misma base; login/register conservan el pulido responsive aceptado. Agenda conserva42celdas, día, próximos, privacidad, formulario y colores semánticos reales.
- Simplificación permitida: quitar un encabezado repetido en el mismo panel o una explicación que solo repite el botón; unificar duplicados de una misma acción cuando el equivalente permanece visible, accesible y en el mismo contexto. No quitar guardado/dirty, conflictos, intentos, plazos/zona, notas publicadas/privadas, IA revisable, privacidad, cooldown, errores ni avisos obligatorios. Todo cambio de visibilidad/acción se separa de CSS y exige RED; no esconderlo con `display:none` como atajo.

## Superficies, ownership y orden

El coordinador crea el worktree propuesto `codex/foxmind-visual-polish` desde la base reconciliada después de la confirmación. Cada tarea tiene su registro; nadie toca runtime52171/API52170 ni sus procesos. No se copia configuración privada al worktree. No hace falta contrato nuevo en core: las interfaces/callbacks actuales quedan intactas.

| Orden / responsable | Superficie exclusiva | Entrega y dependencia |
|---|---|---|
| V0 — test_runner | Fixtures/pruebas/evidencia en rutas propias | Baseline y matriz de familias/estados antes de editar producto; RED solo para cambios de comportamiento identificados. |
| V1 — shared worker | shared-ui tokens/controls/shell/entrypoint; declaración @font-face; coordinación puntual `_app.tsx` | Base visual única, controles y shell. Dueño único de importación/fuente. Reconciliar override Home solo después de devolver ownership. |
| V2 — classroom worker | classrooms-ui hojas classroom/cards/workspace/learning; luego hojas Home, sin archivos compartidos | Mis aulas→Plan→miembros/wizard→Biblioteca/Muro→autoría/IA→entrega→corrección/progreso; Home después de fundaciones. Cambios TSX solo si se asignan explícitamente y pasan RED cuando alteran capacidades/visibilidad. |
| V3 — account/agenda worker | shared-ui account/auth-responsive/auth-polish excluyendo bloque de fuente V1; agenda-ui CSS; páginas/components cuenta asignadas | Auth auxiliar/perfil/settings/files y armonización Agenda. No edición simultánea del mismo archivo que V1: el bloque fuente termina antes de entregar auth. |
| V4 — verificador/reviewer | Tests/evidencia propios; diff en lectura | Revisión integrada, QA completa por familias y roles, juicio L3; coordinador integra y documenta. |

No trabajo paralelo sobre un archivo. La tabla define responsabilidades secuenciales reutilizables; no exige tres implementadores simultáneos. Mantener barriles actuales y no añadir un sistema de componentes paralelo. Archivos nuevos<200líneas/funciones<40; no refactorizar por longitud código heredado ajeno al objetivo.

## DoT, DoD y cortes de entrega

- **Visual/CSS:** PostCSS/sintaxis, strict typecheck y `npm run web:build` aislado; revisiones de captura antes/después. No tests triviales que congelen cada hex o radio. Cambios de copy/JSX sin comportamiento: revisión de DOM, labels y rutas. Cambios de visibilidad, composición interactiva o remoción de duplicados: tests significativos creados por test_runner, RED observado antes de GREEN, callbacks/destinos y estados conservados.
- **Regresión proporcional:** seleccionar suites existentes por diff: home-polish-presentation, agenda-polish-presentation, foxmind-3d-flows-* y p3-web-client/auth/cuenta; añadir clientes autoría/entrega/grading únicamente si TSX funcional cambia. CSS no justifica reejecutar toda DB. Build API30s solo si se modifica una superficie que realmente lo requiere; Next180s, actual330s/child360s y demás presupuestos existentes no se amplían.
- **Matriz visual:** todas las rutas inventariadas (`/`, sign-in/register/verify-email/forgot-password/recover-password/profile/settings/files/inicio/mis-aulas/agenda) y las familias internas de aula. Desktop1440x900 y notebook1366x768; responsive1024/768/390/320, más zoom200% sobre shell/formulario/Plan/calendario/evaluación. No hace falta cada combinación de ruta×ancho: todos los templates a desktop/móvil y breakpoints de cada layout. Capturar estados docente/estudiante/mixto/none, empty/loading/error, nombres largos, archivo/read-only, formulario busy/error y modal abierto donde aplica.
- **Aceptación:** sin overflow horizontal de página ni recorte de texto/acciones; scroll local de tabs/calendario documentado cuando corresponda, objetivos44px salvo excepción de grilla explícita; contraste texto4.5:1, texto grande3:1 y bordes/foco significativos3:1; teclado, foco visible, Escape/retorno, foco tras navegar, reduced-motion y fallo de imagen preservan uso. No convertir semántica de nota/progreso/privacidad a solo color.
- **QA segura:** reutilizar el patrón existente de harness Home/Agenda con componentes reales y APIs en memoria, ampliado por familias. Sirve para píxeles/interacciones/callbacks; no se presenta como E2E autenticado ni prueba de persistencia. Ningún login, seed, Gemini, upload o mutación sobre las cuentas/datos retenidos. QA corre en puerto propio y cierra solo sus procesos.
- **Navegador:** el coordinador reporta ego no disponible en PATH; esta unidad no lo ejecutó. Resolver ejecución por ruta existente si se localiza sin instalar/cambiar configuración. Si sigue ausente, incluir en la confirmación L3 el fallback al navegador integrado, manteniendo capturas inspeccionadas, geometría y teclado. No usar una prueba DOM sin captura como aprobación visual.
- **Cortes:** V1 base/shell, V2 colección/Plan, V2 gestión/autoría, V2 entrega/resultados, V3 cuenta, V3 Agenda y cierre integrado, subdivididos si superan400líneas authored por commit. Paquetes de estilo aprobables sin mezclar cambios de lógica. Tras dos fallos consecutivos en el mismo test/compilación: detener ese parche, conservar la evidencia y escalar; no relajar pruebas ni presupuesto.
- **DoD:** matriz cubierta con resultado/evidencia real, pruebas afectadas y build aprobados, revisión independiente sin hallazgos abiertos, datos/contratos/assets originales preservados, registros exactos. Solo coordinador actualiza roadmap y realiza commits locales; push/PR/despliegue requieren autorización posterior. Ninguna métrica de performance/zoom/hardware no observada se declara aprobada.

## Verification

- `git status --short`: vacío antes de este registro; `git branch --show-current`: main; `git log -1 --format='%H %s'`: fa3ce749, documentación de inicio local.
- Lectura de fuentes y referencias únicamente; no auditoría visual de la aplicación en ejecución.
- Pruebas funcionales no ejecutadas: esta unidad solo produce diseño/documentación.
- Comprobación PowerShell de las seis secciones requeridas y tres enlaces relativos: PASS. `git diff --check -- docs/work-log/2026-10-28-astra_visual_design.md`: exit0. Registro nuevo aún untracked; el registro coordinador concurrente también aparece untracked y no se modifica.
- Dos rutas de exploración no existían: `apps/web/src/pages/_app.tsx` y `docs/functional-spec.md`; corregidas por inventario a `apps/web/pages/_app.tsx` y `docs/foxmind-v1-functional-spec.md`, luego leídas. No son fallos de producto.
- La especificación visual histórica aún describe topbar y fuentes candidatas anteriores. El contrato 3D posterior y la solicitud actual mantienen sidebar/drawer e imágenes existentes; esta unidad no reabre esas decisiones ni reescribe su historia.

## Commits and outcomes

Sin commit propio ni modificación de producto. Contrato terminado; los valores visuales y cortes anteriores son propuestas de implementación, no resultados ejecutados.

## Handoff

Única confirmación a presentar: aceptar el plan L3 en worktree aislado y el navegador integrado como fallback de QA si ego sigue indisponible. Recomendado por proteger el runtime del usuario y preservar revisión por superficies. Alternativa: mantener la preparación y resolver ego antes de ejecutar; no comenzar RED de forma implícita. No hace falta preguntar de nuevo por estilo, stack, assets o estructura.

Primer trabajo después de confirmar: crear/adjuntar worktree desde HEAD reconciliado, registrar baseline de V0 con fixtures seguros y liberar V1 tokens/controles/shell. El coordinador puede guardar el contrato en `slice/visual-polish`; memoria y roadmap permanecen bajo su ownership para evitar actualización concurrente. Esta unidad no afirma escritura Engram ni aprobación nativa.

# Agenda · refinamiento suave de diseño

- Rol: escritor de diseño delegado; identificador de sesión no expuesto.
- Fecha: 2026-11-12. Rama: `codex/agenda-complete-polish`. Base: `0112a64c7f88822b1d86c4e98565cc64c435f76d`.
- Autoridad: TASK-005 reabierta, S3–S4 y S6–S7 de `odd/tasks/agenda-ux.md`, leído completo incluido Log. Sólo propuesta 01 y referencia/manifest; prohibida implementación hasta aprobación humana explícita.
- Superficies: `design/agenda-polish/01-calm-focus.html`, `design/agenda-polish/design.json`, `design/system.md`, `design/system.html`, este registro.
- Árbol inicial: cambios ajenos en CSS mensual, docs de Agenda/diseño/coordinador y tarea; archivos sin seguimiento de handoff, registros mensuales y prueba mensual. Se preservan íntegros.
- Fuente tipográfica verificada: `apps/shared-ui/brujula.css` declara Brújula desde `/brujula/lexend.woff`, peso 400; previews reutilizarán esos bytes locales, no una descarga ni Segoe.
- Excepción TDD: artefactos visuales pasivos; no existe RED determinista significativo. Verificación estructural con Node incorporado y diff, sin navegador, captura, build ni servicios.
- Registro abierto antes de editar. Resultado: composición 01 revisada; sin modificaciones de producto, alternativas 02/03 ni tarea del coordinador.

## Diseño entregado

S3–S4 y S6–S7: dirección neutral compartida entre roles, Lexend real, fecha prominente, filas con anclas horarias y acentos ligeros, sin tarjetas pesadas anidadas; mes de seis filas preservado. Superficies con dos sombras existentes y degradados de colores ya capturados, naranja cálido y pasteles discretos. Sin details/summary, detalle/editor permanente ni acciones gigantes. Detalle contextual y recorte de formulario de lectura en diálogos; móvil apilado/hoja inferior; hover, press y apertura breves con reduced-motion y foco visible. No implica seguridad comprobada.

Tradeoff: mayor espacio para lectura y fecha frente a densidad; calendario y navegación son muestras fijas, formulario es sólo un recorte visual sin guardado. 02/03 preservan la versión anterior, incluida tipografía anterior. No se han aprobado ni implementado estos cambios.

## Evidencia local

- Incrustación con `node <<'NODE'` usando sólo `node:fs` y `node:crypto`: fuente `apps/web/public/brujula/lexend.woff`, 9204 bytes, SHA-256 `d1a6bcc8be16439d978c4bd741a38093196cbeae9f6c71e1254076f4b9755628`. Ambos HTML tienen bytes idénticos a la fuente. Declaración original: `apps/shared-ui/brujula.css`, Brújula, peso 400; negritas sintetizadas según navegador.
- Verificador inline `node <<'NODE'` con assert/crypto/vm: PASS JSON, feature y rutas/dimensiones; ausencia de disclosures, recursos externos y APIs de red; fuente primaria y hash; reglas de foco/44px/responsive/reduced-motion; scripts parseados sin ejecución. 19 valores de color documentados en 01 y 24 en sistema (incluyen sombras/alpha). Paleta y familia contrastadas con `design/system.md`.
- Contraste calculado: tinta 11.92–14.54:1 y secundario 4.66–5.68:1 en superficies usadas; blanco/naranja 5.25:1; naranja/selección 4.75:1; azul/pastel 5.49:1, verde/pastel 6.49:1, violeta/pastel 7.39:1; error/blanco 8.62:1; foco/superficies 5.98–6.61:1 y contorno 11.18–12.37:1. No equivale a certificación AA integral.
- Alternativas 02/03 comparadas byte a byte con HEAD: PASS. Rutas tracked cambiadas sólo las cuatro autorizadas más las cinco previamente sucias; no se escribieron archivos de producción. Advertencias Git LF→CRLF registradas, no fallos del chequeo.
- Sin RED/GREEN de comportamiento: artefactos pasivos. Sin navegador, screenshots, ejecución JS, test/build, servicios, memoria, revisión nativa ni operaciones Git terminales. No scratch ni caché creados.
- Verificación final inline Node repetida después de afinar semántica de botones y retorno de foco: PASS para ambos HTML, manifest/feature/rutas, 24 pares de contraste y alternativas intactas. `git diff --check`: PASS, sólo advertencias LF→CRLF. Sin fallos de validación ni ciclos de corrección.
- Pendiente al cierre: coordinador refresca canvas y presenta revisión; espera aprobación humana antes de cualquier implementación. S3 autenticado/paridad real y S6 satisfacción estética quedan sin comprobar por esta delegación. El coordinador conserva tarea/mirror y decisiones de revisión/publicación.

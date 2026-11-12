# Agenda · cuaderno naranja, comparación 04

- Rol: escritor delegado de diseño; sesión no expuesta. Fecha 2026-11-12, rama `codex/agenda-complete-polish`, HEAD `0112a64c7f88822b1d86c4e98565cc64c435f76d`.
- Autoridad: TASK-005/S10, conservar S6–S9. Documento vigente leído completo, incluido L17. Sólo diseño, sin aplicación, publicación, navegador ni capturas; espacios5/6 son humanos. Coordinador mantiene tarea y canvas.
- Superficies: nuevo `design/agenda-polish/04-school-orange.html`, manifest, `design/system.md`, este registro. Registro abierto antes de copiar/editar.
- Skills exactas leídas: gentle-design, gentle-ui-design, design-driven, taste-skill, impeccable. Referencias pertinentes: UI task-and-content/composition-and-feedback/adaptive-interfaces; taste dials/preflight/absolute-bans; catálogo impeccable (critique/clarify/polish). No scripts de skills, instalaciones ni sistemas paralelos.

## Design Read y auditoría previa

Humanist Companion: cuaderno escolar contemporáneo, no infantil. Lexend real y naranja FoxMind con superficies de lectura sólidas; diales variación5/movimiento3/densidad5. Firma: margen fino de cuaderno, papel en capas y puntos de luz pequeños. Reglas: decoración detrás y fuera de texto/celdas, aria-hidden/pointer-inert; naranja en acción/selección con foco azul distinto; efectos breves de interacción anulados por reduced-motion. Gradientes cálidos autorizados por el usuario, no hero SaaS violeta ni partículas perpetuas. Se heredan radios y sombra de marca, no neobrutalismo. Critique/clarify/polish se usan como operaciones de análisis, no comandos instalados.

Auditoría de claridad antes: título genérico “Un espacio para organizarte”; párrafo de instrucciones largo con lenguaje técnico; selector de vista sin indicación visible de propósito; acciones Editar/Eliminar de muestra parecen productivas fuera de su nota. Después previsto: título Agenda, guía breve “Ver por”, separar elegir fecha/abrir evento/crear, nota pequeña sin guardado, acciones explícitas de muestra. Horas/tipo y fecha seleccionada conservan jerarquía, sin métricas o insignias inventadas.

TDD: excepción RED por refinamiento decorativo y microcopy, sin cambio de semántica interactiva. Se copiará 01 antes del refinamiento y preservará JS byte por byte; no se atribuirá a04 la prueba runtime histórica de01. Validación estructural/contraste únicamente, sin afirmar reflujo/foco real o aceptación visual.

## Base preservada

`git status --short && git branch --show-current && git rev-parse HEAD && node <<'NODE'` (hashes con fs/crypto y diff Git, exit0):

- 01 SHA256 `cc94eff7d625400e170b08f3a149795944689275a12f4f54319324b01de1d839`.
- 02 SHA256 `2b6e559f8e8221d88b584feaa4c9be9e66ea9a7fd6947f567cb944b251ac313c`.
- 03 SHA256 `cb77e600938e5c4679cd31a1d53cf0e77006fc113cdcf74340275ef295e11b7c`.
- system.html SHA256 `a59f21b4b09e1a505369614672acbbf0859b8acc799f1e02b82923e143fd4cba`.
- `git diff -- apps/ src/ tests/` SHA256 `ca677504fc4f99c6359ec89cdb575612600d1da4e1ec0f48e7b7896a9a91004d`.
- Árbol inicial sucio de unidades anteriores preservado: CSS mensual,01/manifest/sistema, docs de diseño/Agenda/coordinador/tarea; sin seguimiento handoff, registros previos y prueba mensual. No se descartan ni reescriben.

## Resultado y comprobaciones

1. `node <<'NODE'` con `fs.copyFileSync` y rechazo si04 ya existe: exit0, stdout `Copied 01 byte-for-byte into new 04; original untouched.` Luego se refinó sólo04 mediante edición dirigida. JS se dejó íntegro, no hay cambios de comportamiento que requieran RED nuevo. Microcopy estático no cambia los handlers ni sus efectos.
2. `node <<'NODE'` verificador inline con fs/crypto/assert/vm/child_process (script completo en recibo de herramienta de esta sesión): exit0, stderr vacío. Stdout PASS:
   - Los cuatro hashes de archivos preservados y hash del diff productivo/pruebas son idénticos a la base de arriba.
   - JS de04 byte-idéntico a01, parse por `vm.Script` sin ejecución. Bytes de fuente idénticos a01 y `apps/web/public/brujula/lexend.woff`, SHA256 `d1a6bcc8be16439d978c4bd741a38093196cbeae9f6c71e1254076f4b9755628`.
   - IDs originales únicos/conservados, bindings Mes/Semana/Día/aria-controls, fecha compartida, bucle42 celdas, siete días, ocho colores y actualización preview, dos aperturas editor, dos diálogos, tres cierres y retorno de foco conservados estructuralmente.
   - Sin recursos externos, llamadas de red, storage ni disclosures; fuente primaria Brújula; foco/reduced-motion y reglas responsive767/600/360px; sin animaciones perpetuas o transition:all.
   - Decoración de header y margen con aria-hidden, pointer-events:none, SVGfocusablefalse, sin handlers. Carril propio112px y margen fuera del contenido; ocultación del dibujo en pantallas pequeñas. Sombras existentes y dos bordes de papel sin textura sobre texto/celdas.
   - 34 valores de color documentados en `design/system.md`. Valores añadidos comprobados directamente en Brújula, tokens3D y Brújula-parity; no cambios de marca. Manifest válido con feature `odd/tasks/agenda-ux.md`, cuatro archivos existentes y dimensiones positivas.
3. `git diff --check`: exit0. Sin errores de whitespace, sólo advertencias LF→CRLF en01/manifest/sistema y registros/tarea previamente sucios. No se corrigieron archivos ajenos.

### Contraste calculado, no medición de pantalla

Interpolación sRGB de cada degradado claro con256 posiciones, incluyendo extremos. El mínimo está en el extremo cálido; todas las componentes evolucionan monótonamente, por lo que los extremos también acotan la luminancia. Resultados mínimos tinta/secundario/primario:

- Blanco→papel `#ffedcf`: **12.65 / 4.94 / 4.57:1**.
- Melocotón `#ffeadb`→blanco: **12.49 / 4.88 / 4.52:1**.
- Selección `#fff1e7`→canvas `#f4f7fe`: **13.15 / 5.14 / 4.75:1**.
- Blanco sobre acción/selección naranja `#b8490c`: **5.25:1**.
- Tinta en los ocho fondos de muestra: **>=11.92:1**. Foco azul contra superficies claras: **>=3:1**, comprobado por cálculo. Naranja vivo, halos opacos y trazos al50% sólo decoran, no son texto ni señales únicas.

### Auditoría final de claridad y límites

Antes→después: título genérico→Agenda; instrucciones largas→nota pequeña sin guardado + guía elegir fecha/abrir evento; vistas sin propósito visible→“Ver por”; Agregar genérico→“Crear evento para este día”; Editar/Eliminar con apariencia productiva→“Ver edición de muestra”/“Eliminar (muestra)”; campo de color→“Elegí el color del evento” conservando nombre/check/aria y preview. La vista activa es naranja sólido con texto blanco; fecha seleccionada conserva borde y fondo naranja suave, foco azul independiente. Horario/tipo antes del título en Semana/Día y tiempos tabulares; títulos largos siguen envolviendo.

Targets: reglas heredadas min-height44px y muestras48px, botón principal48px, cierre con min-width44px. No se acredita una medición44×44 de todos los elementos: la rejilla mensual heredada permite min-width0 para conservar siete columnas en móvil. No se alteró ese compromiso de01 para fabricar un PASS. El tamaño efectivo, clipping, hit-testing, contraste rasterizado, comportamiento sticky, Cancel/Escape real y aceptación estética de04 necesitan prueba renderizada autorizada. Las pruebas runtime anteriores son sólo historia de01, no evidencia funcional nueva de04. Se ofrece04 como borrador para mostrar, no como UI verificada para producción.

No hubo fallos del verificador ni correcciones post-check; sin uso de navegador, espacios, screenshots, servicios, builds, instalación, scripts de skills, revisión nativa, memoria o mutaciones Git. No hay scratch/cache creado. Cambios limitados a04, manifest, referencia y este registro; preservar todo lo demás.

## Handoff

S10 propuesto; S6–S9 preservados en estructura/JS/fuente, no reevaluados por navegador. Ninguna nueva afirmación sobre roles autenticados S3 o seguridad. El coordinador hace spotcheck y abre canvas `agenda-polish`, elige **Cuaderno naranja · Escuela contemporánea** para comparar con01; la entrada04 no autoriza implementar.

Prueba sugerida para presentación: Mes→Semana→Día→Mes; elegir13 y volver12; abrir evento; Crear→elegir Automático/Grafito u otro color→ver preview→Cancelar/Escape. Confirmar decoración, claridad y reflujo antes de aceptar. Más identidad escolar y calidez a cambio de mayor presencia visual y algo más de encabezado que01. Próximo paso: presentación humana y autorización explícita antes de tocar app/publicación.

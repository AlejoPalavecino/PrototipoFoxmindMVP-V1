# FoxMind 3D — evidencia visual de la aplicación

Estas son **páginas reales autenticadas de FoxMind**, con datos sintéticos y servicios descartables propios. Ego Space9 realizó los recorridos. `Page.captureScreenshot` no estuvo disponible: se exportó la misma página con media `screen` a PDF y se rasterizó su primera página con Poppler. Por eso se denominan exportaciones visuales, no capturas de pantalla; conservan las limitaciones de paginación y encabezados fijos de la impresión.

Las imágenes WebP son lossless, con igualdad exacta de píxeles frente al PNG renderizado. [Manifest de procedencia, medidas y hashes](manifest.json). Los PDF fuente se conservan en `sources/`; no se publican ni cargan desde la aplicación. Los nombres/correos que aparecen son fixtures escolares sintéticos, no participantes reales. No contienen contraseñas, cookies ni tokens.

[Resultados finales y streams seguros](checks.json):122PASS API,176PASS/4SKIP en nueva+afectada,23PASS en regresiones/PostgreSQL; builds y cierre de Space. Las suites se solapan y no se suman como casos únicos. Las líneas de entrada CSS posteriores tienen validación L1 separada.

| Pantalla | Escritorio | Móvil |
|---|---|---|
| Inicio mixto | [1440](inicio.webp) | [390](inicio-movil.webp) |
| Mis aulas | [1440](aulas.webp) | [320](aulas-movil.webp), [768](aulas-tablet.webp) |
| Aula / Plan | [Docente](plan.webp), [estudiante](plan-estudiante.webp) | [320](plan-movil.webp) |
| Agenda | [1440](agenda.webp) | [390](agenda-movil.webp) |
| Mi perfil | [1440](perfil.webp) | [320](perfil-movil.webp) |
| Configuración | [1440](configuracion.webp) | [390](configuracion-movil.webp) |

![Vista conjunta de las seis pantallas](vista-general.webp)

## Comportamiento observado

Los cinco runtimes estuvieron limitados a360segundos por grupo; todos limpiaron los procesos, contenedores y datos de su propiedad. Un único Space9/p1 se reutilizó para la tarea. Las exportaciones finales corresponden al grupo5, después de las correcciones revisadas.

- Inicio adapta módulos a docente, estudiante, mixto, ninguna aula o solo archivadas; la cuenta no verificada conserva su gate.
- Registro, correo de verificación en Mailpit propio, confirmación con fragmento eliminado y cierre de sesión; edición de perfil persistente al recargar.
- Evento privado creado en Agenda aparece en miniagenda y abre el día autorizado, incluido el extremo de zonas entre Kiritimati y GMT−12.
- Plan abre una actividad real; TP inicia sesión y termina en entrega confirmada. Corrección privada de cero, publicación explícita y consulta efectiva del estudiante comprobadas.
- IA controlada genera una propuesta, permite revisarla y editarla y la aplica como DRAFT. No se usó Google ni se publicó automáticamente.
- Filtros de aulas y búsqueda mantienen conteos verdaderos; siete portadas disponibles y Matemática persistida en borrador. Notificación abre y enfoca el hilo exacto y confirma lectura.
- Error de red de Home no muestra datos anteriores; el reintento recupera módulos. Con imágenes bloqueadas, texto/acciones siguen disponibles. Movimiento reducido sin animaciones activas.

## Límites explícitos

Las cuatro pruebas omitidas son condiciones históricas de navegador de otras suites: cooldown de cuenta, fragmento en documento, invitación en ruta de producción e historial móvil. No son casos nuevos omitidos para esconder fallos. Se verificaron los flujos actuales arriba mediante ego, sin afirmar equivalencia completa con cada escenario omitido.

El zoom nativo200% no pudo confirmarse con la herramienta; reflow320/390/768/1440 y teclado sí fueron observados. LCP/INP no disponibles; diagnósticos CLS quedaron contaminados por cambios de viewport/interacción/exportación y no certifican rendimiento. No se afirma conformidad completa de accesibilidad, dispositivos físicos o Safari. El wizard se observó hasta persistir portada y abrir paso2, no hasta creación completa por UI en este nuevo recorrido; sus contratos/servicios existentes se conservaron y verificaron por pruebas.

Historial de fallos, RED/GREEN, resultados y atribuciones: [registro coordinador](../../2026-10-25-root-visual-migration.md), [juicio dual](../../2026-10-25-root-visual-judgment.md). Reproducción del export desde los PDF originales ignorados: `node docs/work-log/evidence/2026-10-25-foxmind-3d/export-proof.mjs` (Node, sharp y Poppler disponibles en el runtime local).

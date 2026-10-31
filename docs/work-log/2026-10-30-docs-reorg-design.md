# Reorganización documental — contrato ejecutable por dominios

- Agent / role: architect, diseño documental delegado.
- Session or task ID: `/root/docs_reorg_design`.
- Date: iniciado 2026-10-30; continuación 2026-10-31, America/Buenos_Aires, según actualización de contexto del usuario. Se conserva el nombre original del registro.
- Branch / worktree: `codex/documentation-audit`, `C:/Users/alejo/.codex/worktrees/foxmind-audit-remediation/ProtipoFoxMind`.
- Starting commit: `d4fdf34bfa32489905c3482d4fceab3a93914ae5`.
- Phase and detailed task/spec links: [auditoría Astra](../audits/2026-10-30-astra-documentation-audit.md), [roadmap](../implementation-roadmap.md), [protocolo](README.md). El coordinador crea la tarea única `odd/tasks/documentation-reorganization.md`.
- Status: completed para el contrato de diseño delegado; no acredita ejecución/integración de la reorganización.

## Request and scope

El coordinador transmite autorización del usuario para ejecutar el plan completo: reconciliar contradicciones, reorganizar guías por dominios, conservar historia y eliminar únicamente copias innecesarias demostradas; integrar/publicar main limpio después de verificar. Esta asignación solo escribe este registro de diseño. No cambia producto, despliegue, datos retenidos, secretos o Engram. Los demás agentes trabajan en el mismo árbol; no revertir sus cambios ni editar sus registros.

## ESTADO_DISENO: LISTO_PARA_TDD_RED

No hace falta otra entrevista: la arquitectura de información y la compatibilidad son decisiones editoriales reversibles dentro del alcance transmitido. Los contratos de producto no cambian. La fase RED corresponde únicamente al nuevo validador documental, si se incorpora; la migración Markdown puede comenzar en paralelo por ownership disjunto.

## ESTRATEGIA_EQUIPO_Y_SUPUESTOS

Un solo mapa activo y archivo de aceptación: `odd/tasks/documentation-reorganization.md`, propiedad de root. Este registro es la respuesta de diseño atribuida, no otro backlog. Root incorpora allí el manifiesto de rutas definitivo; no mantener dos mapas activos. Corte nuevo en `docs/audits/2026-10-30-documentation-reorganization/`; no ejecutar `audit_docs.py` o `build_map.py` históricos sobre sus salidas.

| Owner | Superficie exclusiva |
|---|---|
| root | `README.md`, `AGENTS.md`, `docs/README.md`, especificación, roadmap, `odd/tasks/documentation-reorganization.md`, `odd/tasks/grading-ai-issue-2.md`, `docs/product/**`, guías IA enumeradas debajo, `docs/work-log/INDEX.md`, `docs/verification/**`, `design-qa.md`, manifiesto/catálogos globales del corte nuevo |
| workerops | 40 orígenes/destinos de la tabla técnica; `docs/engineering/README.md`, `architecture.md`, índices de dominios salvo IA; `docs/api/files.md` solo cabecera/enlace de integración; su registro propio y recibo de migración propio |
| workerdesign | `docs/design/**` excepto cortes históricos inmutables, `docs/entry-glass.md`, `docs/folder-theme.md`, `docs/agenda-event-ux-proposal.md`, `docs/visual-reference-index.md`; catálogo de direcciones/archivo lógico y decisión de los cuatro pares; su registro propio y recibo de preservación |
| test_runner | Solo nuevos `tests/documentation-links.test.mjs` y fixtures `tests/helpers/documentation-links/**`; RED antes de implementación y GREEN independiente |
| worker validator | Solo `scripts/check-documentation.mjs`, `scripts/documentation-links.mjs`, `scripts/documentation-manifest.mjs`, si root incorpora el validador; sin editar tests ni package/CI |
| reviewer | Revisión independiente de diff/manifiesto/compatibilidad y registro atribuido; sin editar fuentes ajenas |

Los destinos `docs/engineering/`, `docs/product/` y `docs/verification/` no existen en la inspección inicial. Antes de cada movimiento comprobar destino vacío; si aparece trabajo paralelo, detener solo esa escritura y reconciliar con root. La rama ya es un worktree aislado; crear más worktrees no aporta aislamiento dentro de los ownership anteriores. Secuencia de commits revisables por dominio y unidades de hasta 400 líneas cambiadas; no agrupar migración técnica completa en un solo parche gigante.

## CONTRATOS_Y_PLAN_POR_SLICE

### 1. Rutas fijas y reconciliación de entrada — root

- Mantener `docs/foxmind-v1-functional-spec.md`, todos sus IDs y anclas; añadir índice acotado de extensiones aprobadas: extracción de plan, generación de actividades, análisis individual y corrección asistida con revisión docente. Corregir exclusión genérica de AI grading sin ampliar modalidades/formatos aprobados ni duplicar privacidad/publicación.
- Mantener `docs/implementation-roadmap.md` y anclas antiguas. Abrir con resumen vigente enlazable, por ejemplo `#estado-actual`, y enlazarlo desde índices. Separar historia mediante un encabezado explícito manteniendo títulos/IDs viejos. Estado de producto reside solo aquí; otros índices enlazan y describen su función.
- Mantener `docs/api/accounts-sessions.openapi.json` sin modificación: carga directa de `tests/p31-contracts.test.mjs:6`.
- Mantener `odd/tasks/grading-ai-issue-2.md`: su existencia activa la rama de CI de `.github/workflows/issue2-ci.yml:84`; actualizar vigencia in situ, conservar criterios/historia y enlazar cierres TP PDF y Q/E con desarrollo/opción única. No afirmar cobertura de todos los formatos.
- `docs/product/README.md`: índice de dominios/extensiones hacia especificación, contratos y guías; no otro conjunto de requisitos.
- `docs/engineering/ai/README.md`: mapa de cuatro funciones y sus fuentes. Root migra las tres guías: `docs/classroom-ai.md` → `docs/engineering/ai/plan-extraction.md`; `docs/activity-ai.md` → `docs/engineering/ai/activity-generation.md`; `docs/student-ai.md` → `docs/engineering/ai/student-analysis.md`. Crear `docs/engineering/ai/grading-assistance.md` como guía breve derivada del contrato issue #2 y controles vigentes, sin copiar prompts ni pruebas privadas.

### 2. Migración técnica real — workerops

Cada fila es un movimiento de contenido a la ruta canónica y un alias en el origen. Enlaces internos del contenido migrado se recalculan desde el destino. No dejar una copia completa en el origen. Preservar los bloques de prueba histórica con fecha/atribución, separados de las instrucciones vigentes. Los índices nuevos enlazan rutas canónicas directamente.

| Origen bajo `docs/` | Destino bajo `docs/engineering/` |
|---|---|
| `backend.md` | `local-development/backend.md` |
| `database.md` | `local-development/database.md` |
| `local-email.md` | `local-development/local-email.md` |
| `local-demo-account.md` | `local-development/demo-account.md` |
| `p9-local-operation.md` | `local-development/operation.md` |
| `identity-http.md` | `identity/http.md` |
| `identity-security.md` | `identity/security.md` |
| `registration-profile.md` | `identity/registration-profile.md` |
| `account-verification.md` | `identity/email-verification.md` |
| `password-recovery.md` | `identity/password-recovery.md` |
| `password-change.md` | `identity/password-change.md` |
| `account-mail-outbox.md` | `identity/mail-outbox.md` |
| `mail-sender.md` | `identity/mail-sender.md` |
| `p3-web.md` | `identity/web.md` |
| `dependency-security.md` | `testing/dependency-security.md` |
| `p3-test-runtime.md` | `testing/account-runtime.md` |
| `p9-runtime-controls.md` | `testing/owned-runtime-controls.md` |
| `private-files.md` | `files/private-files.md` |
| `p4-host.md` | `files/host.md` |
| `p4-web.md` | `files/web.md` |
| `p4-integration.md` | `files/integration.md` |
| `classrooms.md` | `classrooms/classrooms.md` |
| `p5-host.md` | `classrooms/host.md` |
| `p5-web.md` | `classrooms/web.md` |
| `p5-integration.md` | `classrooms/integration.md` |
| `p6-teaching.md` | `teaching/plan.md` |
| `p6-library.md` | `teaching/library.md` |
| `p6-muro.md` | `teaching/wall.md` |
| `p7-authoring.md` | `activities/authoring.md` |
| `p7-participation.md` | `activities/participation.md` |
| `p7-practical-submissions.md` | `activities/practical-submissions.md` |
| `p7-questionnaire-attempts.md` | `activities/questionnaire-attempts.md` |
| `p7-history-notifications.md` | `activities/history-notifications.md` |
| `p8-private-grading.md` | `grading/private-grading.md` |
| `p8-publication.md` | `grading/publication.md` |
| `p8-published-corrections.md` | `grading/published-corrections.md` |
| `p8-progress.md` | `grading/progress.md` |
| `agenda.md` | `agenda/agenda.md` |
| `p9-home.md` | `home/home.md` |
| `foxmind-3d.md` | `home/foxmind-3d.md` |

`local-development/README.md` da el recorrido de entorno propio, configuración sin secretos y arranque vigente; enlaza detalles de cada módulo. `testing/README.md` explica `test:ci`, inventario/grupos de `test:complete`, propiedad/cleanup y lectura de pruebas, sin repetir sumas ni invocar opt-ins históricos. No ejecuta comandos como parte del chequeo documental.

`architecture.md` es un mapa breve basado en barriles públicos y composición: navegador/Next → proxies `/api/v1` → Nest/composición → dominio/puertos → PostgreSQL/almacenamiento/escáner/correo/proveedor IA; workers y sus límites vinculados a sus contratos. Fuente en `apps/*`, `src/core/domain/index.ts`, composición/configuración y `package.json`, solo para comprobar afirmaciones. El mapa no redefine contratos de código. Corregir login ordinario a `/inicio` para cuenta verificada, manteniendo destinos explícitos permitidos/invitación y la verificación obligatoria. En `docs/api/files.md` quitar afirmaciones de integración diferida y enlazar host integrado sin alterar endpoints/reglas.

### 3. Compatibilidad de rutas y anclas — todos los escritores

Un alias tiene título identificador, enlace relativo a la guía canónica y una frase de traslado. Preservar cada ID de encabezado anterior con `<a id="..."></a>` seguido del enlace a la ancla canónica correspondiente; no basta un único enlace genérico. No conservar párrafos, estados, políticas o comandos duplicados. Una sección renombrada recibe su ID histórico explícito en el destino. Encabezados duplicados requieren el sufijo GitHub previo (`-1`, `-2`); no eliminarlo accidentalmente.

Inventario por archivo antes de mover: origen, SHA-256 original, destino, tratamiento, IDs de encabezado y anclas HTML, referencias entrantes documentales/ejecutables identificadas y owner. Después: alias real, destino real, IDs preservados y nuevo hash. Los cortes históricos que mencionan el origen siguen correctos por el alias. No reescribir registros/auditorías congeladas para que parezcan generados hoy. Rutas en JSON/HTML/CSS/JS activos se resuelven desde el archivo consumidor, además de Markdown; un `rg` sin coincidencias no prueba ausencia de carga dinámica.

### 4. Diseño y archivo lógico — workerdesign

- `docs/design/README.md`: entrada vigente con sistema/dirección y evidencia de integración separadas. `docs/design/INDEX.md`: catálogo de familias con rol (sistema aplicado, seleccionado histórico, exploración, antecedente), paquete, decisión/cierre y relación de continuación. No otro checkpoint de producto.
- Mantener físicamente familias, manifiestos, fuentes, herramientas y 82 IDs de flujos. Mantener `entry-glass.md`, `folder-theme.md`, `agenda-event-ux-proposal.md` y `foxmind-folder-platform/HANDOFF.md`; clasificarlos como antecedentes en catálogo/encabezado contextual sin borrar el texto histórico ni cambiar sus resultados. Lo vigente de Agenda se enlaza a la nueva guía.
- Sustituir los siete `file:///` del índice activo por enlaces relativos a archivos ya versionados y una nota textual de procedencia cuando la ruta externa forme parte de la historia. No sondear carpetas externas. `visual-reference-index.md` conserva catálogo/procedencia de las 29 referencias y enlaza el índice de diseño.
- Resolver cuatro pares folder-platform/user-reference-style mediante recibo por par: hash, función/procedencia, consumidores Markdown/manifiestos/herramientas/globs y decisión. Son las dos vistas Inicio v3 y los dos PNG originales del zorro. El coordinador prefiere conservar estas cuatro copias por el paquete autocontenido y el recibo histórico; confirmar esas funciones y registrar la retención satisface la depuración. Una eliminación solo sería admisible si apareciera evidencia nueva suficiente, conservando master versionado, consumidores y mapa de equivalencia sin falsificar validaciones históricas. No tocar los otros seis pares con roles de evidencia/brand distintos.
- `validation.json` y `manifest.json` de 2026-10-22 describen un recibo histórico que fija hashes de documentos y copia local. Si la consolidación rompe esa procedencia y no puede conservarse sin falsificar el recibo, mantener los cuatro PNG. No imponer ahorro de bytes como criterio de éxito.

### 5. Catálogos y evidencia — root

Conservar en sitio, como evidencia contextual y no instrucciones actuales: `backend-verification.md`, `database-verification.md`, `foxmind-3d-verification.md`, `p4-integration-handoff.md`, `p9-acceptance-matrix.md`, `p9-failure-recovery.md`, `p9-joined-journeys.md`, `p9-verification-plan.md`, `p9-final-row-ledger.json`.

`docs/work-log/INDEX.md` ofrece entrada por unidad y fecha hacia coordinador, implementación, prueba, revisión y entrega; relaciones solo verificadas (`continuado por`, `cerrado para este alcance por`). Enlazar los registros existentes sin inferir estados por nombre o estado inicial. Puede dividirse en páginas derivadas por unidad/fecha si hace falta, bajo una carpeta nueva propiedad de root; mantener protocolo/records/evidence intactos. `docs/verification/README.md` diferencia pruebas históricas, grupos y límites; `design-qa.md` pasa a entrada de evidencia visual conservando sus encabezados históricos o enlace al catálogo correspondiente. Catálogos no suman pruebas ni convierten capturas en aceptación funcional.

### 6. Contrato del validador portable — RED separado

Sin dependencias nuevas ni Internet; Node estándar. API pública propuesta `checkDocumentation({root, files, manifest})` retorna `{checkedFiles, checkedLinks, issues}`; cada issue `{code, file, line, target, detail}`. Exports desde `scripts/documentation-links.mjs`; CLI `node scripts/check-documentation.mjs --manifest docs/audits/2026-10-30-documentation-reorganization/manifest.json` (root real por ubicación del script/Git, nunca rutas personales). Exit 0 sin errores, 1 con enlaces/compatibilidad rotos, 2 con uso/manifest inválido. Solo lee el árbol; no ejecuta docs, no red, no escribe cortes históricos.

Manifest versionado: `schemaVersion: 1`, `baseCommit`, `moves: [{from,to,owner,sha256Before,anchorsBefore}]`, `fixedPaths: []`, `preserved: [{path,sha256}]`, `duplicateDecisions: [{paths,sha256,decision,reason}]`. Root agrega decisiones finales observadas, no inventa hashes futuros. Puede acompañarse de un catálogo TSV/JSON si evita superar unidades de 400 líneas; no duplicar el mapa como otro plan activo.

El alcance aceptado por root es acotado: enlaces locales y aliases/anclas del mapa actual, más rutas críticas. Validar los Markdown migrados/índices cambiados y las anclas históricas declaradas en el manifiesto; admitir espacios/Unicode y `%xx`, encabezados y IDs HTML del corpus actual, omitir bloques de código y URLs externas/mail/tel/data. Documentar límites del parser. Enlaces HTML/JSON/manifiestos activos y consumidores ejecutables se revisan explícitamente según inventario; no inventar un parser universal ni intentar decidir semántica de cada string genérico. Un diagnóstico histórico preexistente se registra como baseline con alcance y ruta, sin reescribir historias ni convertirlo en nuevo estado de producto. Ningún alias/enlace nuevo roto puede ocultarse bajo baseline. Histórico `file:///` se registra como localizador externo; ninguno debe persistir en entradas activas.

## CRITERIOS_DE_TEST_DOT

- RED/GREEN del validador con fixtures temporales sintéticos proporcionales al corpus: destino ausente, fragmento ausente, Unicode/espacios/URI, encabezados repetidos e IDs explícitos, links dentro de fences ignorados, externo ignorado, alias con cada ancla histórica enlazada, fixed path ausente y hash de evidencia cambiado. CLI con exit 0/1/2 y root relativo independiente de cwd. Sintaxis adicional solo si existe en los consumidores inventariados. Nada de Docker ni UI para esos tests.
- Migraciones: todos los 43 destinos canónicos y aliases de la tabla técnica+IA existen; ninguna segunda copia íntegra; IDs antiguos siguen resolviendo; índice activo entra a canónicos y no a localizadores personales. Tabla de ruta por cada movimiento comprobada contra Git; comparación de bytes de originales/evidencia preservada salvo guías con cambios editoriales declarados.
- Consumidores fijados: `node --test tests/p31-contracts.test.mjs tests/issue2-ci-workflow.test.mjs` después de verificar que no lanzan recursos externos; prueba proporcional de la compatibilidad OpenAPI y workflow. No modificar esos tests para adaptar la limpieza.
- No se necesitan suites funcionales, Docker `_test` ni ego(lite): no cambia comportamiento/UI. Si aparece un cambio de producto/CI/harness fuera del validador, detener esa unidad para separar contrato y prueba; no convertir una limpieza en ampliación de producto.
- Revisión humana de H01–H10 contra fuentes/cierres: login, cuatro usos IA, integración 3D, alcance real de Gemini, estado de remediación sin afirmar nueva corrida navegador42, instrucciones vigentes separadas de historia, catálogo y cuatro decisiones de duplicado.
- Antes de commits: `git diff --check`, comprobación portable de links/anchors/manifiesto, `gitleaks protect --staged` (si disponible; indisponibilidad queda explícita), revisión independiente y superficie permitida. Work logs ajenos y artefactos preservados no cambian. Root reconcilia todos los recibos y los estados observados; commits/push se registran solo después de existir.

## DoD de la reorganización completa

No cerrar tras reconciliar índices: deben estar ejecutados los 43 movimientos canónicos, aliases/anclas, arquitectura/operación/verificación vigentes, catálogo por unidad, catálogo de diseños, cuatro decisiones de depuración y verificación de consumidores. El plan único queda con resultados/recibos y primer pendiente exacto. Root integra en main la cadena local revisada, observa árbol limpio, hace push dentro de la autorización transmitida y confirma igualdad de la referencia remota; distinguir publicación Git de despliegue. Si integración o push falla, el trabajo sigue parcial y se conserva la evidencia del fallo.

## Work performed and verification

Lectura dirigida de auditoría 30/10, índices, roadmap, protocolo, guías backend/operación/archivos/3D/IA, cierres reales TP y Q/E, package scripts y consumidores CI/OpenAPI. Skills leídas: `cognitive-doc-design`, `clean-architecture`, `team-docs-strategy`. Inspección inicial `git status --short` sin salida; branch y HEAD anteriores confirmados. No consultas de proveedor, secretos, ejecución de producto, instalaciones o escrituras Engram. Un `rg` sobre directorio inexistente `tools/` y un listado opcional de `docs/engineering/` devolvieron exit 1; no se interpretaron como validación positiva. El destino engineering ausente justifica reservarlo, no prueba su estado futuro.

Comprobación Python estándar sobre este registro: exit 0; 147 líneas al corte anterior a esta nota, 40 movimientos ops con orígenes/destinos únicos y 40 orígenes presentes, tres enlaces Markdown existentes y cero blancos finales. `git diff --check -- docs/work-log/2026-10-30-docs-reorg-design.md` exit 0; el archivo seguía untracked y ese comando no valida por sí solo su contenido, por lo que el chequeo Python de blancos/enlaces es la prueba propia. Sin pruebas funcionales porque esta asignación solo especifica la reorganización. El coordinador aceptó mapa 40+3, nombres IA finales, aliases por ancla, alcance acotado del validador y retención justificada de los cuatro pares.

## Commits and outcomes

Sin commits/stage propios. Única escritura propia: este registro. El contrato está listo para incorporarse a la tarea única por root; ejecución y publicación son responsabilidad del coordinador.

## Handoff

Primer paso: root crea tarea/manifiesto en la base real y asigna workerops la tabla de 40 rutas, workerdesign su superficie y test_runner RED del validador; esas tres unidades son independientes. Root puede reconciliar entradas/IA/catálogos al mismo tiempo. Esperar RED observado antes de implementar el validador; no esperar RED para migraciones puramente documentales. No hay decisión pendiente del usuario.

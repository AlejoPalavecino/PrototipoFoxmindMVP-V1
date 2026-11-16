# Mi Estudio: fidelidad a la maqueta aprobada

- Agente: `/root/study_exact`, implementador delegado; identificador de sesión no expuesto.
- Fecha: 2026-11-16. Rama: `codex/foxmind-product-parity`.
- Worktree: `C:/Users/alejo/.codex/worktrees/foxmind-product-parity/ProtipoFoxMind`.
- Commit inicial: `ef6828b96084b0fcaf9a883e4afb95e0871cf1d6`; árbol con trabajo concurrente, preservado.
- Autorización: coordinador transmite autorización vigente de implementación y retiro de UI extra frente a la maqueta externa.
- Superficies propias: `features/study`, `screens/study-screen.tsx`, CSS nuevo `parity-study-exact.css`, pruebas focalizadas nuevas.
- Referencia: worktree externo `foxmind-ui-lab`, `design/foxmind-ui-lab/study-folders.*`, `study-practice.*`, `foxy-{workspace,context,library,planner,generation}.*`.

## Desvíos y plan

1. Colección: filtros extra y borradores con card de carpeta activa. Alinear pestañas, vacíos y tarjetas.
2. Creación: selección de origen y revisión distintas; corregir composición y textos con carga/proveedor reales.
3. Contexto y biblioteca: faltan modos, resumen, tabs y acciones directas. Unificar acceso a materiales existentes sin modificar permisos.
4. Herramientas y creaciones: configuración siempre visible, filtros distintos. Abrir formularios por acción y conservar generaciones y resultados reales.
5. Práctica: todas las preguntas simultáneas. Alinear navegación, revisión y confirmación manteniendo autoguardado y devolución.

## Límites de contrato conocidos

La inspección inicial detectó ausencia de materia, paso guardado y renombrado de conversaciones. El usuario autorizó esos tres cambios durante esta ejecución y el agente `study_persistence` implementó su contrato backend. Este agente integró `subject?:string`, `wizardStep?:number` (0–3, sólo borrador) y `RENAME_CONVERSATION` con `conversationId/title`, sin escribir backend.

`StudyDetail` no expone actividades del aula ni descripción propia de cada sesión. No se inventaron esos datos. La asociación durable de GENERATE a una conversación se elevó al coordinador y luego fue autorizada explícitamente por el usuario. El agente `study_persistence` implementó el contrato y este agente su consumo frontend. Sin dependencias, build web, servidores, secretos, commits o publicación. QA visual a cargo del coordinador.

## Estado y evidencia

VERIFYING; checkpoint de UI congelado para QA del coordinador.

## Resultado por flujo

- Colección: Activas/Borradores, cards completas accionables, materia real, portadas, vacío, progreso persistido y eliminación confirmada. Las carpetas archivadas existentes conservan acceso secundario sólo cuando hay datos.
- Creación: materia, reanudación del paso, portadas principales, fuente propia/aula, carga real y preparación explícita, revisión y regreso a Activas/Borradores. No se reemplazó el proveedor por simulaciones.
- Chat: composición compartida, iconos/botones, prompt de bienvenida al compositor, biblioteca y contextos temporales, contador de creaciones. Renombrado persistente conserva mensajes y borrador del chat.
- Contexto: modos propios/aula, selección de aula y resumen de plan/materiales/creaciones reales. El guardado revalida mediante API; una selección de aula aún no guardada no reutiliza como si fueran suyos los materiales de otra aula.
- Biblioteca: fuente, tabs Materiales/Plan, búsqueda, filtros, agregar/leer/quitar material, plan y estudiar tema. DOCX usa vista previa existente y otros formatos mantienen lectura/descarga disponible. Adjuntos sólo del chat permanecen diferenciados cuando existen.
- Herramientas: seis tarjetas y formulario por intención. Brief y temas se conservan ante fallo, la generación vuelve al chat y usa cancelación real. Sin fases de progreso simuladas.
- Generación durable: un chat nuevo se crea antes de enviar GENERATE; el existente conserva su identidad. La indicación real, parámetros y solicitud se recuperan desde GET. PENDING consulta el detalle, COMPLETE abre el ID persistido exacto, FAILED/CANCELLED/INSUFFICIENT ofrecen reintento explícito. Los reintentos terminales tienen UUID nuevo; un transporte incierto conserva UUID y conversación. La tarjeta sólo proyecta título/identidad, sin respuestas o soluciones de práctica. La conversación seleccionada queda en la query `chat` para recuperar un chat anterior después de recargar.
- Creaciones: filtros Todas/Apuntes/Planes, lectura, edición, descarga TXT de contenido real y acceso a práctica. Se conserva contenido previo y referencias persistidas.
- Práctica: pregunta por pantalla, navegación, revisión, confirmación antes de finalizar, autoguardado, resultados y nuevos intentos mediante comandos existentes.
- Repaso: formulario con inicio, evaluación, temas, duración, cantidad y horario. Se convierte a disponibilidad real y el motor existente asigna las sesiones; edición/revisión y confirmación explícita para Agenda. Se muestran advertencias y coincidencias reales.

## Verificaciones y fallos conservados

- `node --test tests/study-exact-practice.test.mjs`: RED verificable (2 preguntas visibles contra 1 esperada; navegación inexistente), luego 2/2 PASS.
- `node --test tests/study-exact-repaso.test.mjs`: RED por export todavía ausente; luego 2/2 PASS (reparto en zona seleccionada, fechas/cantidad/horario negativos).
- `node --test tests/study-exact-persistence-ui.test.mjs`: 2/2 PASS (materia/paso y renombrado conservando chat).
- Regresión ampliada de tests del feature, seis nuevos y `foxy-study-demand-panels`: 33/38 PASS inicialmente. Cinco selectores/caminos correspondían a UX reemplazada, sin modificar las pruebas automáticamente.
- Con autorización explícita del coordinador, se reconciliaron dos criterios de `study-sequence.test.mjs` (confirmar antes de Agenda, detalles completos avanzan sin archivo pero el plan exige aprobación) y sólo los dos casos de foco Study de `foxy-study-demand-panels.test.mjs`.
- `node --test apps/web/src/features/study/model/study-sequence.test.mjs tests/foxy-study-demand-panels.test.mjs`: 11/12 PASS; único fallo pendiente es el test Filtros de Foxy, de otro propietario. Archivo liberado al coordinador para reconciliarlo con su autor.
- `npx tsc --noEmit --incremental false -p apps/web/tsconfig.json`: sesión 77839 terminó con **exit 0** confirmado. Un resultado anterior comunicado prematuramente como verde se corrigió explícitamente; ese snapshot tenía tres errores `Tab('history')`, resueltos con `historyOpenKey` compatible provisto por el propietario compartido.
- Se revisaron capturas del coordinador `app-study-library-v2-390.png` y `ref-library-390.png`. Se corrigieron ancho móvil, tabs, search en fila, radio de botón, selector de aula, colores y se adoptó `FoxyDialog`. Esas capturas acreditan el desvío previo; la nueva comparación queda a cargo del coordinador.
- QA del coordinador detectó Contexto móvil con tres columnas, título partido, colores heredados y footer dentro del scroll. Se corrigieron la especificidad, las dos columnas y el footer mediante la propiedad externa de `FoxyDialog`. La comparación posterior queda a cargo del coordinador.
- QA detectó que Crear, después de volver desde una carpeta activa, recibía el detalle anterior durante la recarga de catálogo. `StudyScreen` entrega ahora sólo un borrador cuyo ID coincide con la ruta; creación nueva recibe `undefined`. Prueba de regresión con catálogo diferido PASS. El badge de aula vinculada se conserva: la fuente de referencia sí lo incluye condicionalmente.
- GENERATE: pruebas de modelo y hook comenzaron RED por módulos aún ausentes; luego GREEN. Cubren nueva/existente conversación, parámetros reales, proyección sin datos privados, polling y finalización, bloqueo de duplicados, transporte incierto con mismo ID, cancelación recuperada y reintento terminal con ID nuevo. La respuesta CANCELLED no se interpreta como creación completa ni borra el brief.
- Pruebas UI durables: recarga de chat anterior con resultado exacto (no la última creación), tarjeta de práctica sin consignas/respuestas/soluciones, PENDING recuperado y cancelación del requestId persistido. La regresión de Crear valida abrir vacío aun conservando temporalmente el detalle activo.
- El coordinador autorizó completar el fixture de `ux-chat-polish.test.mjs`: se agregó sólo `exams: []`, sin modificar assertions de envío, fallo, IME o doble envío.
- Verificación combinada actual: `node --test apps/web/src/features/study/api/study-client.test.mjs apps/web/src/features/study/model/study-discovery.test.mjs apps/web/src/features/study/model/study-file-policy.test.mjs apps/web/src/features/study/model/study-payload.test.mjs apps/web/src/features/study/model/study-sequence.test.mjs tests/study-exact-practice.test.mjs tests/study-exact-repaso.test.mjs tests/study-exact-persistence-ui.test.mjs tests/study-exact-generation-model.test.mjs tests/study-exact-generation-hook.test.mjs tests/study-exact-generation-ui.test.mjs tests/study-exact-creation-entry.test.mjs tests/foxy-study-demand-panels.test.mjs tests/ux-chat-polish.test.mjs`: **52/52 PASS, exit 0**. Incluye el caso Foxy reconciliado por su propietario.
- Typecheck posterior a GENERATE: `npx tsc --noEmit --incremental false -p apps/web/tsconfig.json`, sesión 4357, **exit 1**. Reportó únicamente dos errores ajenos en `features/foxy/ui/foxy-workspace.tsx` (61:24 TS2554 y 178:17 TS2322, ref sin valor inicial/unión undefined). Informados al coordinador y propietario; no se declara compilación global verde todavía.
- El coordinador transfirió explícitamente la escritura exclusiva de `apps/shared-ui/parity-ai-fidelity.css` a este agente durante QA; el propietario Foxy confirmó freeze. Correcciones CSS contrastadas con `foxy-focus.css`, `chat-expansion.css`, `foxy-workspace.css`, `foxy-library.css` externos y estilos computados informados por el coordinador: padding de workspace 5→0; compositor recupera flujo block/textarea inline-block, margen superior 7px, footer de 44px y gap 8px; móvil conserva fuente comprobada (h2 24px, textarea 15px), botón 36px/icono16px. Se descartaron estimaciones visuales de 22px/14px cuando el estilo fuente y la medición las contradijeron.
- Transcript corto centrado con espacio flexible antes/después y descendientes sin contracción; ese espacio se reduce a cero cuando el historial necesita scroll. Formulario con textarea 105px/min85px, botón ejemplo con borde y fondo peach, labels slate e icono de banner16px. Lectores de ambos roles con ancho760px, separación del título y cuerpo de lectura max70ch. Acción Abrir creación44px/negrita y advertencias11px. No se cambió el texto de proveedor ni se copiaron avisos de demo.
- Checkpoint CSS posterior: parser PostCSS de `parity-ai-fidelity.css` y `parity-study-exact.css` **PASS, exit0**. `git diff --check` de superficies versionadas propias sin errores (sólo avisos de conversión LF/CRLF en archivos previos). El coordinador copiará ambos CSS al snapshot aislado para comparar los estados actuales; este agente no ejecutó navegador.
- Con autorización del coordinador antes del build del snapshot, se aplicaron sólo dos aliases agregados por el propietario compartido: `chat-square` en la sugerencia de bienvenida y `pencil` en Practicar. Freeze TSX informado; este agente no modificó el catálogo compartido de iconos. El propietario Foxy confirmó la corrección de su ref y que el revisor independiente ejecutaba el typecheck global; su resultado corresponde al coordinador.

## Superficies propias finales

Nuevos: `study-collection.tsx`, `study-context.tsx`, `study-library.tsx`, `study-generation-status.tsx`, `model/study-generation.ts`, `model/use-study-generation.ts`, `parity-study-exact.css` y siete suites propias `tests/study-exact-*.test.mjs` (practice, repaso, persistence-ui, generation-model, generation-hook, generation-ui y creation-entry). Modificados: `study-client.ts` (tipos), `study-time.ts`, `study-creation-dialog.tsx`, `study-practice.tsx`, `study-wizard.tsx`, `study-workspace.tsx`, `study-screen.tsx`; tres archivos de aceptación/fixtures autorizados. No se tocaron los cambios previos de `study-materials`, `study.module.css` ni políticas de archivo de otros autores.

Primer paso pendiente: typecheck global después de la corrección del propietario Foxy, QA desktop/móvil y recorrido durable en navegador a cargo del coordinador. No se afirma paridad visual completa ni integración/publicación/despliegue.

## Correcciones de auditoría de flujos

El coordinador reabrió tres defectos comprobados por revisión independiente: cambiar el aula de un borrador que ya importó otro plan, cantidad de sesiones distinta de la elegida y devolución pendiente en práctica sólo objetiva. Se autorizó corregirlos con pruebas RED/GREEN. El backend conserva propietario `study_persistence`: IMPORT_CLASSROOM_PLAN recibe destino opcional `classroomId` y cambia vínculo/plan juntos; PLAN_EXAM recibe `sessionCount` opcional 2–5, con una sesión por ventana y rotación de temas, preservando el modo previo sin ese campo. Se descartó encadenar PLAN_EXAM y EDIT_EXAM porque podría dejar un plan parcial ante fallo. Este agente sólo consume esos contratos y corrige presentación. Estado IN_PROGRESS.

- Wizard: reemplazo de plan usa IMPORT con `classroomId` explícito, sin PATCH previo. Guardar y salir resuelve el cambio de un plan importado antes de guardar metadatos y usa unidades/revisión devueltas. Un fallo conserva el vínculo/plan anterior y permite reintentar. El borrador que todavía no importó ningún plan conserva su guardado incompleto: no se fuerza una importación sólo para salir. Cuatro pruebas nuevas tuvieron RED por PATCH previo, pérdida del vínculo A o importación prematura; luego GREEN.
- Repaso: el formulario envía `sessionCount` en la única operación PLAN_EXAM. La prueba conecta el formulario real con `planExam`, sin simular sus sesiones: RED comprobado 1 contra 3 sesiones; GREEN con 1 tema/3 sesiones, 2 temas/5 y 5 temas/2. Verifica duración completa, rotación e instantes elegidos.
- Práctica: feedback orientativo se muestra sólo si hay respuestas de desarrollo. Práctica objetiva finalizada conserva corrección/explanación sin pendiente perpetuo; desarrollo completo no ofrece una nueva llamada de devolución. Dos pruebas nuevas RED/GREEN.
- `node --test tests/study-exact-persistence-ui.test.mjs tests/study-exact-practice.test.mjs tests/study-exact-repaso.test.mjs`: **13/13 PASS, exit0**. ESLint de ambos componentes modificados: **exit0**.
- Repetición de la tanda combinada frontend documentada arriba, después del último ajuste de borrador: **59/59 PASS, exit0**. Incluye generación durable, foco, chat/IME, práctica, repaso, wizard, cliente y secuenciación de revisiones.
- Typecheck web `npx tsc --noEmit --incremental false -p apps/web/tsconfig.json`, sesión 64477: **exit0**. Este proceso se ejecutó durante la corrección final; el último ajuste de guardado incompleto fue además validado con ESLint y la suite focal. El snapshot final del coordinador compilará las superficies congeladas.
- QA del coordinador confirmó compositor desktop con altura idéntica de 145,8px frente a la referencia; no se volvió a alterar. La última corrección CSS de bienvenida usa peso800 y el mismo padding/gutter del área de mensajes en chat nuevo. Se inspeccionaron sus capturas `app-foxy-final-1440.png` y `ref-foxy-final-1440.png`; nueva comparación a cargo del coordinador.

Estado de estas correcciones: VERIFYING, frontend congelado para snapshot/QA. No se ejecutaron servidores, builds, commits ni navegador desde este agente.

## Último ajuste responsive de QA

El coordinador confirmó bienvenida y compositor coincidentes a 1440/1920 con diferencia menor a 0,5px y pidió corregir sólo CSS de tablet/móvil. Se contrastaron `visual-metrics-final.json`, las capturas de 390px y las reglas externas de `chat-expansion.css`, `foxy-focus.css` y `foxy-library.css`.

- `parity-ai-fidelity.css`: a 681–1000px se recupera padding exterior 10px/14px; el padding 7px/6px queda limitado a 680px. Esto corrige los 16px extra de ancho reportados a 768px sin modificar desktop.
- A 390px se elimina el padding horizontal duplicado de bienvenida y el límite de 338px de sugerencias; se mantiene párrafo de 13px y título de 24px, confirmados en la fuente. Contexto recupera título12px/subtítulo9px y símbolo29×33px con icono16px. Biblioteca usa fuente11px, gap5px, icono15px y contador18px; el footer conserva44px.
- Parser PostCSS y comprobación de espacios al final de línea de ambos CSS propios: **PASS, exit0**. Sin nuevas pruebas de CSS ni cambios TSX. `git diff --check` global detectó espacios/CRCRLF en tests de aulas de otro propietario; no se alteraron esos archivos. La comprobación local de los CSS no detectó esos problemas.

Freeze CSS informado para resync del coordinador. La comparación visual posterior corresponde a su navegador; este agente no la atribuye como ejecutada.

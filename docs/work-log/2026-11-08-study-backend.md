# Backend de Carpetas de estudio

Agente: `/root/study_backend` (worker). Fecha: 2026-11-08. Rama inicial: `main`. Commit inicial: `1f46028a0e08833528ac2bdbe924e45ab8beb5b4`. Worktree compartido; sin aislamiento afirmado ni commits propios.

## Alcance y autorización

Implementación delegada por coordinador desde propuesta aprobada: CRUD privado, borradores, plan, materiales propios mediante puerto, referencia viva a Biblioteca, conversaciones/creaciones/prácticas y examen mediante motor neutral, transporte seguro y persistencia aditiva. No acceso a secretos, recursos retenidos ni proveedor real. Composición de app, custodia de bytes, proveedor, Agenda y avisos pertenecen al coordinador.

Superficies propias: `apps/api/src/study-folders/{commands,http,index,service,sources,types}.ts`, pruebas focales en esa carpeta, `src/core/domain/study-folders.ts`, modelo StudyFolder en `prisma/schema.prisma`, migración `202611080003_study_folders`. Los subdirectorios `uploads` y `reminders` pertenecen al coordinador.

## Resultado local

Carpetas con propietario estudiantil verificado, borrador y revisión concurrente, activación/archivo/reactivación/baja lógica. No reutiliza bytes docentes: consulta pertenencia vigente y materiales/versiones actuales. Validación estricta en activa y estructura incompleta permitida en borrador. Proyección no contiene estado interno ni soluciones activas.

Mutaciones con Origin/CSRF, admisión general y autenticación transaccional antes/después de bloqueos y operación. Dueño serializado por fila de usuario y carpeta. Generación reserva recibo durable y revisión antes de salir de transacción, ejecuta proveedor fuera, revalida identidad/revisión/contenido de fuentes en preflight y al aplicar. Expone callback authorize para revalidación posterior a countTokens/budget e inmediatamente antes de dispatch. No aplica resultado revocado o desactualizado. PENDING repetido no vuelve a gastar; tras diez minutos una nueva consulta del mismo comando lo pasa a FAILED/INTERRUPTED, sin repetir proveedor automáticamente. Fallo de generación queda recuperable por nuevo requestId y revisión actual.

Prácticas autoguardan respuestas, ocultan claves y todo markdown potencialmente revelador de la generación, finalizan idempotentemente y conservan resultado ante fallo/reintento de devolución orientativa. NEW_ATTEMPT conserva práctica previa y versión de preguntas, crea otro ID/respuestas vacías y revalida fuentes antes de reutilizar preguntas. Evidencia adaptativa se calcula sólo con prácticas de la carpeta. Chat conserva todos los turnos y envía ventana de veinte turnos.

Exámenes usan sesiones estables; edición valida identidad única, fechas con offset, futuro, duración y límite del examen. Devuelve advertencia de superposición. Confirmación Agenda es puerto separado, explícito e idempotente; archivar/eliminar cancela avisos mediante puerto sin borrar eventos Agenda.

## Evidencia ejecutada

- RED inicial: `node --experimental-strip-types --test apps/api/src/study-folders/policy.test.ts` falló por módulo de dominio ausente (ERR_MODULE_NOT_FOUND), antes de implementar validador. GREEN posterior: 2/2.
- `node --experimental-strip-types --test apps/api/src/study-folders/*.test.ts`: 12/12 pasan. Incluye borrador/revisión, rol/propiedad, material no disponible, recibos y proveedor fuera de transacción, fallo durable, doce intercambios chat, advertencia de solape, IDs repetidos, recuperación PENDING, autosave/finalización/soluciones/nuevo intento.
- `node --experimental-strip-types --test apps/api/src/study-folders/database.test.mjs`: 1/1 pasa en PostgreSQL Docker propio aleatorio, tmpfs y ownership verificado. Aplica todas las migraciones. Acredita persistencia entre instancias, CF02 dueño/rol ajenos denegados, CF04 alta/baja/revisión de Biblioteca, CF05 revocación previa a dispatch y durante proveedor; resultado rechazado y sin creación persistida.
- `npm run api:build`: Prisma generate y compilación API exit 0 en última ejecución.
- `node --test apps/api/src/study-folders/http.test.mjs`: 1/1 pasa con build fresco, HTTP real, sesiones persistidas, roles/dueño, Origin, CSRF ajeno/incorrecto, invitado, cuenta no verificada y sesión revocada.
- `node node_modules/prisma/build/index.js validate`: esquema válido.
- ESLint focal de archivos propios exit 0; `node scripts/check-boundaries.mjs`: Architecture AST boundaries passed (123 frozen exceptions, sin agregar excepciones desde este agente).

## Fallos y límites conservados

Fixture PostgreSQL inicial usó extensión TXT no admitida y omitió timestamps de escaneo: restricciones existentes lo rechazaron; corregido a metadatos PDF sintéticos válidos. Intento de restaurar material eliminado fue rechazado por identidad inmutable; corregido para probar nueva revisión sin deshacer tombstone. Una compilación encontró cast de prueba faltante, corregido. Otra ocurrió mientras el coordinador removía exports HTTP del barrel: corregidos imports directos y última compilación verde. No se atribuye TDD estricto a todas las pruebas añadidas después de implementar; RED/GREEN comprobado corresponde al validador inicial.

Esta evidencia no prueba proveedor real ni despliegue. Los contratos de archivos/Agenda/avisos son puertos implementados por el coordinador; su QA integrado y la UI completa no se atribuyen a este agente. Persistencia JSON v1 requiere migración explícita si cambia el formato futuro. Límites de cantidad y ventana están fijados en servicio; configuración productiva de cuotas queda a cargo de composición/operación y no se declara aprobada.

Estado: implementación propia verificada localmente; pendiente reconciliación del coordinador con pruebas integradas, QA UI y documentación canónica. Primer paso siguiente: ejecutar el candidato completo y resolver hallazgos reales antes de cerrar TTP.

## Ampliación de integración Prisma/CI y ajustes de QA (2026-11-08)

El coordinador amplió el encargo: reflejar en Prisma las tablas SQL nuevas 004/005/006, admitir todas las pruebas nuevas en CI y resolver hallazgos funcionales de QA dentro del alcance aprobado.

- Agregados modelos `StudyFolderUpload`, `StudyReviewSession` y `StudyAiDispatch`, con columnas, tipos, nullable/defaults y relaciones inversas necesarias en User/StudyFolder/AgendaEvent. Se conservan CHECK e índices parciales en sus migraciones SQL, sin reemplazarlos por índices completos ni reescribir migraciones.
- Inventario y rutas completas admiten las trece suites nuevas: ocho API/dominio (cinco puras y tres PostgreSQL/HTTP) y cinco UI. Se distribuyen entre fast/owned-db y pure/transport/integration-owned; ninguna se excluyó. Runner focal `npm run test:study` construye API fresca y ejecuta la lista explícita. `node scripts/run-ci-suite.mjs --suite study` usa el build ya creado.
- Plan requerido al activar; borrador sigue incompleto. RED del nuevo criterio falló por Missing expected exception y GREEN posterior pasa. Confirmar/reactivar revalida custodia ready/purpose plan. Test específico conserva DRAFT si plan deja de estar ready antes de confirmar.
- El plan aparece como fuente privada `kind: PLAN`, materiales como `kind: MATERIAL`. Chat/herramientas pueden usar el documento del plan sin aula/material extra. La fuente plan no pertenece a la colección removible de materiales. Metadatos distinguen formatos extraíbles (PDF/DOCX o cuerpo textual); se excluyen formatos sin soporte de lectura antes de enviar al motor. Más de veinte fuentes candidatas legibles produce AI_INPUT_LIMIT explícito: no hay truncamiento silencioso.
- `EDIT_MATERIAL {materialId,title,topicIds}` edita metadatos de recursos propios; valida temas de la carpeta y deniega IDs del aula o plan. Bytes siguen inmutables. Test propio acredita edición y denegaciones.
- Se detectó query del bridge CLASSROOM que pedía columnas digest/upload_status fuera de FileObject. El hallazgo fue comunicado al coordinador para corregir sus joins con custodia/uploads; no se atribuye ese cambio a este agente.

Evidencia adicional: Prisma validate PASS; build API fresco PASS; auditoría de runners/discovery 9/9 PASS; check inventory/routing final 511 entradas, 53 exclusiones existentes, 23 rutas PASS. La primera corrida focal ampliada pasó 43/43; tras plan como fuente/editar materiales pasó 45/45 y las dos pruebas de la suite UI discovery recién incorporada pasaron separadamente. Se repite runner final para incluir las trece suites en una sola cuenta, sin nueva ejecución de proveedor real.

Límites: no se ejecutó suite completa de todo el repositorio desde este agente; admisión asegura cobertura declarada, no prueba toda la base. Prisma se alineó manualmente con SQL versionado, sin introspección de datos retenidos ni db push. Los defaults numéricos de cantidad/ventana/contexto son límites de implementación local y no una cuota productiva aprobada.

Cierre de la ampliación: runner final `node scripts/run-ci-suite.mjs --suite study` terminó **48 passed, 0 failed, 0 skipped**. Incluye las trece suites y el nuevo segundo caso integrado del coordinador para admisión IA compartida/revalidación/deduplicación sin proveedor externo, incorporado durante esta corrida. Estado propio: cambios y admisión CI verificados localmente; reconciliación global/QA real continúa bajo el coordinador.

## Protección del presupuesto de estado y CI final (2026-11-08)

Encargo adicional del coordinador por hallazgo de revisión: el JSON acumulado podía exceder el límite de respuesta del proxy y volver inaccesible el detalle de una carpeta.

Se agregó `STUDY_FOLDER_STATE_MAX_BYTES = 3_000_000` en `service.ts`. Es un presupuesto operacional del contrato HTTP local, independiente de una cuota productiva. `serializeState` mide bytes UTF-8 del estado completo, incluidos recibos de idempotencia, antes de INSERT/UPDATE. Rechaza con QUOTA_EXCEEDED y no ejecuta la escritura; no trunca creaciones, conversaciones, prácticas ni recibos. GET mantiene la lectura sin aplicar un rechazo nuevo por tamaño.

RED ejecutado: prueba acumulada de cien ediciones con emojis creció sin rechazar y falló con `must reject accumulated state before the 4 MiB proxy response ceiling`. GREEN ejecutado: acumula hasta el presupuesto, rechaza mutación siguiente, GET coincide exactamente con su valor previo, estado guardado <=3_000_000 bytes y proyección <4 MiB.

Evidencia final: `npm run test:study` construyó API fresca y ejecutó **53 passed, 0 failed, 0 skipped**, incluyendo últimos cambios de motor/UI y dos integraciones PostgreSQL del coordinador. ESLint focal PASS. Inventario/rutas final PASS: 511 entradas, 53 exclusiones existentes, 23 rutas; trece suites nuevas admitidas, sin archivos excluidos por este trabajo.

Se comunicó además al coordinador un límite diferente: colección todavía proyecta unidades/materiales completos por cada carpeta y podría crecer por acumulación entre carpetas, aunque cada detalle cumpla su presupuesto. Se recomendó un DTO de resumen explícito, sin cambiar silenciosamente el contrato de colección desde este agente. Pendiente decisión/reconciliación del coordinador sobre ese contrato.

El coordinador autorizó resolver también el tamaño de colección: agregado `StudyFolderSummary = Omit<StudyFolder, 'units' | 'materials'>`. El listado devuelve sólo metadatos; no fabrica arrays vacíos ni carga el estado completo desde PostgreSQL. El SELECT proyecta `(state->'fields')-'units'` y columnas del resumen, evitando transferir recibos/recursos para armar tarjetas. GET detalle conserva unidades y materiales completos; retomar wizard consulta ese detalle por ID. RED prueba colección detectó arrays presentes; GREEN resumen sin arrays y detalle intacto. Consulta real PostgreSQL de listado también pasó. Así queda resuelta la alerta de colección documentada arriba.

Última corrida después del DTO de resumen: build API PASS; runner terminó **54 passed, 1 failed, 0 skipped**. Falló el caso integrado del coordinador de admisión IA con AI_UNAVAILABLE en adapter; el mock afirma el esquema JSON de respuesta y el coordinador informó cambios/compilaciones concurrentes sobre esos artefactos. No se atribuye la causa definitivamente al presupuesto o al resumen. El candidato completo queda **NO_GREEN hasta conciliación root**. Por pedido explícito del coordinador se detuvieron builds nuevos desde este agente; root es único escritor de `.build` y ejecutará el runner final tras su reinicio. Las pruebas focales del límite/resumen y la consulta real PostgreSQL pasaron; ESLint focal e inventario/rutas también pasaron. No se declara final completo verificado con este fallo pendiente.

## Harness aislado de navegador para QA sintética (2026-11-08)

Encargo del coordinador: preparar otra instancia full app con proveedor estudiantil determinista para revisar herramientas y recorridos, sin tocar la app local Gemini :3000, sus límites o sus recursos.

Agregados `scripts/study-preview.mjs` y `scripts/study-preview-provider.mjs`. El primero selecciona `FOXMIND_STUDY_PREVIEW=synthetic` y reutiliza `documentation-preview.mjs`. El hook opcional sólo en esa selección pasa `options.study.provider`, usa carpeta de artefactos propia con prefijo study-preview y etiqueta el fixture como proveedor sintético. Con flag ausente, conserva la composición de documentación previa.

El proveedor parsea el prompt JSON y reutiliza IDs/versiones de las fuentes autorizadas. PLAN ofrece unidades; CHAT/NOTE/OUTLINE devuelven texto; QUIZ/EXERCISE/MOCK_EXAM generan cantidad solicitada con selección simple, múltiple de dos correctas y desarrollo. La devolución orientativa vuelve por CHAT. Títulos y textos indican QA sintética; no se atribuye contenido a Gemini ni a un proveedor real.

Verificación ejecutada sin build: import del engine ya compilado y prueba de sus siete acciones con cantidades 3/5, corrección y feedback orientativo PASS; node --check de los tres scripts PASS; inventario/rutas 511/53/23 PASS. `node scripts/study-preview.mjs` inició ownership existente con withP4Services/Mailpit: DB/storage/scanner propios ready, migraciones, aplicación, web y seed mediante endpoints reales de dos roles PASS.

Salida ready observada: origin http://127.0.0.1:51745, fixture ignorado `.test-artifacts/study-preview-1827e85aa036b372/fixture.json`, parada `.test-artifacts/study-preview-1827e85aa036b372/stop`. Proceso queda vivo en waitForStop para QA del coordinador. Credenciales sólo en fixture ignorado; no se leyeron ni imprimieron. El coordinador recibe la ruta y es responsable de crear ese stopFile al terminar para cleanup propio. No se ejecutó build ni se reinició/paró otro recurso desde esta tarea.

Límite: esto acredita preparación de infraestructura y validez sintética de contratos; el recorrido de navegador completo corresponde al coordinador. No prueba calidad académica ni generación real.

## Validación de temas antes de reservar/gastar IA (2026-11-08)

QA del coordinador detectó práctica con selección explícita de temas vacía que llegaba al proveedor y recién fallaba al validar su resultado. Se adelantó `selectTopics` al inicio de la rama de generación. QUIZ/EXERCISE/MOCK_EXAM sin temas seleccionados rechazan INVALID_INPUT antes de leer fuentes, invocar callback de preparación o reservar recibo/gasto. PLAN y CHAT conservan admisión de contexto sin temas.

RED: prueba nueva para los tres tipos falló con Missing expected rejection. GREEN: las dieciséis pruebas de servicio pasan; el caso nuevo acredita cero llamadas al generador, revisión inicial intacta, ausencia de recibo y GET legible sin cambios. ESLint focal PASS. No se ejecutó build por coordinación explícita de root ni se reinició el harness sintético o sus contenedores. Runtime ya vivo conserva su build previo hasta que el coordinador decida actualizarlo.

## Preferencias adaptativas privadas por carpeta (2026-11-08)

Por encargo del coordinador se completó la parte de preferencias ya incluida en la propuesta aprobada. Contrato GET detalle: `memory.preferences = {difficulty: EASY|MEDIUM|HARD, questionCount: 1..30, topicIds: string[], lastTool: NOTE|OUTLINE|QUIZ|EXERCISE|MOCK_EXAM}`. Los temas se validan contra la carpeta en el momento de generar. Si el plan se reorganiza después, la UI debe intersectar la selección histórica con los temas corrientes al hidratar controles.

Las preferencias se guardan exclusivamente después de generación COMPLETE de herramienta y después de los retornos de CHAT/PLAN. INSUFFICIENT y fallos no actualizan preferencias. Al finalizar práctica se conserva memoria previa y se reemplaza sólo topics con nueva evidencia. Dificultad/cantidad omitidas usan preferencias anteriores o MEDIUM/5. Validación estricta de tipo/rango ocurre antes de callback de reserva/proveedor. Se escriben preferencias después de replay y generación; no alteran inputHash de la operación en vuelo.

RED: prueba nueva falló con undefined frente al objeto de preferencias esperado en GET. GREEN: 18/18 pruebas de servicio pasan; cubren persistencia/recarga, finalización sin pérdida, defaults posteriores, preservación por CHAT/PLAN/INSUFFICIENT y valores inválidos con cero llamadas/revisión intacta. TypeScript --noEmit PASS y ESLint focal PASS; no se emitió build ni se modificó `.build`. Inventario/rutas PASS 511/53/23. Contrato comunicado directamente a UI y coordinador. Sin cambios al harness vivo, recursos, cuotas o proveedor real. Runner integrado final y actualización de runtime quedan coordinados por root.

## Cierre confirmado del harness aislado (2026-11-08)

Después de que el coordinador creó el stopFile propio, este agente consultó su sesión exec 71448: terminó con exit_code 0 y salida `P4 owned cleanup failures: 0`. La comprobación de existencia (sin abrir el contenido) confirmó que `.test-artifacts/study-preview-1827e85aa036b372/fixture.json` fue retirado por el finally del helper. El cierre recorrió la limpieza propia de web/app, Mailpit y withP4Services. No se ejecutó ninguna operación sobre recursos ajenos ni sobre :3000; no se reabrieron/copiararon credenciales. Estado del harness: cerrado y cleanup sin fallos reportados.

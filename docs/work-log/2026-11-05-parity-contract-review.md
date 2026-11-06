# Paridad Brújula — auditoría independiente inicial

- Agent / role: `/root/parity_contract_review`, quality_reviewer, solo lectura.
- Session or task ID: `/root/parity_contract_review`.
- Persisted by: root; el revisor no escribió archivos ni implementó cambios.
- Date: 2026-11-05 (America/Buenos_Aires).
- Branch / worktree: codex/brujula-parity-audit / checkout principal.
- Starting commit: 668b816fb0028e903dd9488f6083303aa229b0fd.
- Phase and detailed task/spec links: [BRU-11](../../odd/tasks/foxmind-brujula.md).
- Status: completed (auditoría), candidato NOT_VERIFIED.

## Request and scope

Inspección independiente de HTML y código de Foxy, Agenda, Biblioteca, Muro, Progreso, Alumnos, Historial y Configuración. Excluyó shell/Inicio/Plan/autoría trabajados por root.

## Work performed

Hallazgos comprobados por fuente:

1. Biblioteca: HTML2397–2401 admite archivo opcional, contenido/descripcion y uso del recurso; Library y LibraryService exigen archivo y sólo guardan título/unidad/tema. Búsqueda actual sólo título; referencia también tipo/unidad/tema. Falta ficha de lectura integrada.
2. Agenda: HTML1752/1763/1768 admite excepción de una ocurrencia; dominio/API/editor actual sólo serie completa. Requiere excepciones persistentes, con propietario/revisión/validación temporal.
3. Configuración: falta edición de coverKey tras publicación, tanto formulario como PATCH. Catálogo de dominio existente reutilizable.
4. Alumnos/Historial: falta ficha diferenciada con navegación a progreso/análisis/actividad/intento exacto. Resumen de memberships omite activityId. Correo docente ausente; sólo se debe exponer al docente, nunca compañeros.
5. Muro: filtros locales sólo consideran diez publicaciones cargadas; consulta antigua puede quedar oculta. Filtrar en servidor con cursor asociado al filtro, manteniendo paginación acotada.
6. Foxy: renderiza markdown completo y ofrece handoff actividad/rúbrica para cualquier respuesta READY. Referencia usa tarjeta/tipo. Exportación sólo PDF frente a PDF y DOCX de referencia. Enter/Shift+Enter y rail3+historial móvil faltan.

No encontró contratos demostrablemente huérfanos: visuales, preparación/publicación/gestión de recursos, progreso/análisis, edición/moderación tienen consumidores activos. Conservar permisos y reglas reales; no sustituir escaneo/límite50MB por simulación10MB.

## Verification

Sólo `git status`, `git rev-parse HEAD`, `rg --files`, `rg -n` y `Get-Content`. Leyó especificaciones/guías y snapshots app/ref de Biblioteca/Progreso/Alumnos generados por root. No ejecutó tests, navegador, servidor, migraciones ni accedió a secretos. Primeras rutas/comodines inexistentes corregidas sin atribuirlas a producto. El árbol cambió por trabajo concurrente de root; hallazgos corresponden a lecturas indicadas.

## Commits and outcomes

Sin commits ni cambios propios. No P0/P1 confirmado; brechas anteriores P2, teclado/rail P3. No es aceptación del candidato final.

## Handoff

Incorporar brechas a BRU-12 y agregar casos RED de contratos/acciones antes de su implementación. Revisión final de diff identificable pendiente.

## Revisiones acotadas adicionales — atribuidas al revisor, persistidas por root

2026-11-06, mismo task /root/parity_contract_review, sin escrituras propias: detectó allowlistRUBRIC faltante, edición de serie desde fecha trasladada, rechazo de texto multilínea y borrado de excepciones al editar metadatos. Root corrigió esos cuatro hallazgos con pruebas focales y SQL. Revisor confirmó normalización AAD UUIDlowercase después de reproducir código recuperable distinto por casing. Dio mapa de19archivos para retirar9accionesPlan sin debilitar setup/ownership/stale/CAS; root convirtió setup a fixtureSQL explícito. Las lecturas de progreso/archivos/versiones y setTopicState siguen vigentes.

Revisión TEXT posterior: migración P6 prohíbe cambiar file_id; actividades y citas dependen materialId/fileId/digest. Propuso contrato de revisión inmutable con relación única, pipeline upload/scan/cuota, CAS, idempotencia y digest servidor. No ejecutó servicios ni pruebas y marcó NOT_VERIFIED. Root implementó revisión sin relink automático de evidencia histórica dentro del alcance actual autorizado. No atribuir implementación ni SQL10PASS al revisor. Revisión del contrato implementado solicitada nuevamente; resultado pendiente.

Revisión acotada del contrato implementado (2026-11-06), read-only mismoagent: probes puros reprodujeron FILE→TEXT sinreadyFile y pérdida de replay tras cambio de resourceUse; inspección detectó context-sourceshistórico y discrepancia titletrim; también comparó badge con Home/History para exmiembros. Root corrigió esos cinco puntos y agregó casosSQL/UI; el revisor no ejecutó esas pruebas. Último informe delrevisor emitido mientrasrootagregaba command_hash aúnreportaba replaypendiente; rootlo considera corregidocon casoSQL de replaydespuésdeeditar metadatosyGREEN26delgrupo, sinatribuirverificaciónalrevisor. Nueva revisión globalfinalpendiente.
# Revisión atribuida adicional — 2026-11-06

Última revisión de `/root/parity_final_verify` sobre `Wall.tsx` y reglas Muro de `brujula-parity.css`: sin hallazgos concretos. Probe propio con componente real/hooks en memoria confirmó identificadores/operaciones de edición y respuesta, cancelación sin escritura, confirmación con `confirm:true`, acciones ocultas en aula archivada, recuperación de carga sólo ante error y nombre accesible «Responder publicación». Permisos siguen condicionados por `canEdit`, `canRemove`, `removedAt` y archivo. No ejecutó navegador, servicios ni SQL; el coordinador comprobó ancho y controles en captura Ego114 y repetición integrada107. R0, HEAD base668b816 + diff; sin escrituras ni memoria del revisor.

Seguimiento final de `/root/parity_final_verify`, R0, persistido por el coordinador: inspeccionó selectores, paginación/acciones, decoder y UI de notificaciones sobre HEAD `668b816…` + diff activo. Comparó los tres `WHERE` con HEAD y comprobó que siguen idénticos. El nombre de quien entrega sólo se proyecta al docente; la calificación exige publicación/intento entregado/alumno correcto; Muro no muestra el mensaje eliminado y conserva respuestas vigentes conforme a la regla existente. Probes propios verificaron límites Unicode321/80/280 y escape HTML. Ejecutó `node --test --test-concurrency=1 tests/audit-notifications-contract.test.mjs tests/brujula-notifications-complete.test.mjs tests/notifications-presentation.test.mjs`: **10 PASS, 0 FAIL** propios, sin hallazgos nuevos. No ejecutó SQL/builds/navegador/E2E ni escribió archivos o memorias. El coordinador sí verificó después SQL99 (18 PASS del grupo) y E2E100 (2 PASS); no se atribuyen al revisor.

## Verificación final independiente del candidato

Persistido por el coordinador a partir del informe de `/root/parity_final_verify`, revisor R0, 2026-11-06, rama `codex/brujula-parity-audit`, HEAD base `668b816fb0028e903dd9488f6083303aa229b0fd` más diff activo. Se solicitó `gpt-6.1-sol` con razonamiento `xhigh` según la política del proyecto; el agente informó que el runtime no le expone una confirmación independiente del modelo efectivo.

Inspeccionó el diff productivo y las siete migraciones, permisos, revisiones TEXT/digest y archivos históricos, CAS/respuesta escrita/reentrega, corrección/IA, exclusividad NEXT, código docente, Agenda y navegación. Detectó dos P2: inicio de intento inducido por una URL `mode=respond` sin acción local y plazo general mostrado en la ficha del alumno pese a prórroga individual. El coordinador corrigió ambos. El revisor ejecutó probes propios con módulos reales: URL externa inicia cero intentos, acción local concede un único inicio y el replay no inicia otro; individual en Buenos Aires y `null` explícito se propagan hasta la ficha. Ningún hallazgo abierto en su alcance inspeccionado.

Ejecuciones propias del revisor: `node --test --test-concurrency=1 tests/p7-practical-client.test.mjs tests/grading-ai-snapshot.test.mjs` (8 PASS); cuatro casos puros seleccionados por nombre de `tests/agenda-recurrence.test.mjs` (4 PASS, SQL excluido); `tests/foxmind-3d-flows-attempt.test.mjs`, `tests/classroom-activity-redesign.test.mjs` y `tests/brujula-authoring-complete.test.mjs` (43 PASS). Total propio 55 PASS, cero fallas, más los probes. No ejecutó Docker, migraciones, builds, lint, navegador, proveedores ni E2E. No leyó secretos ni configuración/datos retenidos. No escribió archivos, commits ni memorias. Su estado completed corresponde a la auditoría acotada, no a aceptación global ni publicación; los últimos ajustes visuales y el candidato recompilado siguen a cargo del coordinador.

La revisión previa de `/root/parity_contract_review` también reejecutó probes de guardado/publicación tardíos: cerrar o cambiar de destino durante POST o refresh preserva el destino nuevo; publicación confirmada con lectura fallida sólo reintenta lectura. Sin hallazgos abiertos en esas carreras. No ejecutó build/lint/navegador ni atribuyó como propias las suites del coordinador.

Revisión posterior del solver: `/root/parity_contract_review` identificó P2 por plazo general en lugar del individual y por preparación que podía reabrirse tras cerrar/cambiar destino. El coordinador corrigió ambos con pruebas RED/GREEN; el revisor confirmó después estáticamente el override `undefined/null`, `cancelResponse`, cierres y guardas. No ejecutó las pruebas atribuidas al coordinador.

Revisión posterior del contrato práctico escrito: mismo revisor, R0, HEAD `668b816…` + diff no congelado. Leyó migración002, Prisma, servicio/HTTP/proxy, proyecciones de sesión/historia/corrección, copia de reentrega, UI y snapshot/provider de IA. No encontró defecto concreto nuevo: propiedad/membresía/recepción/editor/CAS bajo locks, SUBMITTED antes de lectura docente, texto separado de consigna e incluido en huellas. Señaló brechas de prueba específicas de inmutabilidad/copia y recuperación ante respuesta/refresh perdidos; el coordinador está completándolas. Resultado del revisor: inspección estática completada sin hallazgos; ejecución funcional NOT_VERIFIED por ese agente. Sin ediciones, navegador, secretos ni servicios.

El coordinador recibió de `/root/parity_contract_review` dos revisiones R0 adicionales, sin modificaciones del revisor: (1) mapa de cobertura de los recorridos históricos P9 frente a la UI actual; (2) comparación estática de Inicio alumno y Perfil con el HTML aprobado. Identidad runtime no disponible; no se escribieron memorias atribuidas.

El mapa identifica como brechas que no pueden retirarse sin prueba actual: moderación cancelada/confirmada conservando respuestas; destinatarios, lectura y apertura exacta de notificaciones; reorganización del mismo archivo vinculado a actividad; las tres métricas separadas de progreso; persistencia conjunta tras reinicio y digest de bytes privados. El coordinador está adaptando `tests/p9-teaching-remainder-integration.test.mjs` al helper actual, sin tocar el helper histórico congelado. No se declararon retiradas ni verificadas las pruebas antiguas por esta revisión.

La comparación estática detectó el sidebar234 frente a240 del HTML desde1580px, especificidad de padding de Inicio y contenedor1550 interior frente a1474, padding32 frente38 en Perfil; colores/iconos de accesos de alumno, destacado pendiente, comentario de feedback y controles extra en Perfil. El coordinador implementó ajustes parciales. El revisor comprobó archivos/diff y referencias HTML, no renderizó ni probó el resultado: **resultado renderizado pendiente**.

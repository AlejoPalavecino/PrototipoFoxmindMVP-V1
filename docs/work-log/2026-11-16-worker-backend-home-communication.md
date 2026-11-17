# TASK-009 / TASK-016 - Muro y bandeja

Agente /root/backend_authoring_contracts. Fecha 2026-11-16, rama codex/backend-capabilities, worktree C:/Users/alejo/.codex/worktrees/069c/ProtipoFoxMind. Base dd6f4bc92b959cce0e2c68343291614270c4a17e mas cambios concurrentes preservados.

Alcance: separar bandeja en Home, mantener productores de avisos dentro de su tx academica; organizar capacidades y tipar contratos sin cambiar URLs, permisos, SQL, locks, filtros o destinos. Ownership communication/home, dos bootstraps y nueva composicion de notificaciones, guias home/teaching y este registro. Sin DB/red/proveedores/secretos/commits. Mapas propios en .test-artifacts/backend-capabilities.

Registro abierto antes de implementar. Pendiente evidencia y reconciliacion del coordinador.

## Resultado del candidato

TASK-009: communication/wall gobierna feed, hilo, respuestas, publicaciones, edicion y moderacion. WallService y WallReadPort ya no poseen metodos de bandeja. WallRepository tiene ocho operaciones tipadas por objeto; el adaptador traduce post/reply a tablas estaticas y limpia title al retirar posts, sin recibir SQL del consumidor. Su insercion de notifications permanece antes del avance de revision y dentro de la tx academica. RevisionPort se importa de Aulas.

TASK-016: home/dashboard conserva HomeService, transporte, UoW y proyecciones de Inicio. home/notifications posee NotificationInboxService, lectura/paginacion, destinos y estados de bandeja. El repositorio nuevo tiene cinco operaciones tipadas por objeto para descubrimiento del destinatario, locks de cada familia y marcado. Su puerto de lecturas usa comandos acotados y NotificationPage/ClassroomNotification concretos; AgendaNoticeSource especifica los avisos proyectables. SQL, filtros, cursores, reautorizacion y locks se conservaron. La busqueda autorizada que ya pertenece a classrooms/catalog mantiene ese duenio.

Los metodos numerados del repositorio original se distribuyeron: readWallPosts01 -> findPost; insertWallPosts02 -> createPost; insertWallReplies03 -> createReply; updateWallPosts04 -> updatePostTitle; updateNotifications05 -> editContent; updateNotifications06 -> removeContent; readNotifications07 -> lockTarget; insertNotifications08 -> createWallNotifications; readNotifications09 -> findRecipientClassroom; updateOF10 -> lockWallNotification; updateOF11 -> lockAcademicNotification; updateOF12 -> lockGradeNotification; updateNotifications13 -> setRead.

## Mapas y APIs

Mapas exactos estables: .test-artifacts/backend-capabilities/communication-move.json (8 rutas) y home-move.json (24 rutas). El primero incluye notification-selection de Communication a Home/notifications; el segundo conserva las rutas originales de Home. Los helpers se ejecutaron con scope de cada modulo; no se remapearon externos ni archivos de otros escritores. Root debe aplicar ambos mapas a externos/CI/inventarios.

APIs nombradas: communication/wall/public.ts ofrece WallService, WallRepository y WallReadPort; home/dashboard/public.ts ofrece HomeService/createHomeService; home/notifications/public.ts ofrece NotificationInboxService, sus contratos y target mappers. Los public de modulo reexportan por esas capacidades, sin infraestructura.

Wiring exacto para root: importar NotificationInboxService desde bootstrap/academic-notifications-composition.ts; crear new NotificationInboxService(this.context), donde context tiene run, classroom y ports.signingKey. Cambiar los cinco delegadores de fachada listNotifications/listNotificationPage/readNotification/readAllNotifications/openNotification a esa instancia, conservando sus firmas. Wall no retiene compatibilidad de bandeja. El bootstrap original de Muro ahora construye solo lecturas y persistencia del Muro.

Propios: academic-communication-composition.ts, nuevo academic-notifications-composition.ts y home-host.ts. No se editaron academic-composition.ts, application.ts ni academic-http.ts. Carver recibio ownership exclusivo de academic-routes/http-operations en las dos capacidades; esos cuatro archivos no fueron editados ni remapeados por este agente.

## RED/GREEN y evidencia observada

- Primer intento del test de extraccion fallo por ruta relativa incorrecta (ENOENT); se corrigio el fixture antes de comprobar RED real.
- RED real: node --test apps/api/src/modules/home/notifications/application/inbox.test.ts: 0/1 por presencia de listNotifications/openNotification/notificationAction en Wall, antes de extraerlos.
- GREEN inicial 1/1 tras extraccion. Los demas casos agregados caracterizan el comportamiento conservado; no se afirma RED individual previo por cada caso.
- GREEN final: node --experimental-transform-types --test con communication/wall/application/wall.test.ts, home/notifications/application/inbox.test.ts y home/notifications/infrastructure/{repository,projections}.test.ts: 29/29 PASS, sin skips.
- El intento de ejecutar projections.test.ts sin experimental-transform-types fue bloqueado por propiedades de constructor TS en dependencias; se ejecuto el comando compatible anterior. No fue fallo funcional ni se oculto.
- Muro: notificacion atomica antes de revision, revision obsoleta sin publicaciones/avisos, edicion ajena prohibida antes de persistencia.
- Inbox: destinatario antes de aula-lock; revalidacion de pared/actividad/nota antes de marcar; destinos autoritativos exactos; recipient ajeno/recurso revocado no marca; proyecciones pasan por puerto reautorizador; listas usan read y lectura masiva write; IDs invalidos fallan antes de tx.
- Proyecciones: revocacion entre descubrimiento y lock impide marcado; read-all toma locks por ID global y reevalua visibilidad; cursor rechaza actor/filtros diferentes y SQL conserva filtros antes del limite.
- 16 casos congelados desde el adaptador y selecciones originales comparan SQL exacto, argumentos, resultado y tx de las 13 operaciones originales, incluyendo variantes post/reply de edicion/retiro/lock.
- Corpus SQL restante comparado AST contra HEAD: 31 originales / 31 actuales, cero consultas nuevas/faltantes. Sumado a las 13 operaciones anteriores cubre el corpus productivo original de ambos modulos.
- TypeScript createProgram strict/noEmit sobre TODOS Communication/Home y tres bootstraps propios: 0 diagnosticos propios. Incluye seis @ts-expect-error para impedir fragmentos SQL, genericT elegido por consumidor, mezcla repositorio Muro/bandeja y ausencia de destinatario. No reemplaza build global.
- ESLint de ambos modulos y tres bootstraps: PASS. git diff --check de superficies propias: PASS.
- checkBoundaries(process.cwd(), { checkStale: true }): 0 violaciones propias y 0 globales en ultima comprobacion. Durante implementacion aparecieron hallazgos concurrentes Foxy/Study; no fueron editados por este agente.

## Documentacion y pruebas nuevas

Se actualizaron docs/engineering/home/README.md y se agrego un parrafo a teaching/README.md, preservando el texto congelado de Curriculum. Explican duenio de bandeja y produccion atomica; no cambian reglas de producto. Cuatro tests nuevos enumerados arriba deben registrarse en CI/inventarios por el coordinador. Tests existentes aprobados no fueron editados.

## Limites y siguiente paso

No se ejecuto build global, DB, integracion real, navegador, proveedor, red ni publicaciones. Las tx sinteticas prueban orden/identidad y ausencia de llamadas tras rechazo; no acreditan contencion o rollback de PostgreSQL. Root integra la fachada y verifica build/suites/HTTP e inventarios; Carver verifica sus rutas. TASK-009/TASK-016 no marcadas DONE por el implementador.

Reversion: invertir solo los dos mapas, reponer el Wall original y su composicion, retirar Inbox/contratos/pruebas/composicion propios y restaurar solo agregados documentales de esta unidad. Coordinar con root la reversion de delegadores externos y con Carver las rutas nuevas; no usar git restore global ni revertir trabajo ajeno. Primer paso pendiente: verificacion conjunta de fachada, build y regresiones oficiales.

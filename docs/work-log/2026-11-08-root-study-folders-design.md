# Carpetas de estudio: definición y propuesta

- Responsable: Codex /root, orquestador; identidad de sesión no expuesta.
- Fecha: 2026-11-08. Checkout principal, rama main, commit inicial 1f46028. Árbol inicialmente limpio.
- Ruta: R2 con controles de privacidad, acceso a materiales e integración con Agenda.
- Autorización: el usuario pidió la sección estudiantil y aprobó las recomendaciones de una sola aula vinculada, sincronización con revocación, adaptación por carpeta y recordatorios internos configurables. Esta etapa prepara diseño y especificación; no confundir esa aprobación con aprobación de un modelo de datos todavía no presentado.
- Superficies: propuesta en docs/product, enlace en índice de producto y mapa documental. Sin cambios de producto, migraciones, proveedores, credenciales o servicios en ejecución.
- Fuentes leídas: base README/roadmap/especificación, arquitectura/datos, diseño, biblioteca, aulas, IA/Foxy, Agenda, política documental y registros. Código: FoxyScreen/workspace, modelos AgendaEvent/Notification/FoxyConversation y tipos de navegación.
- Hallazgos: Foxy docente exige su política propia; Notification requiere classroom_id, por lo que un recordatorio personal necesita soporte explícito. Agenda carece de anticipación de avisos. La biblioteca conserva identidades de revisiones; consultar por título no identifica una fuente de forma segura.
- Referencias visuales inspeccionadas: teacher-classrooms.png y teacher-foxy-discovery-desktop.png existentes. Son evidencia histórica de la base, no pantallas nuevas ni QA funcional de esta propuesta.
- Skills: harness-discovery, harness-ux-ui, harness-architecture, harness-specification; criterios de diseño existentes contrastados con design-taste-frontend, landing-page-design y ui-ux-pro-max. cognitive-doc-design para el documento de revisión. La dirección visual explícita del usuario prevalece sobre generar otro estilo.
- Fallos de inspección: Navigation.tsx no existe; se ubicó navbar-types.ts. Dos búsquedas con glob en argumento de ruta fallaron en PowerShell; se corrigieron a rutas existentes. Lecturas iniciales extensas se truncaron; las decisiones de permisos y datos se contrastaron mediante lecturas focales.

## Estado de la definición inicial

Propuesta recuperable en [Carpetas de estudio](../product/study-folders-proposal.md). Alcance funcional confirmado; UX detallada, arquitectura/modelo propuestos e implementación pendientes de aprobación. No se crea registro TTP hasta aprobar el diseño y autorizar ejecución, conforme TTP v1.0.

## Comprobaciones de la definición inicial

Resultado observado: npm run docs:check comprobó 66 archivos y 724 enlaces, con 0 problemas (exit 0). git diff --check exit 0 para archivos rastreados; las dos altas aparecen como no rastreadas y fueron incluidas por docs:check. git status --short muestra únicamente las cuatro superficies documentales de esta tarea. No corresponde ejecutar pruebas de producto para cambios exclusivamente documentales. No se abrió navegador, no se arrancó la app y no se generó contenido con IA del producto. Sin commits, push o despliegue.

## Implementación autorizada

El usuario respondió «Si lo apruebo» a la solicitud explícita de aprobación de pantallas, solución/modelo y ejecución. Se inicia implementación y seguimiento en [tarea única](../../odd/tasks/study-folders.md), con plan nativo de cinco hitos. Delegación proporcional autorizada por AGENTS y skills: backend, motor e interfaz en superficies disjuntas; coordinador integra composición, navegación y puentes transversales. Se preserva el trabajo documental previo. Sin autorización nueva de Git o despliegue.

El resultado de implementación y su cierre se detallan debajo.

## Cierre de implementación

Implementado en working tree main sobre 1f46028, sin commit propio, push, integración publicada o despliegue. La aprobación explícita autorizó UX/modelo/ejecución. Se mantuvo el stack y el espacio docente separado. [Guía canónica](../engineering/study/README.md), [tarea única](../../odd/tasks/study-folders.md), [recibo](../verification/study-folders.json).

Carpetas/borradores/planes, fuentes vivas con revocación, custodia privada, Foxy/creaciones, prácticas/feedback/nuevos intentos, preferencias/evidencia por tema y planificación/Agenda/avisos implementados. Cuatro migraciones aditivas se probaron en bases vacías propias y se aplicaron sólo al entorno local registrado. Estado3MB por carpeta y colección resumida impiden bloquear lectura; cuota de archivos configurable, sin decidir cuota productiva. La recuperación tras login usa destinos literales/UUID autorizados y vuelve a verificar dueño.

### Evidencia y atribución

- Orquestador: npm run test:study final con build fresco:65 PASS,0 FAIL,0 SKIP. API/web construidas por local:restart; tsc web sin emisión PASS. npm run lint:boundaries PASS (123 excepciones congeladas), tests del guard13 PASS, inventario511 entradas/53 exclusiones/23 rutas PASS. No se agregaron exclusiones para ocultar pruebas.
- Regresiones: admisión compartida Foxy30 PASS usando el loader oficial; Agenda14 PASS y continuidad de cuenta4 PASS. No se ejecutó la suite completa del repositorio, CI remoto, carga ni auditoría WCAG completa.
- Backend delegado /root/study_backend: RED/GREEN de reglas, servicio, PostgreSQL aislado y HTTP con identidad persistida/CSRF/Origin; fuentes/versiones/revocación predispatch y completion. [Registro propio](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/work-log/2026-11-08-study-backend.md).
- Motor /root/study_engine:15 pruebas de contexto, preguntas, fracciones, planificación, historia extensa y práctica sin temas. [Registro](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/work-log/2026-11-08-study-engine.md). UI /root/study_ui:22 pruebas de contrato/proxy/selecciones/revisiones/zonas/preferencias/feedback, tipos/lint. [Registro](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/work-log/2026-11-08-study-ui.md). Los conteos focales están incluidos en65, no se suman como ejecuciones independientes del candidato.
- /root/study_review, sólo lectura por instrucción (sin aislamiento fuerte afirmado): VERIFIED focal, sin P1/P2 abiertos entre lo revisado. Últimos cotejos propios52 pruebas y42 pruebas de guardas/preferencias; no hizo DB/build/navegador. Snapshot focal previo de nueve archivos ffc2b0a57f0a43b1000f3368f087ad9ea17a0c131436b0ee0aa4d9edce049670, distinto de un hash Git del candidato completo. Correcciones visuales/continuación posteriores se comprobaron por root/UI, no se atribuyen al revisor.

### Aplicación real y límites

Ego Lite en una única TaskSpace3: estudiante sintético sobre app local propia. DOCX subido/validado/escaneado, extracción de unidades y chat Gemini reales PASS; quiz3 validado directamente en motor con Gemini y material sintético propio, sin atribuirle un E2E completo de navegador. Examen determinista: tres sesiones confirmadas en Agenda, aviso privado y conservación tras reinicio PASS. Logout/login volvió a carpeta exacta mediante next; guard de práctica sin temas visible/deshabilitado antes de gasto.

Harness aislado explícitamente sintético, sin sustituir app habitual Gemini: aplicación/API/PostgreSQL/almacenamiento/ClamAV/Mailpit reales propios, cinco herramientas generadas. Práctica SINGLE/MULTIPLE/desarrollo guardada y reabierta tras recarga, sin soluciones antes de finalizar; corrección y devolución orientativa visibles; nuevo intento vacío conservó previo. Doce Tabs permanecieron en diálogo y Escape devolvió foco al disparador. Diez capturas con metadatos a390/834/1440 sin desborde; banner final medido366,7px para tarjeta368,3px incluyendo borde. Catálogo188 capturas,376 hashes exactos verificados. Captura intermedia de feedback retirada antes de catalogar por texto pendiente corregido después.

El actor demo agotó su cupo diario existente de cinco solicitudes IA; no se elevó ni se cambió clave/proveedor. Dos quizzes iniciales de navegador fallaron al deseleccionar todos los temas preseleccionados; esa ruta ahora se rechaza en UI/comando/motor antes de reservar o invocar proveedor. Se agregaron schema contextual y etiquetas de documentos para robustecer referencias. No se repitió quiz E2E real tras renovar esas guardas por el cupo agotado. Esta limitación no se presenta como PASS Gemini. Formatos AI legibles PDF/DOCX/cuerpos TEXT; otros permitidos se descargan. Esquemas son texto editable; recordatorios sólo internos.

### Fallos y recuperación conservados

Lecturas iniciales truncadas/rutas o globs PowerShell inexistentes se corrigieron mediante lecturas focales. Una prueba de integración inicial usó pg bigint como string; se alineó el adaptador sintético a BigInt de Prisma. Una invocación directa de regresiones sin loader falló por sintaxis TS; se repitió con register-api-test-build y transform-types:30 PASS. Builds concurrentes provocaron un fallo temporal del mock que esperaba schema todavía no compilado; el candidato se reconstruyó en serie y cerró65 PASS.

QA automatizado: seleccionar archivo no lo cargaba hasta el clic explícito (espera corregida); fill nativo no completó datetime-local en Ego, se usó setter/eventos del control; una espera confundía0 preguntas sin responder con respuestas pendientes. La edición concurrente del diagnóstico provocó CONFLICT conservando formulario; reintento con revisión actual confirmó. Hubo referencias de snapshot obsoletas y ventanas minimizadas; se observaron estado/targets actuales y se restauró sólo la ventana del espacio agente. No fueron presentados como fallos de producto.

Un local:restart falló leyendo JSON transitorio; local:status confirmó STOPPED propio y local:up recuperó READY. Reinicios finales construyeron app actual y conservaron datos/configuración. Harness descartable cerrado por stopFile exacto: proceso hijo exit0, P4 owned cleanup failures0, fixture retirado. TaskSpace3 cerrada keep vacío. App habitual queda READY con Gemini y configuración autorizada; no se leyeron secretos históricos ni se imprimieron credenciales.

### Estado y siguiente paso

Implementado y verificado localmente con alcance/omisiones del recibo, sin bloqueantes de código abiertos. Documentación canónica reconciliada y tareas DONE sólo tras evidencia. No quedan cambios de producto del alcance aprobado; comprobación opcional futura: quiz E2E real con temas al renovarse cupo. Publicación Git, infraestructura productiva y despliegue requieren otra autorización.

Comprobación final de entrega: docs:check72 archivos/776 enlaces/0 problemas; git diff --check exit0 (avisos informativos LF/CRLF conservados); lint:boundaries e inventario PASS; local:status READY. Catálogo188 capturas/376 hashes exactos. Sin tareas, revisiones o procesos descartables pendientes; el supervisor habitual propio queda encendido.

Memoria opcional: búsqueda Engram disponible; intento de guardar el resumen durable rechazado por PreToolUse porque la sesión host no está registrada. No se inventó identidad ni se afirmó persistencia. Toda la continuidad esencial queda en este repositorio.

## Publicación posterior autorizada

El usuario autorizó commits, push e integración a main. Entrega funcional 3c30de328b5e4e518bd5faf4282c9773ca45afa1 integrada por fast-forward y publicada; SHA remoto comprobado. El registro de publicación conserva la evidencia de esta etapa. Las menciones anteriores de ausencia de publicación describen el cierre previo a esta autorización. Sin despliegue.

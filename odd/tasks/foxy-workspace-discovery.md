# Foxy: conversaciones y creaciones encontrables

- **Spec:** propuesta y criterios 1–8 de [revisión](../../docs/work-log/2026-11-08-root-foxy-review.md), aprobados explícitamente por el usuario el 2026-11-08; implementación autorizada en el mensaje siguiente.
- **Design:** Brújula vigente, chat central, título editable, contexto/fuentes antes de enviar; widget segmentado Herramientas/Creaciones; conversaciones y creaciones con búsqueda y filtros, contexto y destinos visibles; recuperación en hasta tres acciones de navegación.
- **Owner:** /root, único escritor del registro.
- **Record:** [implementación](../../docs/work-log/2026-11-08-root-foxy-implementation.md).
- **Delivery:** local; sin autorización nueva de commit, push o deploy.

## FOX-01 — Catálogos privados completos
- **State:** DONE
- **Depends on:** none
- **Owner:** backend worker, integrado y verificado por /root
- **Acceptance:** búsqueda y filtro de conversaciones sobre todo el conjunto autorizado; catálogo paginado de resultados NOTE/PLAN/ACTIVITY/RUBRIC/DIAGRAM/IMAGE, incluidos anteriores y aún no abiertos; destinos reales y estado privado/preparación/borrador/publicado, aislados por propietario. Sin migración ni llamada IA para listar. Conservar contratos anteriores.
- **Evidence:** RED módulo ausente; GREEN catálogo SQL/HTTP 3/3 y suites repositorio/runtime 14/14 y servicio/HTTP 19/19 del worker; revisor independiente repitió catálogo SQL/HTTP 3/3. Build API y lint PASS; filtros prelimit, lectura sin materializar, título editado, aislamiento/roles y destinos efectivos comprobados. Proxy allowlist RED 404 → GREEN; inventario CI actualizado. Ver registros atribuidos.
- **Blocker:** none

## FOX-02 — Conversaciones y contexto previo
- **State:** DONE
- **Depends on:** FOX-01 (integración de filtros)
- **Owner:** /root y UI worker en superficies disjuntas
- **Acceptance:** renombrado validado persiste, conflicto no sobrescribe; selección de temas/fuentes antes del primer envío; búsqueda/filtro completo y abrir conversación de resultados paginados; Markdown seguro legible. Guardas de cambios no guardados vigentes.
- **Evidence:** controladores nuevos RED 6 fallos → GREEN; suite controladores/runtime/guardas 79/79; regresiones y foco GREEN. Navegador real observó tema/fuente antes de primer turno, mensaje multilínea, renombrado y recuperación tras reload. Conversaciones → aula → abrir, tres clics; cuenta/roles y concurrencia en SQL/controladores, sin proveedor real. Recibo y límites en registro.
- **Blocker:** none

## FOX-03 — Herramientas y Creaciones
- **State:** DONE
- **Depends on:** FOX-01
- **Owner:** /root y UI worker en superficies disjuntas
- **Acceptance:** selector accesible con cinco herramientas y catálogo recuperable tras recarga; apertura directa de texto/visual sin recorrer chat; contexto de origen distinto de destino; enlaces reautorizados; móvil con acceso directo, búsqueda/filtro y apertura hasta tres acciones; carga/vacío/error/recuperación.
- **Evidence:** pruebas componentes y catálogo GREEN; apertura directa de apunte y publicación efectiva observadas en navegador, estado publicado y destino en Creaciones tras recarga. Visual antiguo preservado y reautorizado con polling en regresión y repro independiente. Tres clics móviles Creaciones → Apuntes → abrir; Escape tras refresco de catálogo (1435 ms) conserva botón y vuelve a colección; segundo Escape al disparador. Catálogo mantiene páginas ya cargadas durante actualización.
- **Blocker:** none

## FOX-04 — Validación y documentación
- **State:** DONE
- **Depends on:** FOX-01, FOX-02, FOX-03
- **Owner:** /root; revisor independiente de sólo lectura
- **Acceptance:** pruebas focales, build/tipos/lint/documentación, navegador real 390/768/1440 y teclado/foco; permisos, persistencia, enlaces, tres clics; documentar límites y actualizar fuentes canónicas.
- **Evidence:** builds API/web, lint/boundaries, inventario CI y docs PASS; suite focal completa web Foxy salida 0 y grupos detallados en registros. Revisor independiente sin bloqueantes tras correcciones (último recheck 30/30). Ego real 1440/768/390 sin desborde horizontal; teclado y retorno de foco; tres capturas nuevas con metadatos/buildId y hashes del catálogo. Recursos propios limpiados; sin commit/push/deploy o proveedor real. Guías canónicas, modelo, roles, especificación y roadmap actualizados.
- **Blocker:** none

## FOX-05 — Gemini real y entrega Git
- **State:** VERIFYING
- **Depends on:** FOX-04
- **Owner:** /root
- **Acceptance:** usuario amplía autorización a comprobar Gemini con la clave de raíz antes de commits/push; comprobar chat, continuidad, herramientas, fuente insuficiente y vinculación en fixtures propios; luego integrar y publicar main, sin despliegue.
- **Evidence:** clave validada sin exposición; chat/continuidad, fuentes, insuficiencia y cinco herramientas reales comprobadas en ensayos separados. Dos timeouts sin reintento; reproducción sin llamadas nuevas de cuatro resultados completos acredita PDF revisado, catálogo y TP privado. Correcciones de instrucciones y avisos excluidos del catálogo con RED/GREEN; adaptadores/presupuesto 21/21, catálogo SQL/HTTP/visual 3/3. [Registro de entrega](../../docs/work-log/2026-11-08-root-foxy-publication.md), [recibo real y límites](../../docs/verification/foxy-gemini-real.json).
- **Blocker:** ninguno externo; publicación Git pendiente. Configuración habitual y despliegue fuera de esta comprobación aislada.

## Contrato de integración acordado

`GET /foxy-ai/conversations`: conserva limit/after; suma q (búsqueda literal de título, hasta 120 caracteres), context (`ALL`, `GENERAL` o UUID de aula). `GET /foxy-ai/creations`: limit (1–50), after (cursor base64url JSON `{createdAt,id}`), q (hasta 120), context (ALL/GENERAL/UUID), type (ALL/NOTE/PLAN/ACTIVITY/RUBRIC/DIAGRAM/IMAGE), status (ALL/PRIVATE/PREPARING/DRAFT/PUBLISHED). Resultado `{items,next}`. Cursor creado/ID estable y filtros aplicados antes del límite; propietario docente verificado.

Creación: `{id,kind,title,context,conversationId,turnId,visualJobId,assetId,createdAt,status,destinations}`. IDs no aplicables null. `kind` es tipo de herramienta; `status` resume destinos efectivos. `destinations`: `{kind:'MATERIAL'|'ACTIVITY',classroomId,classroomName,id,state:'PREPARING'|'DRAFT'|'PUBLISHED'}`. `id` es material/actividad cuando existe, null si sólo preparación. No incluir destino de otros propietarios ni marcar asignado el origen del chat. Respuestas CHAT/SUMMARY quedan fuera; texto READY de herramientas entra aun sin foxy_resource materializado. Visuales sólo READY/asset disponible. Ediciones privadas prevalecen en título. No nuevas dependencias ni modelo de datos.

UI accede con un controlador de catálogo separado (cancelación y revisión de filtros); abrir resultado de texto usa conversación+turno directamente y verifica con API; visual selecciona su conversación/trabajo y muestra la publicación existente. Las colecciones no deben descargarse completas para filtrar en cliente.

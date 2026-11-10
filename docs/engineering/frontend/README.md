# Frontend y composición visual

Next Pages Router conserva las rutas y proxies `/api/v1`; el backend mantiene autorización y publicación. El frontend se organiza por capacidad, con composición global separada. El [diseño UX/UI](../../design/README.md) y las [capturas actuales](../../design/current/README.md) conservan las reglas de experiencia.

## Dónde ubicar un cambio

| Superficie | Responsabilidad |
|---|---|
| `apps/web/pages` | Adaptadores Next de páginas y rutas HTTP |
| `apps/web/src/screens` | Pantallas que coordinan sesión y features públicas |
| `apps/web/src/application` | Shell, navegación, clientes autenticados y coordinación entre capacidades |
| `apps/web/src/application/server` | Proxies Node, SSR privado y captura estática de enlaces de prueba |
| `apps/web/src/features/<capacidad>` | UI, estado, API y validación de la capacidad |
| `apps/shared-ui` | Controles, feedback, Markdown, fechas, portadas y estilos genéricos |

Las features son identity, agenda, classrooms, curriculum, materials, communication, activity-authoring, participation, grading, home, notifications, foxy, study y files. Exponen entradas explícitas `index.ts`; cuando se necesita transporte puro, `api.ts` evita cargar TSX/CSS. Otra feature no importa sus archivos internos. Shared no importa features ni composición. Los directorios anteriores `apps/classrooms-ui`, `apps/agenda-ui`, `apps/web/src/components` y `apps/web/src/lib` están retirados.

`application` se usa porque `src/app` está reservado para App Router y es incompatible con la ubicación actual de `pages`. Los componentes `academic-*` de application coordinan varias capacidades: no trasladar esa coordinación a una feature ni reintroducir un cliente académico global como dueño de todas las reglas.

## Composición y contratos

`application/navigation/destinations.ts` define continuaciones y destinos globales; `account-navbar.tsx` compone cuenta, búsqueda, aulas y notificaciones. `application-shell.tsx` conserva tema, foco y cleanup. `_app` conserva CSS y captura inicial de documento Foxy; `_document` mantiene el orden del script de prueba mediante `application/server/token-capture.ts`.

Agenda reúne UI/model/API en su feature; `screens/agenda-screen.tsx` compone sesión/navegación y `application/agenda-client.ts` adapta el caller autenticado. Foxy y Estudio exponen sus capacidades por feature y coordinan documentos, recursos y navegación desde screens/application. El transporte Node queda fuera de las entradas de navegador. Los proxies limitan destino, método y payload; ocultar controles no sustituye permisos.

Los rechazos de Aulas/Foxy descartan el cuerpo pendiente sin retener chunks, dentro de un presupuesto adicional finito y de la ventana metadata absoluta de 10 s desde la entrada. Se conserva el tamaño JSON aceptado. Una vez drenado, entregan el error completo; si se exceden descarte/plazo o se cancela, abortan el transporte y liberan listeners y timer. No se garantiza JSON de error para un cuerpo arbitrariamente grande. Implementación compartida: [ciclo del cuerpo rechazado](../../../apps/web/src/application/server/rejected-request-body.ts).

Notice/Dialog viven en `apps/shared-ui/feedback.tsx`; Button/Input/Label, clases y portadas son genéricos. La navegación específica de aula pertenece a classrooms. Brújula conserva Lexend. La guía base describe menú compacto por debajo de 1024 px, mientras las reglas específicas Brújula activan sidebar desde 801 px: esta migración conserva esos quiebres y corrige únicamente la oclusión que producían al superponerse. Unificar el umbral requiere una decisión UX aparte. Recursos de producción: `apps/web/public`; estilos compartidos: `apps/shared-ui`. Los nombres fm3d/p5 aún utilizados no autorizan borrar sus recursos.

## Comprobar una pantalla

Revisar roles, carga/vacío/error, confirmación, foco/teclado, mobile/tablet/desktop, contraste y movimiento reducido. Una captura acredita lo visible; no demuestra transacción o persistencia. La aceptación de la reorganización se conserva en el [tablero](../../../odd/tasks/architecture-migration.md).

Fuentes: [páginas](../../../apps/web/pages/), [pantallas](../../../apps/web/src/screens/), [features](../../../apps/web/src/features/), [composición](../../../apps/web/src/application/), [controles](../../../apps/shared-ui/brujula-controls.css), [navegación de aula](../../../apps/web/src/features/classrooms/ui/ClassroomNavigation.tsx). [Política documental](../../documentation-policy.md).

# Frontend y composición visual

Next Pages Router conserva las rutas y proxies `/api/v1`; el backend mantiene autorización y publicación. El frontend se organiza por dominio y caso de uso, con composición global separada. La organización por casos de uso está integrada en `main`. El [diseño UX/UI](../../design/README.md) conserva la experiencia vigente.

El candidato de origen `codex/frontend-cohesion` conserva su [recibo](../../verification/frontend-cohesion.json) de 1.288 pruebas y recorridos propios. La [integración con backend](../../verification/refactor-integration.json) tiene evidencia nueva del conjunto y registra su entrega local; los resultados originales no se atribuyen al combinado.

## Dónde ubicar un cambio

| Superficie | Responsabilidad |
|---|---|
| `apps/web/pages` | Adaptadores Next de páginas y rutas HTTP |
| `apps/web/src/screens` | Pantallas que coordinan sesión y features públicas |
| `apps/web/src/application/shell` | Tema, foco global y composición ordenada de estilos de producto |
| `apps/web/src/application/navigation` | Destinos, continuaciones y navbar |
| `apps/web/src/application/clients` y `transport` | Composición de clientes autenticados y transporte HTTP genérico |
| `apps/web/src/application/workflows` | Coordinación entre capacidades: colección/creación/interior de aula, sesión de actividad, Foxy y avisos |
| `apps/web/src/application/server` | Proxies Node, SSR privado y captura estática de enlaces de prueba |
| `apps/web/src/features/<dominio>/<caso>` | Componentes, estado, reglas y estilos del caso; pruebas próximas cuando corresponda |
| `features/<dominio>/api` y `model` | Adaptadores HTTP y contratos/reglas compartidos dentro del dominio |
| `apps/shared-ui` | Controles, feedback, Markdown, fechas, portadas y estilos genéricos |

Las features son identity, agenda, classrooms, curriculum, materials, communication, activity-authoring, participation, grading, home, notifications, foxy, study y files. Exponen entradas explícitas `index.ts`; cuando se necesita transporte puro, `api.ts` evita cargar TSX/CSS. Otra feature no importa sus archivos internos. Shared no importa features ni composición. Los directorios anteriores `apps/classrooms-ui`, `apps/agenda-ui`, `apps/web/src/components` y `apps/web/src/lib` están retirados.

`application` se usa porque `src/app` está reservado para App Router y es incompatible con la ubicación actual de `pages`. Los antiguos componentes planos `academic-*` están agrupados en workflows. La coordinación entre dominios permanece allí; las reglas y el estado de cada capacidad pertenecen a su feature. No crear carpetas para funcionalidades pequeñas ni reemplazar un componente grande por un hook que concentre las mismas responsabilidades.

| Dominio | Casos principales |
|---|---|
| materials | catalog, reader, publishing |
| study | folders, conversations, creations, practice |
| activity-authoring | drafting, generation, publication |
| grading | editing, ai-review, publication, results, progress |
| classrooms | collection, enrollment, creation, workspace, members, settings |
| foxy | conversations, context, collections, resources, publication, visuals, tools, workspace |
| agenda | calendar, event-editor, event-details, upcoming |
| curriculum | plan, extraction |
| identity | authentication, profile, settings y controles internos compartidos |
| home / notifications | dashboard y cola / inbox |
| participation | questionnaire, practical, receipts y revisión |
| communication / files | Piezas pequeñas conservadas sin subdivisión ceremonial |

## Composición y contratos

`application/navigation/destinations.ts` define continuaciones y destinos globales; `account-navbar.tsx` compone cuenta, búsqueda, aulas y notificaciones. `application/shell/ApplicationShell.tsx` conserva tema, foco y cleanup. `_app` incorpora `application/shell/styles/product.css` y captura inicial de documento Foxy; `_document` mantiene el orden del script de prueba mediante `application/server/token-capture.ts`.

Las pantallas reúnen sesión, ruta y capacidades públicas. `application/clients/agenda-client.ts` adapta el caller autenticado de Agenda. Biblioteca, Autoría y Corrección reciben operaciones tipadas; sus adaptadores conocen las rutas HTTP. El transporte genérico conserva CSRF, timeout, abort y cabeceras del editor; la validación histórica de respuestas académicas se inyecta desde la composición, fuera del transporte genérico. El transporte Node queda fuera de las entradas de navegador. Los proxies limitan destino, método y payload; ocultar controles no sustituye permisos.

En Estudio, reemplazar el contexto invalida resultados tardíos y su recuperación; una escritura confirmada sigue confirmada aunque falle el refresh. El intento creado se obtiene de su recibo, sin inferirlo por orden de la colección. En Corrección, recarga y navegación comparten la decisión de reemplazar o conservar el borrador. Guardar y publicar siguen siendo operaciones distintas.

Los rechazos de Aulas/Foxy descartan el cuerpo pendiente sin retener chunks, dentro de un presupuesto adicional finito y de la ventana metadata absoluta de 10 s desde la entrada. Se conserva el tamaño JSON aceptado. Una vez drenado, entregan el error completo; si se exceden descarte/plazo o se cancela, abortan el transporte y liberan listeners y timer. No se garantiza JSON de error para un cuerpo arbitrariamente grande. Implementación compartida: [ciclo del cuerpo rechazado](../../../apps/web/src/application/server/rejected-request-body.ts).

Notice/Dialog viven en `apps/shared-ui/feedback.tsx`; Button/Input/Label, clases y portadas son genéricos. La navegación específica de aula pertenece a classrooms. El diseño vigente usa Nunito y navegación compacta hasta 1000 px; la reorganización conserva esos valores. Los estilos específicos viven en su dominio; los temas que coordinan varias capacidades, en shell/navigation. `product.css` conserva el orden de importación global. Se retiraron únicamente reglas exactamente repetidas con prueba de orden; los overrides distintos no se eliminan por parecido. Recursos de producción: `apps/web/public`. Los nombres fm3d/p5 aún utilizados no autorizan borrar sus recursos.

## Comprobar una pantalla

Revisar roles, carga/vacío/error, confirmación, foco/teclado, mobile/tablet/desktop, contraste y movimiento reducido. Una captura acredita lo visible; no demuestra transacción o persistencia. El guard AST existente comprueba entradas y ciclos; `check-frontend-architecture.mjs` añade imports por dominio, transporte fuera de presentación tipada y estilos genéricos sin dependencia de features. El inventario y rutas explícitas de suites deben acompañar cada movimiento o prueba nueva.

Fuentes: [páginas](../../../apps/web/pages/), [pantallas](../../../apps/web/src/screens/), [features](../../../apps/web/src/features/), [composición](../../../apps/web/src/application/), [controles](../../../apps/web/src/application/shell/styles/brujula-controls.css), [navegación de aula](../../../apps/web/src/features/classrooms/workspace/ClassroomNavigation.tsx). [Política documental](../../documentation-policy.md).

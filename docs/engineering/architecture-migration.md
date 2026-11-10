# Migrar FoxMind por dominios y responsabilidades

El usuario aprobó el 2026-11-10 la migración incremental a monolito modular con casos de uso, puertos/adaptadores y frontend por features, y autorizó su implementación por etapas. Este documento conserva diseño y aceptación; el [tablero](../../odd/tasks/architecture-migration.md) registra ejecución y evidencia. La [arquitectura vigente](architecture.md) describe lo efectivamente implementado.

## Alcance y compatibilidad

Conservar stack, rutas y contratos HTTP, permisos, reglas, datos, apariencia y comportamiento. No modificar esquema Prisma ni migraciones para reorganizar código. Mantener las rutas técnicas de OpenAPI y del contrato de corrección IA. Publicación y despliegue requieren autorización propia.

Separar movimientos mecánicos de extracciones de reglas. Mantener adaptadores temporales de una sola implementación con consumidor y condición de retiro identificados. No dejar dos implementaciones de la misma regla.

## Diseño aprobado

- Backend: `apps/api/src/modules/<dominio>/{domain,application,infrastructure,presentation}` y entrada pública explícita. Crear solamente las partes necesarias; sin capas vacías.
- Composición del backend: `bootstrap` conecta infraestructura, módulos y ciclos de vida. `platform` contiene soporte técnico, sin reglas académicas.
- Frontend: `apps/web/src/application` compone sesión/navegación/layouts; `screens` compone features; `features/<capacidad>` reúne UI, estado, API, validación y pruebas; `shared` contiene infraestructura cliente y presentación genérica.
- Ajuste técnico comprobado durante el primer corte: el plan llamaba `app` a la composición frontend. Next reserva `src/app` y rechaza su coexistencia con `pages` en otra raíz. Se usa `application` para conservar Pages Router, rutas y responsabilidades; no es una migración a App Router.
- Reglas neutrales compartidas: agrupadas por dominio, separadas de DTOs seguros para cliente y de contratos SQL. La ubicación definitiva se introduce por dominio durante su piloto, sin crear paquetes o workspaces adicionales.
- `presentation -> application -> domain`; infraestructura implementa puertos y bootstrap la conecta. Dominio no importa frameworks, HTTP ni adaptadores. Features no importan internos de otras features; shared no importa features.
- Interfaces entre módulos pequeñas y explícitas. Proyecciones autorizadas pueden coordinar dominios por contratos de lectura; no forzar llamadas repetidas ni desarmar transacciones.

## Mapa de responsabilidades y destino

Inventario de partida: commit `aebc603`. Conteos excluyen tests y archivos generados; incluyen TS/TSX y CSS. Son una referencia de organización, no una medida de calidad.

| Dueño | Origen principal | Destino y contrato |
|---|---|---|
| Identidad | `apps/api/src/identity`, `identity-security`, `account-mail-outbox`, `mail`; web `account-*` | Módulo identity: cuenta/sesión/abuso/correo; frontend identity. Hash, correo y DB son adaptadores; autorización de cada recurso sigue en su dueño. |
| Aulas y pertenencia | `classrooms/{drafts*,memberships*,invitations*,classroom-codes,policy,revision}` | classrooms: creación, propiedad, pertenencia, archivo y revisión; frontend creation/membership. |
| Plan | `classrooms/plan*`, `classrooms/ai` | curriculum: unidades, temas, progreso temático y extracción; frontend curriculum. |
| Biblioteca | `classrooms/library*` | materials: publicación, versiones y conservación; contrato transaccional con files. |
| Muro | `classrooms/wall*` | communication: consultas, avisos, respuestas y moderación. |
| Autoría | `classrooms/activity-*`, `classrooms/activity-ai` | activities: contenido, borrador y asignación; frontend activity-authoring. Clasificar auxiliares de participación por sus consumidores antes de mover. |
| Participación | `classrooms/{attempt-*,activity-participation,activity-session,practical-submissions,questionnaire-*,submission-receipt,activity-history}` | participation: obligación/intento/editor/recepción; frontend activity-submission. |
| Calificación | `classrooms/{grading*,grade-*,scoring,progress*}` | grading: cálculo exacto, corrección, publicación, auditoría y progreso académico; frontend grade-review. Separar avance de temas al dueño curriculum. |
| Agenda | `apps/api/src/agenda`, `apps/agenda-ui`, web `agenda-*` | agenda: eventos privados, recurrencia y proyección académica. Piloto de extremo a extremo. |
| Inicio y avisos | `apps/api/src/home`, `classrooms/*notification*`, web `home-*`, `notifications-screen` | home/notificaciones: proyecciones y destinos reautorizados. Los productores académicos conservan sus transacciones. |
| Foxy | `apps/api/src/foxy-ai`, web `foxy-*` | foxy: conversaciones/recursos privados y preparación/publicación confirmada. Puertos hacia materiales/actividades/files. |
| Estudio | `study-folders`, `study-engine`, web `study-*` | study: carpetas/fuentes/prácticas/repasos privados, sin permisos docentes. |
| Archivos | `apps/api/src/files` | files: bytes, custodia, escaneo, cuotas y acceso; ninguna feature obtiene autoridad por un ID de UI. |
| Proveedores y host | API `ai`, archivos raíz `*-integration`, `application`, `configuration`, `database` | Adaptadores por contrato y composición explícita. Presupuesto/admisión compartidos no unifican políticas de privacidad. |
| UI y navegación | `apps/shared-ui`, `classrooms-ui/components`, web `classroom-client` | Presentación genérica independiente de Aulas; navegación global fuera de su cliente HTTP. |
| Contratos compartidos | `src/core/domain` (54 archivos planos) | Agrupar por dominio y distinguir reglas, DTOs y persistencia. Conservar identidad de errores en compatibilidad. |

Backend: 361 archivos; classrooms 114, foxy-ai 92, files 43. Frontend: web/src 72; classrooms-ui 90 planos; agenda-ui 34 planos; shared-ui 85 planos. La base AST tiene 123 excepciones: 44 broad barrel, 29 cross-module private API, 19 public surface, 8 eager-cycle edges, 19 mixed-cycle edges y 4 type-only-cycle edges. Son aristas, no cantidad de ciclos independientes. Fuente reproducible: `inspectBoundaries` y `legacyEdges` en los scripts de límites.

## Transacciones y garantías a conservar

| Operación | Frontera actual | Garantía de migración |
|---|---|---|
| Mutación académica | `classrooms/context-run.ts`, `context.ts` y servicios | Misma transacción, autenticación repetida, cuenta verificada, locks de aula/pertenencia, revisión y rate limit. Extracción de módulo no habilita segunda transacción autónoma. |
| Entrega y editor | Participación, cuestionarios, adjuntos y recepción | Capacidad de edición, revisión y recepción atómica; no duplicar intento ni cambiar puntualidad. |
| Corrección/publicación | grading, grade-publication y grade-corrections | Privado/publicado separados; precisión exacta, versión guardada, motivo/auditoría y nota efectiva. |
| Agenda privada/académica | `agenda/unit-of-work.ts` | Lock de dueño, reautenticación después de esperar y al terminar; repositorio privado y proyección autorizada en la unidad vigente. |
| Estudio/Agenda | `study-agenda-integration.ts` | Confirmar sesiones/eventos/recibos dentro de la transacción recibida; conflicto ante modificación independiente. |
| Archivos/Biblioteca | `attachment-integration`, `library-publication`, `files` | Mismos bytes aprobados/escaneados; identidad, custodia y conservación no se sustituyen por mover DTOs. |
| IA y cierre | Runtimes, colas y `application.ts` | Idempotencia, presupuesto, propiedad del trabajo y drenaje antes de cerrar DB/storage; pruebas sintéticas no gastan API. |

## Etapas y aceptación

1. **Base:** mapa de propiedad/transacciones/consumidores y resultados de pruebas. Clasificar fallos previos sin esconderlos.
2. **Fronteras:** guard para nuevos módulos/features; UI genérica y navegación independientes de Aulas; compilación/inventario conservan cobertura. Dividir en cortes verificables.
3. **Piloto Agenda:** UI/API/reglas/contratos reorganizados; crear/editar/eliminar conserva recurrencia, zonas, permisos/conflictos y repasos de Estudio. Verificar interacción real.
4. **Frontend:** identidad/global -> Foxy/Estudio -> Aulas/Plan/Biblioteca/Muro -> autoría/entrega/corrección -> Inicio/avisos. Cada corte verifica roles y estados afectados.
5. **Backend:** contratos identidad/files -> creación/pertenencia -> Plan/Biblioteca/Muro -> autoría/participación/calificación -> Foxy/Estudio/Inicio/host. Mover y extraer en cortes distintos.
6. **Cierre:** retirar puentes sin consumidores, justificar excepciones restantes, controles y documentación coherentes, suite completa aplicable y revisión independiente de rutas críticas.

## Verificación y recuperación

- Base rápida: `node scripts/run-complete-suite.mjs --check`, `--group fast`, `npm run lint:boundaries`, builds API/web y tipos. Integración y navegador aislados se seleccionan según superficie; la suite rápida no los sustituye.
- Nuevas restricciones: prueba negativa RED por la dependencia prohibida, luego GREEN y regresiones. Preservar aserciones funcionales al actualizar rutas/mocks de importación.
- Antes de mover: actualizar `scripts/ci-suites.mjs`, inventario/rutas completas, loader API, tsconfigs y workflows afectados. Revisar previews y consumidores fuera de producción.
- Por corte: evidencia, diff y fallos/omisiones en registro. Sin DONE con aceptación pendiente. Revertir solamente el corte propio si falla; no tocar datos ni trabajo ajeno.
- Adapter/Facade/Strategy/State se incorporan al resolver una variación concreta; no generar jerarquías por cumplir patrones.

## Corte inicial

Preparar guard para estructura futura; extraer Notice/Dialog a `apps/shared-ui` (consumidor standalone y web) y navegación global a `apps/web/src/application/navigation`. Mantener un puente de compatibilidad en las rutas anteriores para consumidores que se migren después. No migrar estilos ni crear directorios vacíos.

El corte inicial está cerrado. El piloto de etapa 3 se documenta debajo; la aceptación actual se conserva en el [tablero](../../odd/tasks/architecture-migration.md) y el [registro del piloto](../work-log/2026-11-10-root-agenda-pilot.md).

## Piloto Agenda: cortes técnicos autorizados

- Reglas neutrales y tipos compartidos en `src/core/domain/agenda/`, con una entrada explícita. Los archivos planos anteriores serán reexports temporales de la misma implementación para conservar identidad de errores y consumidores de Estudio/Inicio.
- Módulo backend en `apps/api/src/modules/agenda`: casos de uso/paginación y puertos de aplicación, persistencia/unidad de trabajo en infraestructura, HTTP en presentación. Reglas puras compartidas permanecen en el dominio neutral; no agregar una capa vacía para duplicarlas.
- Entrada `public.ts` acotada a aplicación/contratos. `bootstrap/agenda-composition.ts` conecta identidad, infraestructura y la proyección académica pública de Aulas. La infraestructura de Agenda recibe esa proyección mediante fábrica que usa el mismo tx/actor, sin importar privados de Aulas ni abrir otra transacción. La integración de Estudio conserva su transacción recibida.
- Frontend en `apps/web/src/features/agenda/{ui,model,api}`, con `index.ts` público; pantalla en `screens`, cliente con identidad y proxy servidor en composición `application`. No mezclar el transporte Node con la API del navegador. Preservar los adaptadores públicos anteriores para consumidores aún no migrados, sin duplicar funciones.
- Extraer tipos de props y dirección de helpers cuando sea necesario para eliminar los ciclos reales de Agenda, en lugar de trasladar sus excepciones a rutas nuevas. El guard debe proteger las ubicaciones nuevas y registrar sólo excepciones legadas que sigan existiendo.
- Aceptación: reglas puras, contratos cliente/proxy/HTTP, propiedad/reautenticación/CSRF/revisión, cola académica, recurrencia/zonas/excepciones y transacción de repasos conservadas. QA real de crear/editar/eliminar y errores, foco y responsive con fixture sintética; no atribuir persistencia a capturas.
- Cortes recuperables: contratos/dominio y backend (TASK-009/010), feature y composición UI (TASK-011), verificación integrada/cierre (TASK-012). Sólo el coordinador actualiza el tablero. [Registro del piloto](../work-log/2026-11-10-root-agenda-pilot.md).

### Ubicaciones implementadas del piloto

`src/core/domain/agenda/index.ts` reúne las reglas neutrales. El backend expone `modules/agenda/public.ts`; su infraestructura recibe una fábrica académica obligatoria, conectada por `bootstrap/agenda-composition.ts` mediante `classrooms/public/index.ts`. `bootstrap/agenda-transport.ts` conserva autenticación, CSRF, admisión y montaje HTTP. Estudio sigue usando la misma implementación de repositorio y la transacción recibida mediante compatibilidad.

La feature web expone `features/agenda/index.ts`, incluido su estilo público; `screens/agenda-screen.tsx` compone sesión y navegación. Los adaptadores autenticado/servidor quedan en `application/agenda-client.ts` y `application/server/agenda-proxy.ts`. `apps/agenda-ui` y las ubicaciones anteriores contienen puentes explícitos, no implementaciones paralelas. El catálogo neutral de zonas está en `apps/shared-ui/time-zones.ts`.

El guard elimina once excepciones que desaparecieron: tres dependencias backend y ocho aristas de ciclos UI. Restan 112 excepciones legadas de otros cortes. `scripts/agenda-compatibility.mjs` congela origen, destino, sintaxis, modo y nombres de los puentes; no autoriza exports adicionales. El build API incluye explícitamente todos los archivos de dominio compartido para emitir también contratos históricos que ya no tengan consumidores runtime en API.

## Corte identidad y composición global autorizado

Feature `features/identity/{api,model,ui}`: cliente/errores/validación, tipos de vista/formulario y componentes de cuenta. `screens/identity-screen.tsx` coordina los flujos existentes con sesión y navegación. La feature no importa composición ni UI legacy. Los controles genéricos Button/Input/Label y combinación de clases pertenecen a shared y conservan puentes anteriores.

`application/navigation/account-navbar.tsx` compone identidad, búsqueda, aulas y notificaciones; no pertenece a la feature identidad. `application/application-shell.tsx` conserva envoltorio/foco existente; `_app` sigue como adaptador Next y conserva la captura de entrada Foxy antes de render. No agregar provider ni cambiar estrategia de sesión. Proxy, SSR privado y captura estática de prueba por fragmento pertenecen a `application/server`; `_document` preserva orden de script y headers. Feature/API pública de navegador nunca reexporta transportes servidor.

Puentes explícitos conservan una sola implementación y nombres públicos. Consumidores y mocks/source checks se remapean sin debilitar aceptación; el ciclo de tipo de cuenta se elimina, sin renombrarlo como excepción nueva. Pruebas cliente/proxy/formularios/continuaciones/avatar/documento, build/tipos/lint/CI y QA sintético verifican el corte. [Registro](../work-log/2026-11-10-root-identity-frontend.md), TASK-013/014/015 del tablero único.

Implementación del corte: `features/identity/index.ts` expone UI/model y cliente; `features/identity/api.ts` es la entrada pública pura para adaptadores HTTP y consumidores Node, sin cargar TSX/CSS. Sólo esa entrada exacta, con imports nombrados, amplía la regla de index; sus implementaciones internas siguen privadas. El guard rechaza UI/Node (incluidos built-ins sin prefijo) y React/Next dentro del transporte. Los puentes anteriores siguen reenviando una sola implementación. Se retiraron dos aristas del ciclo de cuenta; restan 110 excepciones legadas.

## Resolución del retiro final

Las descripciones de puentes y cifras de excepciones del piloto anterior registran la transición de ese corte. El candidato final retiró esas compatibilidades: frontend en features/screens/application, backend en modules/bootstrap/platform y reglas neutrales en core/domain por dueño. SQL y DTO compartidos pertenecen a core/contracts. La proyección Agenda se conecta a modules/classrooms mediante bootstrap; no conserva classrooms/public legado. El guard tiene baseline vacía y elimina agenda-compatibility. Sólo main/application/configuration permanecen como entradas raíz del host. La aceptación integrada y los límites vigentes se registran en el tablero y el registro final; este diseño no acredita por sí solo pruebas completadas.

### Ajuste de alcance aprobado durante aceptación

El 2026-11-10, ante dos fallos preexistentes observados, el usuario autorizó corregir accesibilidad y desbordes mínimos. Se admite ajustar bordes de controles auth de #d4d9e9 (1,41:1 sobre blanco) a #8993a5 (3,10:1), y corregir el posicionamiento CSS de acciones de la miniagenda de Inicio para evitar desborde móvil. Se conserva el diseño general, las acciones y sus áreas de interacción. Esta excepción acotada a la conservación visual no autoriza rediseño ni cambios funcionales. TASK-026 registra la aceptación real.

Posteriormente autorizó corregir también el cierre prematuro de conexión al rechazar JSON excesivo en los proxies de Aulas y Foxy. Se conservan tamaños aceptados, validaciones y permisos. El tratamiento del cuerpo rechazado debe permanecer acotado en bytes y en la ventana metadata existente, sin buffering ni renovación del plazo; un cuerpo arbitrario puede requerir aborto defensivo de transporte. TASK-028 exige regresión de frontera, cancelación/cleanup y revisión independiente antes del cierre. No modifica API, esquema ni proveedores.

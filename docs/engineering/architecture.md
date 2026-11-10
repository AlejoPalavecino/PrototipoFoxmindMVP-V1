# Arquitectura y tecnologías de FoxMind

FoxMind es una plataforma educativa para organizar aulas, planes, materiales, actividades, entregas y devoluciones. Cada cuenta tiene un rol exclusivo de docente o estudiante. La V1 está implementada con comprobaciones locales de alcance explícito; integración, publicación y despliegue tienen estados independientes en el [roadmap](../implementation-roadmap.md).

## Lectura del sistema

1. Este documento explica tecnologías, componentes y límites.
2. El [modelo de datos](data-model.md) explica entidades, relaciones e integridad.
3. Las [funciones por rol y sección](../product/features-by-role.md) explican capacidades y permisos.
4. El [diseño UX/UI vigente](../design/README.md) explica recorridos, estados y componentes.
5. La [política documental](../documentation-policy.md) indica qué actualizar al incorporar una función.

## Tecnologías declaradas por el repositorio

| Área | Tecnología | Responsabilidad |
|---|---|---|
| Ejecución y lenguaje | Node.js 24, TypeScript 5.9.3 | Herramientas, servicios y tipado |
| Interfaz | Next.js 16.4.2, React 19.3.1 | Páginas, componentes y proxies HTTP; Pages Router en apps/web/pages |
| Estilos | CSS compartido y por pantalla, Tailwind CSS 4.3.3 | Brújula sobre componentes existentes; no asumir que todos los estilos históricos pueden retirarse |
| API | NestJS common/core 12.1.3, platform-express 12.3.2 | Composición, transporte y ciclo de vida |
| Persistencia | Prisma 7.10.0, pg 8.23.1, PostgreSQL 17.10 local | Acceso transaccional; migraciones SQL para restricciones adicionales |
| Archivos | SDK S3 3.1152.0, almacenamiento compatible con S3, ClamAV | Custodia privada, validación y escaneo |
| Identidad y correo | Argon2, Nodemailer, Mailpit local | Hash de contraseñas y flujos de correo; Mailpit captura sin enviar a destinatarios reales |
| IA y recursos | @google/genai 2.31.0, pdf-lib, sharp | Adaptadores de generación, documentos y recursos; capacidades sujetas a configuración/cuotas |
| Verificación | node:test, Playwright, ESLint y control de límites | Pruebas por grupo, navegador y dependencias entre módulos |

Versiones tomadas del [manifiesto](../../package.json); el [lockfile](../../package-lock.json) fija la resolución. PostgreSQL local está declarado en [Compose](../../compose.yaml). Son datos del proyecto, no una recomendación de actualización ni una validación de soporte externo.

## Componentes y responsabilidades

Se conserva el monolito modular: una aplicación backend compone capacidades especializadas. Separar módulos no implica servicios desplegados por separado. La composición, contratos y excepciones se comprueban en el código y en el guard de límites, sin depender de relatos históricos.

| Superficie | Responsabilidad |
|---|---|
| apps/web | Páginas Next, controles de cuenta, integración de pantallas y proxies /api/v1 |
| apps/classrooms-ui, apps/agenda-ui | Recorridos académicos y agenda; clientes y componentes reutilizados por la web |
| apps/shared-ui | Navegación y presentación compartidas, componentes y estilos Brújula |
| apps/api/src | Composición Nest, identidad, archivos, aulas, Inicio, Agenda, IA y adaptadores |
| src/core/domain | Tipos, validación y reglas compartidas; sin dependencias de framework |
| prisma | Modelo físico y migraciones; incluye integridad no expresable sólo con el esquema Prisma |
| tests, scripts, ci | Contratos, runners, fixtures, controles y operación; no son código descartable por no estar en producción |
| docs, odd/tasks | Guías actuales, contratos, decisiones, tareas y evidencia atribuida |

Identidad controla sesión y verificación; cada capacidad revalida propiedad y membresía. Files conserva los bytes privados; el puente de adjuntos coordina su relación académica sin trasladar esa autoridad al navegador. Inicio y Agenda usan proyecciones autorizadas; los trabajos IA comparten admisión sin combinar sus políticas de privacidad.

## Flujo de una operación

El navegador usa Next.js y sus proxies `/api/v1`; el host Nest compone transportes y servicios, con dominio y puertos compartidos. La configuración determina qué módulos de archivos y aulas se integran. Las guías y contratos enlazados contienen las reglas.

```text
Navegador -> Next /api/v1 -> Nest (composición y transportes)
                                    |
                          servicios -> dominio / puertos
                                    |
 PostgreSQL, almacenamiento privado, escáner, correo y proveedor IA
```

- [Identidad](identity/README.md) y [archivos](files/README.md): sesión, autorización y contenido privado.
- [Aulas](classrooms/README.md), [enseñanza](teaching/README.md), [actividades](activities/README.md), [corrección](grading/README.md), [agenda](agenda/README.md) e [inicio](home/README.md): capacidades por dominio.
- [IA](ai/README.md): extracción de planes, generación de actividades, análisis, asistencia de corrección y espacio Foxy; cada capacidad conserva sus límites y privacidad.
- [Operación local](local-development/README.md) y [pruebas](testing/README.md): configuración, recursos propios y limpieza. Los procesos de trabajo y su ciclo de vida se describen en las guías correspondientes.

La cuenta verificada que inicia sesión ordinariamente llega a `/inicio`; destinos explícitos permitidos e invitaciones conservan su flujo y la verificación sigue siendo obligatoria.

Para una mutación, la UI reúne la intención y revisión; el proxy limita ruta, método, payload y destino backend. El transporte autentica y valida la solicitud, y el servicio decide permisos y reglas dentro de su unidad transaccional. PostgreSQL protege relaciones e invariantes; almacenamiento, correo y proveedores se integran mediante sus adaptadores. Las respuestas y errores vuelven a estados explícitos de la interfaz. Ocultar un botón no sustituye la autorización del servicio.

## Persistencia y trabajos diferidos

PostgreSQL mantiene las relaciones académicas, sesiones, revisiones y colas durables. Los archivos se almacenan de forma privada y se referencian por metadatos/custodia; una carga no se vuelve publicable por haber terminado de transmitir bytes. Las colas conservan estados, deduplicación y propiedad de ejecución; las tablas no ejecutan los trabajos por sí mismas. El host coordina su inicio y drenaje antes de cerrar infraestructura.

Hay cinco familias documentadas de asistencia: extracción de plan, generación de actividades, análisis individual, corrección asistida y [espacio Foxy](ai/foxy.md). Proponer, guardar y publicar son operaciones distintas. La configuración del proveedor permanece en backend; su existencia no prueba que se haya ensayado con un proveedor real.

El [modelo de datos](data-model.md), las [guías de archivos](files/README.md) y las [guías IA](ai/README.md) detallan relaciones, estados y controles. No aplicar migraciones ni arrancar servicios sobre datos retenidos para comprobar esta documentación.

## Dónde empezar un cambio

La [migración por dominios](architecture-migration.md) fue aprobada el 2026-11-10. El primer corte incorpora `apps/shared-ui/feedback.tsx` como dueño de Notice/Dialog y `apps/web/src/application/navigation/destinations.ts` como dueño de continuaciones y destinos globales; las rutas anteriores conservan puentes de una única implementación. Se usa `application`, porque `src/app` es un directorio reservado de Next incompatible con la ubicación actual de `pages`.

`scripts/migration-boundaries.mjs` complementa el guard AST: protege capas de nuevos módulos bajo `modules/<dominio>`, contratos públicos nombrados, entradas de features y dependencia descendente de shared. El código legado conserva sus 123 excepciones exactas; esto no significa que los módulos actuales ya estén migrados. Estado y aceptación por corte en el [tablero único](../../odd/tasks/architecture-migration.md).

Carpetas de estudio incorpora una capacidad privada en `apps/api/src/study-folders`, con cargas/avisos internos al mismo módulo. El motor neutral está en `src/core/domain/study-engine.ts`; los puentes de composición `study-file-integration.ts` y `study-agenda-integration.ts` reutilizan validación/escaneo/almacenamiento y Agenda sin conceder permisos docentes. El adaptador Gemini de estudio comparte admisión/presupuesto con las otras familias. El transporte de identidad es un host explícito en el guard AST; el resto del módulo mantiene sus fronteras. [Guía](study/README.md).

1. Ubicá la regla en la [especificación vigente](../foxmind-v1-functional-spec.md) y su [matriz por rol](../product/features-by-role.md).
2. Seguí proxy → transporte → capacidad dueña → transacción/persistencia, consultando la guía de dominio y el código. Classrooms conserva servicios especializados y operaciones compartidas; no inventar un paquete por cada función ni borrar excepciones sin criterio.
3. Elegí pruebas de permisos, contratos y datos según el cambio. Revisá [verificación](testing/README.md) y ejecutá lint:boundaries si cambia una dependencia entre módulos.

Fuentes: [host](../../apps/api/src/main.ts), [composición](../../apps/api/src/application.ts), [dominio](../../src/core/domain/index.ts), [scripts](../../package.json). [Estado actual](../implementation-roadmap.md).

# FoxMind: documentación vigente

Esta es la base del proyecto a partir del 2026-11-07. Describe el producto y su implementación actuales, contrastados con código y recorridos de la aplicación. La evidencia distingue lo observado de lo no ensayado; no se heredan permisos de ejecución o publicación de documentos anteriores.

Inicio docente incorpora en este worktree la mejora aprobada el 2026-11-11: [reglas](engineering/home/README.md#inicio-docente-orden-y-selección-de-aulas), [capturas](design/current/README.md#inicio-docente--2026-11-11) y [evidencia con límites](verification/teacher-home-polish.json). No está integrada ni publicada en main.

La dirección UX/UI vigente de Foxy, Carpetas de estudio y creación de Aulas incorpora el pulido aprobado del 2026-11-09: [reglas de experiencia](design/README.md#dirección-vigente-de-foxy-y-estudio), [28 capturas por flujo](design/current/README.md#referencias-vigentes-del-pulido--2026-11-09) y [evidencia de validación](verification/foxy-study-ux-polish.json). Está implementado y verificado localmente; el [roadmap](implementation-roadmap.md) distingue su integración/publicación Git del despliegue.

| Necesitás | Fuente |
|---|---|
| Entender el sistema y el stack | [Arquitectura](engineering/architecture.md) |
| Retomar la migración por dominios aprobada | [Diseño](engineering/architecture-migration.md) y [tablero](../odd/tasks/architecture-migration.md) |
| Consultar reglas del producto | [Especificación vigente](foxmind-v1-functional-spec.md) |
| Ver capacidades y permisos | [Funciones por rol y sección](product/features-by-role.md) |
| Entender entidades y relaciones | [Modelo de datos](engineering/data-model.md) |
| Diseñar o ampliar una pantalla | [UX/UI actual](design/README.md) |
| Revisar Mis aulas docente/estudiante en el candidato separado | [Diseño detallado](design/classroom-teacher-redesign.md), [maqueta](design/classroom-teacher-preview.html) y [tareas/evidencia](../odd/tasks/classrooms-ux-unification.md); implementación local, sin merge |
| Recorrer capturas y checks | [Referencia visual actual](design/current/README.md) y [matriz de flujos](verification/flows.md) |
| Ejecutar y verificar en local | [Entorno](engineering/local-development/README.md) y [pruebas](engineering/testing/README.md) |
| Consultar contratos HTTP | [Cuenta](api/accounts-sessions.md), [OpenAPI](api/accounts-sessions.openapi.json), [archivos](api/files.md) |
| Incorporar una funcionalidad | [Política documental](documentation-policy.md) y [plantilla](templates/feature.md) |
| Retomar el pulido UX/UI | [Estado actual](implementation-roadmap.md) y [tareas UX](../odd/tasks/foxy-study-ux-polish.md) |

Las guías de [ingeniería](engineering/README.md) explican los dominios. Cada recibo identifica su entorno: la base inicial y las esperas/errores controlados usan proveedores sintéticos; los ensayos Gemini y el chat ya existente tienen su procedencia propia. Las capturas usan cuentas/contenido de prueba; una imagen no acredita por sí sola persistencia, proveedor real o despliegue.

La documentación anterior se retira del árbol de trabajo. El [recibo de retiro](verification/documentation-retirement.json) permite auditar rutas y hashes; el historial Git no se reescribe. OpenAPI y el contrato de corrección IA conservan sus rutas técnicas actuales por sus consumidores.

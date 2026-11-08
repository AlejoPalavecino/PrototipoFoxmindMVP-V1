# FoxMind: documentación vigente

Esta es la base del proyecto a partir del 2026-11-07. Describe el producto y su implementación actuales, contrastados con código y recorridos de la aplicación. La evidencia distingue lo observado de lo no ensayado; no se heredan permisos de ejecución o publicación de documentos anteriores.

| Necesitás | Fuente |
|---|---|
| Entender el sistema y el stack | [Arquitectura](engineering/architecture.md) |
| Consultar reglas del producto | [Especificación vigente](foxmind-v1-functional-spec.md) |
| Ver capacidades y permisos | [Funciones por rol y sección](product/features-by-role.md) |
| Entender entidades y relaciones | [Modelo de datos](engineering/data-model.md) |
| Diseñar o ampliar una pantalla | [UX/UI actual](design/README.md) |
| Recorrer capturas y checks | [Referencia visual actual](design/current/README.md) y [matriz de flujos](verification/flows.md) |
| Ejecutar y verificar en local | [Entorno](engineering/local-development/README.md) y [pruebas](engineering/testing/README.md) |
| Consultar contratos HTTP | [Cuenta](api/accounts-sessions.md), [OpenAPI](api/accounts-sessions.openapi.json), [archivos](api/files.md) |
| Incorporar una funcionalidad | [Política documental](documentation-policy.md) y [plantilla](templates/feature.md) |
| Retomar esta entrega | [Estado actual](implementation-roadmap.md) y [tareas](../odd/tasks/project-documentation-renewal.md) |

Las guías de [ingeniería](engineering/README.md) explican los dominios. Las capturas usan cuentas y contenido sintéticos sobre API, PostgreSQL, almacenamiento, escáner y correo propios; las respuestas IA son sintéticas. No acreditan despliegue, proveedor real ni todos los casos de error.

La documentación anterior se retira del árbol de trabajo. El [recibo de retiro](verification/documentation-retirement.json) permite auditar rutas y hashes; el historial Git no se reescribe. OpenAPI y el contrato de corrección IA conservan sus rutas técnicas actuales por sus consumidores.

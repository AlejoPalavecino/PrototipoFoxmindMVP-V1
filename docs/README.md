# Documentación de FoxMind

Empezá por lo que necesitás hacer. El [roadmap](implementation-roadmap.md#estado-actual) mantiene el estado aceptado; las guías explican el funcionamiento y los registros conservan la evidencia.

## Empezar según lo que necesitás

| Necesidad | Camino de lectura |
|---|---|
| Entender el producto y sus límites | [Producto](product/README.md) → [especificación](foxmind-v1-functional-spec.md) |
| Retomar el trabajo | [Estado actual](implementation-roadmap.md#estado-actual) → tarea y cierre enlazados |
| Entender el sistema | [Arquitectura](engineering/architecture.md) → [guías por dominio](engineering/README.md) |
| Ejecutarlo localmente | [Desarrollo local](engineering/local-development/README.md) → configuración y servicios propios |
| Comprobar un cambio | [Verificación](engineering/testing/README.md) → [interpretación de evidencia](verification/README.md) |
| Usar o desarrollar IA | [Cuatro funciones con alcance propio](engineering/ai/README.md) |
| Consultar la dirección visual | [Diseño vigente y antecedentes](design/README.md) → [catálogo de familias](design/INDEX.md) |
| Encontrar una decisión o un fallo anterior | [Catálogo de registros](work-log/INDEX.md) |

## Producto y contratos

- [Especificación funcional](foxmind-v1-functional-spec.md): reglas e identificadores estables, con extensiones aprobadas enlazadas.
- [Cuenta y sesión](api/accounts-sessions.md) y [OpenAPI](api/accounts-sessions.openapi.json): contratos conservados en su ruta pública.
- [Archivos privados](api/files.md): contrato HTTP; permisos y host en su guía técnica.
- [Referencias visuales originales](visual-reference-index.md): procedencia de29referencias; una imagen no agrega requisitos.

## Guías por tema

Las guías canónicas están en [engineering](engineering/README.md): identidad, archivos, aulas, organización docente, actividades, calificaciones, Inicio, Agenda, interfaz e IA. Las rutas anteriores conservan accesos a sus secciones para no romper el historial; el contenido vigente se mantiene en una sola ubicación.

## Evidencia y trabajo detallado

El [catálogo de verificación](verification/README.md) enlaza comprobaciones fechadas y límites. El [catálogo por unidad y fecha](work-log/INDEX.md) permite encontrar coordinación, pruebas, revisión y entrega. Los originales conservan autores, resultados, fallos y avisos; leerlos no ejecuta pruebas nuevas.

Las tareas detalladas viven en [odd/tasks](../odd/tasks/), incluido el [plan único de reorganización](../odd/tasks/documentation-reorganization.md). Las [auditorías anteriores](audits/2026-10-30-astra-documentation-audit.md) son cortes históricos, no inventarios actuales ni instrucciones para ejecutar sus generadores.

## Cómo interpretar y mantener la documentación

- **Vigente:** guía o contrato aplicable; el estado global se consulta en el roadmap.
- **Histórico:** resultado de un candidato anterior. Un estado antiguo de un agente no determina el estado del producto actual.
- **Propuesta:** requiere una decisión de alcance; no se implementa por estar guardada.
- **Integrado, publicado y desplegado:** son hechos distintos, con evidencia separada.

Mantener rutas y anclas de compatibilidad al mover guías. No borrar contratos consumidos por pruebas ni modificar registros ajenos para aparentar una aceptación posterior. El [protocolo de registros](work-log/README.md) y las [instrucciones de colaboración](../AGENTS.md) explican la continuidad. La reorganización cambia documentación, no permisos de ejecución ni comportamiento de la aplicación.

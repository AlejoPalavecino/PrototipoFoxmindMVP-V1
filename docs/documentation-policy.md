# Mantener esta base como fuente de verdad

La base vigente es docs/README.md → especificación, arquitectura, datos, funciones, guías y UX/UI. El registro de comprobaciones explica qué se observó y con qué límites; no modifica reglas por sí solo. No reconstruir producto desde chats, documentos retirados o capturas de otra versión.

## Autoridad

Decisión humana vigente > especificación/decisión aprobada de esta base > comportamiento comprobado > memoria > hipótesis. Si código y documentación difieren, registrar la diferencia y resolverla: un bug no se vuelve requisito por estar implementado. No heredar autorizaciones de ejecución/publicación.

## Qué guardar de una funcionalidad

Problema/resultado, alcance/exclusiones, actores/rol/sección, reglas y permisos, entradas/salidas/errores, recorrido/estados UX, datos/relaciones/conservación, dependencias/configuración por nombre, criterios verificables, decisiones pendientes y evidencia/limitaciones. Usar la [plantilla](templates/feature.md) dentro de la guía del dominio o especificación cuando alcance; no duplicar fichas.

## Qué actualizar y quién

| Cambio | Fuente canónica | Responsable |
|---|---|---|
| Capacidad, permiso o sección | [Especificación](foxmind-v1-functional-spec.md) y [matriz de roles](product/features-by-role.md) | Autor del cambio funcional |
| Contrato/regla/operación | Guía de dominio y contrato API | Dueño de la capacidad |
| Persistencia/conservación | [Modelo](engineering/data-model.md), Prisma y migración | Autor del cambio de datos |
| Recorrido o presentación | [Diseño](design/README.md), capturas y [matriz de flujos](verification/flows.md) afectados | Autor del cambio UX/UI |
| Responsabilidades, dependencias o stack | [Arquitectura](engineering/architecture.md); ADR sólo si aporta decisión duradera | Autor técnico y coordinación |
| Trabajo R2 | Un único odd/tasks por funcionalidad | Coordinador, único escritor |
| Evidencia y handoff | [Registro por agente/sesión](work-log/README.md) | Cada agente; coordinador atribuye revisores de sólo lectura |
| Estado global | [Roadmap](implementation-roadmap.md) | Coordinador tras verificar evidencia |

## Momento y criterio de cierre

Antes de R2: alcance/diseño aprobados, implementación autorizada y criterios. Durante: documentación junto al cambio. Al verificar: comandos, resultados, errores, omisiones, roles, candidato y recursos propios. Al entregar: estado local/integrado/publicado/desplegado separado. R1 no necesita tarea o documento ceremonial.

Una funcionalidad se cierra cuando comportamiento y documentación aplicable coinciden y los checks proporcionales están observados. Si una rama no se ensayó, declararla; no copiar un PASS histórico. Revisión de documentación es parte del cambio, no un pendiente indefinido.

Agregar guías activas al [mapa](documentation-map.json). Ejecutar docs:check, revisar referencias Markdown y HTML, y verificar consumidores de código/CI antes de mover o retirar una ruta. Pruebas del validador siguen activas; no deshabilitarlas para limpiar.

## Evidencia visual vigente

Guardar capturas de la app real con rol/viewport/flujo, candidato, datos sintéticos y resultado; conservar recibos que acrediten autorización/persistencia además de la imagen. Separar proveedor sintético, proveedor real y no ensayado. Al cambiar el flujo, actualizar la referencia y el catálogo/hash de los artefactos afectados. Evitar que una galería desactualizada compita con la guía actual.

## Retiro de material viejo

Al reemplazar una galería, actualizar su índice, catálogo y los ejemplos del README con imágenes de la misma revisión. Si una imagen citada sale del árbol, enlazar la ruta del commit que conserva los bytes evaluados. Registrar qué conjuntos se retiraron, la revisión de origen y la comprobación de referencias.

Conservar decisiones referenciadas por tareas, contratos vigentes y recibos con evidencia única. Identificar la fecha y el candidato de cada recibo y presentar el estado actual en el roadmap.

Licencias, recursos runtime y contratos ejecutables no son documentación obsoleta. OpenAPI y odd/tasks/grading-ai-issue-2.md conservan su ubicación por pruebas/CI y contenido vigente. Cambiar un marcador de cobertura requiere revisión explícita, no eliminación silenciosa.

## Datos y herramientas

No guardar contraseñas, tokens, URLs con credenciales, prompts privados, datos personales reales o transcripciones. No limpiar bases, secretos o volúmenes como parte de documentación. Memoria es ayuda opcional; la base debe poder usarse sin ella. Esta política no crea automatizaciones ni autoriza servicios externos.

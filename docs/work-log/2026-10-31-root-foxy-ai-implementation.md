# Foxy AI — implementación aislada

- Agent / role: /root, coordinador
- Session or task ID: /root; identificador de sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 64f613f
- Phase and detailed task/spec links: [Foxy AI](../../odd/tasks/foxy-ai-proposal.md)
- Status: in_progress

## Request and scope
Implementar el recorrido completo de Foxy AI para docentes, en tareas verificables y worktree separado. Contexto de aula con plan, materiales y actividades ya realizadas; selección de tema y uso de pasado/presente/futuro. Preparación y publicación en Biblioteca tras revisión y confirmación docente. El usuario confirmó esquemas e imágenes generadas con IA en la primera entrega. No se autorizó despliegue, push ni datos reales.

## Work performed
Se creó el worktree desde 64f613f sin alterar los cambios preexistentes del checkout principal. Diseño técnico y exploración encargados en solo lectura; decisiones del usuario registradas en la propuesta.

## Verification
Pendiente diseño, pruebas e implementación. No se afirma ninguna capacidad nueva terminada.

## Commits and outcomes
Sin commits de implementación.

## Handoff
Finalizar contrato y dividir slices; diseñar la generación visual y validar cada tarea antes de declarar la feature completa.

## Informe atribuido de exploración
- Agente: /root/foxy_explorer, solo lectura; persistido por /root. Sesión no disponible. Consultó Engram, guías de IA, Plan/Biblioteca, tareas, código y Git; sin inspección de Docker ni cambios.
- Plan dispone de PENDING, NEXT y TAUGHT; NEXT es el próximo tema marcado, no prueba por sí solo que sea el actual. Biblioteca exige archivo aprobado y flujo de validación existente. IA de actividades ya selecciona fuentes explícitas y controla límites. Búsqueda AST tuvo salida demasiado extensa para identificar nodos adicionales.
- Primer paso: contrato técnico de contexto, publicación y recursos visuales; preservar aislamiento del checkout principal.


## Informe atribuido RED de contratos
- Agente: /root/foxy_red, solo pruebas; persistido por /root. Sesión no disponible; rama codex/foxy-ai, base 64f613f.
- Creó `src/core/domain/foxy-ai-contract.test.mjs`. `node --test --test-reporter=dot src/core/domain/foxy-ai-contract.test.mjs` terminó 1 con seis fallos por parsers todavía inexistentes. Cubre aislamiento de contexto, validación de objetos, UUID, revisión, Unicode, límites y duplicados.
- Siguiente paso: implementar parsers sin modificar pruebas y ejecutar GREEN. Sin pruebas de DB/UI; esta unidad es contrato puro.

## Informe atribuido de arquitectura
- Agente: /root/foxy_architect, solo lectura; persistido por /root. Sesión no disponible; rama codex/foxy-ai, base 64f613f. Inspeccionó guías, schema, dominio, puertos, presupuesto, UI y pruebas; Engram sin diseño vigente de Foxy. No ejecutó tests, Docker o proveedor. Una búsqueda amplia fue truncada y un glob falló; se completó con lecturas focalizadas.
- Contrato F0: conversación con contexto fijo general/aula, selección de fuentes, validaciones estrictas. Slices siguientes: respuesta/recurso/publicación, persistencia, catálogo y snapshots autorizados, trabajos y presupuesto compartido, edición, publicación por flujo de archivos y Biblioteca, transporte, UI y verificación; generación de imágenes confirmada por usuario y pendiente de diseño específico.
- Plan NEXT es opcional y no prueba tema en curso; versiones históricas son distintas de temas enseñados. Actividades no poseen estado realizada; seleccionar publicadas con fecha, sin claves ni datos de estudiantes. Biblioteca exige archivo material listo y escaneado, y publicación idempotente con control de revisión. Mantener presupuesto compartido y no sobrescribir ediciones.
- Siguiente paso: GREEN de F0, contratos restantes y diseño de generación visual, luego integración y pruebas aisladas. No se declara feature completa.

## Informe atribuido RED de recursos
- Agente: /root/foxy_red, solo pruebas; persistido por /root. Sesión no disponible; branch codex/foxy-ai base 64f613f.
- Creó `src/core/domain/foxy-ai-resource.test.mjs`. `node --test --test-reporter=dot src/core/domain/foxy-ai-resource.test.mjs` terminó 1 con cuatro fallos por parsers aún inexistentes. Cubre respuesta y referencias, edición, destino unidad/tema y confirmación, objetos exactos y revisiones.
- No se fijaron máximos de markdown, advertencias ni datos faltantes; falta contrato. Primer paso: implementación GREEN sin editar pruebas. Sin DB/UI.

## Diseño visual y revisión atribuidos
- /root/foxy_architect, solo lectura: diseños de esquemas, imágenes privadas, presupuesto multimodal y publicación. Context7 sin cuota; consultó documentación oficial. Sin proveedor real ni credenciales. F2 requiere aislamiento, idempotencia y CAS; git fetch origin terminó exit 0.
- /root/foxy_review, solo lectura: revisó F0/F1, 10 tests, fronteras y diff; encontró duplicados UUID con distintas mayúsculas y títulos con controles incompatibles con Biblioteca. /root/foxy_red añadió pruebas RED y /root/foxy_green corrigió ambos; 13 pruebas PASS, build y fronteras exit 0. Revisión de correcciones pendiente.
- /root/foxy_red preparó prueba F2 con helper de base efímera; RED exit 1 por módulo inexistente, antes de Docker. No se ha demostrado GREEN ni ejecución SQL.

- Revisión posterior /root/foxy_review: sin hallazgos sobre las dos correcciones; 13 pruebas y fronteras PASS, scan de archivos sin filtraciones. Una búsqueda inicial con glob falló y se repitió. No inspeccionó DB ni proveedor.

- Primer corte F0/F1 registrado en commit 246cc62, con 13 pruebas y revisión independiente; sin feature funcional todavía. /root/foxy_red creó prueba visual V0: node --test --test-reporter=dot src/core/domain/foxy-ai-visual.test.mjs terminó 1 con cinco fallos por parsers ausentes; sin UI/DB. Sigue GREEN visual y F2 de persistencia.

- /root/foxy_visual_review revisó V0 en solo lectura: 18 pruebas y fronteras PASS, escaneo sin filtraciones; sin hallazgos dentro del contrato. No verificó renderer, proveedor ni publicación. V0 quedó en 6c792c6; diff --cached --check señaló una línea vacía final en el registro que el autor corrigió después, pendiente de commit adicional. /root/foxy_green completó F2 con PostgreSQL temporal: prueba y cuatro subcasos PASS; primera ejecución falló por TS strip-only y fue corregida; sin prueba de concurrencia, drift ni HTTP. F2 está en revisión.

- Revisión F2 /root/foxy_review: concurrencia y repositorio pasan en DB temporal; detectó drift de cuatro claves foráneas Prisma vs SQL por onUpdate implícito; se asignó corrección al autor. F3 requiere contabilizar también adjuntos de consignas de actividades entre límites documentales y no omitirlos silenciosamente.

- F2 revisado por /root/foxy_review: prueba principal y cuatro subpruebas, concurrencia real de solicitud y CAS, fronteras y scan PASS. Una discrepancia de ON UPDATE fue corregida por el autor y migrate diff en otra DB temporal devolvió 0 sin diferencias. Contenedores propios eliminados; sin DB retenida. Corte guardado en 726ea51; no acredita HTTP ni feature completa. Algunas lecturas de rutas inexistentes se repitieron con rutas reales.

- /root/foxy_architect definió F3 en solo lectura: catálogo limitado a metadatos, autorización docente y aula revalidada, versiones de plan y actividades publicadas; adjuntos de consignas cuentan para los límites y no se omiten sin advertencia. Primer RED de currículo encargado. No realizó pruebas ni DB. docs:check: 137 archivos, 1663 enlaces, 0 incidencias.

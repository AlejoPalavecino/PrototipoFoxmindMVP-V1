# ARQ-03 — diseño de límites para revisión

- Agent / role: /root, coordinación; análisis en línea, sin delegación.
- Session or task ID: no disponible en el runtime; no se infiere identidad de sesión.
- Date: 2026-11-02.
- Branch / worktree: main, C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind.
- Starting commit: add38ec16a6f03e4e4332288b198036161e4cf58.
- Phase and detailed task/spec links: [ARQ-03](../../odd/tasks/architecture-consolidation.md#arq-03--aprobar-diseño-de-límites), [cierre ARQ-02](2026-11-02-id-unavailable-arq02-verification.md).
- Status: completed.

## Request and scope

El usuario solicitó preparar el diseño de límites y alternativas de ARQ-03 para revisar antes de implementar y recordar el cierre de ARQ-02. Alcance: inspección actual y propuesta documental, mapa de dependencias, datos/escrituras/lectores, contratos, invariantes/transacciones, APIs de host/consumo, excepciones y primera extracción. No implementar, cambiar código/pruebas/configuración/datos, iniciar servicios/builds/suites, leer secretos, crear commits ni publicar. Diseño e implementación requieren decisiones separadas.

## Work performed

Inspección Git: main/add38ec, checkout con pendientes preservados de ARQ-02 y ajenos. Plan, roadmap y registro ya documentan ARQ-02 completed localmente; se conservan sus resultados y omisiones como evidencia previa, no ejecución de esta tarea. Lectura de instrucciones actuales del usuario (incluye CES), AGENTS.md del repositorio, roadmap, plan, matriz ARQ-01, cierre ARQ-02, protocolo y arquitectura actual. Skill harness-architecture para comparar alternativas sin imponer tecnologías.

Preparada [propuesta de diseño](../../odd/tasks/architecture-consolidation-arq03-design.md): arquitectura observada con referencias actuales, tres alternativas, recomendación gradual B, dependencias permitidas, propiedad por operación/campo, lectores, contratos, invariantes y transacciones. Primera extracción del bridge de adjuntos con autorización síncrona, hechos de custodia/reservas, asociación académica atómica y errores vigentes. Excepciones temporales explícitas: SQL académico restante de Files, promoción/publicación, lectores Inicio/Agenda y coordinación IA. APIs de composición separadas de consumo; `ports/run/store/storage/scanner` revisados. Features institucionales/comerciales y PD quedan separadas. No se creó ADR aprobado ni se modificó la arquitectura canónica para presentar una propuesta como decisión.

Inspección directa: Files bridge/access/store/service/module/public/contracts; Classrooms composición/contracts/attempt-access/proyección Agenda/publicación de notas/biblioteca/progreso; raíz application; Activity AI database; Foxy runtime; Inicio y Agenda unit-of-work/consultas/repositorio; checker AST y excepciones; pruebas bridge y recorrido práctico. El mapa no afirma inventario exhaustivo de todos los escritores: debe completarse por capacidad antes de cada extracción.

Actualizados únicamente los estados/enlaces necesarios del plan y roadmap: ARQ-02 completada, ARQ-03 in_progress con propuesta preparada pendiente de aprobación. Escrituras de esta tarea: ese anexo, este registro, plan y roadmap. Ninguna escritura de código, pruebas, configuración, datos o registros ajenos.

## Verification

- git status --short; git branch --show-current; git rev-parse HEAD: exit0, estado indicado.
- `Get-FileHash ../foxmind_reglas_de_negocio_desarrollo.md -Algorithm SHA256`: coincide con plan/matriz, `1a0adba05a18a555ae2e163c651a0fc9f7003efbd94e1b9c96d0da3e7e6e8fc2`.
- `checkDocumentation` vía Node sobre propuesta, registro, plan y roadmap, manifest vacío: exit0, 4 archivos / 260 enlaces / 0 problemas antes del último enlace de avance; comprobación final consignada abajo.
- Validador de referencias `archivo:línea`: exit0, 31 referencias, archivos existentes y líneas dentro de rango. Inspección semántica manual de las fuentes citadas; el validador por sí solo no demuestra semántica.
- `npm run docs:check`: exit0, 138 archivos / 1689 enlaces / 0 problemas antes del último enlace de avance. No modifica el mapa documental compartido.
- `git diff --check`: exit0, sin errores; advisories LF/CRLF en dos JSON preexistentes de inventario/rutas, sin intervención de esta tarea. Nuevos Markdown comprobados por espacios finales y newline EOF: PASS.
- Huella agregada de 1450 archivos enumerados por `rg --files apps src tests scripts`, antes/después: idéntica `08bef336053413d3da48a274b683aca9895df66ef4d1aca23f809931d6000506`. Los 21 archivos del manifiesto `.test-artifacts/arq02-final-candidate-sha256.json` coinciden: 0 diferencias. Prueba de preservación de esas superficies, no prueba funcional.
- Consultas iniciales con glob PowerShell literal y nombres inexistentes (`home-service.ts`, `grade-correction.ts`, directorio `packages`) fallaron; se corrigió usando directorios existentes/`rg --files`. No se usaron como evidencia positiva. La primera huella fallida se reemplazó por la enumeración válida de 1450 archivos.
- Sin ejecución funcional, build, servicios, navegador, scanner/proveedor ni migraciones: esta entrega solo cambia documentación; pruebas existentes y necesarias están diferenciadas en la propuesta. Los resultados de ARQ-02 no son una ejecución nueva ni certifican la extracción futura.
- Comprobación final tras enlaces de avance: `checkDocumentation` de los cuatro documentos, exit0, 4 archivos / 263 enlaces / 0 problemas; `npm run docs:check`, exit0, 138 archivos / 1691 enlaces / 0 problemas.

## Commits and outcomes

Sin commits ni publicación; mismo HEAD. ARQ-02 conserva estado completed y se registra explícitamente su cierre. ARQ-03: diseño aprobado explícitamente por el usuario con alternativa B, contrato de extracción y excepciones; cierre registrado el 2026-11-02. Status completed tras esa aprobación. La preparación previa permaneció in_progress hasta recibirla. No se modificó código ni datos.

Memoria Engram no escrita: el hook vigente no dispone de identidad de runtime registrada y prohíbe herramientas de memoria atribuidas hasta registro del host. No se reintentó ni se inventó sesión; continuidad preservada en repositorio.

## Handoff

Actualización de cierre, 2026-11-02: el usuario indicó «Apruebo el diseño de ARQ-03 con la alternativa B, el contrato de extracción y las excepciones propuestas. Registrá el cierre de ARQ-03.» Se reconciliaron nuevamente main/HEAD/working tree, conservando pendientes. Se registró la decisión durable como ADR breve dentro del diseño, sin duplicar el contrato, y se actualizaron estado/última unidad/siguiente acción en plan y roadmap. Solo cuatro documentos de esta etapa modificados; sin código, datos, commits ni publicación. ARQ-04 a ARQ-09 siguen not_started. Controles del cierre: checkDocumentation exit0, 4 documentos / 264 enlaces / 0 problemas; npm run docs:check exit0, 138 documentos / 1692 enlaces / 0 problemas; git diff --check exit0 con los mismos avisos preexistentes de LF/CRLF. Sin pruebas funcionales nuevas porque el cierre es documental.

Primera tarea pendiente: asignación explícita de ejecución de ARQ-04, controles de arquitectura según el diseño aprobado. La revisión humana aprobó B, contrato y excepciones; se registró ADR breve en el diseño y se cerró ARQ-03. Aprobar diseño no autoriza implementar. No iniciar ARQ-04/05 ni extraer código con esta entrega. PD de features siguen abiertas y no bloquean refactor de paridad.

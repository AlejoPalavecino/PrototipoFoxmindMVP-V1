# ARQ-01 — completada con alcance aprobado

- Agent / role: /root, coordinador; trabajo en línea, sin delegación.
- Session or task ID: no disponible en el runtime; ARQ-01 identifica la tarea de producto, no una identidad de sesión.
- Date: 2026-11-02.
- Branch / worktree: main, C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind.
- Starting commit: add38ec16a6f03e4e4332288b198036161e4cf58.
- Phase and detailed task/spec links: [ARQ-01](../../odd/tasks/architecture-consolidation.md#arq-01--fijar-alcance-y-diferencias), [matriz](../../odd/tasks/architecture-consolidation-arq01-matrix.md).
- Status: completed.

## Request and scope

Comparar todas las reglas FM, INV y CA de la fuente externa confirmada con especificación, código y pruebas actuales. Escritura limitada a la matriz y este registro. Sin cambios de código, datos, pruebas, configuración, plan compartido, roadmap ni registros ajenos; sin servicios, builds, suites funcionales, secretos, commits o publicación. Detenerse en ARQ-01, cuyo cierre requiere aprobación humana del alcance.

## Work performed

Lectura de AGENTS.md raíz, instrucciones web, plan, roadmap Estado actual, protocolo de registros, arquitectura y reglas externas. Fuente versión 1.0, decisiones 2026-11-02; SHA-256 observado y coincidente con el plan: 1a0adba05a18a555ae2e163c651a0fc9f7003efbd94e1b9c96d0da3e7e6e8fc2.

Se creó exclusivamente la matriz autorizada: 27 reglas FM, 8 invariantes INV y 24 casos CA, con nueve columnas por fila y evidencia archivo:línea. Clasificación de las 59 entradas: 7 sin diferencia observada, 1 refactor sin cambio funcional, 42 funcionalidad nueva/cambio de producto y 9 decisión pendiente/evidencia insuficiente. Son entradas de trazabilidad, no 42 features independientes. No se confirmó defecto funcional respecto del contrato vigente; no equivale a certificar ausencia de bugs.

Inspección pertinente: identidad/runtime y pruebas de rol exclusivo; esquema declarativo y migración de rol como texto; composición, contexto, creación, participación, invitaciones, consultas, actividades, TP/QE, resultados y progreso de aulas; bridge de adjuntos y wiring de Files; presupuestos técnicos, autorización/atribución de generación, análisis programado, corrección AUTO y Foxy. Se consultaron aserciones de pruebas P5/P6/P7/P8/P9, budget y grading-enqueue/grants, y el registro histórico de rol exclusivo como antecedente, sin trasladar sus PASS. La matriz localiza cada evidencia y distingue pruebas existentes de ejecución y cobertura futura.

Conclusiones: conservar rol exclusivo; tratar salida archivada como cambio del contrato anterior (su prueba exige rechazo); separar transferencia, ocultamiento, representación, vínculos/reportes, comercio y saldo por fuentes. AiUsageDaily es presupuesto técnico, no saldo comercial. El iniciador comercial de IA automática requiere decisión adicional: la corrección se dispara en la entrega pero owner_id es docente. Documentadas ambigüedades de especificación visual de roles, reapertura/colas y estado de documentación Foxy; no corregidas fuera de alcance.

Recomendación entregada: consolidación incremental compatible, con alternativas mínima y mixta comparadas, excluyendo features nuevas y decisiones comerciales. Candidatos fundamentados para futuras etapas: bridge académico en Files, acceso a ports/database de Classrooms, contratos afectados y coordinación transversal de colas. No se diseñaron tablas definitivas ni se eligieron tecnologías. No se inició ARQ-02 ni se modificó plan/roadmap.

Estado inicial ajeno preservado: modificados apps/web/next-env.d.ts, docs/documentation-map.json, docs/engineering/local-development/demo-account.md y docs/implementation-roadmap.md; sin seguimiento el plan architecture-consolidation.md, su registro 2026-11-02-id-unavailable-architecture-plan.md, registros root-demo-ai/root-local-relaunch/root-local-start y archivo de nombre inusual terminado en Good. No se leyó configuración privada ni contenido de cuentas demo.

## Verification

- git status --short; git branch --show-current; git rev-parse HEAD: exit 0, main y commit indicado, árbol con pendientes anteriores.
- Get-FileHash sobre la fuente externa -Algorithm SHA256: exit 0, coincidencia exacta.
- Búsqueda de instrucciones con rg --files -g AGENTS.md -g '!node_modules': raíz y apps/web, ambas leídas.
- Búsqueda acotada: rg -n -i 'institution|subscription|license|licence|institutional|suscrip|licencia' apps/api/src src/core prisma/schema.prisma -g '*.ts' -g '*.prisma': exit 1, cero coincidencias. No prueba universal de ausencia; contrastada con inventario de modelos y composición del host.
- Búsqueda acotada de ocultamiento/transferencia: rg -n -i 'hiddenClassroom|hideClassroom|classroom.*hidden|hidden.*classroom|transferOwner|transferTeacher|ownership.?transfer' apps/api/src/classrooms apps/classrooms-ui apps/web/src/lib/classroom-client.ts -g '*.ts' -g '*.tsx': exit 1, cero coincidencias. Primer barrido sin filtro incluía CSS hidden; descartado como evidencia funcional.
- Algunas lecturas tentativas de authorization.ts/student-ai.ts y globs de PowerShell fallaron por ruta inexistente/sintaxis; localizadas las implementaciones reales database.ts, source.ts, progress.ts y worker.ts mediante rg, se inspeccionaron después. No se usaron esos fallos para concluir ausencia de capacidades.
- Control estructural por node --input-type=module, script por stdin: extracción de encabezados FM/INV/CA de fuente, comparación con filas y unicidad, nueve columnas, clasificación en catálogo cerrado y existencia/rango de referencias archivo:línea. Resultado observado: sourceIds=59, rows=59, checkedReferences=180, issues=[]; exit 0. No comprueba semántica por sí solo; se acompañó de lectura del código citado.
- Control de enlaces con node --input-type=module -e "import {checkDocumentation} from './scripts/documentation-links.mjs'; const r=await checkDocumentation({root:process.cwd(),files:['odd/tasks/architecture-consolidation-arq01-matrix.md','docs/work-log/2026-11-02-id-unavailable-arq01-matrix.md'],manifest:{}}); console.log(JSON.stringify(r)); process.exitCode=r.issues.length?1:0;": exit 0, checkedFiles=2, checkedLinks=6, issues=[]. Usa el validador existente sobre los dos archivos autorizados, sin modificar manifiesto ni atribuir cobertura al índice compartido.
- git diff --check: exit 0 en archivos versionados. Se comprobó también cada archivo nuevo con git diff --no-index --check -- NUL <ruta>: la primera revisión detectó línea vacía adicional al final de matriz, corregida. Repetición final: exit 1 por diferencias de archivo nuevo frente a NUL, sin diagnósticos de whitespace, solo advertencia LF/CRLF; no se presenta ese exit como 0. Control determinista adicional por node --input-type=module (stdin: leer ambos archivos, rechazar espacios/tabs finales y exigir exactamente un newline de EOF): exit 0, checkedFiles=2, issues=[]. La advertencia LF/CRLF describe configuración Git, no se modificó esa configuración. Repetición del validador de enlaces tras cerrar el registro: exit 0, dos archivos/seis enlaces/cero incidencias.
- Comparación Get-FileHash/JSON de nueve pendientes ajenos durante el relevamiento y al cierre: 9 revisados, 0 cambios. El archivo sin seguimiento de nombre inusual permanece en status; no se abrió ni modificó. Estado final de Git: misma rama/commit y cuatro archivos modificados preexistentes; solo se añadieron matriz y registro propios a los no seguidos anteriores.
- Pruebas funcionales, builds, tipos/lint de producto, DB, servicios, suites, migraciones, proveedor real, UI y carga: NO EJECUTADOS por restricción expresa y porque esta entrega solo escribe documentación. Los scripts documentales no prueban comportamiento de producto. No se inspeccionaron secretos, entornos privados ni datos reales.

## Commits and outcomes

Sin commits ni publicación. El relevamiento se entregó inicialmente con cierre pendiente. El 2026-11-02 el usuario indicó explícitamente «Apruebo ARQ-01»: se registra aprobado el alcance recomendado de consolidación incremental y separación de features, y se cierra ARQ-01 en la matriz y este registro. Las PD y aceptaciones funcionales futuras permanecen abiertas; no se inició ARQ-02. Código, pruebas, configuración, dependencias, migraciones y datos sin modificaciones por este agente. Escritura limitada a los dos documentos autorizados; plan, roadmap y registros ajenos preservados.

## Handoff

Actualización posterior autorizada: el usuario solicitó «Vamos con ARQ-02, acordate de registrar que terminaste con ARQ-01». Se sincronizó el cierre aprobado en plan y roadmap desde la coordinación de [ARQ-02](2026-11-02-id-unavailable-arq02-verification.md). El handoff inicial siguiente queda como historia de la entrega de ARQ-01; las ejecuciones posteriores pertenecen al nuevo registro.

La coordinación debe sincronizar el cierre aprobado en plan y roadmap cuando tenga autorización de escritura sobre ellos; sus estados anteriores no se modificaron desde este encargo. Siguiente unidad para asignar: ARQ-02, con alcance propio, sin iniciarla automáticamente. Antes de features, cerrar las PD agrupadas en la matriz (roles/participación, representación/vínculos, privacidad/reportes, capacidad/consumo, calendario/oferta, extras/compras, identidad/retención, límites/UX), más atribución de automatismos. Las 59 filas y la aprobación de alcance no implican ejecución/aceptación de sus CA ni autorización de implementación.

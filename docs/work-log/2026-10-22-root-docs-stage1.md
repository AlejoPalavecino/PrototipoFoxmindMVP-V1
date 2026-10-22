# Documentación — índice y reconciliación de estados sobre main

- Agent / role: /root, coordinador; cambios documentales sin subagentes.
- Session or task ID: task /root; identidad de sesión registrada no expuesta.
- Date: 2026-10-22, America/Buenos_Aires.
- Branch / worktree: main; C:\Users\alejo\.codex\worktrees\p4-p3-integration\ProtipoFoxMind.
- Starting commit: 1eb57002eec7200192fd8efa2c8b65e306554826.
- Phase and detailed task/spec links: [roadmap](../implementation-roadmap.md), [protocolo](README.md), [especificación](../foxmind-v1-functional-spec.md), [P9 cerrado](../../odd/tasks/p9-local-validation.md). Mantenimiento documental, no nueva fase de producto.
- Status: completed para la primera etapa documental; migración física no realizada.

## Request and scope

El usuario eligió main como base y autorizó crear el índice de docs y corregir estados contradictorios, preservando diseños locales e historial. No mover ni borrar archivos. No implementación, cambios de contratos/políticas, servicios, secretos, datos, dependencias, nuevas pruebas funcionales, stage, commit, merge o publicación. Se usa el worktree main ya existente; no se cambia/reset/stash el checkout original.

## Work performed

Leídos AGENTS, roadmap y protocolo de main; tareas P9 y documentos de la auditoría anterior como contexto. Main inició sin cambios tracked y con dos registros untracked preexistentes de preview/demo; preservados sin transcribir contenido sensible. El original sigue en feat/p33-token-flows, 5e86d1e, con sus cambios históricos. Evidencia previa por hash de 224 archivos de main y 156 de docs del original; no se copiaron ni reubicaron diseños.

- Creados [índice general](../README.md) e [índice de diseño](../design/README.md). El primero cubre las 47 guías raíz y tres archivos de API; el segundo registra cuatro familias/27 archivos de diseño locales en el original y el trabajo glass separado. Los enlaces file: son explícitamente locales, no contenido incorporado a main ni una promesa de portabilidad.
- Roadmap mantiene todos los estados de fase; añade base/main, alcance documental, vistas de seguimiento y próximos pasos. Se rotulan los checkpoints/autorizaciones anteriores como históricos sin reutilizar permisos ni convertir fallos a PASS. Anclas antiguas conservadas con alias.
- Reconciliados estados de HTTP/cuenta, registro/perfil, verificación, backend/DB, primitivas, sender/outbox, web P3, archivos P4/handoff, alcance P6 y prueba P9. Las políticas y los comandos no cambian; las limitaciones de cada prueba siguen atribuidas a su candidato.
- README raíz enlaza el índice; AGENTS añade el alcance documental vigente y distingue sus límites históricos. El README de work-log presenta su lista como selección histórica, no tablero activo; ningún registro individual ajeno fue editado.
- La especificación conserva 978 líneas y cambia sólo el prólogo de alcance (línea 3) y el límite documental histórico (978). Requisitos y 170 escenarios intactos. API Markdown cambia sólo estados (3, 7, 114); políticas normativas 9–108 intactas.

Archivos nuevos: docs/README.md, docs/design/README.md, este registro y su [evidencia JSON](2026-10-22-root-docs-stage1-evidence.json). Diecinueve documentos tracked actualizados; detalle exacto en evidence.json y git diff.

## Verification

- `node --test tests/p31-contracts.test.mjs`: 9 PASS, 0 FAIL, 0 SKIP, exit0; contratos estructurales y ejemplos offline, no pruebas funcionales de autenticación.
- `python -B -` con las funciones de lectura del scanner de la auditoría, resolución de enlaces y slugs, cobertura, invariantes de diff y SHA256: enlaces relativos y siete enlaces file: locales existentes; 262 referencias a anclas válidas; todos los IDs antiguos preservados. Cobertura 47 guías raíz y tres archivos API. El JSON adjunto registra conteos y resultado final. Subconjunto Markdown, no un parser CommonMark completo; URLs web no consultadas.
- Comparación por hash: 156 archivos preexistentes de docs del original (incluidos 27 de diseños) y 141 registros históricos de main sin cambios. OpenAPI JSON, Prisma schema y package/lock intactos. No archivos preexistentes ausentes ni renombrados; ninguna política, fase o contrato alterado.
- Comprobación explícita de whitespace/H1/tablas/newline en 22 Markdown de esta etapa PASS; `git diff --check` exit0. Se comprueban explícitamente los untracked, que git diff por sí solo no valida.
- Controles intermedios detectaron un enlace de índice con nombre de tarea incorrecto (p4-integration vs p4-p3-integration), dos anclas de títulos que faltaban conservar y un EOF sin newline en AGENTS. Se corrigieron antes del cierre. La primera validación integral se detuvo en ese EOF, no se presentó como PASS; los demás checks impresos entonces habían pasado. Ningún defecto de aplicación fue inferido.
- Git confirma main/HEAD inicial sin avanzar, staging vacío y cambios tracked limitados a 19 Markdown; no cambios en source/tests. No builds, servicios, navegación de aplicación ni pruebas funcionales: sólo documentación. No comprobación remota nueva; publicación y resultados funcionales continúan como evidencia histórica.

## Commits and outcomes

Primera etapa completada localmente y sin commit. Sin stage, merge, push, deployment, cambio de rama, movimiento o borrado de archivos. El original y sus registros/diseños siguen en sus ubicaciones; main contiene sólo navegación y correcciones documentales de esta etapa.

## Handoff

El usuario puede revisar el índice de main y el diff. Primera tarea futura, sólo si se autoriza: preparar el mapa origen/destino y consumidores para una migración por conjuntos, con compatibilidad de enlaces/IDs y preservación de activos. No mover archivos ni integrar diseños por esta solicitud. Los enlaces locales de diseño siguen requiriendo el workspace original; su incorporación portable será una decisión posterior. No hay nueva tarea de producto o publicación autorizada.

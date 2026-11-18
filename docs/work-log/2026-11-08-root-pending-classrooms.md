# Aulas pendientes

- Agente: /root, coordinador; identificador de sesión no expuesto.
- Fecha: 2026-11-08. Rama inicial: main. Commit inicial: 3d82b82f6d4cff060d71e595da8569ebbb376b59. Árbol inicial limpio.
- Autorización: usuario aprobó flujo e implementación de Pendientes, banner automático, continuación y eliminación con confirmación. Sin publicación ni despliegue en este pedido.
- Alcance: borradores privados del docente en el catálogo; permisos y revisión concurrente al eliminar. Baja lógica interna para conservar integridad de archivos/extracciones; sin restauración en UI.
- Registro: [tareas](../../odd/tasks/pending-classrooms.md).
- Estado: implementado, verificado localmente e integrado/publicado en main por autorización posterior. Sin despliegue. Migración aplicada únicamente a bases descartables propias.

## Cambios

Catálogo docente Activas/Archivadas/Pendientes con contador; tarjetas/lista y banner automático, datos incompletos, filtros y continuación. Invitaciones permanecen separadas. Confirmación accesible con Cancelar/Escape, bloqueo de duplicados, error conservando contexto y devolución de foco al selector tras eliminar.

DELETE en proxy/HTTP/composición/servicio con revisión y confirmación estrictas, propiedad docente y bloqueo de publicados. Migración aditiva `202611080001_pending_classroom_deletion`: baja lógica y restricción de no publicación. Archivos/extracciones conservan relaciones; acceso público/IA y conteo de Inicio excluyen eliminados. Sólo mantenimiento de cargas incompletas puede bloquear técnicamente referencias eliminadas.

Pruebas nuevas registradas en suites/inventario/rutas CI. El helper visual ahora enlaza `apps/web/src`, necesario para el `_app` actual. Declaración CSS de UI permite chequeo aislado sin depender de tipos globales de Next.

## Evidencia observada

- RED inicial: `node --test tests/pending-classrooms.test.mjs`, 3 fallos esperados por selector/tarjeta/método aún ausentes.
- `node scripts/build-api.mjs`: generación Prisma y compilación API exit0, repetido tras corregir transporte/limpieza.
- Comando focal final: `node --test tests/pending-classrooms.test.mjs tests/pending-classrooms-database.test.mjs tests/classroom-collection-workspace.test.mjs tests/classrooms-reference-filter.test.mjs tests/classrooms-reference-controls.test.mjs tests/p5-drafts.test.mjs tests/p5-http.test.mjs tests/classroom-ai-proxy.test.mjs tests/architecture-test-discovery.test.mjs`: **36 PASS, 0 FAIL, 0 SKIP**. El test del runner imprime una falla sintética deliberada, y su aserción pasa; no es fallo del candidato.
- PostgreSQL propio vacío: migraciones deploy/redeploy/status/diff pasan; eliminación persiste entre instancias, docente ajeno/estudiante/no verificado rechazados, revisión obsoleta/confirmación inválida rechazadas, borrador eliminado sin read/save/publish/archivos/IA, aula creada protegida y carrera eliminar/publicar con un único ganador, sin aula huérfana. Limpieza de bases propias exit0.
- `node node_modules/typescript/bin/tsc -p apps/classrooms-ui/tsconfig.json` y `node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit`: exit0.
- `npm run lint:boundaries`: exit0, AST boundaries passed (123 frozen exceptions).
- `node scripts/run-ci-suite.mjs --check`: 493 entradas, 53 exclusiones explícitas; ambas pruebas nuevas registradas.
- `npm run docs:check`: comprobación final, 51 archivos, 657 enlaces, 0 problemas.
- `git diff --check`: sin errores de whitespace; aviso normal de conversión LF/CRLF.

## Revisión independiente

quality_reviewer `/root/review_pending`, sólo lectura, sin escrituras ni servicios reales. Halló P1: hacer invisible deleted_at en lockScope también bloqueaba cleanIncomplete y candidatos posteriores. Corregido con includeDeleted exclusivamente en mantenimiento. Revisor comprobó acceso público FORBIDDEN y barrida de dos candidatos sin fallas; incorporado como prueba de regresión persistente. No encontró otros defectos comprobados; su revisión no ejecutó DB ni navegador (evidencia de esas capas atribuida al coordinador).

## Navegador y capturas

Ego Lite, TaskSpace 3, cerrada al terminar. Componentes reales con cliente de prueba en memoria (sin upstream/datos reales). Selector sólo docente; contador/estados separados; continuar recupera nombre; Cancelar/Escape no emiten DELETE y restituyen foco; eliminar emite una llamada, retira tarjeta, muestra vacío/contador0 y enfoca Pendientes; error conserva tarjeta y diálogo; estudiante sin selector. Tarjetas y lista observadas. Vista móvil con acciones de 44/48 px, sin overflow.

[Escritorio 1440×1000](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/design/current/teacher-pending-desktop.png), [móvil 390×844](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/design/current/teacher-pending-mobile.png), [tablet 768×1024](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/design/current/teacher-pending-tablet.png). Metadatos y hashes en catálogo actual (168 capturas). Las imágenes no prueban persistencia; esa evidencia corresponde al test de PostgreSQL y al test proxy/HTTP.

## Fallos corregidos y límites

El primer chequeo aislado de UI falló por declaraciones CSS faltantes; corregido con styles.d.ts. Primer test DB falló por cast erróneo de un tipo AccountRole que no existe; fixture corregida. Helper visual falló por import actual de `_app` no enlazado; corregido. Una ronda Ego usó `loc=text:` inválido después de despachar eliminación; la ronda siguiente observó el resultado antes de continuar, sin repetir la mutación. El P1 de limpieza y los guards DELETE/confirm del transporte se corrigieron antes del candidato final.

No se ejecutó suite completa, despliegue ni una sesión integrada API+web+S3 para este flujo; navegador usa cliente sintético y DB/transporte se prueban separadamente. Sin auditoría WCAG completa, proveedores reales ni purga física de datos/archivos. No se accedió a datos retenidos. La baja lógica no cancela retroactivamente llamadas IA ya despachadas, pero impide aplicar sus resultados al pendiente eliminado.

Primer paso operativo pendiente: aplicar la migración aditiva al destino expresamente autorizado antes de usar este código allí. No se infiere autorización para migrar datos retenidos ni desplegar desde esta entrega.

## Publicación Git autorizada

El 2026-11-08 el usuario pidió commits, push de todo a main y main como única rama. Fetch origin --prune y ls-remote confirman main local/remota en 3d82b82, sin otras ramas ni trabajo remoto para integrar; único worktree principal. Esta autorización es Git, sin despliegue ni aplicación de migraciones a datos retenidos.

Unidad de publicación: funcionalidad completa de Pendientes con controles de eliminación, migración, pruebas, documentación y referencias visuales. Supera la guía orientativa de 400 líneas al incluir evidencia y pruebas; se conserva como unidad coherente porque eliminar o entregar el flujo requiere conjuntamente contrato, permisos y UI. Reversión: revertir la unidad completa de código/UI/pruebas/documentación; no revertir automáticamente la columna aditiva sobre una base ya utilizada. Rama temporal codex para preparar e integrar por fast-forward; no se publica esa rama. Resultado Git y hash real se registran después de observar el push.

Resultado observado: commit `2de9e28e6dfa150ecc2c31979f1b3c39709abeb4`, `feat(classrooms): manage pending classroom creation and confirmed deletion`, integrado con fast-forward y push origin main exitoso. ls-remote confirmó ese SHA exacto en refs/heads/main. Rama temporal eliminada con branch -d; ramas locales/remotas observadas: únicamente main, árbol limpio antes de este recibo.

Controles del índice antes del commit: diff --cached --check sin errores, docs:check 51 archivos/657 enlaces/0 problemas, inventario 493 entradas/53 exclusiones y 336 hashes PNG/metadatos coincidentes con el catálogo. No se repitieron las 36 pruebas por cambios posteriores exclusivos de prosa; su candidato de código se conserva en el commit publicado. Este recibo y las referencias de entrega se incorporan en un segundo commit documental; su SHA y push se comprueban después de crearlo, sin inventar identidad propia en este archivo.

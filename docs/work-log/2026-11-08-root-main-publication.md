# Publicación de la base documental actual en main

- Agente/coordinador: /root; runtime sin ID de sesión registrado/expuesto.
- Fecha: 2026-11-08, America/Buenos_Aires.
- Estado: completed para la entrega publicada; este documento es su recibo posterior.
- Rama/worktree inicial: main, checkout principal; único worktree observado.
- Commit inicial: d41ff6d0b8c9321403b1d3000a06e06d84366cfe.

## Alcance y autorización

Usuario pide realizar commits, push, integrar todo a main y dejar main como única rama. Autoriza publicación Git y retiro de otras ramas después de incorporar sus cambios; no autoriza despliegue ni cambios de producto. La entrega documental ya fue verificada localmente; este pedido amplía su límite anterior de no publicación.

## Reconciliación inicial

Fetch origin --prune exitoso. ls-remote --heads origin devuelve únicamente main en d41ff6d, igual a main local; no hay cambios remotos que integrar. No otras ramas locales ni worktrees. Cambios pendientes corresponden a renovación documental del chat, evidencia actual, helper sintético de preview, retiros y dos comentarios actualizados; preservar todo ese alcance.

## Unidades y límites de reversión

Primera unidad: base documental coherente, referencias/evidencia, retiro de historia y helper que la guía usa. Retiro masivo supera el tamaño habitual de revisión; dividirlo por archivos rompería fuentes y enlaces. Reversión: revertir la unidad completa, sin cambios de comportamiento de producto o migraciones. Segunda unidad: recibo de publicación con identidad real del primer commit, sin inventar hash propio.

Integrar por fast-forward una rama temporal codex, sin push de esa rama; publicar main y retirar rama temporal tras verificar igualdad remota. No crear PR ni merge artificial si main puede avanzar directamente.

## Verificación

Candidato de publicación: docs:check49 archivos/634 enlaces/0 problemas;35tests focales PASS,0fallos/omitidos; git diff --check PASS. Archivos nuevos limitados a docs, tareas y helper de preview; sin archivos privados ni artefactos ignorados en el staging previsto. Primer commit integrado y publicado; comparación exacta del remoto observada, como se detalla abajo. Pruebas funcionales/UI no se repiten: producto sin cambios nuevos, recorrido y smoke ya observados en el [registro base](2026-11-07-root-current-baseline.md).

## Commits y entrega

Commit de entrega: 620331241f0ba5a0524389078d9eef33529cc342, docs: establish current FoxMind baseline and retire obsolete documentation. Integrado a main con git merge --ff-only --quiet; push origin main exitoso. ls-remote confirmó exactamente ese SHA en refs/heads/main. Rama codex/current-documentation-publication eliminada con branch -d tras integrar; no se publicó al remoto. branch local y ls-remote --heads muestran únicamente main. Árbol limpio observado después de la publicación.

Este recibo se incorpora en un segundo commit documental; no se inventa su propio SHA. Su publicación y el estado final se comprueban después del commit comparando HEAD/origin/main/ls-remote y el árbol de trabajo. El commit de entrega ya está publicado y no queda producto por implementar. Sin PR ni despliegue; historia Git preservada.

## Ajuste detectado al preparar Git

core.autocrlf=true advirtió conversión de metadatos JSON al próximo checkout. Se fija docs/design/current/*.json a LF en .gitattributes para conservar hashes exactos del catálogo entre checkouts. No se modifican PNG ni lógica de aplicación. Verificación previa al commit: los 330 blobs de PNG+metadatos del índice coinciden con los hashes del catálogo. diff --cached --check aprobado.

## Comprobación del recibo

Después de reconciliar roadmap/tarea/registros: docs:check49 archivos/638 enlaces/0 problemas, diff --check limpio. Los330hashes de PNG/metadatos siguen coincidiendo después de integrar a main con la política LF. No se repiten tests funcionales por cambios exclusivos de prosa en este recibo.

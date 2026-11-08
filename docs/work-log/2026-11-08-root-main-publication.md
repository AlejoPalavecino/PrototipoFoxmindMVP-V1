# Publicación de la base documental actual en main

- Agente/coordinador: /root; runtime sin ID de sesión registrado/expuesto.
- Fecha: 2026-11-08, America/Buenos_Aires.
- Estado: in_progress.
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

Candidato de publicación: docs:check49 archivos/634 enlaces/0 problemas;35tests focales PASS,0fallos/omitidos; git diff --check PASS. Archivos nuevos limitados a docs, tareas y helper de preview; sin archivos privados ni artefactos ignorados en el staging previsto. Pendiente commit, integración y comparación exacta del remoto. Pruebas funcionales/UI no se repiten: producto sin cambios nuevos, recorrido y smoke ya observados en el [registro base](2026-11-07-root-current-baseline.md).

## Commits y entrega

Pendiente. Próxima acción: comprobar candidato, crear commits, integrar/push y verificar main única y árbol limpio. No despliegue.

## Ajuste detectado al preparar Git

core.autocrlf=true advirtió conversión de metadatos JSON al próximo checkout. Se fija docs/design/current/*.json a LF en .gitattributes para conservar hashes exactos del catálogo entre checkouts. No se modifican PNG ni lógica de aplicación. Verificación del índice contra hashes antes de commit.

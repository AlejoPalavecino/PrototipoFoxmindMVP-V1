# Publicación de Carpetas de estudio

- Coordinador: /root; runtime sin identidad registrada disponible. Sin escrituras de memoria atribuidas.
- Fecha: 2026-11-08, America/Buenos_Aires.
- Base: main y origin/main en 1f46028a0e08833528ac2bdbe924e45ab8beb5b4; checkout principal.
- Autorización vigente: pedido explícito del usuario de realizar commits, push e integrar todo a main. Sin despliegue.
- Reconciliación: fetch origin --prune exitoso; sólo main local y remoto. Cambios pendientes corresponden a la funcionalidad aprobada, sin trabajo ajeno identificado.

## Unidades y verificación

Unidad funcional: Carpetas de estudio privadas, materiales y vínculo al aula, Foxy y prácticas, planificación/Agenda y avisos. Incluye pruebas, cuatro migraciones aditivas, guías y evidencia visual. Supera el presupuesto habitual de revisión: API, estado persistente, UI e integraciones forman una entrega conjunta ya verificada; dividir por archivos produciría candidatos incompletos. No se prepara PR ni una cadena de PRs. Reversión lógica: revertir la unidad completa; cualquier reversión de esquema requiere preservar datos creados y evaluación previa, sin eliminar tablas automáticamente.

Evidencia funcional y límites: [recibo](../verification/study-folders.json), [tarea](../../odd/tasks/study-folders.md) y [registro de implementación](2026-11-08-root-study-folders-design.md). Suite focal final 65/0/0, tipos/builds, límites de arquitectura y regresiones aprobados según esos registros; no se repiten suites funcionales por publicación sin cambios de producto. Comprobar documentación, inventario, índice Git y hashes exactos antes de crear el commit. Mantener fuera de Git .env y .test-artifacts.

Unidad posterior: recibo con SHA real de entrega y publicación comprobada. Rama temporal codex, integración fast-forward a main y push origin main sin force. Retirar sólo la rama temporal propia una vez integrada. Estado inicial: IN_PROGRESS; primer paso pendiente: controles finales del índice y creación del commit funcional.

## Resultado comprobado

Commit funcional: 3c30de328b5e4e518bd5faf4282c9773ca45afa1, feat(study): add private student study folders and adaptive practice. 117 archivos, 3634 inserciones y 31 eliminaciones. Commit, switch main, merge --ff-only y push origin main exitosos; ls-remote confirmó exactamente ese SHA como única rama remota.

Controles previos: docs:check73 archivos/779 enlaces/0 problemas; inventario511/53 exclusiones/23 rutas PASS; diff --cached --check PASS. Índice comprobado:188 capturas/376 hashes SHA256 exactos,117 archivos y0 rutas privadas. Avisos LF/CRLF informativos; metadatos del catálogo preservados por política Git.

Recibo posterior actualiza tarea, roadmap y evidencia con la publicación real; no cambia lógica ni repite pruebas funcionales. Se comprobará su publicación comparando HEAD/origin/main/ls-remote y árbol limpio; no se inventa su SHA. Estado funcional publicado; sin PR, despliegue ni cambios de proveedor. Primer paso pendiente de esta etapa: publicar este recibo y comprobar igualdad final.

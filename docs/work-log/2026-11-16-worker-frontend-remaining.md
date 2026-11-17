# Frontend — casos de uso restantes

Agente /root/frontend_study; encargo TASK-009, segunda unidad. Fecha 2026-11-16.
Rama codex/frontend-cohesion; worktree C:/Users/alejo/.codex/worktrees/frontend-cohesion/ProtipoFoxMind. Base aprobada dd6f4bc más trabajo concurrente preservado.

## Alcance autorizado
Movimientos mecánicos de agenda, curriculum, identity, home, notifications y participation por responsabilidades existentes. Communication y files pequeños se conservan. Sólo cambios de rutas relativas/imports y entradas públicas; sin lógica, API HTTP, UX ni nombres públicos nuevos. Sin modificar tests/manifiestos, aplicación, pantallas u otras features. Mapa old→new permitido en .test-artifacts/frontend-cohesion/remaining-moves.json.

## Estado y evidencia
Inicio: árbol con extracciones concurrentes de otras features; estas ocho superficies sin cambios previos de otros escritores al inspeccionar. Fuentes: AGENTS.md, apps/web/AGENTS.md, especificación frontend cohesion y archivos/index/API de los ocho dominios.
Mapa estable y movimiento aplicados. El coordinador remapea fixtures/manifiestos y documentación desde `.test-artifacts/frontend-cohesion/remaining-moves.json`; el test engineer confirmó que esas ocho features quedan fuera de su unidad actual. Este worker no editó tests existentes.

## Reversión
Invertir exclusivamente el mapa de movimientos y el cambio de import specifiers de esta unidad; conservar los cambios concurrentes fuera de las ocho features. No usar reset global del worktree. No hay commits propios.


## Agrupación aplicada
81 movimientos, sin reexports temporales ni cambios de nombres públicos:
- Agenda (36): calendar reúne calendario/vistas, hooks de consulta/selección/resultado y estilos de superficie; event-editor reúne formulario, campos, validaciones, borrador y acciones ya existentes; event-details conserva detalle con su CSS; upcoming conserva consulta próxima. Controles pequeños siguen separados. calendar.ts, agenda-presentation.ts, event-colors.ts y event-reminders.ts permanecen model por uso entre casos; adaptadores api intactos.
- Curriculum (12): plan reúne consulta/edición del recorrido, wizard y modelo local; extraction reúne cliente/control de extracción, estados/mensajes y UI de revisión/sugerencias. classroom-zones.ts conserva su lugar compartido en model. Sin cambios de algoritmo ni transporte.
- Identity (7): authentication conserva formularios de acceso; profile conserva edición y su CSS; settings conserva ajustes; controls reúne campo/artwork y superficie CSS usados en más de una vista. Tipos de formulario, account-view y transporte quedan donde estaban.
- Home (15): dashboard reúne composición, foco, aulas, accesos, miniagenda y hook de inicio; queue reúne pendientes, filas, listas y paneles con su completado de consulta. Etiquetas/presentación compartidas quedan en model; adaptador HTTP intacto.
- Notifications (5): inbox reúne consulta, centro, presentación/destinos y CSS de la única capacidad existente.
- Participation (6): questionnaire reúne intento y QuestionnaireDraft; practical conserva intento práctico; receipts conserva comprobante; review conserva respuestas. AttemptExitRef pasa de ui a model por uso compartido. Inicio de sesión e intención de responder permanecen en model; Participation.module.css queda compartido en ui para no duplicarlo ni alterar su orden.
- Communication y Files: conservados íntegros, sin crear carpetas de caso adicionales para unidades pequeñas y cohesivas.

## Mapa y evidencia
Mapa completo máquina-legible: `.test-artifacts/frontend-cohesion/remaining-moves.json`, objeto JSON old→new de 81 rutas relativas al repositorio. Avisado al coordinador antes y después de aplicar. El coordinador es responsable de integrarlo/remapear consumidores de prueba y documentación.

Aplicación: script Python resolvió únicamente specifiers relativos de imports/exports según destino movido; conservó UTF-8 y los bytes restantes. Se ajustaron seis archivos que permanecieron en su ruta (entradas públicas/modelos compartidos), únicamente en sus imports.

Verificación determinista durante el movimiento: todos los bytes fuera de specifiers relativos idénticos al snapshot previo; CSS byte por byte preservado.
Verificación posterior independiente contra `git show HEAD:<old>`: 81/81 archivos con contenido idéntico salvo specifiers relativos (normalizando CRLF/LF del worktree); 9/9 CSS idénticos. 459.592 bytes de origen reubicados. Escaneo de imports productivos `apps/web` con resolución explícita e implícita: 0 referencias a rutas retiradas.

Comandos y resultado:
- `npx eslint apps/web/src/features/agenda apps/web/src/features/curriculum apps/web/src/features/communication apps/web/src/features/identity apps/web/src/features/home apps/web/src/features/notifications apps/web/src/features/participation apps/web/src/features/files`: GREEN, exit 0.
- `npx tsc --noEmit -p apps/web/tsconfig.json --incremental false`: exit 1 por tres errores concurrentes ajenos a esta superficie: application/academic-Wizard.tsx:242 y :256, onFile devuelve Promise<void>|undefined frente a Promise<void>; features/foxy/workspace/foxy-workspace.tsx:240, Promise<unknown> frente a Promise<boolean>. Cero errores en las ocho features de este encargo. Reportados al coordinador, sin editar sus archivos.

## Límites y siguiente paso
Sólo movimiento mecánico/imports: no se añadió comportamiento, por lo que la comparación de contenido verifica conservación y no se creó una prueba que reflejara la implementación. No ejecuté servicios, proveedores, build ni navegador. Las pruebas heredadas requieren primero el remap de rutas por el coordinador; no se quitaron aserciones ni se cambiaron fixtures aquí. No hubo commits ni escritura del tablero; esta unidad queda entregada para verificación, sin declarar DONE. Primer paso pendiente: integrar mapa, remapear pruebas/docs, resolver errores concurrentes y ejecutar verificación global del candidato.

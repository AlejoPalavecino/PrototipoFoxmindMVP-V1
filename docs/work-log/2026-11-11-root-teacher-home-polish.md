# Mejora de Inicio docente

## Publicación autorizada — 2026-11-11

El usuario autorizó commits, merge a main, push y dejar sólo main. Reconciliación inicial: origin/main y las cuatro ramas locales apuntan a 3895f4d; remoto sólo contiene main. Main tiene borradores de diseño sin commit y codex/classrooms-ux-unification tiene trabajo extenso de aulas sin commit; alcance de esa otra entrega consultado al usuario antes de tocarla. El worktree redise_o_aula_docente está limpio. La mejora de Inicio se prepara en dos unidades: contrato de orden paginado con pruebas y registro del worker; interfaz completa con sus pruebas, diseño y evidencia. El segundo corte supera 400 líneas porque selector de aula, estado y flujos comparten aceptación; se conserva cohesión y evidencia sin comprimir código.

Comprobación nueva previa a commit: suite focal de 15 archivos, 84 PASS, cero fallos/omisiones. Las pruebas SQL y el navegador conservan la atribución y límites del recibo. Reversión: retirar la interfaz/estilos y sus pruebas primero; después el contrato de order y cursores si no tiene consumidores. Sin migraciones ni despliegue.

Publicados los commits 1e2bcc4 (orden paginado) y 89ac88d (interfaz y evidencia). Main avanzó por fast-forward con árbol idéntico al candidato; push sin fuerza exitoso y ls-remote confirmó main como único head remoto en 89ac88d. Rama local de Inicio eliminada mediante branch -d; su worktree conservado con HEAD separado. Lint de fronteras pasó con cero excepciones y documentación del candidato con 106 archivos/942 enlaces sin problemas.

Los borradores de main se preservaron temporalmente en stash 9edaba1dcf1fe957d003a2f46ba22a8494f58a94 y se restauraron. El único conflicto, entradas aditivas de documentation-map.json, se resolvió conservando ambos conjuntos. Documentación tras restauración: 110 archivos/975 enlaces, cero problemas. Los borradores vuelven a estar sin stage; el stash se conserva como respaldo hasta cerrar la decisión pendiente. Las ramas classrooms-ux-unification y redise_o_aula_docente no se modificaron: limpieza total local pendiente de aclarar alcance de la otra entrega. Este registro no atribuye publicación al trabajo pendiente de aulas.

- Agente: /root, orquestador; identificador de sesión no expuesto.
- Fecha: 2026-11-11. Rama: codex/teacher-home-polish.
- Worktree: C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/FoxMind-teacher-home-polish.
- Base: 3895f4ded6884641872c5950c39c54215406d6d6.
- Autorización: usuario aprobó la propuesta de cuatro widgets y ejecución en worktree separado. Sin commits, publicación ni despliegue.
- Original: contiene cambios ajenos de diseño de aula; preservados, no copiados al worktree.

## Especificación y diseño aprobados

1. Seguimiento: retirar textos de alcance y orden estático; select superior derecho con Más nuevas primero / Más antiguas primero. Elección independiente por pestaña. Defaults actuales: entregas ascendente por recepción, consultas descendente por última actividad. Aplicar al conjunto paginado, no sólo al preview; conservar permisos y contadores.
2. Aula en foco: elegir aula activa propia desde el widget. Independiente del destino de Acciones. Próximo tema con fondo durazno, acento naranja redondeado, unidad secundaria y acción con flecha circular a la derecha. Conservar avance real y portada.
3. Mini agenda docente: tarjetas con fecha, título/horario y acceso alineados, menta/lavanda para eventos personales y durazno para fecha de entrega; texto oscuro y semántica explícita. Mantener fuentes y ventana actual.
4. Acciones: acción → diálogo específico → elegir aula → continuar. Portada/nombre/división y color de la acción. Una sola aula preseleccionada. Seleccionar destino no altera foco.

Mantener estilo Brújula, comportamiento del estudiante, estados de carga/error/reintento/vacío, teclado/Escape/retorno de foco y responsive. Los selectores deben permitir alcanzar todas las aulas elegibles paginadas. La elección es estado de la vista, sin nueva preferencia persistente.

## Ejecución y evidencia

- git status, branch y worktree list inspeccionados. Worktree propio creado desde main.
- Delegación acotada: /root/home_order implementa contrato, transporte y SQL del orden; coordinador implementa UI y documentación.
- Dependencias propias: npm ci --ignore-scripts --no-audit --no-fund terminó, 491 paquetes. API build generó Prisma en este worktree.

## Resultado y comprobaciones

### Ajuste solicitado de alineación y agenda

El usuario pidió revisar simetría de controles/widgets y retirar la fecha repetida de Mi agenda tras inspeccionar las capturas. Alcance R1 dentro de esta mejora: alinear título/select, agrupar Ver todas con pestañas, uniformar espaciados y mostrar fecha sólo en el bloque lateral de la mini agenda docente; conservar horario/día completo, título, aula y destinos. Sin nuevos flujos o permisos. Estado: DONE. RED de fecha duplicada comprobado y GREEN: 26 pruebas en home-miniagenda-reference, home-reference-dashboard y brujula-home-complete. Tipos web PASS. Ego Lite espacio 12 cerrado: orden y Ver todas en ambas pestañas, retorno de foco queries, viewports 1440/768/390 sin overflow; pestañas y Ver todas tienen el mismo eje Y y altura 44 px. Tres capturas finales inspeccionadas; cliente sintético, sin login integrado. Se corrigió el salto de línea del selector debido al padding y se alineó su flecha al extremo derecho. Una captura no pudo sobrescribir desktop.png (UNKNOWN); se guardaron archivos finales nuevos sin alterar evidencia anterior.

- Implementados los cuatro widgets y sus contratos. El cambio supera un corte de 400 líneas por reunir cuatro superficies aprobadas, pruebas unitarias/SQL, harness y documentación. Unidades revisables: contrato/paginación; selección/destinos; presentación/QA. No hay commits ni lockfile modificado.
- RED UI: tres fallos esperados por navegación inmediata, selector inexistente y cambio de orden inexistente. GREEN inicial 3/3. Regresión adicional de recarga parcial comprobada RED → GREEN. La revisión independiente encontró y motivó controles de StrictMode, selección única, errores por módulo, foco/revalidación y cursor inválido; cubiertos por pruebas/probes y navegador según el recibo.
- Suite final: `node --test tests/home-order.test.mjs tests/p9-home-client.test.mjs tests/brujula-data-http.test.mjs tests/foxmind-3d-http.test.mjs tests/foxmind-3d-service.test.mjs tests/home-reference-dashboard.test.mjs tests/home-polish-presentation.test.mjs tests/home-miniagenda-reference.test.mjs tests/home-by-role.test.mjs tests/home-refinement-copy.test.mjs tests/home-reference-summary.test.mjs tests/home-warm-navigation.test.mjs tests/brujula-home-complete.test.mjs tests/teacher-home-polish.test.mjs tests/workspace-disclosure.test.mjs`: **83 PASS, 0 FAIL, 0 SKIP**.
- SQL: **6 PASS**, atribuidos a /root/home_order; [procedimiento y límites](2026-11-11-worker-home-order.md). Clúster PostgreSQL 16 propio detenido, datos sintéticos temporales conservados. Docker PostgreSQL 17.10 no disponible.
- `npm run web:build`, `npx tsc --noEmit -p apps/web/tsconfig.json`, `npm run lint:boundaries`: PASS, cero excepciones de arquitectura. `api:build`: PASS por worker.
- `node scripts/run-ci-suite.mjs --check`: 533 entradas. `npm run docs:check`: 106 archivos, 942 enlaces, cero problemas. `git diff --check`: PASS. `python C:/Users/alejo/.codex/harness/bin/taskboard.py check odd/tasks/teacher-home-polish.md`: 3 tareas válidas.
- Ego Lite: TaskSpace 9, cerrada al terminar. Harness `node scripts/teacher-home-preview.mjs`, componentes reales con cliente sintético y React.StrictMode. Cinco capturas inspeccionadas y siete muestras de contraste de texto >=6.4:1. Viewports 1440×1000, 768×1024 y 390×844 sin overflow.
- Navegador comprobó ambos órdenes independientes, 7 entregas paginadas, 6 aulas paginadas, foco tras refresh, cuatro destinos, radios con flechas, Escape/retorno de foco, vacío/error/reintento, selección única y exclusión de estilos docentes en estudiante.
- Revisión independiente /root/home_review: 77 pruebas focales y probes de estado/tipos; todos los hallazgos accionables corregidos. Reproducción final del P2 (foco B en página 2, 503 durante refresh, reintento) **VERIFIED**: recupera B. No atribuir SQL/navegador a ese revisor.

## Fallos corregidos y límites

- Corregidos tipos TypeScript y stubs/expectativas anteriores tras reemplazo explícito del contrato UX. No se eliminó cobertura; se agregaron pruebas al inventario.
- Navegador: primera ruta del harness respondió 404, corregida su ubicación de middleware; un selector inválido de snapshot y capturas con ventana minimizada requirieron recuperación en la misma TaskSpace. Capturas tempranas con estilos heredados/animación fueron reemplazadas después de corregir y comprobar el candidato.
- TTP: primera validación rechazó texto extra junto a Approval; se separó la explicación del valor literal approved y la validación final pasó. El servidor Vite propio se detuvo al finalizar QA; no se dejó un nuevo servicio activo.
- No se corrió toda CI, login E2E integrado ni PostgreSQL 17.10 Docker. La UI usa datos sintéticos y se comprueban destinos emitidos, no escrituras académicas desde esa captura. Sin proveedor real, secretos ni datos retenidos.
- Las fuentes canónicas y la galería identifican la nueva dirección; hashes en [recibo](../verification/teacher-home-polish.json). La memoria no sustituye esta continuidad.
- Estado final: implementado y verificado localmente en worktree separado; sin integración, commit, push o deploy. Primer paso de entrega posterior: revisión humana del diff/capturas; cualquier publicación requiere autorización vigente específica.

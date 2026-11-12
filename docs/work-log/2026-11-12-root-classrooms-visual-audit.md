# Auditoría visual de Mis aulas

- Responsable: root, orquestador; identidad de sesión no expuesta.
- Fecha: 2026-11-12. Rama: codex/classrooms-visual-audit.
- Worktree: C:/Users/alejo/.codex/worktrees/classrooms-visual-audit/ProtipoFoxMind.
- Base: 1f61923407fa839df0abb97e673c0274cf12bb1b.
- Autorización: pedido vigente de auditar y corregir paridad visual docente/estudiante, alineación, superposición y recortes de Mis aulas. Conservar diseño y reglas existentes. Sin publicación Git ni despliegue.
- Aislamiento: worktree y dependencias propios; no editar Agenda/Foxy ni recursos retenidos. QA integrado con helper documental y cuentas sintéticas descartables; sin generaciones pagas.
- Aclaración humana vigente: las pantallas docentes son la referencia; adaptar las estudiantiles cuando difieran en elementos compartidos. En docente corregir composición y simetría, conservando identidad visual.
- Fuentes: docs/README.md, especificación funcional, arquitectura, enseñanza, diseño vigente de aulas, política documental y guía local.
- Estado: DONE local; implementación, QA y documentación comprobadas.
- Próximo paso: integración posterior sólo con autorización y reconciliación del trabajo concurrente.

## Resultado y evidencia

Los componentes compartidos ya reutilizaban diseño entre roles. Se corrigieron reglas de composición sobre esos componentes: checks centrados y títulos/estados separados, filtros iguales, recursos y porcentaje alineados en Plan; reserva de espacio para la lupa en Biblioteca; tabla de Progreso con columnas, cabecera y celdas legibles; portadas móviles en dos columnas. Las acciones docentes y los datos personales de Mi progreso permanecen propios de cada rol.

- Ego TaskSpace 8: 56 combinaciones sección/rol/ancho (1440, 768, 390, 320), 16 combinaciones catálogo/rol/ancho/lista o tarjetas. Sin overflow horizontal detectado.
- Build final integrado: 21 casos, aserciones de geometría, filtros, búsqueda y estilo de tarjeta compartido. 14 capturas finales inspeccionadas, catalogadas y hasheadas en el [recibo](../verification/classrooms-visual-audit.json).
- Interacción integrada: marcar/deshacer tema, publicar texto como docente, abrir y leer ese texto como alumno sin edición. Servicios PostgreSQL/S3/ClamAV/Mailpit propios, cuentas sintéticas; proveedor sintético sin gasto de Gemini.
- Diálogos de material/invitación/Muro, editor manual, detalle alumno, nombres largos y teclado: revisión focal de composición a 320 px, incluso altura 568 px; Escape devuelve foco a Invitar alumnos.
- `npm ci --ignore-scripts --no-audit --no-fund`, `npm run api:build`, `npm run web:build`, `npm run lint:boundaries`: PASS; boundaries sin excepciones.
- `node --test tests/classroom-plan-filters.test.mjs tests/classroom-library-search.test.mjs tests/classroom-library-modes.test.mjs tests/classroom-workspace-shell.test.mjs tests/classroom-sections-redesign.test.mjs tests/brujula-grading-ui.test.mjs`: 23 PASS. `node --test tests/classroom-visual-fixture.test.mjs`: 4 PASS. Test nuevo registrado en inventario y ruta fast; inventario válido, 542 entradas/53 exclusiones/23 rutas.
- Scripts Ego y geometría cruda conservados localmente bajo `.test-artifacts/audit-round-*.mjs`; el recibo versionado conserva las matrices y hashes sin credenciales.

## Incidencias y límites

La primera fixture omitía `classroom-main` y tenía respuestas incompatibles de Muro/historial de actividad. Se corrigió la fixture, se agregaron cuatro pruebas de contrato y se repitió QA; las capturas preliminares no acreditan el candidato final. Las regiones live vacías se mostraron inicialmente como alertas en el recolector; se excluyeron sólo textos vacíos, conservando la matriz cruda local. Hubo una navegación temporalmente rechazada durante reinicio del servidor de fixture y un intento de arranque con puerto ocupado; la repetición fue satisfactoria. Un selector de lectura usó el texto visible en lugar del nombre accesible; se corrigió y la lectura integrada pasó.

Esto acredita los recorridos y tamaños enumerados en Chromium/Ego, con datos sintéticos. No acredita todos los dispositivos, Safari/Firefox, seguridad completa ni toda la suite funcional backend; no se ejecutó IA real. Agenda/Foxy y recursos retenidos fuera de alcance. Sin commits, push, integración ni despliegue. Primer paso de entrega posterior: integrar este diff con autorización y reconciliar la base concurrente.

## Cierre

`npm run docs:check`: 120 archivos, 1035 enlaces, cero incidencias. Validador TTP: 3 tareas válidas; inicialmente rechazó el texto adicional en Approval, corregido a valor exacto approved conservando autorización en campo separado. `git diff --check`: PASS. TaskSpace Ego finalizado; helper integrado terminó con código 0 y cleanup failures 0. Servidor de fixture interrumpido intencionalmente; puertos propios 53216/56837 sin listeners. Checkout principal sólo inspeccionado; conserva sus cambios concurrentes de Foxy. Todo este trabajo sigue sin commit en el worktree indicado.

## Integración autorizada — 2026-11-12

El usuario autorizó integrar en main y verificar sin pisar Agenda/Foxy. Main inicial 99834b0 incluye Agenda e Inicio; Foxy conserva cambios sin commit en el checkout principal. Preparar y verificar el candidato combinado en este worktree, conservar las adiciones concurrentes a los índices documentales. Esta autorización cubre commits e integración local; no push ni despliegue. Unidad: correcciones visuales de aulas, fixtures y evidencia; rollback limitado a ese diff. Las matrices/capturas generadas explican el volumen del recibo; no se separan del resultado que acreditan.

### Reconciliación y regresión

Rebase sobre 99834b0 completado; candidato 89d8b93. Cinco conflictos de adiciones en encabezados documentales resueltos conservando Agenda/Inicio y Aulas. No hubo conflicto de producción. Build web y lint/boundaries pasan. La suite general detectó prueba Agenda no registrada: se incorporó agenda-ux-navigation a inventario/ruta fast. Luego detectó export classroomExperienceStyles ausente en el stub de navegación Foxy: se añadió sólo ese export sintético, sin cambiar aserciones ni implementación; RED observado y 4/4 GREEN focal. Se repite fast completo y se ejecutan recorridos integrados existentes con servicios propios y proveedor sintético.

Regresión ampliada: se detectaron también stubs de useHome incompletos en entry-glass-client y folder-platform; se completaron ordering/orders, manteniendo las aserciones. La prueba de salida de aula buscaba el botón desde Plan aunque vive en Compañeros: ahora navega mediante ClassroomNavigation antes de ejecutar la misma comprobación de cancelación al desmontar; 10/10 GREEN focal. No se alteraron contratos de aceptación ni código de producción para resolver estos fallos de fixture. Se continúa el inventario fast por archivos faltantes, conservando resultados exitosos y reemplazando exclusivamente los fallidos por sus repeticiones corregidas; el recibo final distingue esta reconciliación de una corrida monolítica.

La última prueba de devolución recorría sólo children del árbol superficial y no renderizaba FeedbackSections. Ahora usa renderToStaticMarkup para comprobar el mismo texto visible y la exclusión de respuestas; 6/6 GREEN. Resultado reconciliado fast: 347 archivos, 1961 PASS, 0 fallos/skips. E2E: 20 PASS, 0 fallos/skips en Plan, Biblioteca, material/Agenda e Inicio; todos los helpers propios terminaron con cleanup failures 0. Build web, API previo y lint/boundaries verdes. Inventario 543/53/23 válido. No se ejecutaron las demás cohortes owned ni proveedor real.

### Integración completada

Main avanzó por fast-forward de 99834b0 a 8f80098. Código visual en 89d8b93; ajustes mínimos de fixtures/inventario y evidencia en 8f80098. Se preservaron por SHA-256 los ocho archivos concurrentes no versionados de Foxy/estudio; el manifiesto conserva todas sus entradas originales más las tres de aulas. El stash temporal, limitado al manifiesto, se retiró tras comprobar la restauración. No se incluyeron archivos de Foxy en curso en los commits; su código de producción, Agenda e Inicio son idénticos al main inicial. Estado: integrado localmente, sin push ni despliegue. Los resultados fast se reconciliaron por archivo y las dos últimas pruebas se repitieron focalmente; no se ocultan las corridas interrumpidas anteriores. No queda implementación pendiente de esta integración.

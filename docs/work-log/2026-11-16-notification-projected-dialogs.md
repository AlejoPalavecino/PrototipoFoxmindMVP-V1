# Revisión de avisos proyectados desde Notificaciones

- Autor: agente `/root/notification_projected_dialogs`, unidad de implementación UI; 2026-11-16.
- Rama/worktree: `codex/foxmind-product-parity` en `foxmind-product-parity/ProtipoFoxMind`; HEAD inicial `ef6828b96084b0fcaf9a883e4afb95e0871cf1d6`. Árbol compartido con cambios previos de otras unidades.
- Alcance autorizado por el coordinador: abrir la ocurrencia privada y la invitación pendiente en la bandeja según UI Lab, conservar autorización y confirmaciones existentes, reutilizar UI de Agenda y Aulas. «Ahora no» es un cierre neutral; no se agrega una acción visible de rechazo. Las demás aperturas conservan sus destinos.
- Fuentes: `design/foxmind-ui-lab/{notifications,agenda-events,classrooms}.js` de la maqueta, `docs/engineering/{home,agenda}/README.md`, contratos y clientes web existentes.
- Límite: sin modificar backend, datos retenidos, servicios, Git remoto ni tarea TTP central. Verificación visual integrada a cargo del coordinador.
- Estado: unidad implementada y con pruebas focales aprobadas; entregada al coordinador para QA visual e integración.

- Implementado: el centro abre diálogos sólo a partir del destino devuelto por el POST autorizado. El recurso se consulta con el cliente de Agenda o con la lista de invitaciones pendientes; se compara su identidad exacta. Una ocurrencia cancelada o invitación vencida muestra un error rojo y ofrece volver.
- Agenda: detalle, edición, cancelación y eliminación reutilizan los diálogos existentes y se mantienen dentro de la bandeja. La fecha original de la ocurrencia se conserva, incluso al editar recurrencias. En invitaciones se reutiliza la vista previa; «Ahora no» y Escape son neutrales, y «Aceptar y unirme» es la única escritura que ofrece la maqueta.
- Foco: al cerrar se recupera el control de origen si aún existe y está disponible, o el filtro de lectura. Las escrituras confirmadas cierran el diálogo, muestran éxito y recargan la bandeja. Si el acceso cambió, salir del aviso de error refresca la lista.
- RED: `node --test --test-name-pattern 'la pantalla abre' tests/notification-projected-dialogs.test.mjs` reportó 1 fallo esperado: el centro no recibía `onReviewProjected`.
- GREEN: `node --test tests/notification-projected-dialogs.test.mjs tests/agenda-event-details-dialog.test.mjs tests/agenda-editor-exact-discard.test.mjs tests/product-parity-invitation-ui.test.mjs` reportó 25/25 (7 nuevos, 18 de regresión).
- Tipos: `node_modules/.bin/tsc --project apps/web/tsconfig.json --incremental false --pretty false` aprobó. Una primera ejecución observó `hasCounts` ausente mientras se editaba en paralelo el contrato del centro; la ejecución completa posterior no reportó errores.
- CSS: pasos de PostCSS de Next (CSS Modules en modo puro y generación de nombres locales) aprobaron para `EventDetails.module.css`, `agenda-event-editor.module.css` y `notification-review.module.css`.
- Sin commits, push, despliegue, servicios o datos retenidos. Pendiente: comprobar contra el candidato integrado con navegador (ancho, orden de foco real y flujo de aceptación); aquí se verificaron contratos/UI con datos sintéticos e introspección de componentes.

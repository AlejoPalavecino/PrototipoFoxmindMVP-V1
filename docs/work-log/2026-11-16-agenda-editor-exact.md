# Editor exacto de Agenda

- Agente: /root/agenda_editor_exact (implementación delegada). Fecha local: 2026-11-16.
- Worktree: foxmind-product-parity/ProtipoFoxMind, rama codex/foxmind-product-parity, inicio ef6828b96084b0fcaf9a883e4afb95e0871cf1d6 con cambios ajenos conservados.
- Alcance: editor personal docente/estudiante; diálogo de descarte, vista previa, estados acotados y responsive según UI Lab, conservación de contrato de agenda. Sin servicios, backend, proveedores ni commits.
- Referencias: UI Lab agenda-events.js y agenda.css; guía del dominio docs/engineering/agenda/README.md.
- Inicio: preparar una prueba RED antes de tocar producción.

- Implementación: EventForm mantiene una sola instancia del diálogo y oculta el formulario sin desmontarlo al pedir descarte. Cerrar limpio sale; cerrar con cambios muestra «Seguir editando» y «Descartar cambios». Cerrar o Escape en esa confirmación continúa editando y devuelve foco. Mientras hay una escritura activa no cierra. El detalle conserva la única acción de eliminación visible. El hook conserva las APIs y verificaciones anteriores.
- Presentación: botón primario con icono, altura acotada con cuerpo desplazable y acciones fijas, duración real sólo para un intervalo válido, etiqueta de zona, colores, categorías y nota de privacidad consistentes con la maqueta; se preservaron repetición, aviso, día completo, límites y zona reales.
- RED: `node --test tests/agenda-editor-exact-discard.test.mjs` dio 0/2 previo al cambio: el descarte invocaba window.confirm y editar mostraba tres acciones.
- GREEN: `node --test tests/agenda-editor-exact-discard.test.mjs tests/agenda-event-form-editor.test.mjs tests/agenda-event-form-model.test.mjs tests/agenda-event-color-view.test.mjs tests/agenda-notification-parity-ui.test.mjs tests/agenda-visual-polish.test.mjs` dio 38/38; incluye la prueba adicional de reintento con mismo ID, fecha, todo el día, aviso y color.
- Suite ampliada intermedia 48/51: pruebas previas de vista esperan explícitamente window.confirm (reemplazado por el flujo aprobado); dos pruebas ajenas al editor esperan separador antiguo en detalle y consulta secundaria de próximos eventos. No se modificaron pruebas anteriores. ESLint focal y diff --check focal pasaron. La primera corrida de tipos sólo reportó errores transitorios en Agenda.tsx, en superficies bajo edición concurrente. Sin verificación directa de CSS en Ego por esta unidad; el coordinador gestiona navegador y compilación compartidos.
- Estado: implementación propia congelada y entregada al coordinador. Primer paso: verificación real del foco, scroll y botones en escritorio y móvil. Sin commits, push, acceso a datos retenidos, cambios backend ni despliegue.

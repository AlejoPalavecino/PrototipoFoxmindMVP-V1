# Agenda · detalle de evento

Agente: `/root/agenda_detail_exact` (implementación focal; sesión no expuesta).
Fecha: 2026-11-16. Worktree: `foxmind-product-parity/ProtipoFoxMind`, rama `codex/foxmind-product-parity`, base `ef6828b`; árbol compartido con cambios previos.

Autorización: igualar detalle de Agenda en ambos roles a UI Lab conservando contratos, avisos, plan de repaso y alcance de recurrencia. Superficies propias: EventDetails, estilos privados del diálogo y prueba de regresión. Sin servicios, navegador compartido, proveedor, commits o publicación.

Se reemplazó la página por un diálogo nativo con tarjeta del color del evento, fecha, horario, duración real, recordatorio y datos efectivos de la ocurrencia. Se conserva Aviso, recurrencia y destino exacto del repaso. El alcance se elige al editar una serie; al eliminar no se toca el evento hasta la confirmación explícita. Cancelación/escape vuelven al detalle durante el paso intermedio. El diálogo conserva los controles fuera de la zona desplazable y gestiona foco al cambiar de paso.

Evidencia:

- `node --test tests/agenda-event-details-dialog.test.mjs`: RED inicial, 3 fallos; GREEN final, 3/3. Incluye contenido efectivo, enlace, aviso, confirmación/cancelación, fecha original de ocurrencia trasladada, petición única, serie y error de eliminación.
- ESLint de `EventDetails.tsx` y `git diff --check` focales: sin defectos.
- TypeScript del frontend: sin diagnósticos de EventDetails; el candidato simultáneo informó props de AgendaDay/AgendaPeriod durante la integración.
- Al agregar `tests/agenda-event-form-result.test.mjs`, 7/9. Un escenario espera texto y eliminación inmediata obsoletos; el otro una consulta automática adicional del panel de próximos eventos. Ambos informados al coordinador; fuera de mi superficie de escritura.

Estado: superficie propia congelada, sin commits. QA visual real (incluidos scroll, foco móvil y ausencia de superposición al reabrir desde el editor) pendiente a cargo del coordinador en el candidato integrado.

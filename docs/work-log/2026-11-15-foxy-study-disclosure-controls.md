# Paneles bajo demanda en Foxy y Estudio

Agente /root/foxy_study_impl. 2026-11-15, rama codex/foxmind-product-parity en su worktree dedicado, base ef6828b. Alcance autorizado por el coordinador: reemplazar cinco controles nativos details/summary en cuatro componentes. Las pruebas verifican la apertura explícita, la persistencia de entradas y el retorno al control de origen. La vista de producción de QA permanece a cargo del coordinador y de quien hace el recorrido estudiante.

En curso. Los componentes, sus estilos propios y sus pruebas focales son la superficie de cambios.

- Study usa «Fuentes consultadas» para abrir un diálogo compartido, «Ver detalles» para habilitar apertura/descarga y gestión por recurso y «Ver temas» para mostrar una unidad por vez. Abrir las fuentes conserva el borrador y resuelve las etiquetas con los datos actuales.
- Foxy Creaciones usa «Filtros» para mostrar los controles del catálogo. El editor visual vuelve a ofrecer su formulario con «Nuevo recurso visual» cuando ya hay una vista previa. El borrador pertenece al flujo existente.
- Los paneles en línea se abren y cierran con el mismo botón y exponen su estado con `aria-expanded`. Las fuentes reutilizan el diálogo con restauración de foco. Historial y Herramientas conservan sus rutas.

## Evidencia

- `node --test tests/foxy-study-demand-panels.test.mjs`. RED por los nodos details/summary en los cinco controles, en dos pasos para los tres componentes con panel y el chat con fuentes. GREEN 4/4.
- `node --test tests/foxy-study-demand-panels.test.mjs apps/web/src/features/foxy/ui/foxy-visual-workspace.test.mjs apps/web/src/features/foxy/ui/foxy-collections.test.mjs tests/entry-glass-polish.test.mjs tests/ux-chat-polish.test.mjs apps/web/src/screens/foxy-visual-navigation.test.mjs tests/study-feature.test.mjs`. 27/27. Se adaptaron dos pruebas del catálogo a ejecutar sus hooks y abrir el panel. Con autorización del coordinador se preservaron las aserciones de payload, destinos guardados y prohibición de enlaces a preparaciones.
- `node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false`. Código 0. La primera invocación desde raíz sin proyecto sólo mostró la ayuda.
- `git diff --check` acotado a los archivos de la unidad pasó. La búsqueda de details/summary en los cuatro componentes no devolvió resultados.

Evidencia de componentes y restauración de foco compartida. La verificación visual y de teclado en el candidato integrado queda en manos del coordinador. Para revertir, aplicar el inverso de los hunks de esta unidad en los cuatro componentes y dos módulos CSS y revertir sólo los ajustes focales de prueba. Conservar cambios anteriores en los mismos archivos.


## Ampliación a los editores privados

Se reemplazaron también Compartir visual, Editar material y Compartir texto en las dos pantallas editoras. El panel de edición se abre si hay conflicto y permanece disponible al resolverlo. La entrada directa a Actividades o Rúbrica abre Compartir y permite volver a cerrarlo. Los paneles conservan montadas las acciones y formularios para retener la preparación, revisión y estado pendiente.

Las dos regresiones de pantalla fallaron con los desplegables nativos y pasaron con los botones y paneles. La prueba de modo lectura preservó las aserciones de panel cerrado, descarga Word fuera de él y ausencia de mutación, adaptadas a `aria-expanded` y `hidden`. La regresión ampliada suma 43/43 e incluye `apps/web/src/screens/foxy-resource-workspace.test.mjs` y `apps/web/src/screens/foxy-visual-navigation.test.mjs`. TypeScript sin emisión pasó nuevamente. La búsqueda en las superficies de Foxy y Estudio ya no devuelve detalles ni sumarios nativos. El coordinador conserva la verificación visual del candidato integrado.

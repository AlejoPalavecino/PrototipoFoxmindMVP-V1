# Restaurar el foco al cerrar Biblioteca de estudio

Agente /root/foxy_study_impl. 2026-11-15, rama codex/foxmind-product-parity, base ef6828b. El revisor reportó en build integrado que Escape al cerrar Materiales y Plan dejó el foco en BODY a 390 px. Alcance autorizado: Workspace y Materiales de Estudio, prueba local y registro. El coordinador recompila y el revisor vuelve a ejecutar el recorrido.

El revisor independiente reprodujo a 390 y 1440 px desde el chat vacío. Activó Biblioteca con Enter, activó Materiales y Plan dentro del primer diálogo y cerró el segundo con Escape. El foco quedó en BODY y Tab llevó a «Saltar al contenido». Cerrar Biblioteca directamente devolvía el foco.

El diálogo nuevo reemplaza al primero y su activador interior sale del DOM. StudyWorkspace conserva el botón externo de Biblioteca o Contexto durante la transición. Al terminar vuelve a ese botón si sigue conectado y el documento se quedó sin foco útil. Estudiar conserva el destino al compositor, y una navegación que ya enfocó otro control mantiene ese foco.

- RED con `node --test --test-name-pattern 'restores the originating' tests/foxy-study-demand-panels.test.mjs`. Falla al comparar el foco BODY con el botón externo.
- GREEN con `node --test tests/foxy-study-demand-panels.test.mjs tests/study-feature.test.mjs tests/ux-chat-polish.test.mjs tests/entry-glass-polish.test.mjs`, 14/14. La regresión verifica foco, borrador intacto y preservación de un destino de foco deliberado.
- `node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false`, código 0. Pasó `git diff --check` acotado a las rutas modificadas.

Primer paso pendiente en el candidato integrado: repetir con teclado a 390 y 1440 px después de compilar. Para revertir sólo esta unidad, retirar los hunks de foco en StudyWorkspace y los dos casos nuevos de la prueba focal.


# TASK-003 · Autoría y participación

Agente `activities_participation_ui`, implementador. Fecha 2026-11-11. Worktree `FoxMind-classrooms-ux`, rama `codex/classrooms-ux-unification`, base `3895f4d`.

Alcance autorizado: UI real de actividades, editor y participación. Preservar capacidades, proyecciones, revisiones y recepción. Coordinación y verificación visual integradas a cargo de root.

## Implementación

- Actividades muestra contexto curricular, estados y acciones para cada rol. El acceso a la ficha es GET, y la acción de ver devolución abre el intento entregado cuando está disponible.
- Autoría manual y borrador aplicado desde Foxy usan el mismo editor de preparación y revisión. Materiales/comentario y rúbrica se expanden según necesidad. Repartir pesos conserva nombres y evidencias. La revisión muestra la consigna pública y separa la clave docente.
- Salir del editor o intento desde su acción de volver permite conservar los cambios y salir tras guardar, seguir editando o descartar explícitamente. Volver entre pestañas del aula conserva la sesión estudiantil en memoria y el autosave del cuestionario. La recarga de página recupera sólo cambios confirmados por el servidor.
- La consulta no inicia intentos. Abrir explícitamente la consigna completa de un TP sin intento inicia un borrador, según el contrato existente. Archivo local, carga privada y entrega quedan separados. La confirmación de TP usa la revisión de guardado reconocida por el servidor aunque la siguiente lectura siga desactualizada. Se conserva la recepción con hora del servidor.
- History conserva PublishedResult y navega entre intentos corregibles visibles mediante las props del editor de corrección, con remount por ID de intento.

## Evidencia y límites

- RED de test-first: 'node --experimental-strip-types --test tests/classroom-activity-workflow.test.mjs' reprodujo salida sin aviso y ausencia de reparto de pesos (2 fallos esperados). Tras implementar, las cinco regresiones focales pasan, incluidas privacidad, confirmación final y persistencia de sesión en pestañas.
- 'node --experimental-strip-types --test tests/classroom-activity-redesign.test.mjs tests/classroom-activity-workflow.test.mjs tests/activity-ai-ui.test.mjs tests/p7-participation-client.test.mjs tests/brujula-fidelity-navigation.test.mjs' — 34/34.
- 'node_modules/.bin/tsc.cmd --project apps/web/tsconfig.json --noEmit', ESLint en superficies propias, 'node scripts/check-boundaries.mjs' y diff check acotado — código 0.
- La primera invocación de typecheck con '-w' falló porque el paquete web no es un workspace de npm. Se comprobó con TypeScript explícito desde raíz.
- Pruebas ampliadas de backend con base aislada no pudieron ejecutarse: 'activity-review-regressions.test.mjs' necesitó transform-types en B1/B2 y luego falló al levantar Docker igual que B3; 'p7-questionnaire.test.mjs' pasó su chequeo de contrato y falló al levantar su Docker propio. Pendientes QA visual, red lenta y flujos integrados bajo ambos roles a cargo de root. Sin proveedor real ni commits propios.

## Continuidad y reversión

Primer paso pendiente: comparar actividad real con la maqueta, a escritorio y móvil, y recorrer manual/Foxy, lectura, TP y cuestionario y su revisión final con cuentas sintéticas. Para revertir, aplicar el inverso del diff de TASK-003 en los cuatro archivos academic de actividades/intentos y en activity-authoring y participation, más retirar sus módulos CSS, tipo, prueba focal y este registro. Las superficies se comparten por worktree, por lo que se debe aplicar la reversión por hunks si hubo ediciones posteriores.

## Verificación en navegador compartido

Ego TaskSpace 10, p3, Chromium con 1400 × 700 y 390 × 700. La ruta local /activity-qa usa componentes reales mediante un adaptador efímero en .test-artifacts/classroom-interior-reference/apps/web/pages/activity-qa.tsx. No usa base, claves, Gemini, almacenamiento de archivos ni red productiva. Se inspeccionaron las ocho imágenes qa-activities-*.png en .test-artifacts/classrooms-ux.

- Manual escritorio: Unidad y Tipo en la misma fila, separación medida 16 px, controles de 44 px. La revisión inválida abrió la rúbrica y enfocó el error. La revisión válida presentó objetivo, consigna, rúbrica y destino. Log de escrituras vacío hasta Asignar, que produjo create/save/publish y estado PUBLISHED sintético.
- Foxy móvil: tema, fuente y objetivo llegaron a la revisión de parámetros; los botones quedaron debajo del control de cantidad, sin solapamiento ni scroll horizontal a 390 px. Aplicar READY abrió el mismo editor manual con título y contexto de la propuesta en estado DRAFT privado. Generación y aplicación son sintéticas.
- TP móvil: abrir la ficha no escribió. Iniciar creó un borrador. La respuesta sobrevivió al cambio Actividades → Muro → Actividades. Seleccionar archivo no escribió; subir adjuntó en borrador; revisar guardó el texto sin entregar; confirmar emitió exactamente un submit-practical y mostró la hora sintética de recepción.
- Cuestionario escritorio: abrir la ficha no escribió; las dos respuestas se guardaron antes de revisar sin mostrar la clave privada. Escape cerró la revisión, conservó la respuesta y devolvió el foco a Revisar entrega. Una segunda revisión seguida de confirmación emitió un submit-answers.
- Si falla la lectura del historial, la ficha sigue mostrando la actividad ya consultada. La suite focal repitió con 35/35, incluido este caso. TypeScript, ESLint y diff check focales volvieron a pasar.
- Las correcciones visuales fueron locales a editor y pantalla de actividad. Para revertir esta ronda se incluyen también los hunks de academic-ActivityScreen.tsx. El adaptador y los artefactos de QA son descartables.
- Pendiente verificación independiente del coordinador y cualquier recorrido con proveedor/servidor real. El coordinador conserva control del TaskSpace y tablero.

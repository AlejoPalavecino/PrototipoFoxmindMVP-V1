# TASK-004 · Corrección, devolución y progreso

- Agente: grading_progress_ui, implementador delegado. Identificador de sesión no expuesto.
- Fecha: 2026-11-11. Worktree FoxMind-classrooms-ux, rama codex/classrooms-ux-unification, base 3895f4d.
- Alcance: frontend de grading y pruebas focales. Contrato HTTP, persistencia y tablero a cargo de sus responsables.
- Estado inicial: inspección de la maqueta, consumidores y contratos; registro abierto antes de editar.
- Primer paso: reproducir RED del adaptador de comentarios.

## Cambios y contratos

- GradingEditor, GradingAiReview, brujula-grading-rubric y grading.module.css reúnen la evidencia, los puntajes, la rúbrica, la nota y Foxy. Se usa la misma revisión del servidor en guardado, aplicación de sugerencia y publicación. Cero conserva su representación exacta. Los puntajes objetivos provienen del cálculo del servidor. El docente adopta la nota ponderada de forma explícita.
- overall-feedback.ts serializa los rótulos y texto en el campo overallFeedback. Las longitudes permiten reproducir los textos multilínea tal como se guardaron. El editor cuenta el texto serializado en puntos de código Unicode y evita enviar más de 5000 caracteres. Los comentarios generales sueltos, incluidos los procedentes de Foxy, se conservan como texto plano.
- FeedbackDisplay y PublishedResult comparten el render con la vista previa docente. La vista previa usa la corrección guardada y el resultado estudiantil lee su propia proyección publicada. Los comentarios por pregunta conservan los campos existentes.
- Progress muestra primero el resumen propio y las actividades según estado, con avance de temas en un panel separado. La proyección de progreso aporta la primera recepción y la nota efectiva, sin identificar el intento de esa nota. Las acciones llevan al detalle de la actividad.
- El agente de participación conservó PublishedResult en academic-AttemptHistory.tsx y pasó navegación entre entregas y una clave por intento. Al salir del editor o navegar entre entregas, se pide confirmar el descarte de cambios locales. La recarga explícita conserva el comportamiento P8 de volver a la versión guardada. No se agregó almacenamiento local de borradores de corrección.
- Propuestas de Foxy siguen el ciclo existente de servidor para nuevas entregas elegibles. Actualizar sugerencia consulta el estado, y aplicar y descartar requieren confirmación. El cálculo manual sigue disponible con un fallo de IA.

## Evidencia

- RED observado con node --test apps/web/src/features/grading/ui/overall-feedback.test.mjs por ausencia de overall-feedback.ts. GREEN de sus cuatro casos de Unicode, legado, formato dañado y límites.
- Primer pase de regresión mostró cuatro fallos por el nombre accesible duplicado en la sección de nota. Se ajustó el nombre de sección y se conservó el del campo. El primer pase de tipos detectó el retorno amplio en el clasificador de progreso; quedó tipado con las claves de los estados.
- La prueba adicional structured-feedback-flow.test.mjs comprueba bloqueo por límite, guardado privado, vista previa sin publicar y visualización posterior de la devolución con nota cero. Su primer pase usó un fixture de resultado pendiente; pasó con un fixture publicado sintético.
- node --test apps/web/src/features/grading/ui/overall-feedback.test.mjs apps/web/src/features/grading/ui/structured-feedback-flow.test.mjs tests/brujula-grading-ui.test.mjs tests/grading-ai-review-ui.test.mjs tests/p8-grading-client.test.mjs tests/p8-publication-client.test.mjs tests/p8-progress-client.test.mjs tests/grading-ai-ui.test.mjs — 29/29 PASS.
- node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false — salida 0.
- node node_modules/eslint/bin/eslint.js apps/web/src/features/grading/ui — salida 0. git diff --check -- apps/web/src/features/grading — salida 0, con avisos de conversión LF/CRLF.
- El coordinador verifica el candidato integrado con navegador, incluido teclado/diálogo, responsive, navegación en contexto, y operaciones reales de prueba. Este registro no acredita la operación contra HTTP, base de datos o proveedor real.

## Reversión y estado

Unidad sin commits. Para revertir, restaurar únicamente GradingEditor.tsx, GradingAiReview.tsx, brujula-grading-rubric.tsx, Progress.tsx y PublishedResult.tsx a 3895f4d y retirar FeedbackDisplay.tsx, grading.module.css, overall-feedback.ts y sus dos pruebas focales. Coordinar la reversión de las props de navegación con el escritor de academic-AttemptHistory.tsx. Las devoluciones estructuradas ya guardadas seguirían legibles como texto plano con sus rótulos y longitudes en clientes anteriores. Estado local entregado para verificación del coordinador.

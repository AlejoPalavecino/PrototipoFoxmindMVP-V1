# Recuperación del archivo de programa pendiente

- Agente: `/root/aula`, escritor delegado; sesión UUID no expuesta.
- Fecha: 2026-11-17. Worktree: repositorio principal ProtipoFoxMind. Rama/commit inicial: consulta Git bloqueada en sandbox (`not a git repository`); el coordinador conserva el estado Git.
- Autorización: corregir la pérdida del archivo pendiente al guardar y salir, con regresión RED/GREEN. Sin publicación Git ni cambios a servicios persistentes.
- Superficies: hook de archivo del wizard, callback de selección y pruebas focalizadas.
- Contrato revisado: `draftPayload(..., false)` admite `planFileId` UUID sin exigir aprobación; `DraftService.saveDraft` conserva el payload bajo autorización y revisión. Publicar mantiene la promoción P4 con comprobación del archivo. La UI debe seguir bloqueando avanzar/extraer/publicar mientras el archivo no esté aprobado.
- Estado inicial: reproducción sintética confirma que subir archivo pendiente y guardar conserva el ID anterior.
- Implementación: el hook informa la selección del archivo pendiente no rechazado para que el borrador conserve su ID. El snapshot recién recibido evita una lectura inicial redundante; el polling y la consulta manual conservan la validación. Al reabrir el wizard se consulta el mismo ID pendiente. Un reemplazo rechazado conserva el programa anterior.
- RED: `node --test --test-name-pattern='Guardar y reabrir' tests/classroom-wizard-file-step.test.mjs` falló por la causa esperada (`actual: approved`, `expected: pending-new`).
- GREEN: `node --test tests/classroom-wizard-file-step.test.mjs tests/classroom-processing.test.mjs tests/classroom-creation-four-steps.test.mjs tests/classroom-draft-wizard-state.test.mjs`: 29/29. La regresión comprueba ID guardado, reapertura, prohibición de avanzar e IA no iniciada.
- Lint: `node node_modules/eslint/bin/eslint.js apps/web/src/features/classrooms/creation/use-classroom-plan-file.ts apps/web/src/application/workflows/classroom-creation/ClassroomWizard.tsx`: exit 0.
- Tipos: intento `node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false` bloqueado: módulo `typescript/bin/tsc` no instalado. No se instalaron dependencias.
- Límites: el nuevo caso utiliza harness sintético; no acredita un recorrido de navegador de la ventana pendiente. La promoción backend mantiene `requireReady` antes y después del lock de origen; no se modificó backend ni permisos. Sin commits ni publicación.
- Estado: implementación y regresión focalizada verificadas; comprobación de tipos y revisión integrada a cargo del coordinador.
- Primer paso pendiente: reconciliar diff y candidato integrado con el coordinador.

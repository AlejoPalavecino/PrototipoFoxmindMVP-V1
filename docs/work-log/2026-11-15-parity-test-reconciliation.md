# Conciliación de pruebas históricas de paridad

- Agente: test_engineer (`parity_test_reconciliation`).
- Fecha: 2026-11-15. Rama: `codex/foxmind-product-parity`. Base: `ef6828b`.
- Alcance: pruebas históricas de Inicio, aula, autoría, plan, biblioteca y política de archivos. Decisiones de referencia en [TTP](../../odd/tasks/foxmind-product-parity.md) y [plan de implementación](../../design/foxmind-ui-lab/IMPLEMENTATION-PLAN.md).

## Cambios y evidencia

- Inicio: los tests recorren las tarjetas, el selector docente explícito y las colas de ambos roles. Preservan reintentos por módulo, autorización, restauración del foco, selección del próximo tema con su ID y destinos de borradores y entregas. La dirección aprobada reemplaza el aula focal con una grilla. Material, avisos y progreso se abren desde el aula.
- Autoría: tres etapas, selección interunidad y confirmación explícita. Se conservan la ausencia de escrituras al recorrer etapas, campos obligatorios, publicación en orden y recuperación tras error. IA exige idea privada y alcance. Con ambos, admite una propuesta sin adjuntos.
- Archivos: PDF, DOC, DOCX, PPT y PPTX hasta 20 MB por propósito. XLSX, JPG, JPEG, PNG y ZIP conservan 50 MB en material y entrega. Se preservan verificaciones de rechazo, CSRF, hash y escaneo. La cabecera usa un fixture con unidades y comprueba recuentos.
- Pruebas de Inicio que fallaron antes del ajuste de producción: acceso a borradores globales y su reintento, reintento de devoluciones, enlace exacto al tema, ocultación de colas no aplicables y restauración de foco al cerrar la cola. Las corrigió el coordinador y quedaron verdes.
- Primera corrida histórica focalizada: 36 archivos, 156 aprobadas y 35 fallidas. `%TEMP%\foxmind-parity-test-reconciliation-focused-red.log`.
- Primera ejecución de `node scripts/run-complete-suite.mjs --group fast`: 394 aprobadas y 3 fallidas en Foxy. El dueño recibió el log `%TEMP%\foxmind-parity-test-reconciliation-fast.log`.
- Compilación con `node scripts/build-api.mjs` y entorno filtrado por `cleanEnvironment()`: generación de Prisma y TypeScript exitosas. Antes de esta compilación, dos casos del nuevo contrato fallaron contra una compilación anterior. `%TEMP%\foxmind-parity-test-reconciliation-build.log`.
- `node --import ./scripts/register-api-test-build.mjs --experimental-transform-types --experimental-test-module-mocks --disable-warning=ExperimentalWarning --test --test-reporter=tap --test-concurrency=3 <37 archivos>` con entorno filtrado: 208 aprobadas, 0 fallidas, 0 omitidas. `%TEMP%\foxmind-parity-test-reconciliation-focused-green.log`. `git diff --check` limpio en los nueve archivos de pruebas editados.
- No hubo cambios de producción ni commits en esta unidad. Estas pruebas usan fixtures y clientes sintéticos. No se ejecutaron grupos con base de datos, servicios o navegador en esta unidad.

## Rondas de la suite amplia

- Segunda ejecución del grupo fast: 771 aprobadas, 2 fallidas y 0 omitidas. Superó los fallos iniciales de Foxy y se detuvo en 108 de 370 archivos. Los dos fallos detectaron que el detalle docente y estudiantil reordenaba los temas por índice del plan. El responsable de autoría reparó la producción. Ambas pruebas se mantuvieron intactas. `%TEMP%\foxmind-parity-test-reconciliation-fast-final.log`.
- Se recorrieron los otros 262 archivos con `executeFastFile` y el mismo entorno filtrado, sin modificar el runner. Los fallos restantes se repartieron entre presentación de Agenda y Notificaciones, navegación, Inicio, autoría, perfil y participación. `%TEMP%\foxmind-parity-test-reconciliation-fast-tail*.log`.
- El nuevo caso de Inicio estudiantil falló por la causa esperada: con una actividad cerrada seguida de una abierta, la bienvenida navegaba a la cerrada. El coordinador corrigió primero continuar la abierta en modo responder y, si sólo hay cerradas, consultar la primera en sólo lectura. `%TEMP%\foxmind-parity-test-reconciliation-extra.log`.
- La validación de destinos agregó únicamente Compañeros. Continúan los rechazos de configuración, historial, destinos arbitrarios y parámetros inválidos. Las pruebas de configuración IA siguen exigiendo avance sin escrituras, alcance e idea antes de generar, y controles de etapas inactivas deshabilitados.
- La repetición focalizada incluyó 11 archivos, 65 aprobadas, 0 fallidas y 0 omitidas, con correcciones del coordinador y de los dueños de Agenda, Notificaciones y autoría. `%TEMP%\foxmind-parity-test-reconciliation-recheck.log`. `git diff --check` limpio en los 16 archivos de pruebas editados.

- Corrida oficial consolidada de `node scripts/run-complete-suite.mjs --group fast`: 370 archivos, 2054 aprobadas, 2 fallidas, 0 omitidas. Los dos fallos son RED de compatibilidad Biblioteca incorporados durante la última ronda. Verifican edición de una descripción legada larga y representación de cuerpo y descripción sin duplicación. `%TEMP%\foxmind-parity-test-reconciliation-fast-consolidated.log`.

## Verificación posterior a los últimos cambios

- Corrida focal con entorno filtrado: 22 archivos, 94 aprobadas, 0 fallidas y 0 omitidas. Incluyó Biblioteca legada, entrada real al diálogo de invitación en el componente compuesto, destinos autorizados, aula en cuatro pasos y documentación. Se conservan las pruebas de plan incompleto, archivo pendiente, revisión persistida y doble confirmación. Editar y preparar el mismo texto no altera el plan ni crea otra revisión. El contrato de borrador admite nombres de unidades y temas. Sus IDs se asignan al publicar el aula. `%TEMP%\foxmind-parity-test-reconciliation-final-scopes.log`.
- `npm run docs:check` verificó 143 archivos y 871 enlaces, sin incidencias en la última ronda. `node scripts/run-complete-suite.mjs --check` pasó con 574 archivos, 54 exclusiones y 23 rutas explícitas. `node --check tests/brujula-complete-browser.test.mjs` pasó. Esta revisión de sintaxis no ejecuta el recorrido de navegador.
- El navegador histórico se adaptó al diálogo de texto del plan, la confirmación explícita de publicación, las tarjetas de Inicio y la bandeja nueva. Se mantuvieron las verificaciones de escrituras, privacidad, lectura y publicación. Esta unidad ejecutó pruebas de componentes y clientes sintéticos. El recorrido integrado de navegador corresponde a otra unidad.
- Huella final de las superficies acotadas: SHA-256 `3d0cfcacfeb6e12a861813a5f1e2ceeb6e6399a04f4376fb0644a88efb58a8ae`. Incluye `academic-Wizard.tsx`, `academic-Classrooms.tsx`, `WizardPlan.tsx`, `Library.tsx`, `MaterialReader.tsx`, `materials/application/library.ts`, `materials/infrastructure/library-repository.ts`, `product-parity-library-ui.test.mjs`, `product-parity-invitation-ui.test.mjs` y `wizard-reference-navigation.test.mjs`. Se ordenaron por ruta relativa y se añadieron al hash como ruta, separador, tamaño, separador y bytes originales.

Estado de la reconciliación inicial: pruebas históricas y repetición focal verificadas. Los dos RED de la corrida amplia quedaron verdes en la repetición de sus áreas.

## Integración en navegador

- Ejecuté los archivos de navegador con `cleanEnvironment()`, `node --import ./scripts/register-api-test-build.mjs --experimental-transform-types --experimental-test-module-mocks --disable-warning=ExperimentalWarning --test --test-reporter=tap --test-concurrency=1 <archivo>` y el runtime aislado existente. PostgreSQL, almacenamiento, ClamAV y Mailpit usaron recursos de prueba propios. El navegador usó sesiones sintéticas con roles distintos.
- `tests/brujula-complete-browser.test.mjs` pasó 1/1 en el build `DjCTHtE_ZH09q3BT7FhwU`. Las rondas anteriores corrigieron los selectores de consulta del intento, salida de corrección y formulario de Muro. La suite conservó las comprobaciones de permisos, descarga del plan, revisiones, escrituras, privacidad y lectura de notificaciones por cuenta. `%TEMP%\foxmind-parity-brujula-e2e-05.log`.
- Repetí la suite integral en el build de entrega `itNER5mJohCBmeNzCurv-` tras cambiar los desplegables nativos a paneles y diálogos. Pasó 1/1, con cero fallos de limpieza de procesos o de recursos propios. `%TEMP%\foxmind-parity-brujula-e2e-release.log` y `%TEMP%\foxmind-p9-brujula-complete-qeoejq\safe-responses.json`.
- `tests/p7-authoring-integration.test.mjs` pasó 6/6 en el mismo build de entrega. El driver usa radios de tipo, selección de tema dentro de su unidad, pestañas de contenido y diálogo de publicación. Verificó DST, privacidad, archivo escaneado y descarga, preguntas inválidas que no se persisten, permisos y persistencia después de reiniciar. ARQ-07 verificó enlace autorizado, recarga, Atrás/Adelante y 320 px. El fixture respetó un `Retry-After` real de 46 s. Ambos runtimes terminaron con cero fallos de limpieza y la comparación Docker dejó cero recursos nuevos. `%TEMP%\foxmind-parity-p7-e2e-release-01.log`.

## Grupo fast de entrega

- `node scripts/run-complete-suite.mjs --group fast` compiló el API y recorrió los primeros 220 archivos hasta una expectativa desactualizada de singular en la cabecera de aula. Informó 1321 aprobadas, 1 fallida y 0 omitidas. `%TEMP%\foxmind-parity-test-reconciliation-fast-release.log`.
- La cola de 152 archivos se ejecutó con `executeFastFile` y el entorno filtrado del mismo runner. Informó 749 aprobadas, 6 fallidas y 0 omitidas. Los fallos correspondían a pruebas que no abrían los nuevos diálogos de Agenda y corrección con IA. `%TEMP%\foxmind-parity-test-reconciliation-fast-release-tail.log`.
- Repetición de los tres archivos corregidos: 11/11, sin fallos ni omisiones. Agenda verificó el orden de todas las entregas, la ausencia de acciones duplicadas, el bloqueo durante espera y el destino al cerrar el diálogo. Corrección verificó orden de preguntas, privacidad y confirmación previa a aplicar o descartar. La cabecera conservó los recuentos y el singular para un tema dado. `%TEMP%\foxmind-parity-test-reconciliation-fast-release-recheck.log`.
- Comparé ambos registros con el inventario. Los 372 archivos coincidieron, sin faltantes, extras ni duplicados. Resultado agregado por caso, sin sumar otra vez los cuatro que volvieron a pasar: 2077 aprobadas, 0 fallidas y 0 omitidas. La evidencia reúne tres ejecuciones y registra el fallo intermedio.

Estado de entrega: pruebas integradas de navegador 7/7 y cobertura del grupo fast completada por lotes. Los cambios de esta unidad se limitaron a pruebas y su registro.

# Reauditoría Plan/Biblioteca — 2026-11-16

- Agente: /root/classroom_plan_library; implementación delegada. Rama/worktree: codex/foxmind-product-parity, C:/Users/alejo/.codex/worktrees/foxmind-product-parity/ProtipoFoxMind. Se preservan cambios concurrentes.
- Alcance: Plan/Biblioteca docente y estudiante, estados y diálogos en ancho reducido/altura corta. No shell, backend, política de formatos ni publicación.
- Evidencia inicial: inspección de capturas final/flow-teacher-plan-upload-390.png, flow-teacher-library-reader-390.png, flow-student-choose-topic-390.png, app-student-library-390.png y app-teacher-plan-390.png. Los títulos de diálogos no conservan peso de la referencia (styles.css h2=800), mientras la superficie principal sí.
- Hallazgo de código: Library.change ejecuta onSaved antes de reload; publicación en presentation=upload cierra overlay en onSaved. Un fallo de refresco posterior deja Plan desactualizado sin error recuperable visible. Se prueba antes de corregir.
- Pendiente solicitado al coordinador: medición real de selector/lector/carga a 320×480; no se infiere ausencia de overflow desde capturas 390.

## Cambios y evidencia

1. Publicación desde Plan: RED demostró que cerrar se disparaba pese a fallar reload (closed=1). GREEN conserva diálogo «Material publicado», explica que se guardó y permite Actualizar Plan y cerrar sin repetir POST. Mientras refresca no permite publicar/cerrar como si estuviera sin guardar. Cierre normal ocurre al completar refresco; error conserva estado confirmado.
2. Marcado de tema: RED demostró que un POST confirmado seguido de reload fallido dejaba activo el control (busy=false). GREEN bloquea otro marcado y ofrece Actualizar Plan como operación de lectura. Test comprueba un POST y dos lecturas de refresco, sin nuevo marcado.
3. Vacío de Biblioteca: antes era un párrafo simple sin ficha; la referencia teachingLibraryList muestra icono/ficha/título y ayuda específica para filtros. Ahora se usa esa estructura con datos reales.
4. Diálogos: peso/jerarquía de título de selector, lector y carga alineados con styles.css h2=800. Se limita alto al viewport menos 24px con scroll vertical y corte de palabras largas. A <=360px la ubicación del lector se apila para no comprimir ambos textos. Estos ajustes requieren validación browser final del coordinador a 320×480.

Archivos propios: Plan.tsx, PlanWorkspace.tsx, plan.module.css, Library.tsx, library.module.css, tests/classroom-plan-library-exact.test.mjs y este registro. Ningún cambio de shell/backend.

Resultados: suite focal de cinco archivos (classroom-plan-filters, classroom-plan-library-exact, product-parity-library-ui, p6-library-client, classroom-sections-redesign): 22/22 PASS. ESLint de tres TSX modificados: PASS. tsc web completo --noEmit --incremental false: PASS.

Límites: fixtures/hook tests no prueban scroll real, teclado ni selección de archivo nativa. Las capturas inspeccionadas eran 390, no 320. Se solicitó al coordinador medición 320×480 y evidencia de acciones finales alcanzables; pendiente reconciliar esas medidas. No se tocaron formatos admitidos, política de archivo, recursos retenidos ni servicios.

## Corrección del encabezado a 601px

Root aportó app/ref-teacher-shell-601.png (601×850) en classroom-interior-reaudit/before. Se comprobó título app centrado desde x112 y badge en una fila inferior, frente a referencia título x24 y badge a derecha. El freeze previo sólo ajustaba h2 <=520, por lo que no lo corregía.

Se agregó una regla focal 521–760 en plan.module.css para forzar fila sin centrado ni wrap, bloque de título flexible, badge a derecha, h2 22/800 y ayuda 13px. Se conservan los contenidos y la disposición inferior <=520. No se tocó cabecera shell. La geometría final depende de nueva medición por root; pruebas de comportamiento se repitieron.

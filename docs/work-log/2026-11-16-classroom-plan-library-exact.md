# Paridad exacta de Plan y Biblioteca

- Agente: /root/classroom_plan_library, implementación delegada por root; sesión no expuesta.
- Fecha: 2026-11-16. Rama: codex/foxmind-product-parity. Worktree: C:/Users/alejo/.codex/worktrees/foxmind-product-parity/ProtipoFoxMind. HEAD inicial: ef6828b96084b0fcaf9a883e4afb95e0871cf1d6.
- Autorización: R2 de paridad docente/estudiante con UI Lab; superficies curriculum/materials UI y tests propios. Preservar cambios preexistentes, contratos, permisos y datos. Sin commits/publicación/proveedores.
- Referencia: worktree foxmind-ui-lab, teaching-library.js/css y teaching-room.js/css. Contratos: docs/engineering/teaching/plan.md y library.md.
- Diferencias comprobadas en código: lector inline y acciones de edición en filas; carga sin pasos; filtro sin opción sin unidad; filas sin tamaño. Plan con proporciones diferentes y recursos sin procedencia tema/unidad.
- Estado: implementación en curso. QA visual y build integrados corresponden al coordinador.
- Plan: pruebas focales RED de pasos, filtros y lector; implementar jerarquía/estados; ejecutar pruebas y entregar freeze.

## Resultado implementado

- Plan docente/estudiante: mapa de unidades y selector móvil según referencia, selección inicial del primer tema, Pendiente/Dado, marcado docente desde detalle. Recursos de tema y unidad, exclusión de eliminados/reemplazados y actividades interunidad conservados. Se retiraron filtros, paginación, marcado por casilla y creación de actividad conforme a la instrucción vigente transmitida por root.
- Biblioteca: filtro Sin unidad ni tema, tamaño real de archivo, lista con Abrir únicamente. Se retiraron controles visibles Escribir/Editar/Eliminar y uso del recurso por instrucción vigente de paridad; no se borraron endpoints ni datos.
- Carga: Archivo y detalles → Organización; continúa sólo con archivo aprobado, no publica al preparar y conserva unidad/tema. La publicación final usa operación real existente.
- Lector: modal, nombre/tamaño/ubicación, descripción/cuerpo y actividades vinculadas obtenidas desde endpoint autorizado; descarga/vista de archivo real según permisos/formato. Errores de asociaciones recuperables.
- Integración preparada: Library acepta presentation='reader' + targetMaterialId + onReaderClose para mantener Plan visible detrás del modal. Root integra la invocación en shell; este agente no modifica shell.
- CSS exclusivamente en módulos de curriculum/materials; no requiere import global.

## Evidencia

- RED inicial de tests/classroom-plan-library-exact.test.mjs: 3/3 fallaron por paso único, ausencia de filtro sin unidad y lector inline (causas esperadas).
- GREEN inicial: 6/6 tests exactos y metadata/lector.
- Verificación sintética de revisión transaccional: tests/parity-library-revision-independent.test.mjs pasó, junto con exactos y metadata (10/10 en esa corrida).
- Corrida intermedia detectó prueba histórica de filtros; root autorizó reconciliarla con selector y marcado desde detalle. También autorizó actualizar sólo caso de contexto de material de classroom-sections-redesign.test.mjs; ahora verifica preparar sin POST y publicación única con mismo contexto. El agente de Progreso reconcilió su caso separado.
- Corrida final: `node --test tests/classroom-plan-filters.test.mjs tests/classroom-plan-library-exact.test.mjs tests/product-parity-library-ui.test.mjs tests/p6-library-client.test.mjs tests/classroom-sections-redesign.test.mjs`: 19/19 PASS.
- ESLint de PlanWorkspace.tsx, Library.tsx, MaterialReader.tsx y material-presentation.ts: PASS.
- TypeScript web completo: `npx tsc --project apps/web/tsconfig.json --noEmit --incremental false`: PASS antes de agregar modo reader; se repitió sobre candidato final (resultado enviado al coordinador).

## Superficies y límites

Archivos: PlanWorkspace.tsx y plan.module.css; Library.tsx, MaterialReader.tsx, library.module.css y nuevo material-presentation.ts; nuevo tests/classroom-plan-library-exact.test.mjs; prueba classroom-plan-filters.test.mjs; sólo caso de contexto material en classroom-sections-redesign.test.mjs; este registro.

No hubo commits, publicación, reinicios ni proveedores reales. No se ejecutó navegador por este agente; QA visual responsive, interacción nativa con diálogos y prueba de archivo real corresponden a root. Fuentes canónicas teaching/plan.md y teaching/library.md aún describen controles retirados: requieren reconciliación por el coordinador con la decisión vigente. No se afirma igualdad visual validada sin esa evidencia.

Estado: candidato congelado para integración y QA de root; sin ediciones adicionales salvo pedido específico. Primer paso pendiente: conectar presentation='reader' en apertura desde Plan y comparar desktop/móvil con UI Lab.

## Segunda pasada visual (pedido de root)

Se inspeccionaron con view_image los pares app/ref teacher-plan y teacher-library, a 1440 y 390, bajo .test-artifacts/classroom-interior-exact/after. No se operó navegador.

Hallazgos corregidos: título de tema y títulos/acciones de recursos con peso heredado liviano; encabezado móvil que ubicaba marcar/desmarcar al lado del tema; contador con check textual pegado; Biblioteca con campos pequeños/livianos, flecha naranja de estilo legado, contador marrón y 14px extra antes del buscador. Se aumentó la especificidad sólo dentro de los módulos propietarios, se colocó acción debajo de tema a <=520px y se recuperaron márgenes de h4 de referencia (UI Lab no resetea h4, por lo que conserva margen 1.33em). Se incorporó icono real al resumen de Plan.

Cambios de esta pasada: Plan.tsx, plan.module.css y library.module.css. No se tocó shell. No se observó corte horizontal en las capturas inspeccionadas; la igualdad final requiere nueva captura del candidato.

Prueba posterior: node --test tests/classroom-plan-filters.test.mjs tests/classroom-plan-library-exact.test.mjs tests/product-parity-library-ui.test.mjs → 11/11 PASS. Root ejecuta build y navegador final. Freeze de esta segunda pasada enviado.

## Carga sobre Plan sin cambiar pestaña

A pedido de root, Library admite presentation='upload' y onUploadClose. Se comparten el diálogo de dos pasos y la confirmación de descarte con Biblioteca; no se renderizan lista/buscador/panel en este modo. Publicación confirmada llama onUploadClose y conserva el reload existente para refrescar asociaciones del Plan. El shell lo conecta root. Contexto unidad/tema, estado de revisión y bloqueo por permisos se conservan.

Evidencia: nuevo test de carga aislada tuvo RED por buscador extra; GREEN verifica contexto, ausencia de buscador, descarte protegido, preparar sin POST, publicación única con tema y callback/carga posterior. Suite focal final de cinco archivos: 20/20 PASS. ESLint Library PASS. TypeScript web final PASS.

Límite explícito: la matriz real de formatos/escáner no cubre todos los teachingFileTypes de UI Lab. Esta UI conserva formatos actuales del backend (PDF, DOC/DOCX, PPT/PPTX, XLSX, JPG/JPEG, PNG, ZIP) y sus límites actuales; no se modificaron política, escáner ni migraciones para aceptar XLS legado, OpenDocument, TXT, CSV o WebP simulados por la referencia. Esta diferencia requiere alcance backend separado si se desea ampliarla.

Freeze: sólo Library.tsx, test propio y este registro cambiaron en esta unidad. Root ejecuta build/recorrido visual final.


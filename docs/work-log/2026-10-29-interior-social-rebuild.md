# Biblioteca, muro y actividades — en progreso

- Agente: `/root/interior_social_rebuild`, slice worker.
- Fecha: 2026-10-29; rama `codex/inicio-reference-astra`.
- Base: `dd622f9`; archivos compartidos, trabajo paralelo en curso.
- Estado: completed para implementación asignada; QA integrado pendiente. Alcance: referencias 3, 8 y 4, manteniendo contratos y controles reales.
- Propiedad: Library.tsx, Wall.tsx, Activities.tsx, interior-activity-reference.css, interior-library-fidelity.css y este registro; no pruebas ni archivos ajenos.
- Primer paso: mejorar estructura semántica/visual de cada pestaña, comprobar pruebas focalizadas y tipos; QA visual integrada a cargo del coordinador.

## Resultado y pruebas

`Library.tsx`: resumen con número real de materiales, iconos/tipos derivados del nombre del archivo, encabezado y fichas; conserva carga, permisos, búsqueda, foco de enlace, revisión y edición. Nueva hoja `interior-library-fidelity.css` debe ser importada por coordinador después de la anterior. `Wall.tsx` y `Activities.tsx`: encabezados con iconos existentes; actividades con tipo, estado e icono de estado reales. `interior-activity-reference.css`: elimina doble panel, compacta compositor y conversaciones, mejora tarjetas y mantiene adaptación móvil. Sin acciones ni datos ficticios, sin edición de pruebas.

`node --test --test-reporter=dot --test-concurrency=1 tests/classroom-library-search.test.mjs`: 3 PASS, exit0. `node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json --noEmit --incremental false`: exit0. PostCSS analizó las dos hojas: PASS. `git diff --check` para rutas propias: PASS, con advertencia habitual LF/CRLF. El repositorio no ofrece linter de fronteras configurado; no se invocó infraestructura o DB. Los componentes usan `EntryIcon` local preexistente y React existente, sin API externa nueva. Validación visual y pruebas del muro/actividades integradas pendientes del tester; no se declara QA final.

## Handoff

Importar CSS nuevo en ambos entrypoints y comparar pestañas en viewport y estado equivalentes. Posibles diferencias por falta de favoritos, reacciones, adjuntos y contenidos inventados de las capturas: no se añadieron porque carecen de contrato. Archivos modificados: Library.tsx, Wall.tsx, Activities.tsx, interior-activity-reference.css, interior-library-fidelity.css y este registro.

## Corrección de densidad

QA de `/root/interior_visual_test` comparó fixture Literatura: tarjetas de biblioteca318px frente a223px, compositor muro258px frente a206px y filas actividades170px frente a140px. Se agruparon acciones secundarias de material en `details` accesible conservando botón de eliminación bloqueado y explicación de vinculación; reducido padding de tarjetas, separación del compositor y hilos, y márgenes/tipo en línea de actividades. El `textarea` conserva redimensionado manual. Pruebas de biblioteca3 PASS y TypeScript exit0 luego de agrupar; recaptura integrada pendiente con QA. Primer trabajo pendiente: verificar medidas finales y controles de menú con el tester antes de cerrar aceptación visual.

Recaptura del tester: biblioteca226px y actividades muestran las tres filas; P2 de densidad actividades resuelto. Selector de carga cerrado se alinea a la derecha de búsqueda en escritorio y permanece en flujo normal si está abierto; QA confirmó que se abre y muestra selector sin enviar datos. Muro quedó en214,6px de alto; primer aviso y589 frente a y547 en fuente, con parte del desplazamiento atribuible a la posición común de tabs (y218 frente a y196 en esa fuente). Las otras referencias sitúan tabs cerca de y215; el coordinador decide si queda alguna diferencia de composición relevante. Integración y cierre siguen a cargo de coordinador.

QA detectó que el float de carga reducía el ancho del grid. Se añadió `clear: both` al grid; PostCSS PASS. Recaptura de `/root/interior_visual_test`: tres columnas x244–1624, primera fila y462–688 y segunda y704–929, ambas visibles. Antes de la corrección se verificaron menú de opciones y apertura de carga sin mutaciones. Handoff al coordinador para cierre integrado.

## Filtros por origen

Coordinador solicitó filtros reales Todos/Materiales del plan/Archivos del aula. Tester agregó caso de origen más búsqueda combinada en `tests/classroom-library-search.test.mjs`: RED 3 PASS/1 FAIL por ausencia del botón. Implementados filtros locales mediante `unitId` presente/ausente, sin solicitudes ni cambios de datos, con `aria-pressed`; un enlace profundo nuevo limpia búsqueda y filtro antes de enfocar. La búsqueda y acciones permanecen. GREEN: 4 PASS, exit0; `tsc --project apps/web/tsconfig.json --noEmit --incremental false` exit0. QA debe comprobar toolbar y acceso al control de carga en escritorio/móvil. No se añadió favoritos al no existir contrato.

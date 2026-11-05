# Fidelidad de aulas Brújula — en curso

- Agent / role: worker de interfaz
- Session or task ID: /root/brujula_classroom_fidelity
- Date: 2026-11-05
- Branch / worktree: codex/foxmind-brujula; checkout compartido
- Starting commit: 5ea7f568d485512c88ed626511aef537bcad5704
- Phase and detailed task/spec links: [BRU-02/03/05](../../odd/tasks/foxmind-brujula.md)
- Status: in_progress

## Request and scope
Trasladar fielmente catálogo, interior y actividades desde docs/design/brujula/FoxMind-Brujula.html. Preservar permisos/callbacks/datos reales. Sin backend, secretos, commit ni publicación. Root posee Home y shell; otro worker Agenda/Foxy.

## Work performed
Inspección de referencia HTML/CSS, estado Git y componentes existentes. Se identificaron banner antiguo, tarjetas horizontales, filtros plegados y paneles con jerarquía diferente del HTML.

## Verification
Pendiente comprobación estática focal. QA navegador global asignada al coordinador.

## Commits and outcomes
Sin commits.

## Handoff
Continuar cambios visuales. El contrato de catálogo no aporta cantidad de estudiantes ni avance: no fabricar cifras.

## Implementación realizada
- Catálogo: encabezado de texto `Mi espacio / Mis aulas`, eliminación del banner anterior, tarjetas verticales `cl-course`, portada original, división/ciclo, docente real, tarjeta completa accionable y estados/filtros visibles del HTML.
- Interior: masthead con portada/paisaje, etiqueta Aula/división/ciclo, docente y navegación original; rejilla de tabs móvil y Plan árbol/detalle con unidades seleccionadas.
- Actividades: filas, filtros, modal manual/IA y tarjetas de elección. Autoría manual agrupada en dos pasos exactos (`Preparar actividad`, `Revisar y asignar`); todos los campos y publicación explícita conservados.
- Biblioteca: cabecera y filas sobrias, Agregar material abre modal conservando carga, revisión de archivo y publicación real; contexto desde Plan retenido.
- Muro: cabecera, filtros sobre publicaciones cargadas y modal de publicación; sin paneles decorativos añadidos por la adaptación anterior. Permisos, revisión, respuestas y paginación conservados.
- Sidebar: links reales de aulas y carga del catálogo también al ingresar por deep link, solicitado explícitamente por root.
- Navegación alumno: HomeTarget classroom admite plan/library/progress/wall, parser rechaza secciones administrativas; routing respeta sección. Ampliación solicitada por root.
- CSS: reglas académicas originales del HTML extraídas con PostCSS y prefijadas al área de aulas en apps/shared-ui/brujula-workspaces.css, más adaptadores sobre los controles existentes. No se modificaron las reglas previas de Agenda.

## Archivos afectados
apps/classrooms-ui/{ClassroomCollectionHero,ClassroomCollection,ClassroomCollectionCard,ClassroomCollectionFilters,ClassroomHeader,ClassroomNavigation,Classrooms,ClassroomView,Plan,PlanWorkspace,Activities,ActivityAuthoring,Library,Wall}.tsx; apps/classrooms-ui/classroom-home-target.ts; apps/shared-ui/brujula-workspaces.css; src/core/domain/{home,home-target}.ts; tests/brujula-fidelity-navigation.test.mjs.

## Verificación observada
- `node --test tests/brujula-fidelity-navigation.test.mjs`: RED observado antes de reagrupar autoría (4 etapas !=2); GREEN final2 PASS, incluye no mutación al navegar/revisar/abrir confirmación y publicación exacta solo al confirmar.
- `node --test tests/brujula-fidelity-navigation.test.mjs tests/classroom-curriculum-workspace.test.mjs tests/classroom-content-workspace.test.mjs tests/foxmind-3d-contracts.test.mjs`:14 PASS/0 FAIL.
- `npx tsc --noEmit -p apps/web/tsconfig.json`: PASS final.
- `npx eslint` sobre componentes editados, HomeTarget y routing: PASS observado; último título/steps verificado por tsc y test focal.
- PostCSS parse de brujula-workspaces.css: PASS631 nodos antes del último bloque steps (estructura comprobada).
- `git diff --check`: PASS; avisos LF/CRLF de archivos compartidos, sin errores whitespace.
- `npx tsc --noEmit -p apps/classrooms-ui/tsconfig.json`: no ejecutable como comprobación autónoma del repositorio por declaraciones de CSS modules ausentes (Agenda y Classrooms). tsconfig web incluye esas declaraciones y pasó.

## Pruebas históricas incompatibles con la referencia actual (sin modificar)
- classroom-collection-workspace: tres fallos por separador `Activas ·1`, desplegable `Más filtros` retirado y prefijo `Docente:` anterior.
- classroom-workspace-shell: un fallo exige cover mini/classroom-identity-cover anterior.
- foxmind-3d-flows-collection: dos fallos mismo separador de estados anterior.
- brujula-integration: un fallo busca tab `Revisión` anterior (nuevo `Revisar y asignar`). La nueva prueba cubre confirmación/publicación.
- classroom-activity-redesign: un fallo exige explícitamente cuatro etapas anteriores. Otras cuatro pruebas de contexto/guardado/IA pasaron.
- workspace-disclosure: dos fallos de Home/shortcuts durante trabajo concurrente de root, informado al coordinador; fuera de esta superficie.
No se cambiaron pruebas de aceptación ajenas. Root debe revisar su actualización para reflejar la solicitud visual vigente.

## Límites y entrega
Implementación y comprobación estática listas; QA visual en navegador global a cargo de root, todavía no observada por este worker. Sin commit ni publicación. No se declaran porcentajes de avance ni conteos de alumnos que Classroom/Detail no entregan; su ausencia es una brecha del contrato real frente al contenido de muestra. No se modificó backend ni se fabricaron datos.

## Handoff actualizado
Root: ejecutar comparación visual responsive y recorridos reales sobre esta versión; informar hallazgos, actualizar pruebas de presentación obsoletas tras revisión y registrar el nuevo test en inventario/rutas de suite si corresponde. Este registro queda in_progress hasta la evidencia visual final del coordinador.

## Cierre de código y hallazgo P2
Solicitud de root durante revisión independiente: `Continuar borrador` docente abría consulta. Se agregó test RED verificable (editor0!=1) y se corrigió resolución del target: GET preview, y únicamente si DRAFT y aula editable, GET library seguido de ActivityAuthoring. Publicados/archivados conservan ActivityPreview; señales AbortSignal verificadas después de ambas esperas. No hay escritura al abrir.

Prueba propia final3 PASS; selección final `node --test tests/brujula-fidelity-navigation.test.mjs tests/classroom-curriculum-workspace.test.mjs tests/classroom-content-workspace.test.mjs tests/foxmind-3d-contracts.test.mjs`:15 PASS/0 FAIL. `npx tsc --noEmit -p apps/web/tsconfig.json` y eslint de ActivityAuthoring/Activities/Classrooms: PASS. Código congelado comunicado a root para build y QA. La asignación del worker queda entregada; aceptación visual final pendiente del coordinador.
Último cableado pedido por root/revisor: Classrooms pasa api={api} a Home para montar HomeFocus de borradores; tsc web PASS posterior. Sin otras ediciones.

## Seguimiento QA del coordinador — toolbar catálogo
Root aportó captura real teacher-mis-aulas-1440.png de fixture foxmind-p9-brujula-layout-TwxwfA y reference-aulas.png. Worker observó ambas: reglas heredadas apilaban lupa/input (altura80) y selects mostraban flecha naranja/altura60. Se agregaron selectores scoped de mayor especificidad para toolbar horizontal41px, input37px/icono17px, selects41px/chevron neutro y switch41px. Responsive≤620 mantiene buscador completo y controles en segunda fila. Se agregó breadcrumb Inicio/Mis aulas con enlace real /inicio.
`npx tsc --noEmit -p apps/web/tsconfig.json` y eslint ClassroomCollectionHero: PASS. Código congelado informado; nuevo render a cargo de root. No se afirma QA del build posterior todavía.

## Seguimiento QA final — modal, navegación móvil y Plan
Se observó failure-0.png del fixture foxmind-p9-brujula-cbE0qh: bloque contextual naranja grande y botones con serif heredada. Se retiró ActivityAssignment del selector de métodos; contexto de Plan se conserva en estado y pasa sin cambios al editor manual/IA. El selector mantiene dos tarjetas con texto original y nombres accesibles exactos Crear manualmente / Crear con IA, descripciones separadas, iconos SVG edit/spark disponibles y fuente explícita. El tipo manual queda en control compacto inferior porque POST create exige tipo antes de crear el borrador; IA conserva su selector propio posterior. Se eliminó estilo heredado del contenedor.
Nueva prueba de preservación de contexto ambos métodos: PASS; conjunto propio4 PASS. tsc web/eslint Activities PASS observado tras cambio del modal. CSS final oculta dropdown móvil duplicado con mayor especificidad y normaliza Administración de Plan, notas, contexto y selección de temas hacia neutro/lila; nota diferenciando avance y calificaciones conservada. Freeze de código informado a root para build final; QA posterior corresponde al coordinador.

## QA final POwsQx — cascada sidebar y tabs móviles
Se observaron teacher-mis-aulas-1440.png, teacher-agenda-1440.png y teacher-classroom-plan-390.png de foxmind-p9-brujula-layout-POwsQx. Diferencia confirmada en fuente: classrooms-surface.module.css imponía padding18px/gap24px/fondo crema/nav50px sobre el shell compartido. Se añadieron overrides scoped en brujula-workspaces.css para conservar sidebar común: padding0 14px19, gap0, logo88px, búsqueda39px, nav44px/gap6, fondo#fcfdff. En tabs compactas se impusieron métricas originales (teacher4columnas/student3, fuente11px, padding4px1px, minheight35px), sin partición de palabras heredada y selección correcta.
PostCSS parse PASS686 nodos; `node --test tests/brujula-fidelity-navigation.test.mjs tests/classroom-workspace-shell.test.mjs`:7 PASS/0 FAIL. No cambió TS/contratos ni componentes. Freeze informado a root; el render posterior no fue observado por este worker y queda pendiente de QA del coordinador.

## Último cableado Inicio/sidebar — catálogo real
Root detectó ausencia de Mis aulas en sidebar Inicio ambos roles (fixture foxmind-p9-brujula-pjBYVy). Se agregó prueba RED: Inicio no realizaba consulta (0 calls vs catálogo esperado). Classrooms ahora ejecuta load(signal, rooms) en Inicio simple, usando exclusivamente endpoint catálogo completo; no consulta drafts/invitations en ese camino. Otras entradas conservan load completo. Guardas existentes por token y AbortSignal intactas. La prueba comprueba ambos roles, exclusión de aulas archivadas y aborto al desmontar.
`node --test tests/brujula-fidelity-navigation.test.mjs`:5 PASS/0 FAIL; tsc web y eslint Classrooms PASS. Sin cambios CSS. Freeze comunicado a root; render posterior pendiente del coordinador.

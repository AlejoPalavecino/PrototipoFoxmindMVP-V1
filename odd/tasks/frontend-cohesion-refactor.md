# Feature: Cohesión y casos de uso del frontend

- **Spec:** docs/engineering/frontend/cohesion-refactor.md
- **Design:** docs/engineering/frontend/cohesion-refactor.md
- **Approval:** approved

Plan y ejecución autorizados por el usuario el 2026-11-16; rama separada del backend. No incluye publicación Git.

## Tasks

### TASK-001 — Candidato aislado y base reproducible
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** Worktree propio desde dd6f4bc, alcance registrado, mapa de superficies y baseline de tipo/build/fronteras.
- **Evidence:** Rama/worktree y dependencias propias; typecheck verde, build Next correcto con 25 rutas, 37 pruebas de features/fronteras verdes y guard AST sin excepciones. Primer intento de build falló por junction y quedó registrado.
- **Blocker:** none

### TASK-002 — Respuestas de Estudio vinculadas al contexto activo
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** root
- **Acceptance:** RED/GREEN para replace(A→B), refresh exitoso/fallido y comando rechazado tardío; preservar escritura confirmada.
- **Evidence:** RED independiente con 7 fallos previstos/5 controles verdes entre ambas regresiones; GREEN padre 25/25 con study-sequence y brujula-grading-ui. Revisión independiente final en TASK-012.
- **Blocker:** none

### TASK-003 — Recarga de corrección conserva borrador hasta confirmar
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** root
- **Acceptance:** RED/GREEN, cancelar mantiene campos; confirmar recarga sin POST; regresión de navegación verde.
- **Evidence:** RED independiente demuestra dos fallos por falta de diálogo; recarga pasa por leaveEditor. GREEN padre 25/25 con pruebas de Estudio y corrección. Revisión independiente final en TASK-012.
- **Blocker:** none

### TASK-004 — Contratos frontend acotados y transporte conservado
- **State:** DONE
- **Depends on:** TASK-002, TASK-003
- **Owner:** root
- **Acceptance:** Operaciones tipadas por capacidad, transporte HTTP separado, sin cambiar core/backend ni política CSRF/abort/revisión.
- **Evidence:** Operaciones locales conectadas a consumidores; request genérico separado de decodificación académica. Sin cambios de core/backend; guard AST0 excepciones, guard frontend5/5 y revisión independiente de sesión/CSRF/editor/abort aprobada. Facades temporales retiradas.
- **Blocker:** none

### TASK-005 — Biblioteca independiente por catálogo, lector y publicación
- **State:** DONE
- **Depends on:** TASK-002, TASK-003
- **Owner:** frontend-materials
- **Acceptance:** Casos de uso separados, sin consulta innecesaria en reader/upload, preserva DOCX/polling/vínculos/confirmación.
- **Evidence:** Catálogo/lector/publicación separados y conectados; adaptadores y pruebas heredadas en pasada final1288/1288. Ego Lite comprobó carga PDF, organización, publicación explícita, lector y persistencia tras recarga (HTTP 200).
- **Blocker:** none

### TASK-006 — Estudio por carpetas, conversaciones, creaciones y práctica
- **State:** DONE
- **Depends on:** TASK-002, TASK-003
- **Owner:** frontend-study
- **Acceptance:** Controlador de contexto seguro, comandos tipados, selección de intento por ID, sin clientes concretos en workspace/screen.
- **Evidence:** Carpetas/conversaciones/creaciones/práctica y transporte tipado conectados, sin facade antigua. Workspace1259→570L; Practice/Exam separados244/241L; Wizard 516L y presenters24–127L. Revisión independiente50/50 y AST34 presenters, 0 hooks; pasada final1288/1288. Navegador final en curso.
- **Blocker:** none

### TASK-007 — Autoría separa borrador, generación y publicación
- **State:** DONE
- **Depends on:** TASK-002, TASK-003
- **Owner:** frontend-authoring
- **Acceptance:** Controlador comprobable sin UI, conserva revisiones/fechas/rúbrica/publicación; estilo y pruebas junto al caso.
- **Evidence:** Drafting/generation/publication conectados; revisiones, fechas y publicación cubiertas en pasada final1288/1288. Ego Lite comprobó borrador privado guardado y publicación sólo al confirmar Asignar al aula; lectura HTTP 200 devuelve PUBLISHED.
- **Blocker:** none

### TASK-008 — Composición organizada en workflows
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** root
- **Acceptance:** academic-* agrupados por flujo, screens finas, wiring entre entradas públicas, preview sintético actualizado.
- **Evidence:** 61 movimientos de composición, rutas academic-* retiradas y workflows conectados; build finalNext 16.4.5, lint y1288 pruebas verdes. Entradas/proxies conservados; mapa versionado de262 movimientos.
- **Blocker:** none

### TASK-009 — Resto de features con ownership consistente
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** root
- **Acceptance:** Revisar las 14 features, separar casos independientes, conservar piezas cohesivas; sin imports globales de dominio innecesarios.
- **Evidence:** 14 features revisadas;81 movimientos restantes idénticos salvo imports y9 CSS idénticos. Foxy/aulas separan coordinación, estado y paneles.49 consumidores usan dominio concreto; core/backend intactos. Guard0 excepciones y suite1288/1288.
- **Blocker:** none

### TASK-010 — CSS específico pertenece a su funcionalidad
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** root
- **Acceptance:** Mapa de CSS y consumidores, estilos específicos locales, orden conservado y limpieza solo con evidencia visual.
- **Evidence:** 69 hojas reubicadas, product.css conserva orden de19 entradas;12duplicados exactos retirados con hash de orden efectivo idéntico. Comparación catálogo390x844: 0 píxeles distintos por encima de 8/canal; inicio1440x1000:0,0294%. Catálogo desktop omitido por dimensiones de baseline distintas.
- **Blocker:** none

### TASK-011 — Fronteras, suites y documentación reflejan los nuevos dueños
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** root
- **Acceptance:** Guard sin excepciones, manifests completos, docs verificadas, no imports a rutas retiradas ni cambio de cobertura.
- **Evidence:** GuardAST0 excepciones y nuevo guard 5/5; manifiesto 648 tests/23 rutas incluye 12 suites nuevas. Docs 183 archivos/1089 enlaces0 issues y routing648 tests/23 rutas validados; tests heredados conservan aceptación, sólo rutas/fixtures reconciliados.
- **Coordination:** Frontend sin consumidores productivos del barrel global; entrada conservada intacta por decisión vigente. Retiro posterior condicionado a integrar ramas y comprobar cero consumidores, incluidas pruebas. Escaneo de128imports al dominio:0destinos ausentes en el candidato backend; no equivale a integración verificada.
- **Blocker:** none

### TASK-012 — Aceptación independiente y real del candidato
- **State:** DONE
- **Depends on:** TASK-005, TASK-006, TASK-007, TASK-008, TASK-009, TASK-010, TASK-011, TASK-013, TASK-014
- **Owner:** root y quality_reviewer
- **Acceptance:** Tipado/build/suites afectadas verdes, revisión independiente de rutas críticas y Ego Lite ambos roles/responsive/foco/errores.
- **Evidence:** Suite 229 archivos/1288 pass / 0 fail / 0 skip; revisión crítica 110/110 y vistas Study 50/50. Build final taxGKwLfuzPwSvl5CiKv6 y lint verdes. Ego Lite docente Biblioteca/Autoría y estudiante DOCX/carpeta/chat/práctica/reintento; HTTP confirma persistencia.390/768/1440 sin overflow,1000/1002 navegación; Tab/Escape/foco/error recuperable comprobados. Previews EXIT 0 / cleanup 0 y espacio cerrado. Recibo docs/verification/frontend-cohesion.json explicita recorridos omitidos y límites.
- **Blocker:** none

### TASK-013 — Corrección por edición, revisión IA, publicación y lecturas
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** frontend-grading
- **Acceptance:** UI consume operaciones acotadas; borrador y política de reemplazo tienen dueño único; organización por caso preserva fix y payloads.
- **Evidence:** Capacidades edición/revisiónIA/publicación/resultados/progreso conectadas. Revisión independiente de descarte/CAS aprobada; regresiones originales y adaptadores incluidos en pasada final1288/1288. Validación de descarte ejecutable 3/3; recorrido manual de corrección completa no ejecutado.
- **Blocker:** none

### TASK-014 — Participación consume capacidades tipadas del intento
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** frontend-grading y root
- **Acceptance:** Cuestionario/práctico/adjuntos/lectura usan operaciones acotadas; token/epoch, CSRF, CAS, abort y confirmación separados del guardado preservados; sin escrituras cuando falta editor.
- **Evidence:** Host conectado, operaciones memoizadas y editor/epoch/CSRF/abort conservados. Revisión independiente de caminos sin editor aprobada; suites del caso y heredadas incluidas en1288/1288. No se ejecutó entrega manual completa en navegador.
- **Blocker:** none

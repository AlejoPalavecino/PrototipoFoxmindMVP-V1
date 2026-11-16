# Feature: Revisión exacta de Foxy AI y Mi Estudio

- **Spec:** docs/work-log/2026-11-16-root-foxy-study-exact.md
- **Design:** design/foxmind-ui-lab/01-foxmind.html
- **Approval:** approved

La fuente de diseño autoritativa es la carpeta homónima del worktree foxmind-ui-lab indicada por el usuario el 2026-11-16. Esta revisión tiene propiedad disjunta respecto de TASK-017 (Mis aulas) del tablero general; sólo su coordinador edita aquel registro.

**Ejecución retomada por pedido explícito del usuario.** Se conservan alcance, aprobaciones y estados del checkpoint en docs/work-log/2026-11-16-root-foxy-study-exact.md. Nueva evidencia y coordinación en docs/work-log/2026-11-16-root-foxy-study-resume.md.

## Tasks

### TASK-001 — Foxy y chat compartido fieles a referencia
- **State:** DONE
- **Depends on:** none
- **Owner:** root + foxy_exact (Astra xhigh)
- **Acceptance:** Una cabecera, chat, biblioteca/contexto, historial, herramientas, creaciones y revisión reproducen composición e interacción de referencia, manteniendo contratos reales y accesibilidad.
- **Evidence:** Builds API/web y tipos PASS. Tema acotado desde aula y chat nuevo: 5 pruebas focales PASS. En Ego se abrió lector de la creación recién editada desde el catálogo, se conservaron cambios al volver de Escape y se descargó TXT. Vista y publicación de la versión elegida en candidato GDx_noxCJE7hug5Hq9I7x. Registros de autores y evidencia final en docs/work-log/2026-11-16-root-foxy-study-resume.md.
- **Blocker:** none

### TASK-002 — Mi Estudio fiel a referencia
- **State:** DONE
- **Depends on:** none
- **Owner:** root + study_exact (Astra xhigh)
- **Acceptance:** Colección, asistente, chat, materiales/plan, herramientas, creaciones, práctica y repaso conservan datos y reproducen UI/UX y estados de referencia.
- **Evidence:** UI autor 59/59 y builds PASS. Checkpoint verificó wizard A→B y reanudación, práctica de tres tipos y tres sesiones exactas que llegaron a Agenda. Coordinador repitió materia/paso/activación/renombre por HTTP real aislado y 18 pruebas focales combinadas. En build final GDx_noxCJE7hug5Hq9I7x se verificaron el centrado, compositor visible sin desborde en390/768/1440/1920, y Escape restaura foco y conserva borrador. Galería docs/verification/product-parity/foxy-study-exact/README.md.
- **Blocker:** none

### TASK-003 — Verificación integrada visual y funcional
- **State:** DONE
- **Depends on:** TASK-001, TASK-002, TASK-004, TASK-005, TASK-006, TASK-007
- **Owner:** root
- **Acceptance:** Pruebas focales, tipos/lint y comparación Ego Lite en escritorio y móvil; flujos, foco, errores, animación y límites documentados en candidato identificado.
- **Evidence:** API/web de producción aisladas, tipos, lint focal, fronteras e inventario PASS. Candidato GDx_noxCJE7hug5Hq9I7x. Ego: lector a320/390/1440 y chat Estudio a390/768/1440/1920; confirmaciones explícitas de dos versiones y conservación de copia anterior por HTTP. Regresión de proyección HTTP con PostgreSQL pasó después de detectar un fallo en browser. Revisión independiente 47 UI/proxy,7 sesión,27/30 corrida API inicial y repetición limpia5/5 de casos afectados, intermitencia sin causa confirmada. IA sintética, sin migrar datos retenidos ni integrar. Ver docs/verification/product-parity/foxy-study-exact/README.md.
- **Blocker:** none

### TASK-004 — Persistencia compatible de los controles aprobados
- **State:** DONE
- **Depends on:** none
- **Owner:** root + study_persistence (Astra xhigh)
- **Acceptance:** Materia, paso de borrador y renombrado persisten con validación, propiedad, revisión e idempotencia; carpetas antiguas conservan compatibilidad.
- **Evidence:** 10 pruebas nuevas y 24 de regresión informadas por autor; revisor independiente ejecutó 31/31 PASS sin hallazgos. Coordinador ejecutó suite conjunta 18/18 PASS; build API de snapshot exit0. HTTP real/PostgreSQL aislado: crear materia/paso, PATCH omitido conserva, activar limpia paso, renombrar y repetir recibo conserva una conversación, GET confirma (seed-study.mjs, 2026-11-16).
- **Blocker:** none

### TASK-005 — Propuestas recuperables en conversación
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** study_persistence + study_exact (Astra xhigh), root
- **Acceptance:** Generaciones ligadas a conversación propia recuperan mensaje, estado y recurso tras recarga; cancelación, errores, reintento e idempotencia conservan seguridad y datos previos.
- **Evidence:** Backend autor 69/69; revisor independiente 46/46 y reproducciones negativas corregidas de cuota/historial impar y respuestas tardías concurrentes. UI autor 59/59. Coordinador HTTP/PostgreSQL aislado PASS: PENDING/COMPLETE/CANCELLED, card/recurso exacto, idempotencia y acceso ajeno. Ego tras reserva PENDING: recarga conserva conversación por URL, muestra preparación guardada y recibe una sola creación (ego-64.mjs); http-evidence.json conserva candidato/recibos sintéticos.
- **Blocker:** none

### TASK-006 — Adjuntos privados abiertos y conservados entre contextos
- **State:** DONE
- **Depends on:** none
- **Owner:** foxy_exact y review_study_persistence (checkpoint); foxy_editor_backend, foxy_editor_ui y root (retoma)
- **Acceptance:** Apertura privada autorizada y traslado por referencia al mismo objeto, sin duplicación física ni eliminación mientras existan vínculos activos; permisos, idempotencia y limpieza concurrente verificados.
- **Evidence:** Autor SQL 9/9; revisor 26/26 y contrato1/1 sin hallazgos. Coordinador transporte/UIcarry7/7 y HTTP/PostgreSQL PASS: lectura binaria y hash, denegación ajena, mismo attachmentId General→Aula→General, reintento y desvincular origen preservan destino. Ego abre PDF privado en pestaña y cambia contexto conservando enlace/archivo; Escape restaura foco (ego-54/56.mjs). Builds API/web PASS.
- **Blocker:** none

### TASK-007 — Lector y edición versionada de visuales
- **State:** DONE
- **Depends on:** none
- **Owner:** foxy_exact (Astra xhigh), review_study_persistence, root
- **Acceptance:** Lector de imagen/esquema reproduce título, privacidad, edición de título/texto, TXT y paso a Biblioteca de la maqueta. Edición durable con revisión e idempotencia conserva bytes originales y copias publicadas; nueva revisión editorial admite nueva publicación explícita. Migración aditiva compatible, permisos y concurrencia verificados.
- **Evidence:** Aprobación explícita previa «Sí, completar edición y versiones (recomendado)», reanudada por el usuario. RED→GREEN del lector y fallos de integración documentados. Backend Astra 11/11 + regresión HTTP real; frontend 16/16 última tanda de lector y editor, tipos exit0. Revisión independiente de autoridad, concurrencia, replay, propiedad, migración con filas previas y bytes intactos de imagen/esquema. Ego del build final verifica preparación rev.0 tras guardar rev.1, texto congelado, revisión nueva y dos publicaciones confirmadas y coexistentes. Registros y límites en docs/work-log/2026-11-16-root-foxy-study-resume.md.
- **Blocker:** none

# Brújula — fidelidad al HTML aprobado

- Agent / role: root / coordinador.
- Session or task ID: unavailable.
- Date: 2026-11-05.
- Branch / worktree: codex/foxmind-brujula / checkout principal.
- Starting commit: 5ea7f568d485512c88ed626511aef537bcad5704.
- Phase and detailed task/spec links: [Brújula](../../odd/tasks/foxmind-brujula.md).
- Status: completed.

## Request and scope

El usuario señala diferencias y pide la misma tipografía, colores, formas y flujos del HTML adjunto. Su SHA256 coincide con la referencia anterior: 3D32B2953AC6DD1668B0AFA5A49A7A8102A52C23FEE5504DD4B2411888429D39. Se reabre fidelidad visual; el cierre anterior prueba comportamiento y geometría, no igualdad visual. Sin publicación autorizada.

## Work performed

Inspeccionados estado Git, referencia, plan y registro anterior. Cambios locales previos preservados. Delegación por superficies disjuntas: aulas/interior; Agenda/Foxy; root navegación/Inicio y comparación navegador.

## Verification

Comparación visual realizada en navegador con referencia HTML y componentes productivos. Candidato verificado: Fast1538/0/0, Home13/0/0, recorridos Brújula y matriz visual aprobados. No se reutilizan capturas del build anterior como evidencia actual.

## Commits and outcomes

Sin commits.

## Handoff

Implementación y verificación local cerradas. Siguiente acción: revisión humana del diff y capturas conservadas; no hay autorización para commit, publicación o despliegue. La equivalencia visual fue revisada manualmente, no por comparación automatizada pixel a pixel.

## Verificación en curso y revisión atribuida

Primera corrida integrada2PASS usó build anterior: detectado al revisar capturas, no se atribuye al candidato nuevo. Nuevo build API/Next aprobado; corrida siguiente falló por selectores anteriores de tarjeta Entrar al aula y saludo Hola. Helpers actuales adaptados al botón con nombre de aula y Buen día; frozen intacto. Fast inicial279PASS/1FAIL: contexto accesible de Foxy perdido al cambiar cabecera, corregido y7focalesPASS. No se declara corrida fallida PASS.

Revisor independiente /root/brujula_review (solo lectura; registro persistido por root) detectó y confirmó corregidos mojibake, conteos desconocidos inventados con items.length, error aulas confundido con vacío, selector inline, destino borrador que abría preview, aula focal archived/rol ajeno y falta api en montaje Home. Dictamen focal VERIFIED con20PASS/0FAIL/0SKIP; sin navegador ni servicios propios. Hashes revisados prefijos HomeFocus14C49A426FC842CF, ActivitiesFC77BD87A0F7B7C3, ActivityAuthoring8FCACE5A21B40053, ClassroomsB58C7EF4FF75DEEF. No acredita igualdad visual global.

Test engineer actualizó expectativas visuales tras revisión independiente:43PASS/0FAIL/0SKIP; permisos, abort, error/retry y edición DRAFT conservados. Registros de trabajadores separados: [aulas](2026-11-05-brujula-classroom-fidelity.md), [Agenda/Foxy](2026-11-05-brujula-agenda-foxy-fidelity.md), [cuenta](2026-11-05-brujula-account-fidelity.md), [tests](2026-11-05-brujula-fidelity-tests.md).

## Implementación del candidato de entrega

- Fuente Brújula del kit declarada como estática400, con síntesis de negritas; corrección de la cascada que conservaba tipografías, fondos, botones y espaciados anteriores. Assets originales para identidad, portadas y bienvenida por rol.
- Sidebar consistente, búsqueda, cuenta/rol, notificaciones y aulas reales también en Inicio; menú móvil y recuperación de foco. Inicio docente con atención/acciones y rail agenda/aula/borradores; alumno con pendientes, accesos, devoluciones y agenda. Conteos desconocidos no inventados.
- Catálogo, plan, muro, biblioteca y actividades adaptados al HTML; elección manual/IA sin creación implícita, dos etapas de autoría y borradores que abren edición. Pestañas móviles legibles.
- Agenda con cabecera/breadcrumb/calendario/panel lateral; perfil y configuración compactos. Foxy con chat central y herramientas laterales; primer mensaje conservado tras confirmación de cambios pendientes y esquemas sujetos a las guardas vigentes de publicación.

## Segunda revisión independiente atribuida

/root/brujula_review, solo lectura; persistido por root. Encontró dos regresiones Foxy: intención de primer envío perdida al confirmar salida de un recurso modificado y botón Esquema que omitía bloqueo de publicación visual. Ambas corregidas y reproducidas con pruebas. Selección inicial83PASS/1FAIL por fixture de imageGeneration incompleto; selección corregida11PASS/0FAIL. Sondeo de doble inicio confirma una conversación y un envío al ID nuevo. Dictamen focal VERIFIED, sin hallazgos abiertos. Prefijos de hashes revisados: Workspace C39F3BCD065C8C3F, Session CCE0A30C09CA2DC7, Start77B76039CA39DD7A. Breadcrumb añadido después usa la misma guarda requestNavigate; revisión final focal registrada al cerrar.

## Evidencia visual y corridas intermedias

[15 muestras actuales conservadas](evidence/2026-11-05-brujula-fidelity/README.md), tomadas de72 capturas reales. Build de entrega: `.test-artifacts/brujula-fidelity-delivery-build.log`, exit0. Los dos recorridos Brújula aprobaron (`brujula-fidelity-delivery-e2e.log`); el único cambio posterior de CSS Foxy se validó con otro build y matriz visual completa. Home adicional cerró13/0/0 en `brujula-fidelity-home-verified.log`.

Se mantienen como fallidas las corridas fast279/1,659/1,977/1,983/2 y la selección restante549/3; descubrieron expectativas anteriores de contexto, modal, filtros y navegación, además del contexto accesible Foxy corregido. No se suman como una corrida aprobada. Pruebas actualizadas por test_engineer sin cambiar permisos ni la semántica funcional.

Home detectó429 real: endpoint auth/session, Retry-After39 a21 segundos. Diagnóstico de métodos/rutas confirmó carga combinada de cuatro cuentas en una IP, sin bucle de efectos. El catálogo Inicio agregó lecturas legítimas y movió el límite al GET de aula en la corrida siguiente. No se modificaron cuotas ni el reloj del servidor; la prueba separa sus bloques para respetar la ventana real y conserva comprobaciones de admisión y reintento visible. Los fallos originales y omisiones posteriores quedan en sus logs.

## Comprobaciones finales observadas

- Fast completo por runner vigente, serial/concurrency1 y entorno limpio: **1538PASS/0FAIL/0SKIP**, exit0 (`node .test-artifacts/brujula-fast-serial.mjs`; log `brujula-fidelity-fast-delivery.log`). Usa executeFastFile, preload y límite360s por archivo originales. No es la suite completa de cinco grupos.
- Build API y build Next aprobados. Último `node node_modules/next/dist/bin/next build apps/web`: exit0. `node node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json`: exit0. `npm run lint:boundaries`: exit0,127 excepciones congeladas.
- `node --test tests/brujula-browser.test.mjs`: PASS dentro de selección de entrega; rúbrica/privacidad/intento exacto/foco/evento persistido. Matriz `node --test tests/brujula-responsive-browser.test.mjs`: PASS repetido después del ajuste CSS Foxy,64 capturas y permisos entre alumnos, cleanup0/0 (`brujula-fidelity-visual-final.log`). Inicio aporta otras8 capturas.
- `node scripts/run-complete-suite.mjs --check`:461 entradas,53 exclusiones,23 rutas; `npm run docs:check`:138 archivos/1753 enlaces/0 problemas; `git diff --check`:exit0 con advertencias LF/CRLF. Un primer intento invocó un nombre de script de inventario inexistente; se corrigió usando el entrypoint vigente anterior.
- `node --test tests/p9-home-integration.test.mjs`: **13PASS/0FAIL/0SKIP**, exit0 (`brujula-fidelity-home-verified.log`,128.8s). Archivo/revocación, recuperación offline, navegación320/375/1280, teclado/foco, borradores y sesión aprobados. La comprobación del banner mide cajas de texto visibles después de cargar fuentes, sin relajar separación con Foxy ni overflow. Fixture `foxmind-p9-home-AycH96`; cleanup0/0. Fallos previos de contenedor transparente y drenaje diagnóstico de documentos destruidos permanecen históricos, corregidos en la prueba.

Revisión final atribuida a /root/brujula_review, sin escritura: `node --test tests/brujula-fidelity-navigation.test.mjs apps/web/src/components/foxy-workspace-start.test.mjs apps/web/src/lib/foxy-workspace-actions.test.mjs` produjo51PASS/0FAIL/0SKIP. Sondeo adicional del breadcrumb real confirma cancelar conserva y descartar navega una vez. Catálogo Inicio solo consulta aulas y conserva token/abort. Prefijos Classrooms114546C7D794014E, WorkspaceF8AE10314FAC5B21, Session421552F527F11F4F. Dictamen focal VERIFIED; no sustituye QA visual/SQL del coordinador.

## Límites operativos

No se afirma igualdad automática pixel a pixel ni se copian datos de demo para aparentarla. Catálogo no expone ciertas métricas agregadas del HTML; se conservan datos disponibles sin fabricar alumnos/progreso. Agenda conserva su contrato de42 días. Rúbrica de Foxy propone texto editable; no lo asocia automáticamente a una actividad. Proveedores reales y calidad de generación no se ensayaron en esta revisión.

Sin cambios sobre datos retenidos, secretos, commits, push ni despliegue. El escenario histórico de recuperación con roles mixtos no se ejecutó y no se declara aprobado; la política vigente de rol exclusivo permanece. No se ejecutaron los cinco grupos completos de la suite. Servidor visual propio53191 cerrado y taskspace ego finalizado; fixtures integrados reportaron cero fallos de limpieza.

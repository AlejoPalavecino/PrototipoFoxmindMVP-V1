# TASK-006 / TASK-007 - Capacidades de Aulas

Agente /root/backend_authoring_contracts. Fecha 2026-11-16, rama codex/backend-capabilities, worktree C:/Users/alejo/.codex/worktrees/069c/ProtipoFoxMind. Base dd6f4bc92b959cce0e2c68343291614270c4a17e mas trabajo concurrente preservado.

Autorizacion: mover Aulas por capacidades y tipar puertos/separar decisiones de persistencia, conservando HTTP, SQL, locks, revisiones y tx. Sin commits, red, secretos, proveedores o DB retenida. Ownership segun encargo; coordinador unico escritor del tablero y wiring global.

Mapa exacto en .test-artifacts/backend-capabilities/classrooms-move.json. Registro abierto antes de implementar. Pendiente evidencia y reconciliacion del coordinador.

## Resultado por tarea

TASK-006: drafts y settings separados. El caso de publicacion coordina snapshot, destino, bloqueo/revision del origen, marcado, promocion de plan, carga de unidades/temas y codigo dentro de la tx recibida. Ajustes mantiene autorizacion docente, revision y disponibilidad IA en aplicacion; adaptador conserva SQL atomico de revision/epoch/COALESCE. Repositorios de borradores tienen nombres de negocio, objetos de entrada y resultados concretos.

TASK-007: memberships, invitations y catalog separados. Alta por codigo, confirmacion, salida y vistas de miembros gobiernan decisiones en aplicacion; SQL esta en adaptadores con contratos concretos. Invitaciones individuales y lotes gobiernan reglas/replay en aplicacion con sobres inyectados, mientras el adaptador conserva SQL y entrega. Catalogo listado/detalle recibe repositorio y apertura de codigo inyectados. Search queda localizado como adaptador de catalogo; Agenda/query quedan localizados en academic-projection. Access agrupa UoW, permisos y contratos de runtime; dominio root conserva reglas puras compartidas. El unico contrato legacy restante application/management-operations.ts es solo tipos.

## Mapa y wiring

Mapa exacto de 34 rutas originales a finales: .test-artifacts/backend-capabilities/classrooms-move.json. Incluye test context-run con aserciones intactas; solo cambian sus imports. Capabilities ofrecen public.ts nombrados. No hay imports de infraestructura privada entre capacidades ni ciclos de tipos en el guard final.

Composiciones propias actualizadas: academic-management-composition.ts y academic-delivery-composition.ts. No se editaron application.ts ni academic-composition.ts.

Wiring externo requerido al coordinador:

- ClassroomCore recibe segundo argumento createCatalogOperations(createCatalogRepository(), { readCode: decryptDelivery, digest }); factories en catalog/public y catalog/infrastructure/classroom-queries-repository.
- Adaptador memberships/infrastructure/classroom-codes.newClassroomCode recibe digest y encryptDelivery adicionales. La composicion academic-management exporta newClassroomCode(tx,id,key) ensamblado para consumidores que conservan la firma de tres argumentos.
- Helpers ensamblados exportados tambien desde academic-management: publishDraftOperation, updateSettingsOperation, previewCodeOperation, confirmCodeOperation, endMembershipOperation y membersOperation. Tests existentes de helpers pueden remapear imports/loadTsModule a composicion, conservando aserciones. Normalizacion de codigo se importa desde memberships/public.
- Remapear consumidores externos, loaders, inventarios y CI con el mapa final, incluyendo application/ports.ts a access/application/ports.ts. No restaurar puentes legacy.

## RED/GREEN y evidencia observada

- RED source: node --test apps/api/src/modules/classrooms/drafts/application/publication.test.ts: 0 PASS / 1 FAIL por tx.query en aplicacion, antes de extraer SQL.
- GREEN inicial: mismo comando, 5/5 PASS tras extraccion y caracterizacion de publicacion/settings. Las pruebas posteriores de comportamiento caracterizan conservacion; no se afirma RED previo individual de cada escenario.
- GREEN final: node --experimental-transform-types --test con publication.test.ts, classrooms-persistence.test.ts, membership-behavior.test.ts, batch-behavior.test.ts y context-run.test.ts: 72/72 PASS (70 nuevos + 2 existentes movidos).
- 58 casos de adaptadores congelan SQL, orden de argumentos, identidad de tx y resultado. Un primer intento de generar esa matriz descubrio 0 casos por separadores Windows; se corrigio normalizacion de paths y se exigieron exactamente 58 antes de ejecutar la matriz real. No se acredita aquel intento como cobertura.
- Comparacion AST de todos los tx.query de Classrooms contra archivos originales en HEAD: 77 originales / 77 actuales, multiset identico; 0 consultas nuevas o faltantes (normalizacion de newline CRLF/LF).
- Publicacion: orden destino antes de source-lock, conflicto antes de promocion, replay sin destino nuevo; plan/unidades/temas/codigo con misma tx.
- Settings: permiso docente write, revision y disponibilidad IA impiden update cuando corresponde; revision nueva exacta.
- Memberships: orden classroom/code/enrollment/clock; token validado nuevamente con hora DB antes de enroll; archivo bloquea alta; salida propia archivada permitida; revocacion anterior al evento; vista alumno sin email/periodos historicos.
- Lotes: replay de recibo incluso tras archivar; emision/encolado antes de persistir recibo; destinatario terminal no reemite; archivo falla pendiente sin crear invitacion.
- TypeScript createProgram strict/noEmit sobre TODOS classrooms y ambas composiciones propias: 0 diagnosticos propios. Incluye seis @ts-expect-error que exigen rechazo de comandos/resultados invalidos. No sustituye build global.
- node node_modules/eslint/bin/eslint.js apps/api/src/modules/classrooms apps/api/src/bootstrap/academic-management-composition.ts apps/api/src/bootstrap/academic-delivery-composition.ts: PASS.
- node scripts/check-boundaries.mjs: PASS, 0 frozen exceptions en candidato final. Durante trabajo aparecieron cruces/ciclo de tipos propios resueltos; hallazgo concurrente curriculum fue resuelto por su escritor antes del guard final.

## Archivos nuevos y corte de revision

Cuatro tests nuevos: drafts/application/publication.test.ts; drafts/infrastructure/classrooms-persistence.test.ts; memberships/application/membership-behavior.test.ts; invitations/application/batch-behavior.test.ts. Registro para CI/inventario a cargo del coordinador.

Ademas del mapa de 34 movimientos: 6 public.ts de capacidades (academic-projection no necesita API de aplicacion porque solo posee adaptador), 7 pares de contratos/adaptadores de consultas extraidas, settings/application/settings.ts, memberships/domain/classroom-code.ts y README de modulo. Root public y contrato compartido management-operations se remapearon. Sin edicion de pruebas existentes fuera del test movido y sin tocar aserciones protegidas.

Diff de archivos movidos contra originales antes del movimiento: +261/-471 de autoria/imports, mas 574 lineas de 21 archivos nuevos (incluye pruebas/README y la extraccion settings), exports public y composicion. Excede 400 lineas porque cubre TASK-006 y TASK-007, con extraccion de SQL de varios flujos que compartian contratos. Revisar en cortes por capacidad: drafts/settings y su wiring; memberships; invitations; access/catalog/academic-projection estructural. No se generaron commits automaticamente.

## Limites, pendiente y reversion

No se ejecuto build global concurrente, DB, integracion, proveedores o servicios reales. Las tx simuladas prueban identidad/orden e interrupcion de llamadas, no rollback real ni contencion de locks PostgreSQL. El coordinador debe reconciliar wiring externo, build y suites existentes/integracion descartable antes de cerrar tareas. No se marcaron DONE.

Reversion: invertir solo este mapa de movimientos y reponer contenido previo de Classrooms/las dos composiciones, retirando contratos/pruebas/README propios; preservar todas las otras capacidades concurrentes. Dado que el coordinador remapea externos, su reversion debe reconciliar esos imports junto con este corte. No usar git restore global. Primer paso pendiente: verificacion conjunta del coordinador.

<a id="p4--integración-pendiente-del-cierre-de-p3"></a>

# P4 — Handoff histórico previo a la integración

**Handoff histórico previo a la integración.** P4 estaba validada de forma aislada y esperaba el cierre de P3 cuando se preparó esta guía. La posterior [integración aceptada](p4-integration.md) y el [roadmap de main](implementation-roadmap.md) sustituyen ese estado de espera. Se conservan referencias, instrucciones y resultados históricos para trazabilidad; no se solicita repetir la integración ni se amplía autorización.

| Referencia congelada | Evidencia |
|---|---|
| Base original de P4 | `33fd80f62b9735e43124dc2df1a4d12c81f01c8a` |
| Código corregido y aprobado nativamente | `2ea8523fdd2b8ca68cf4c7d7a46d33b63ba83c38` |
| Cierre documental anterior a esta guía | `767174bc61f2fc3a80c3937c4a0519b1b90523e0` |
| Última ejecución funcional observada | Build exit0; 68 comprobaciones PASS: 40 componentes/ciclo de vida, 27 servicios reales y 1 reinicio persistente |
| Persistencia y limpieza observadas | Seis migraciones, drift0, limpieza de recursos propios exit0; servicios P4 detenidos y volúmenes conservados |
| Revisión | Rechecks independientes y once disposiciones nativas reconocidas; cuatro advertencias corregidas, sin hallazgos pendientes de esas revisiones |

La [evidencia nativa](work-log/2026-10-16-id-unavailable-p4-native-review.md) distingue revisión estática, pruebas del coordinador, fallos históricos y límites. Las 68 comprobaciones no prueban integración con la aplicación ni ausencia absoluta de errores. En aquel checkpoint la fase completa seguía `in_progress` hasta la aceptación integrada, posteriormente documentada en la guía enlazada arriba.

## 1. Recuperar el contexto correcto

Leer el roadmap y los registros **del P3 finalmente aceptado**, esta guía, los [contratos HTTP](api/files.md), las [operaciones de P4](private-files.md) y las [tareas/evidencia](../odd/tasks/p4-private-files.md). Inspeccionar ramas, commits y cambios locales antes de editar.

El worktree P4 vive en `C:\Users\alejo\.codex\worktrees\foxmind-p4-files\ProtipoFoxMind`. El checkout original continúa P3. Al preparar esta guía se observó allí `0fd271c` con trabajo de recuperación sin cerrar; esa observación no es una aprobación de P3 ni su futuro commit final.

Después del cierre de P3, preparar una rama de integración basada en ese cierre y reconciliar el delta de P4 desde su base original. Preservar el trabajo local y revisar conflictos por responsabilidad. **No reemplazar los archivos completos de P3 por sus versiones históricas de esta rama.** En especial, mantener el `AGENTS.md`, roadmap, identidad, esquema y manifiestos aceptados en P3; incorporar únicamente los cambios P4 pertinentes. El resumen de siete operaciones P3 de este worktree es histórico.

## 2. Qué incorporar

| Superficie | Tratamiento durante la integración |
|---|---|
| [Módulo de archivos](../apps/api/src/files/index.ts), todo `apps/api/src/files/` | Servicio, contratos, adaptadores, validación, permisos, HTTP y limpieza; actualmente opt-in |
| [Schema](../prisma/schema.prisma) | Reconciliar adiciones de custodia y relaciones con el esquema final de P3; conservar ambas evoluciones |
| [Custodia](../prisma/migrations/202610160001_file_custody/migration.sql), [pruebas SQL](../prisma/migrations/202610160002_custody_proof_guards/migration.sql), [promoción](../prisma/migrations/202610160003_draft_plan_promotion/migration.sql) | Tres migraciones P4 adicionales a las tres fundacionales; no reescribir migraciones aplicadas |
| [package.json](../package.json), [lock](../package-lock.json) | Incorporar dependencias/scripts P4 preservando los cambios finales de P3; reconciliar y verificar el lock resultante |
| [.gitignore](../.gitignore) | Conservar exclusiones P4 de credenciales/artefactos sin perder las exclusiones posteriores de P3 |
| [Compose dedicado](../compose.p4.yaml), [ClamD](../config/p4-clamd.conf), [FreshClam](../config/p4-freshclam.conf) | Conservar aislamiento, límites, imágenes fijadas y guardia de firmas recientes |
| [Launcher](../scripts/p4-local.mjs), [runner](../scripts/test-p4.mjs), [servicios](../scripts/p4-services.mjs), [limpieza de probe](../scripts/p4-probe-cleanup.mjs) | Mantener propiedad de recursos, migración/reinicio y salida acotada |
| `tests/p4-*`, guías y registros P4 | Conservar regresiones y atribución; enlazar el checkpoint P4 desde el roadmap final sin retroceder P3 |

No incorporar `.p4-local/`, credenciales, contextos/capacidades nativos, `.test-artifacts/`, `.build/`, `.generated/` ni `node_modules/`. Los datos y volúmenes locales no son cambios de Git. No leer/copiar secretos del checkout P3 para preparar esta integración.

## 3. Conectar la aplicación

Estos son contratos de conexión existentes, no funcionalidades de producto nuevas ya terminadas:

| Responsable | Conexión requerida |
|---|---|
| P3 + P4 | Adaptar sesión real, Origin/CSRF y admisión al `FileAccess.authenticate`; usar identidad del servidor |
| P4 + dominio | Instalar `createFileAccess` con resolución de registros reales, pertenencia, rol de ese aula, archivo y propiedad del intento |
| P5 | Publicación del borrador con promoción atómica del plan a su aula; wizard e incorporación de miembros siguen siendo P5 |
| P6 | Vínculos reales de plan/materiales y conservación de contenidos publicados; no exponer registros sin enlace autorizado |
| P7 | `authorizeAttemptWrite`: editor activo/epoch, elegibilidad, plazo y máximo de cinco adjuntos; conservar intentos |
| Web de cada flujo | Estado pendiente/rechazado/listo, cuota y reintento; previsualización admitida con descarga alternativa |

Se puede incorporar la base de P4 después de P3 sin declarar P5/P6/P7 terminadas. Cada flujo de dominio se habilita cuando su adaptador y sus pruebas reales estén disponibles. No usar una autorización permisiva temporal para exponer escrituras de adjuntos.

### Arranque y cierre

1. Construir infraestructura con `createFileInfrastructure(config)`: endpoint, región, bucket, credenciales y host/puerto del scanner desde configuración confiable. La política actual admite HTTPS o HTTP loopback para storage y scanner loopback; no promete una topología remota distinta.
2. Proporcionar a `FilesModule.register` la base transaccional, acceso, storage, scanner y `draftQuotaBytes` bigint explícito. La cuota del aula sale de su valor persistido; no hay cifra de producción elegida.
3. Conectar el puente P3 aceptado. `authenticate(tx, request, action)` es repetible y se invoca tras locks y E/S: la admisión/counters ocurre **una sola vez por petición HTTP**, fuera de esa función. No copiar los headers sintéticos de autenticación de fixtures.
4. Instalar una instancia de `createFilesHandler(service)` por ingreso. Conservar la petición original y el cuerpo binario sin consumir para PUT; ordenar el middleware antes de parsers generales que drenen el stream. Respetar sesión/CSRF/admisión del host sin duplicar contadores.
5. Mantener el orden usuario → ámbito → pertenencia/registro en mutaciones y revocaciones compatibles. No hacer E/S externa dentro de transacciones SQL. El resolver vuelve a comprobar acceso después de E/S.
6. `FilesModule` instala `FileCleanupWorker`: barrido inmediato y siguiente 60 s después de terminar, sin superposición. Si se construye `FileService` directamente, el host debe poseer ese ciclo de vida. En cierre, esperar su operación acotada y llamar `close()` de la infraestructura; la aplicación conserva la responsabilidad de cerrar su cliente de base de datos.

El resolver exige `authenticate` y `authorizeAttemptWrite`; no hay fallback permisivo. La interfaz [FileTransaction](../apps/api/src/files/contracts.ts) debe envolver la transacción real aceptada; no crear una transacción anidada para aparentar atomicidad.

### Publicación del plan en P5

Dentro de **la misma transacción de publicación**, asignar `published_classroom_id`, llamar `promoteDraftPlanInTransaction(tx, request, fileId, classroomId)` y enlazar el plan. Exige propietario verificado y docente del destino activo, archivo listo y aula publicada correcta. Serializa aula y luego borrador; transfiere cuota sin duplicar, conserva identidad/bytes y revierte con el rollback del dominio. `promoteDraftPlan` sirve para una publicación ya establecida. No existe ruta HTTP pública de promoción.

## 4. Datos y configuración local

Primero reconciliar el historial de migraciones final de P3 y probar el esquema combinado en una base de integración aislada. No usar reset, borrar volúmenes ni reescribir SQL aplicado para resolver divergencias. Las tres migraciones P4 y las guardias de enlaces/pruebas/promoción deben seguir presentes. Un cambio posterior requiere una migración adicional y nueva verificación.

El entorno retenido P4 usa proyecto `foxmind-p4-files`, PostgreSQL `127.0.0.1:55434`, S3 `127.0.0.1:18334` y ClamD `127.0.0.1:13311`. No reutiliza los volúmenes ni el Mailpit de P3. Al cierre anterior los servicios quedaron detenidos; no se arrancaron para redactar esta guía.

Solo cuando corresponda operar ese entorno dedicado, desde su worktree:

```powershell
npm run p4:local -- up
npm run p4:local -- migrate
npm run p4:local -- drift
npm run p4:local -- status
npm run p4:local -- stop
```

`stop` conserva volúmenes. Las credenciales generadas permanecen en archivos ignorados; `p4LocalConfiguration()` las entrega en memoria al caller confiable. No imprimir ese objeto, guardar URLs con contraseña en registros ni regenerar credenciales sobre volúmenes conservados. El launcher no migra automáticamente una futura base de integración distinta: su configuración debe reconciliarse explícitamente.

Conservar los límites de análisis y firmas de [operaciones](private-files.md). Un error de scanner, actualización o almacenamiento no produce aprobación. Los tests de arranque con comandos sustitutos prueban control de flujo, no una base CVD artificialmente envejecida real.

## 5. Comprobar el resultado integrado

En el futuro candidato combinado, ejecutar los comandos P4 y las suites aplicables del P3 cerrado. Registrar comandos, commits, resultados y limpieza realmente observados; no reutilizar los 68 PASS como resultado de un nuevo candidato.

```powershell
npm run test:p4
npm run test:p4 -- --persistent
```

El runner construye y usa PostgreSQL/S3/ClamAV reales; la variante persistente añade reinicio y limpieza de su probe. También comprobar el build de la aplicación combinada, replay/estado/drift de sus migraciones y regresiones de dependencias/contratos tras reconciliar el lock. Identificar los comandos P3/web desde sus scripts finales, sin asumir que el manifiesto histórico de P4 contiene todos.

Lista de aceptación por flujo habilitado, a través de navegador → sesión real → API → SQL/storage/scanner:

- [ ] Reservar, subir y consultar un archivo permitido; habilitar uso únicamente con bytes completos y validación/scan limpios del mismo digest. Seleccionar un archivo no equivale a entregarlo.
- [ ] Negar usuario sin verificar, aula/registro ajeno, borrador privado de otro estudiante y escritura en aula archivada. Revalidar revocación de sesión/pertenencia durante E/S; conservar lecturas históricas permitidas.
- [ ] Rechazar contenido infectado, cifrado, extensión falsa y tamaño excedido. Scanner/storage caídos o lentos conservan cuarentena y estado veraz, sin confirmación ficticia.
- [ ] Verificar cuota concurrente, repetición de confirmación sin doble cómputo, reintento de mismos bytes y rechazo de reemplazo; cuota agotada preserva lectura autorizada.
- [ ] Comprobar publicación/rollback/promoción cuando se conecte P5 y editor/plazo/cinco adjuntos cuando se conecte P7. El docente no puede leer borradores privados del estudiante.
- [ ] Previsualizar PDF/imagen con permisos actuales y ofrecer descarga alternativa; Office/ZIP descargables. Comprobar desconexión/backpressure, recuperación y ausencia de claves/URLs privadas en respuestas.
- [ ] Limpiar solamente incompletos con 24 h de inactividad; competir con confirmación sin borrar listos, borradores confirmados o historia. Verificar cierre real y conservación de volúmenes.

Cada dominio pendiente conserva su tarea/estado; no marcar la fase completa por incorporar solamente el módulo. Nuevos cambios de código requieren su verificación independiente y política nativa aplicable; el consentimiento y los hashes anteriores no los cubren automáticamente.

## 6. Si la integración falla

Deshabilitar el ingreso/módulo de archivos del candidato y registrar la primera falla concreta. Conservar datos, objetos e historial de migraciones; revisar una corrección aditiva compatible antes de reactivar. No revertir ciegamente esquema ni eliminar archivos confirmados para recuperar un test verde. Mantener disponible la rama P4 y sus registros hasta observar aceptación del candidato integrado.

**Primer próximo paso:** esperar P3 aceptada, identificar su commit final y reconciliar contratos/Git antes de modificar el candidato de integración. El [registro de esta preparación](work-log/2026-10-16-id-unavailable-p4-integration-handoff.md) distingue los chequeos documentales actuales de las pruebas funcionales anteriores.

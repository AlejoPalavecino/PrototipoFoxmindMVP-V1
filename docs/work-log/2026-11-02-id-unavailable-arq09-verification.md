# ARQ-09 — verificación integrada y cierre

- Agent / role: /root, coordinación.
- Session or task ID: no disponible.
- Date: 2026-11-02.
- Branch / worktree: main, C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind.
- Starting commit: add38ec16a6f03e4e4332288b198036161e4cf58.
- Phase and detailed task/spec links: [ARQ-09](../../odd/tasks/architecture-consolidation.md#arq-09--verificar-y-cerrar-consolidación), [diseño aprobado](../../odd/tasks/architecture-consolidation-arq03-design.md).
- Status: completed.

## Request and scope

Ejecutar ARQ-09. Regresión integrada proporcional, revisión independiente, guía de incorporación y cierre según evidencia. Recursos de prueba propios y datos sintéticos.

## Work performed

Reconciliados main/add38ec y 142 entradas previas. ARQ-01 a ARQ-08 completadas con límites registrados. Se verifica el candidato del árbol de trabajo, que incluye cambios aún sin commit.

La [revisión independiente](2026-11-02-arq09_review-independent.md) detectó pérdida del historial y de la acción de recuperación cuando una generación falla durante la carga inicial. Se agregó una regresión focal y se corrigió el hook para incorporar filas que faltan sin reemplazar estados más recientes, y recuperar la vista incierta cuando todavía no hay vista activa. Se actualizó la [guía de incorporación](../engineering/architecture.md#dónde-empezar-un-cambio).

## Verification

- Inventario y rutas: 443 entradas, 53 exclusiones explícitas, 23 rutas. Docker Engine 29.9.2 disponible.
- Candidato de inicio: 1500 rutas de fuente, pruebas y configuración de build/migraciones. SHA-256 del manifiesto serializado `a6441685a4d9601694e508fa1d09a9cffce504d2c59a391fa9307de71d6b400a`.
- Candidato final: mismas 1500 rutas, SHA-256 `623ccae8e431e50f970108546b975c33ff9040efdb2972303a451c2c4009c4bb`. Solo difieren el hook, su prueba y los dos archivos de fixture P4/P8. Se restauró el archivo generado `apps/web/next-env.d.ts` a los bytes previos al build.
- `node --test tests/activity-ai-polling.test.mjs`: RED 3 PASS/1 FAIL por historial ausente. GREEN 4 PASS/0 FAIL y repetición independiente.
- `node --import ./scripts/register-api-test-build.mjs --test --test-concurrency=1 tests/p5-enrollment.test.mjs tests/p6-library.test.mjs tests/p7-practical.test.mjs tests/p7-history.test.mjs tests/p8-grading.test.mjs tests/p8-publication.test.mjs tests/p8-corrections.test.mjs tests/agenda-database.test.mjs`: exit 0, 81 PASS, sin fallos ni omisiones. Incluye permisos de cuenta y membresía, custodia y rollback al fallar el vínculo, revocación durante escaneo, recibos y reapertura, corrección privada, publicación y corrección publicada.
- `node --import ./scripts/register-api-test-build.mjs --test --test-concurrency=1 tests/activity-ai-host.test.mjs apps/api/src/foxy-ai/foxy-shared-admission.test.mjs apps/api/src/foxy-ai/foxy-visual-restart-profile.test.mjs apps/api/src/foxy-ai/foxy-real-storage-scanner.test.mjs tests/grading-ai-files-integration.test.mjs`: exit 0, 37 PASS, sin fallos ni omisiones. PostgreSQL/SeaweedFS/ClamAV propios, proveedor sintético. La medición de dos claimers registró 18,67 y 44,30 ms de espera de admisión y 80,88 ms de edad observada, con una reserva liquidada de 130 unidades del fixture. No se extrapola a producción.
- `node --test tests/p8-publication-tp-integration.test.mjs`: exit 0, 3 PASS. Chromium, Next, Nest, alta con roles exclusivos, correo de verificación, migraciones aplicadas y comparación de esquema, archivo privado y recibo, publicación explícita y resultado propio, reinicio de datos/almacenamiento/API y revocación. El intento original combinado quedó bloqueado en el alta de P8 sin rol. El fixture de P8 ahora selecciona los roles requeridos y conserva las aserciones.
- En el mismo intento combinado P9 completó las pausas y la recuperación de base, almacenamiento y escáner con un ajuste local del fixture que pasaba el rol de cada cuenta. El grupo rápido detectó que modificar ese helper quebraba su huella histórica (1411 PASS/1 FAIL; ocho entradas pendientes). Se restauró su contenido byte a byte y la comprobación focal de huella pasó 3/3. La adaptación de P9 se conserva fuera del código versionado para repetir la evidencia sin cambiar la referencia histórica.
- `npm run web:build`, `npm run lint:boundaries` y `node scripts/run-complete-suite.mjs --check`: exit 0. Next recompiló el hook corregido; el guard validó las 146 excepciones congeladas. La migración fue validada únicamente en PostgreSQL desechable.
- `node scripts/run-complete-suite.mjs --group fast` final: exit 0, 264 archivos, 1449 PASS, 0 FAIL, 0 SKIP.
- `node --import ./.test-artifacts/arq09-p9-role-fixture.mjs --test --test-concurrency=1 --test-name-pattern 'ARQ-07|P9 first actual' tests/p7-authoring-integration.test.mjs tests/p9-service-recovery-integration.test.mjs`: exit 0, 2 PASS con el build final. ARQ-07 restaura enlace, reload e historial. P9 conserva evidencia ante error y recupera base, almacenamiento y escáner. El adaptador local reemplaza solo la llamada de alta en memoria, agregando `undefined, role === 'peer' ? undefined : role` como quinto y sexto argumentos. SHA-256 del adaptador `c75ec974c9e259084dd261204978b28082ebc4c1a46b56c8e9a0c72cdfc3f3b7`. Las aserciones y el archivo histórico se preservaron. Advertencia de deprecación de pg y aviso del worker de Foxy durante la pausa de base, con recuperación observada.
- Los runtimes integrados registraron cero errores de cierre. El dueño exacto de la repetición P9 quedó con cero contenedores, redes y volúmenes. La inspección por etiquetas no encontró contenedores de fixture y mostró redes/volúmenes históricos ajenos a la corrida, que se preservaron.
- `npm run docs:check`, control directo de los cinco documentos modificados y `git diff --check`: exit 0. Git emitió avisos de normalización de fin de línea.
- Alcance proporcional. No se ejecutaron todos los grupos DB, servicios, navegador y wrappers ni la autoría P7 completa. P9 requiere adaptar el alta para este recorrido. Los registros anteriores aportan contexto histórico. Sin proveedor de IA real, datos retenidos, entorno productivo ni despliegue.

## Commits and outcomes

Consolidación cerrada localmente sobre el candidato identificado. Sin commits ni publicación.

## Handoff

Proponer la salida voluntaria de aulas archivadas para aprobación de alcance y aceptación. Resolver readmisión (PD-04) y conservación de entregas (PD-05); revisar PD-17 si el alcance afecta trabajos en curso. [Siguiente entrega](../../odd/tasks/architecture-consolidation.md#cierre-y-siguiente-entrega).

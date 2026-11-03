# ARQ-05 — extracción del puente de adjuntos

- Agent / role: /root, coordinación e implementación.
- Session or task ID: no disponible.
- Date: 2026-11-02.
- Branch / worktree: main, C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind.
- Starting commit: add38ec16a6f03e4e4332288b198036161e4cf58.
- Phase and detailed task/spec links: [ARQ-05](../../odd/tasks/architecture-consolidation.md#arq-05--separar-files-de-decisiones-académicas), [diseño aprobado](../../odd/tasks/architecture-consolidation-arq03-design.md).
- Status: completed.

## Request and scope

Extraer el puente según el contrato aprobado, verificar permisos y atomicidad, registrar el resultado. Pruebas locales desechables y código de la extracción. ARQ-06 queda fuera del alcance.

## Work performed

Reconciliados Git y cierres de ARQ-03/04. El checkout conserva trabajo previo.

El host inyecta el adaptador de adjuntos en Files. Files verifica custodia bloqueada y cuenta reservas activas, mientras Entregas valida el editor, la recepción y el cupo y escribe vínculo y revisión. Se conserva la autorización final después del escaneo y se comparten los locks de aula e intento al leer la selección y las reservas. Se excluyen el archivo actual y las reservas ya seleccionadas. El callback usa cinco campos y la transacción del cambio a listo. La asociación es idempotente y la revisión avanza solo cuando se inserta el vínculo.

Se retiró el puente viejo y se migraron las referencias de cinco pruebas al adaptador. El guard controla el adaptador como API de host. La línea base pasó de 336 a 155 entradas, con una dependencia de barrel y 180 aristas mixtas retiradas. No se agregaron excepciones. El SQL académico restante de Files mantiene el alcance aprobado.

## Verification

- Docker Linux Engine no respondió en su pipe, incluso tras solicitar arranque. La primera ejecución compiló el candidato previo y dio 3 PASS y 1 fallo de infraestructura en `P5 owned Docker run failed`. El primer intento de clúster nativo falló en `pg_ctl start` con timeout pese a status 0 y se limpió. Se corrigió el manejo de descriptores heredados de `pg_ctl` en el lanzador local.
- `npm run api:build`: generación Prisma y compilación estricta exit 0 del candidato final. Una compilación intermedia falló por una importación de `ClassroomError` y se corrigió.
- PostgreSQL 17.6 nativo, clúster temporal propio, loopback y credencial aleatoria. `.test-artifacts/arq05-native-postgres.mjs` sustituye solo el bootstrap del helper de Docker. Ejecutó deploy dos veces, status y diff contra esquema. `node --import ./.test-artifacts/arq05-native-postgres.mjs --test --test-concurrency=1 tests/p7-practical-bridge.test.mjs tests/p7-practical.test.mjs tests/p7-history.test.mjs tests/p7-consultation.test.mjs`: 32 PASS, 0 FAIL, 0 SKIP. Tres clústeres detenidos y limpiados.
- Evidencia SQL: otra conexión no vio cambios parciales antes del commit. Un fallo después de escribir el vínculo revirtió estado listo, vínculo y revisión. Una repetición no avanzó la revisión. Se probaron seis reservas concurrentes para cinco cupos, privacidad de borrador, archivo y salida durante escaneo, editor transferido, cancelación y límites temporales.
- HTTP, proxy, cliente, política Files y guard focales: 28 PASS, 0 FAIL, 0 SKIP. `npm run lint:boundaries` y guard CLI exit 0 con 155 entradas activas.
- [Revisión independiente](2026-11-02-arq05_review-independent.md) sin bloqueantes sobre el candidato. Coinciden los 12 hashes revisados. La revisión no ejecutó PostgreSQL.
- Primer intento de fixture completa con PrismaService: falló antes del puente. El probe reprodujo un conflicto de serialización Int64 con el parser BigInt global de la fixture. El lanzador aisló ese parser en el pool de prueba. Tras corregirlo, el probe de `uuid[]` vacío y no vacío y custodia ausente pasó con PrismaService. La fixture P7 completa del candidato pasó 13/13 con el adaptador Prisma de producción y PostgreSQL temporal.
- Una comparación preliminar con el puente previo y pg directo falló en dos casos de fecha de la fixture y produjo un rechazo no manejado. El valor observado se desplazó tres horas. Se repitió la comparación con el mismo adaptador Prisma y zona UTC para ambas versiones.
- P3 real, almacenamiento privado, ClamAV y navegador quedaron fuera de la ruta nativa por indisponibilidad de Docker. Las pruebas nativas usaron identidad, scanner y storage controlados. Cubren revalidación académica durante escaneo, con la sesión P3 real y su revocación fuera de la comprobación local.
- Comparación final con `TZ=UTC` y `FOXMIND_ARQ05_PRISMA=1`: `node --import ./.test-artifacts/arq05-native-postgres.mjs --test --test-concurrency=1 tests/p7-practical.test.mjs` dio 13 PASS, 0 FAIL, 0 SKIP en cada versión. Para la línea base, `FOXMIND_ARQ05_LEGACY=1` redirigió solo el adaptador al puente emitido en la compilación previa. Ambas corridas pasaron el probe de custodia con Prisma, cerraron sus clústeres y borraron el directorio propio. Cero clústeres temporales ARQ-05 restantes. SHA-256 del lanzador local: `c23d208ba05b48c8e5227b6d3018110926f11c4f995681ba4eb20c8b40dfd2fb`.
- HEAD final coincide con el inicial. Las 21 huellas del candidato ARQ-02 coinciden.
- Enlaces focales: 4 documentos, 271 enlaces, cero problemas. `npm run docs:check`: exit 0, 138 documentos y 1702 enlaces sin problemas. `git diff --check`: exit 0 con avisos de LF/CRLF.

## Commits and outcomes

ARQ-05 completada localmente. Plan y roadmap actualizados. Sin cambios de esquema ni datos retenidos, commits o publicación. La verificación aplicó las migraciones vigentes a clústeres temporales propios.

## Handoff

Siguiente unidad ARQ-06, pendiente de asignación. La extracción eliminó el acoplamiento del puente y 180 aristas de ciclos mixtos. Para estimar ARQ-06, tomar como base las 155 entradas restantes e inventariar por capacidad los consumidores de la fachada y los escritores compartidos. El resultado favorece mantener entregas pequeñas con verificación focal. Aún no hay medición para comprometer un plazo nuevo.

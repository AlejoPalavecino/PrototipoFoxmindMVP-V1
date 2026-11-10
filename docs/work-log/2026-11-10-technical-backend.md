# TASK-018: identidad, archivos y soporte técnico

- Agente `/root/technical_backend`, escritor delegado. Identidad de sesión no expuesta.
- Fecha 2026-11-10; rama `codex/architecture-foundation`, base delegada `29fda64`; árbol con trabajo concurrente preservado.
- Autorización: completar TASK-018 conservando comportamiento, contratos, SQL, locks, seguridad y cierre; sin commits ni servicios externos.
- Superficie: identity/security/mail/outbox/files/database/health y destinos modules/identity, modules/files, platform y bootstrap técnico; pruebas propias. Coordinador único escritor del tablero.
- Fuentes: arquitectura de migración, tablero, registro root y mapa backend de `.test-artifacts/architecture-finish/backend-map`.
- Skills aplicadas: harness-tdd-qa para RED/GREEN; work-unit-commits para unidad revisable; Engram leído, continuidad esencial conservada en repositorio.

## Evidencia

Implementación entregada al coordinador para integración y revisión; no implica DONE. Primero contratos negativos nuevos; después movimiento y extracción de dependencias concretas. No se atribuye aislamiento efectivo del filesystem compartido.

## Resultado y propiedad

- Identidad: casos de uso en `modules/identity/application/runtime.ts`; puertos Store/Hasher/TokenCodec/Outbox/ValidateMailbox y sesión estructural sin Prisma. Adapter transaccional conserva el cliente real en WeakMap, permite solamente operaciones de identidad a la aplicación y entrega el cliente original al outbox. Hash/dummy work permanece fuera de locks; SQL, Argon2, SMTP, HMAC y cifrado permanecen en infraestructura. Configuración y admisión comparten un único contrato de aplicación.
- `bootstrap/identity-runtime.ts` conserva el constructor anterior como composición explícita. `bootstrap/identity-composition.ts` expone los ensamblajes para root. Lifecycle SMTP conserva el cuerpo y el orden de cierre anteriores; la aplicación recibe el lifecycle por puerto.
- Archivos: `application/file-use-cases.ts` posee admisión/snapshot previo a espera y consultas autorizadas de estado/cuota. Infraestructura conserva procesamiento de bytes, SQL, custodia y escaneo. `domain/readiness.ts` es el único dueño de `requireReady(ReadinessSnapshot)`, sin ciclo servicio/promoción. Contratos públicos de lectura, custodia, promoción y readers Foxy/calificación explícitos; FileStore concreto privado.
- `bootstrap/files-composition.ts` expone factories y `files-foxy-publication-composition.ts` conecta UoW/allocator Foxy; el adaptador recibe la factory por parámetro y usa autoridades públicas estructurales, sin typeof privado ajeno.
- Database/health técnicos en `platform/{database,health}`; sin import de dominio. Errores preservan una única clase; `FileIdentityError` está en aplicación, reexportada por store para compatibilidad de instanceof.
- 74 fuentes originales con puentes explícitos temporales. Los índices de compatibilidad están en `bootstrap/*-legacy*.ts`, fuera de la superficie pública del dominio. El coordinador retira puentes/remapea consumidores y configuraciones compile-only. Copias originales, `moves.json` y `final-exports-map.json` conservan atribución y destinos precisos.
- Ocho pruebas colocadas movidas a `modules/files/infrastructure/tests`; `test-moves.json` registra origen/destino. Comparación AST: 288 llamadas `assert.*`, cero archivos con aserciones cambiadas. Sólo imports/mocks/source paths cambian. Startup mock compilado apunta a `bootstrap/files-composition.js` para la composición root nueva.

## Comandos y resultados observados

- `node --test tests/technical-backend-modules.test.mjs`: RED inicial 0/3, faltaban runtime/contratos/públicos. Luego GREEN 3/3. Se corrigió un falso positivo de la prueba propia: `IdentityStore` sin límite de palabra también coincidía con `IdentityStorePort`; no se alteró aceptación preexistente.
- `node --experimental-transform-types --test apps/api/src/modules/identity/application/runtime.test.mjs apps/api/src/modules/files/application/file-use-cases.test.mjs tests/technical-backend-modules.test.mjs`: 9/9 PASS final. Verifica hash antes de TX, outbox en TX idéntica, propagación al rollback, rol negativo, snapshot antes de espera y pruebas de readiness.
- Batch anterior con los cuatro archivos `foxy-{document-reader,private-asset-files,private-image-inspector,s3-owned-send}.test.mjs`: 50/50 PASS, **22 escenarios con PostgreSQL efímero propio por Docker y 28 puros**. Se informó inicialmente «sin DB» de forma incorrecta; al inspeccionar el helper se corrigió al coordinador. La ejecución del helper excedió la restricción del encargo de no Docker/DB. Terminó con código 0 y su finally hizo cleanup con etiqueta de propietario. No se repitió ni se operaron datos retenidos.
- Después del movimiento: document-reader + los 9 propios, 14/14 PASS con los paths canónicos nuevos.
- `npx tsc -p apps/api/tsconfig.p33-security.json` y `npx tsc -p apps/api/tsconfig.p33-mail.json`: PASS. Security se recompiló tras unificar los contratos.
- `node --test tests/p33-identity-security.test.mjs tests/p33-mailbox.test.mjs tests/p33-mail-cancellation.test.mjs`: 24/24 PASS (SMTP fixture local sintético; no proveedor).
- Un batch anterior agregó `tests/p33-mail-deadline.test.mjs`: 24 PASS y 1 fallo, `Owned deadline runner required`; no se falsificó `P33_IDENTITY_ISOLATED` ni se contó ese caso como PASS. Su runner corresponde a la verificación integrada del coordinador.
- `npx tsc -p apps/api/tsconfig.json --noEmit`: primer corte PASS; ejecuciones posteriores observaron errores de otros escritores durante migración (última foto: cinco repositorios grading faltantes en bootstrap, tipo materialId Foxy y tres imports validateMailbox académicos). No hubo errores en los módulos propios; no se declara compilación global final verde.
- `node .test-artifacts/architecture-finish/technical-backend/equivalence.cjs`: 68 plantillas SQL antes = 68 después, multiconjunto exacto idéntico, cero diferencias. Incluye SQL extraído del runtime al store; no prueba por sí solo orden de llamadas ni concurrencia.
- `inspectBoundaries(process.cwd())` filtrando origen `modules/{identity,files}`: 0 aristas modernas propias, sin whitelist. Puentes temporales fuera de módulos siguen pendientes de retiro root.
- Comprobación exhaustiva de 65.536 unidades UTF-16: 0 diferencias entre roundtrip Buffer y TextEncoder/TextDecoder con `ignoreBOM:true`. La primera comprobación detectó la diferencia BOM del decoder por defecto; se corrigió antes de entregar. El parser puro de verificador conserva canonicalidad base64url y pasó las 13 pruebas existentes de seguridad.

## Pendientes y límites

- Root integra consumidores de contratos, retira compatibilidad, actualiza inventario/CI/configuraciones compile-only, recompila y ejecuta los runners aislados/DB completos y revisión independiente. No se ejecutó la suite global ni p33 deadline runner, ni startup mock compilado con la composición final del root.
- `validateMailbox` es implementación de infraestructura exportada por `bootstrap/identity-composition.ts`; los módulos consumidores reciben `ValidateMailbox`, público de identidad. No se reexporta validator desde identity/public.
- Para Aulas: enlazar `load`/`loadAuthorized` desde `service.store` y `promoteDraftPlanInTransaction` desde `service`, con bind al dueño. No se agregó FileStore.close ni autoridad por ID.
- No commits, publicación, proveedores reales, cambios de esquema/migración o secretos. La desviación Docker arriba impide afirmar cumplimiento del límite original de recursos del encargo.
- Primer paso: coordinador coteja `final-exports-map.json` y `test-moves.json` con su remapeo global, compila el candidato reconciliado y verifica seguridad/transacciones/cierre.

## Recuperación

Revertir sólo los archivos de este corte y restaurar sus ubicaciones originales desde la copia/mapa propio en `.test-artifacts/architecture-finish/technical-backend`; conservar cambios concurrentes. Sin acciones sobre DB, volúmenes o configuración privada.

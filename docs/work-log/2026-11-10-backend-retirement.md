# Retiro de compatibilidad backend

- Agente: /root/backend_retirement; worker delegado; sesión no expuesta.
- Fecha: 2026-11-10. Rama delegada codex/architecture-foundation; base de migración 29fda64. Workspace compartido.
- Encargo: TASK-022, remapear consumidores por binding y retirar puentes backend sin cambios de cuerpos, SQL o reglas. Único escritor de esta superficie; preservar cambios ajenos.
- Prohibiciones: Git writes, DB/Docker, API real, build global, documentación canónica/tablero/CI/guard y aceptación funcional. Dos workers Foxy excluidos.
- Estado: IN_PROGRESS. Se resolverán reexports nombrados hasta definición; constructores host mantienen identidad.
- Evidencia y límites: pendiente; mapas y copias de recuperación en .test-artifacts/architecture-finish/backend-retirement.

## Entrega integrada del retiro

- Estado: candidato congelado para integración del coordinador; no se marca DONE ni se modifica tablero.
- Primer corte: 360 archivos retirados y 95 tests colocados movidos. Se preservaron bootstrap/files-composition.ts y las dos entradas permanentes application/config. Constructores host y clases concretas conservan identidad; no se cambiaron SQL, reglas ni cuerpos de producción. Resolución AST por binding, incluida importación de tipos y salida compilada; namespaces de varios dueños se sintetizaron sólo en tests con las referencias reales.
- Primer corte comprobado: API, p33-security y p33-mail con `node node_modules/typescript/bin/tsc -p <config> --noEmit --incremental false`: PASS. `node --experimental-transform-types --test` con policy/service/engine de Estudio, academic/grading modules y Agenda events/colors/recurrence: 98/98 PASS. `node --check`: 262 archivos mjs, cero errores.
- Paridad AST inicial: 268 archivos, 6653 llamadas assert.*, cero diferencias. No constituye por sí sola equivalencia de runtime ni de efectos.
- Fallo conservado: lote anterior de 85 pruebas produjo 84 PASS y un SyntaxError al cargar decoradores Nest directamente desde TS en technical-backend-modules.test.mjs. Requiere el preloader compilado del proyecto; el coordinador informó su verificación independiente. Este agente no atribuye esa ejecución como propia ni modificó la prueba para hacerla pasar.

## Cierre puntual autorizado después del primer freeze

- Retirados los ocho puentes restantes de apps/api/src/mail. Los consumidores nombrados apuntan a sus definiciones canónicas; no se creó un nuevo barrel.
- Diez tests restantes de apps/api/src/ai movidos a modules/foxy/infrastructure/providers/tests, conservando nombres. Sólo se rebajaron imports y rutas mediante AST; no se tocaron sufijos de runtime ni cuerpos de proveedores. Se eligió providers/tests para evitar la colisión con otro foxy-text-budget.test.mjs.
- scripts/test-p33-mail-cancellation.mjs: el hook de --regressions redirige las seis entradas canónicas de mail/bootstrap desde .build/api hacia .build/p33-mail. Conserva las aserciones originales de p32-mailer y el aislamiento de salida privada; no requiere el barrel retirado.
- `node --experimental-transform-types --experimental-test-module-mocks --test apps/api/src/modules/foxy/infrastructure/providers/tests/*.test.mjs`: 57/57 PASS. SDK sintético/fetch inyectado; sin proveedor real.
- `node scripts/test-p33-mail-cancellation.mjs --regressions`: 14/14 PASS, exit 0. Sólo fixture SMTP local sintético; no DB/Docker.
- `node --check` en los diez tests y el script modificado: 11/11 PASS. Comparación AST de los diez tests: 225 llamadas assert.* idénticas. Búsqueda de rutas src/mail legacy en el runner y sus tests: sin coincidencias.
- Totales propios del corte: 368 retiros y 105 movimientos de tests; los ocho movimientos previos del escritor técnico son una unidad separada y no están incluidos.

## Mapas y recuperación

Artefactos propios en .test-artifacts/architecture-finish/backend-retirement: bridge-map-complete.json, special-map.json, deleted-complete.json, test-moves-complete.json y additional-checks.json. test-moves-additional.json contiene sólo los diez movimientos del cierre para CI. Copias de recuperación originales en originals/ y deleted/; mail-cancellation-before.mjs conserva el runner previo al cierre. Mapas iniciales y resultados previos se conservaron.

Para revertir, restaurar exclusivamente los archivos propios con esos mapas y copias, y devolver los tests movidos a sus rutas anteriores; preservar cambios concurrentes. No hubo commits ni operaciones de datos.

## Límites y siguiente paso

No se ejecutaron build global, suites completas, DB/Docker, proveedores reales, Git writes ni cambios en CI/guard/core/tablero. El coordinador integra los diez movimientos adicionales en CI, reconcilia fixtures sintéticas del guard y ejecuta el candidato compilado con sus loaders. El primer intento del movimiento AI se detuvo por colisión antes de modificar archivos; el primer script de auditoría tuvo un require relativo incorrecto, se corrigió y completó sus 262 chequeos. FREEZE final de escritura tras esta entrega.

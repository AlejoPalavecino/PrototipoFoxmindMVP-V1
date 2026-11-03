# Pruebas y verificación

Elige controles por alcance y conserva el resultado y las omisiones junto con el identificador de la ejecución. El [estado actual](../../implementation-roadmap.md#estado-actual) enlaza la evidencia aceptada; los resultados históricos de ejecuciones distintas no se suman como una sola corrida.

- `npm run docs:check` comprueba enlaces y compatibilidad documental con el manifiesto activo.
- `npm run test:ci` genera y compila la API en esa invocación antes de ejecutar los grupos puros y de transporte definidos en el runner de CI; no equivale a la suite completa. El CLI directo `node scripts/run-ci-suite.mjs --suite <grupo>` requiere preparar previamente ese build; CI y el coordinador completo lo hacen explícitamente.
- `npm run test:complete` valida el inventario y ejecuta secuencialmente los cinco grupos siguientes, deteniéndose ante un fallo. `node scripts/run-complete-suite.mjs --check` comprueba solo inventario y rutas; `npm run test:complete -- --group fast` selecciona un grupo.

| Grupo | Alcance y preparación |
|---|---|
| `fast` | Pruebas rápidas del inventario, hasta cuatro archivos en paralelo. Prepara la API y compila los proyectos privados de seguridad y correo; no presupone que solo lea documentación. |
| `owned-db` | Pruebas con base propia y desechable; requiere motor e imágenes locales y limpieza de los recursos creados. |
| `owned-services` | Pruebas con servicios propios según cada fixture; prepara también los proyectos privados de seguridad y correo. Consulta los requisitos de almacenamiento, escáner y correo antes de ejecutar. |
| `owned-browser` | Recorridos con navegador y recursos propios; además prepara el build de Next y requiere navegador y servicios de los fixtures. |
| `wrappers` | Rutas explícitas de los coordinadores de prueba; cada wrapper conserva sus requisitos y limpieza. Sus conteos individuales no están disponibles en el resumen del wrapper. |

Cada grupo prepara el build de API con límite de 30 s; las compilaciones privadas tienen 30 s y el build Next del grupo de navegador 180 s. El límite externo de archivos y wrappers es 360 s; los plazos internos siguen vigentes y no se amplían por este resumen. Los controles concretos y su propiedad están en [runtime de cuentas](account-runtime.md) y [controles de recursos propios](owned-runtime-controls.md). [Seguridad de dependencias](dependency-security.md) explica sus comprobaciones específicas.

La limpieza se limita a recursos creados por el fixture; no uses recursos retenidos ni interpretes una preparación fallida como una prueba aprobada. Los registros de verificación describen lo efectivamente observado.

## Inventario y pruebas junto al código

`node scripts/run-complete-suite.mjs --check` valida todas las pruebas `.test.mjs`, `.test.js`, `.test.ts` y `.test.tsx` en `tests/`, `apps/` y `src/`, sin recorrer dependencias ni builds. Descubrir un archivo exige clasificarlo: no lo incorpora automáticamente a ejecución. Las listas explícitas de `scripts/complete-suite-inventory.json` y `scripts/complete-suite-routes.json` determinan qué se ejecuta y con qué recursos; las exclusiones conservan motivo y clase.

Los ejecutores de Node habilitan mocks de módulos y un preload de prueba que resuelve imports TypeScript de API/dominio contra el build estricto recién preparado. Así soportan los decoradores de Nest sin reescribir pruebas ni tratar la transformación de tipos de Node como compilación completa. Los contratos `.test.ts` de publicación/gestión son compile-only: su enlace `import type` los incluye en la compilación estricta de API, y están excluidos de las rutas de ejecución Node.

La clasificación ARQ-02 incorpora pruebas sintéticas, transporte HTTP de loopback, PostgreSQL desechable y almacenamiento/escáner propios con proveedor sintético. Las pruebas manuales, opt-in y los scripts de proveedor real mantienen su autorización explícita; los tests de sus guards solo comprueban el rechazo antes de preparar recursos o leer configuración privada. No ejecutar `foxy-browser-live.mjs` o `foxy-provider-journey.mjs` por descubrimiento.

El helper PostgreSQL de Agenda comprueba existencia y propiedad también después de un intento de `docker run` fallido: un timeout del CLI no demuestra que el daemon no haya creado el recurso. Solo elimina el nombre propio con etiqueta coincidente; si no puede comprobar la propiedad, la limpieza falla. Evidencia, fallos iniciales y límites de esta recuperación: [registro ARQ-02](../../work-log/2026-11-02-id-unavailable-arq02-verification.md).

# Reparación acotada del presupuesto API local

- Agente: implementation writer; identificador de sesión no expuesto. Fecha: 2026-11-12.
- Rama: `codex/agenda-complete-polish`; worktree actual; commit inicial: `0112a64c7f88822b1d86c4e98565cc64c435f76d`.
- Autoridad: R1, S1–S2 de `odd/tasks/local-startup-repair.md`. Sólo arranque habitual API90s; helper general30s. No autoriza reintentos/aumentos futuros.
- Superficies: scripts/build-api.mjs, scripts/local-app.mjs, scripts/local-api-build.mjs, tests/api-build-pipeline.test.mjs, tests/local-api-build.test.mjs, guía de desarrollo local y este registro.
- Árbol inicial: cambios ajenos de Agenda/diseño/video y archivos sin seguimiento preservados; superficies de scripts/pruebas de esta reparación inicialmente limpias.
- Evidencia previa (no reejecutada): reinicio exit1/58s; helper directo exit1/30s, Prisma9216ms exit0 y TypeScript20841ms SIGTERM/ETIMEDOUT. Intentos agotados; no hijos activos/inciertos según coordinador.

## Plan y límites

Adaptador local fijo que reutiliza buildApi, deadline compartido con reloj inyectable, wrapper95s (90s de trabajo +5s de inicio/salida). CLI general y controles de propietario/puertos/datos/proveedor intactos. Pruebas sólo sintéticas; fixtures en temp del sistema con teardown. Sin compilador real, servicios, secretos, caché, Git mutations ni edición de tarea por este agente.

## Evidencia

- RED: `node --test tests/api-build-pipeline.test.mjs tests/local-api-build.test.mjs`, exit1, 8645ms; 12 pruebas existentes pasan, 5 nuevas fallan. Diagnósticos: adaptador ausente (`ERR_MODULE_NOT_FOUND`), validación de presupuesto ausente (TypeError distinto del esperado), CLI local exit1 en vez de0. Salidas sintéticas de etapas existentes; ningún compilador/servicio real.
- GREEN: mismo comando, exit0, 9402ms; 17/17 pasan, 0 fallos. stdout incluye reporter y diagnósticos sintéticos existentes; los tests capturan y comparan exactamente stdout/stderr/exit de ambos builds y CLI. No stderr inesperado.
- `npm run docs:check`: exit0; `Checked 137 files and 835 links; 0 issues.`
- `git diff --check`: exit0, sin errores whitespace; advertencias LF→CRLF en archivos ajenos y build-api (sin cambios de contenido por el comando).
- Todos los comandos se ejecutaron secuencialmente en foreground con timeout externo30s; ninguno agotó ese límite. Un intento de edición de tests fue rechazado por coincidencia no única, sin escritura; se corrigió el contexto antes de continuar.
- Fixtures sintéticos pequeños en temp del sistema (`foxmind-build-once-*`) eliminados por teardown observado al finalizar ambas suites. Sin caches/scratch nuevos en git status; trabajo ajeno preservado.

## Autorrevisión S1–S2

- S1: reparación aislada de orquestación; local-app sólo agrega import y reemplaza la llamada API. Propietario, puertos, datos, proveedor y prefijo `Local command failed: ` siguen intactos; ningún otro timeout cambia.
- S2: helper general30000ms por defecto, adaptador90000ms fijo y wrapper95000ms. Reloj sintético confirma30000→18000 y90000→78000 tras12s de generación. Prisma y tsc con `-p apps/api/tsconfig.json` una vez por invocación, también en llamadas repetidas; sin reutilización. Fallo, señal, error/timeout o deadline agotado bloquea la siguiente etapa.
- API programática: nuevos `budgetMs` y `now`, presupuesto inválido rechazado antes del runner. CLI general/help sin cambios; nuevo adaptador admite sólo --help/sin argumentos y conserva `API build unavailable`. No flag/override de entorno nuevo.
- PRESERVE: las12 regresiones originales permanecen, sin debilitar expectativas; cobertura CLI extendida al adaptador y fixtures trasladados a temp con teardown. Comprobaciones de local-app son estructurales y del wrapper inyectado, no arranque real.
- No diferencial aplicable: ningún comando existente no nombrado recibe una nueva entrada CLI/programática desde este cambio; el nuevo presupuesto sólo lo pasa el adaptador local. Los consumidores existentes continúan llamando buildApi sin opciones nuevas, cubiertos por regresiones sintéticas. La expiración ahora impide lanzar otra etapa en vez de otorgarle1ms.
- Líneas de cambio rastreadas: build-api +11/-3, local-app +2/-1, pruebas pipeline +10/-7, guía +4/-0; archivos nuevos: adaptador28líneas, pruebas111líneas y registro propio. No cambios de producto/API/UI, tsconfig, dependencias ni archivos ajenos.

## Corrección acotada R2 — validación del reloj (S2)

Autorizada una sola tanda para el defecto de `now`: el verificador informó55PASS/12FAIL del mismo bloqueo, incluyendo concatenación de `'1000'` y lecturas no finitas/no numéricas. Se preserva esa evidencia y los resultados previos; la aceptación anterior queda pendiente de recheck. Superficies de esta tanda: únicamente build-api, pruebas local-api-build y este registro. Validar forma callable y cada lectura antes de aritmética/runner, sin cambiar semántica de relojes válidos, presupuestos ni CLI. Sin hijos activos/inciertos según coordinador. RED/GREEN de esta tanda pendientes al abrir este registro; resultados observados a continuación.

- RED: `node --test --test-name-pattern="invalid clock" tests/local-api-build.test.mjs`, exit1, 73.4374ms, 0PASS/2FAIL. Forma inválida: TypeError `now is not a function` en vez del mensaje esperado; lectura inválida: `Missing expected exception (TypeError)`. Sólo runners inyectados; sin herramientas reales.
- GREEN: `node --test tests/api-build-pipeline.test.mjs tests/local-api-build.test.mjs`, exit0, 8867.2533ms, 19PASS/0FAIL/0SKIP. stdout del runner incluye las etapas sintéticas/regresiones y resumen; no stderr inesperado. Las nuevas pruebas capturan stdout/stderr exactamente: ambos vacíos antes de generación; tras una generación válida sólo `generation out\nPrisma generation: exit 0\n` y `generation err\n`, con TypeError y ninguna llamada a tsc.
- Matriz: ambos helpers, cinco formas no callable y seis lecturas inválidas (NaN, Infinity, -Infinity, undefined, null, string1000) en cada una de las tres lecturas: deadline, antes de generación, antes de tsc. Comprueba número/orden de lecturas y llamadas, argumentos completos y timeout30/90s. Las17 pruebas previas siguen pasando, incluido decremento compartido, CLI y wrapper95s.
- Corrección mínima: `typeof now` antes de invocación; helper local `readClock` valida tipo number y finitud en cada lectura antes de suma/resta. No coerción, lecturas extra, caché de validación, cambio de presupuestos ni semántica de relojes válidos. Dos TypeError explícitos sólo en API programática; CLI y prefijos existentes intactos.
- Diff de esta tanda: build-api agrega10 líneas de validación y reemplaza las dos llamadas now por readClock; local-api-build.test agrega44 líneas de regresión; este registro agrega evidencia sin borrar fallos anteriores. Ningún otro archivo editado en esta tanda.
- `git diff --check` de esta tanda: exit0; sólo advertencias LF→CRLF en archivos preexistentes/build-api, sin errores whitespace. Todos los checks foreground con timeout30s.
- Una implementación tras RED; GREEN pasó al primer intento, sin ciclo correctivo extra ni timeout. Falta sólo recheck independiente focalizado por coordinador; no aceptación real ejecutada.

## Estado

Implementado y autoverificado sintéticamente para R1, S1–S2; sin commits/integración/publicación/despliegue. Ningún S# vinculado queda sin implementar en este alcance. Pendiente R2: verificación independiente del coordinador (riesgo item5); luego R3: aceptación real únicamente por coordinador con recursos propios. No se ejecutó Prisma/tsc real ni arranque local. El margen5s es explícito, no prueba de tiempos reales de este equipo ni autorización de reintentos.

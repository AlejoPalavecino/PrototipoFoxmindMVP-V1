# T1 — Host y runtime de Estudio

- Autor: worker de implementación host/runtime; identificador de sesión no expuesto.
- Fecha: 2026-11-13. Rama: `fix/architecture-audit`. Base: `95fef894becd8de082e8c9f61235c6d0a0a213f8`.
- Autorización: «Bien resolve entonces esos 4 hallazgos»; sólo T1/S1–S2 de `odd/tasks/architecture-audit-remediation.md`. El padre mantiene tarea, mirror y reconciliación.
- Superficies: `bootstrap/application.ts`, nuevo `bootstrap/study-runtime.ts`, dos pruebas host/runtime, arquitectura y este registro.
- Estado inicial: dos archivos ajenos sin seguimiento (`docs/work-log/2026-architecture-audit-root.md`, `odd/tasks/architecture-audit-remediation.md`); preservados.
- Plan: prueba estructural RED; extracción sin cambios de activación, admisión, proveedores, temporizadores ni cierre; pruebas de preservación con dependencias sintéticas y matriz de configuración.
- Risk item 4: concurrencia del timer de limpieza y drenaje; verificación independiente a cargo del padre. No se agrega garantía de idempotencia del cierre.
- Prohibido: secretos/.env, proveedores reales, recursos retenidos, instalaciones, commits o publicación. Sin servidores externos; pruebas en memoria.

## Implementación y autoinspección S1/S2

- S1: runtime movido a `apps/api/src/bootstrap/study-runtime.ts`; el root sólo lo registra, monta transportes y coordina cierre. Token string y forma de opciones conservados mediante `StudyRuntimeOptions`. Mismas seis fábricas, mismo database/authenticate/puertos/cuotas; sin transacciones nuevas.
- S1: autorización previa del override, bloqueo de fallback real ante `options.ai`, contexto del adaptador, cookie/IP/admisión, timer de 60 s `unref`, no solapamiento, advertencia saneada y `Promise.all` de cierre conservados. El root conserva sus dos fases `allSettled` antes de Prisma.
- S2: matriz y errores exactos documentados; parser real probado sin modificar `configuration.ts`, con valores sintéticos explícitos. Se comprueba montaje/desactivación sin servicios externos y cierre con dependencias en memoria.
- Autoinspección de diff/tipos/pruebas/docs: sin cambio funcional intencional, sin cambio de guards; el build estricto verifica la interfaz de opciones extraída. Las pruebas prueban wiring y límites del runtime, no sustituyen HTTP/Study/infraestructura reales.

## Evidencia observada

- `node --test tests/architecture-host.test.mjs tests/study-runtime.test.mjs` — primer RED: exit 1, 12 pruebas, 2 pasan/10 fallan. Fallo estructural esperado: `createStudyRuntime must move out of the root bootstrap`; 7 fallos ENOENT por módulo aún no extraído y 2 fallos de setup por sobrescribir un stub de import repetido.
- Mismo comando tras corregir ese setup, antes de extracción — exit 1, 12 pruebas, 4 pasan/8 fallan, 0 omitidas/canceladas. RED significativo estructural observado; las cuatro pruebas de preservación del host/configuración ya pasan. Los ENOENT no se atribuyen como evidencia de comportamiento.
- Mismo comando tras extracción — exit 1, 12 pruebas, 11 pasan/1 falla: la prueba esperaba rechazo asíncrono, pero la guarda existente lanza síncronamente. Se corrigió la aserción, no producción; también se explicitaron ambos órdenes de terminación del drenaje.
- Mismo comando final — **exit 0; 13 pasan, 0 fallan/omitidas/canceladas**. GREEN estructural y preservación de dependencias, proveedores/admisión, timer, recuperación y cierre en ambos órdenes.
- `npm run api:build` — **exit 0**; Prisma generation exit 0, API TypeScript compilation exit 0. Salidas generadas ignoradas del build autorizado; sin instalación ni acceso a datos.
- `npm run lint:boundaries` — **exit 0**, `Architecture AST boundaries passed (0 frozen exceptions)`.
- `git status --short` — archivos de otros writers preservados; ningún scratch/cache nuevo visible. No se creó scratch externo ni se ejecutaron servicios reales.

## Límites y continuación del padre

Implementación y verificación focal listas; **integración pendiente**. No hay commits propios, publicación ni despliegue. Study completo, seam checks, docs:check y verificación independiente no ejecutados aquí: corresponden al padre.

1. Superficies adicionales exactas necesarias para integrar estas dos pruebas al inventario/runner existentes: `scripts/complete-suite-inventory.json` (entries) y `scripts/complete-suite-routes.json` (files de ruta `fast`). No editadas: fuera del permiso del worker. `validateCompleteSuite` rechaza archivos descubiertos no clasificados; el riesgo se deriva de inspección, no de un comando ejecutado. El padre puede reconciliar también las pruebas de los otros writers. Agregarlas a `scripts/ci-suites.mjs` sería necesario sólo si el padre decide incluirlas además en una suite selectiva.
2. **Risk item 4:** padre debe verificar independientemente concurrencia timer/drenaje. El cierre existente no es memoizado ni promete idempotencia; `Promise.all` puede rechazar antes de finalizar la otra rama si falla el cierre de avisos. Se preservó y documentó ese límite, sin endurecer guards ni inventar garantías.
3. Primer paso: padre integra inventario/routing, corre sus seam checks/Study y verifica lifecycle antes de cerrar T1/T4. Este hallazgo no autoriza al worker a ampliar superficies.

# TASK-002 — Guard de capacidades backend

- Agente: `/root/backend_capability_guards`, implementador delegado.
- Fecha: 2026-11-16. Rama: `codex/backend-capabilities`.
- Worktree: `C:/Users/alejo/.codex/worktrees/069c/ProtipoFoxMind`.
- Base: `dd6f4bc92b959cce0e2c68343291614270c4a17e`.
- Autorización: TASK-002 del diseño aprobado en `docs/engineering/backend-capabilities-plan.md`; sin commits, publicación, proveedores ni datos retenidos.
- Superficie: `scripts/migration-boundaries.mjs`, `tests/audit-boundaries-guard.test.mjs` y este registro. Trabajo concurrente documental preservado; tablero exclusivo del coordinador.
- Objetivo: admitir dominio → capacidad → capas y estructura anterior, preservar aislamiento de capas, contratos nombrados, core/platform/UI y ciclos, sin excepciones nuevas.
- Reglas implementadas: descriptor de módulo/capacidad/capa; misma matriz de capas para layout anterior y nuevo. Dominio de capacidad sólo consume su dominio, dominio compartido del módulo y core/domain. Capacidad hermana se consume por `public.ts` nombrado; otro módulo conserva entrada por su `public.ts` de módulo.
- API pública: sólo reexports nombrados desde application/domain propios; el módulo además puede reexportar la API de una capacidad. Sin namespaces, imports por defecto, adaptadores ni acceso al agregador propio desde capas internas.
- Transición acordada con el coordinador: application compartida del módulo se consume desde capacidades sólo mediante dependencias de tipo; no valores. El dominio compartido no importa capacidades. Los controles frontend existentes no se modificaron.
- RED: `node --test tests/audit-boundaries-guard.test.mjs` terminó exit 1, 29 pruebas, 26 PASS/3 FAIL. Fallaron layouts válidos de capacidades, colaboración pública entre hermanas y el rechazo dominio de capacidad → `@nestjs/common` (el guard anterior lo permitía).
- GREEN final: mismo comando exit 0, 29/29 PASS, sin skips. Incluye cinco escenarios nuevos parametrizados: matriz positiva, fugas entre capas/capacidades, API pública, consumo nombrado y preservación de core/platform/UI/ciclos. También comprueba compatibilidad de exports legacy.
- `node scripts/check-boundaries.mjs`: exit 0, `Architecture AST boundaries passed (0 frozen exceptions)`.
- `git diff --check`: exit 0. Diff propio de código/pruebas: 141 altas/14 bajas; registro aparte. No se modificaron pruebas anteriores ni excepciones congeladas.
- Límites: el guard valida aristas AST, no prueba por sí solo que un símbolo importado con `import type` sea una interfaz en lugar del tipo de una implementación. No se ejecutaron suites de negocio/DB ni proveedores: no hay cambios de producción y la regresión pertinente es el guard completo. No se afirma aislamiento estricto de escritores.
- Entrega: implementado y verificado localmente; sin commits/publicación. Pendiente: reconciliación/verificación del coordinador y piloto Plan. Tablero no editado.
- Reversión: revertir únicamente el diff de `scripts/migration-boundaries.mjs` y los cinco tests nuevos de `tests/audit-boundaries-guard.test.mjs`; retirar este registro si se retira la unidad. Evitar restauración global del worktree para preservar cambios ajenos.

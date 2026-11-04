# Integración local de Taller Cálido en main

- Agent / role: root, coordinador
- Session or task ID: unavailable
- Date: 2026-11-04
- Branch / worktree: main, checkout principal
- Starting commit: a3afdc79bdddeee3eea27e8a38d594858c89b8ae
- Phase and detailed task/spec links: [Inicio por rol](../../odd/tasks/home-by-role.md)
- Status: completed

## Request and scope
El usuario pidió asegurar que los cambios propios de Inicio queden integrados en main, sin cambios ni commits sueltos. Excluyó expresamente los worktrees de Mis aulas y Agenda. Este cierre es local; no incluye push ni despliegue.

## Work performed
La inspección encontró main y origin/main en a3afdc7, sin divergencia después de git fetch origin. Todo el diff del checkout corresponde a Taller Cálido y su verificación previa. La búsqueda de commits de Inicio en otras referencias no mostró candidatos pendientes. Solo se enumeraron los worktrees; no se modificaron sus archivos, ramas ni índices.

Unidad de entrega: composición de Inicio con navegación, recursos, pruebas y documentación. Se conserva como una unidad funcional coherente aunque supera la guía orientativa de 400 líneas; no se abre PR. Reversión: retirar esta unidad completa devuelve Inicio y sus expectativas de pruebas al checkpoint a3afdc7 sin revertir trabajo de otras pantallas.

## Verification
La implementación ya cuenta con 54 pruebas focales, 8 de contratos y P9 integrado 13/13; builds, tipos, límites y revisión independiente en [registro de implementación](2026-11-04-id-unavailable-home-warm-glass.md). Repetición de node --test tests/home-*.test.mjs tests/p9-home-client.test.mjs tests/entry-glass-client.test.mjs tests/folder-platform.test.mjs tests/foxmind-3d-regressions.test.mjs: 54 PASS, 0 FAIL, 0 SKIP, exit 0. El primer intento terminó 47 PASS/1 FAIL porque Docker estaba apagado; se inició Docker Desktop y se repitió con PostgreSQL descartable y rollback, sin cambios de código. npm run docs:check: 138 archivos y 1730 enlaces, cero problemas. git diff --check aprobado. No se repite P9 porque no se cambió comportamiento desde su resultado aprobado.

## Commits and outcomes
La entrega se guarda en el commit que contiene este registro; su identidad se comprueba después de crearlo con git log. El cierre documental no puede anticipar su propio hash. Sin push ni despliegue.

## Handoff
Implementación y pruebas listas para integrar los worktrees separados posteriormente, dentro del alcance que autorice el usuario. El cierre operativo comprueba main y git status después del commit. Los worktrees separados permanecen fuera del alcance.

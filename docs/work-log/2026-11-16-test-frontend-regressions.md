# Regresiones frontend: fase RED

- Agente: `/root/frontend_regression_tests`, rol test_engineer. Sesión independiente no expuesta.
- Fecha: 2026-11-16. Rama: `codex/frontend-cohesion`.
- Worktree: `C:/Users/alejo/.codex/worktrees/frontend-cohesion/ProtipoFoxMind`.
- Base observada: `dd6f4bc92b959cce0e2c68343291614270c4a17e`.
- Autorización: pruebas persistentes para las unidades 2 y 3 de `docs/engineering/frontend/cohesion-refactor.md`; no producción, backend, red, proveedores reales, secretos ni commits.
- Superficies: `tests/frontend-study-context.test.mjs`, `tests/frontend-grading-discard.test.mjs` y este registro. Tablero/manifests a cargo del coordinador.
- Runner: `node:test`, `loadTsModule` y `hookView` existentes. Puertos en memoria y DTO sintético; sin aislamiento efectivo entre escritores del worktree.
- Estado: fase RED terminada; listo para implementación GREEN por otro escritor. Sin cambios de producción ni commits propios.

## Cobertura

- Estudio: 9 escenarios. Comando A pendiente y refresh A pendiente, ambos con `replace(B)` y refresh exitoso/fallido; error de comando tardío y cambio durante refresh de recuperación, con éxito/fallo de ese refresh; control de escritura confirmada cuyo refresh falla.
- Cada carrera verifica que cualquier emisión sea B completo y que la siguiente operación conserve destino B y revisión 7. Una respuesta de A confirmada conserva su resultado aunque falle refresh. No se exige que el controlador ejecute un refresh obsoleto ni que evite emitir B intacto.
- Corrección: 3 escenarios. Navegar con cambios como control; recargar y cancelar conserva nota/devolución sin GET nuevo ni POST; confirmar descarte restaura ambos campos del servidor con un GET, sin POST ni cerrar el editor. Usa el diálogo existente de navegación.

## Comandos y resultados observados

Desde el worktree indicado:

```powershell
node --test --test-concurrency=1 tests/frontend-study-context.test.mjs tests/frontend-grading-discard.test.mjs
```

- Primera ejecución: exit 1, 12 tests, 4 pass/8 fail. Una aserción propia exigía cero emisiones incluso si B se emitía intacto. Se corrigió antes de entregar aceptación, sin tocar producción, para verificar conservación del dato y del destino en vez del número de renders.
- Ejecución definitiva: exit 1, 12 tests, **5 pass/7 fail**, 0 cancelled, 0 skipped, 0 todo; duración reportada 1229 ms.
- Estudio: 5 fallos por la causa esperada. Al resolver A se emite A completo en lugar de B; con refresh fallido después del comando se mezcla `folder A` con sources/conversaciones/memory de B. La recuperación exitosa de un error tardío también restaura A sobre B. Los errores de recovery refresh conservan B y pasan, igual que el control de commit confirmado.
- Corrección: 2 fallos por la causa esperada: no aparece `Tenés cambios sin guardar` al recargar. El control de navegación sí muestra ese diálogo y cancelar conserva los dos campos sin tráfico adicional.
- No hubo fallos de import, runner ni promesas sin manejar. Las dependencias locales fueron preparadas por el coordinador antes de ejecutar; este agente no las modificó.

## Límites y siguiente paso

Las pruebas ejecutan código real con puertos sintéticos en memoria; no prueban DOM, foco, responsive, servidor ni proveedor real. En RED las aserciones posteriores al primer fallo todavía no se ejecutan; deberán completar su recorrido en GREEN. No se afirma aislamiento efectivo entre agentes con acceso al mismo filesystem. El coordinador debe incorporar los archivos al manifest/tablero y otro escritor implementar ambos comportamientos conservando esta aceptación. No se ejecutaron build, lint ni suites ajenas por este agente.

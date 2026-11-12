# Publicación de Foxy AI y Carpetas de estudio

- Coordinador Codex, `root`, sin identificador de sesión expuesto.
- 2026-11-12, worktree principal, `main` en `734845b538e047ef60632adde304b3073199ec90` al iniciar.
- El usuario autorizó los commits del trabajo pendiente, su publicación en `main` y conservar `main` como única rama local y remota.
- El índice estaba limpio. `git fetch origin --prune` y `git ls-remote --heads origin` mostraron que `main` era la única rama local y remota. Los seis worktrees separados apuntaban a commits alcanzables desde `main`.
- La primera ejecución del grupo `fast` se detuvo al validar el inventario. Las pruebas de política y custodia de adjuntos estaban inventariadas sin grupo. La política usa dobles locales y la custodia necesita la base aislada.
- Tras corregir las rutas, `fast` alcanzó 817 pruebas aprobadas y falló en la prueba de diálogo de Agenda. Su simulador carecía de `useId` y la aserción esperaba un ID fijo. Se actualizó el simulador y se añadió al caso la comprobación de que una cancelación originada en un diálogo hijo no cierre el padre.

## Unidades integradas en `main`

- `e8a1293` incorpora ambas pruebas de adjuntos a sus grupos de ejecución.
- `75be138` inicia turnos de Foxy cuando hay capacidad.
- `4812ef8` reutiliza en Crear carpeta los componentes del flujo Crear aula.
- `e084d63` reúne la apertura y descarga de recursos con la generación visual desde un chat nuevo, que comparten la navegación y el estado de Foxy.
- `3f98776` agrega la vista previa de DOCX y mantiene la descarga original.
- `ef5c980` aplica los diálogos de FoxMind a las confirmaciones de Carpetas.
- `b4ea14f` actualiza la prueba compartida del diálogo y comprueba el manejo de Escape.

## Verificación local

- `node scripts/run-ci-suite.mjs --suite study` aprobó 77 pruebas. La prueba de custodia de adjuntos aprobó en PostgreSQL aislado. Las ocho pruebas del formulario de Agenda pasaron con el simulador corregido.
- Compilación web y de TypeScript de API, fronteras de arquitectura y comprobación de inventario aprobadas. El inventario tiene 545 entradas, 53 exclusiones explícitas y 23 rutas de ejecución.
- Los [recorridos E2E](../verification/2026-11-12-foxy-study-e2e.md) y las comprobaciones de cada corrección conservan su evidencia previa con cuentas y proveedores sintéticos. Esta publicación vuelve a ejecutar la regresión local y no repite los recorridos de navegador ni llamadas a Gemini real.
- Logs de la publicación en `.test-artifacts/main-publication-20261112/`. El workflow principal de GitHub se ejecuta en pull requests.

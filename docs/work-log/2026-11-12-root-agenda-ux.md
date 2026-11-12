# Agenda UX — ejecución aprobada

## Iteración aprobada: tarjetas del detalle diario

El usuario aprobó el rediseño del panel: encabezado compacto, tarjeta con fondo tenue por evento, título protagonista, horario debajo, etiqueta discreta y acción «Agregar evento» con +. Implementación y comprobación local en curso, dentro del mismo worktree; sin cambios de permisos o datos.

- Agente: root, orquestador; identificador de sesión no expuesto.
- Fecha: 2026-11-12. Rama: codex/agenda-ux.
- Worktree: C:/Users/alejo/.codex/worktrees/agenda-ux/ProtipoFoxMind.
- Base: 1f61923407fa839df0abb97e673c0274cf12bb1b; árbol inicialmente limpio.
- Autorización: usuario aprobó propuesta y ejecución de detalle diario, navegación y formulario. Sin commits/push/deploy.
- Fuentes: guía Agenda, diseño vigente y [tablero](../../odd/tasks/agenda-ux.md).
- Superficies: frontend Agenda, pruebas focales y documentación canónica.
- Hallazgos: selección diaria existente poco destacada; avanzar mes selecciona día 1; formulario con estilos heredados acumulados.
- Estado: implementación en curso. Evidencia y omisiones se completan al verificar.
- No se accedió a secretos, recursos retenidos ni proveedor IA.

## Evidencia del candidato

- `npm ci --ignore-scripts --no-audit --no-fund`: 491 paquetes; sin scripts de proveedor.
- RED: `node --test tests/agenda-ux-navigation.test.mjs` falló: febrero 01 en lugar de 28.
- GREEN: `node --test tests/agenda-ux-navigation.test.mjs tests/agenda-reference-selection.test.mjs tests/agenda-polish-presentation.test.mjs tests/agenda-view-modes.test.mjs tests/agenda-ui.test.mjs tests/agenda-event-form-model.test.mjs tests/agenda-event-form-view.test.mjs tests/agenda-event-form-editor.test.mjs tests/agenda-event-form-result.test.mjs tests/agenda-visual-polish.test.mjs`: 59 PASS, 0 FAIL, 0 SKIP.
- `npx tsc -p apps/web/tsconfig.json --noEmit`: PASS.
- `npx eslint apps/web/src/features/agenda`: PASS.
- `npm run web:build`: PASS, compilación y generación de páginas.
- Nueva prueba incluida en suite CI pure; CI remoto no ejecutado.
- `node scripts/agenda-ux-preview.mjs`: servidor propio Vite 4327; Ego Lite espacio 2 cerrado al terminar. Componentes/CSS reales con cliente sintético en memoria, sin credenciales/proveedor.
- QA: fecha conservada al avanzar mes y cambiar vista; foco estable en controles; panel móvil con 3 eventos, día vacío y creación para el 13; Escape devuelve foco al día 12. Formulario: error de título enfoca campo, creación horaria y semanal ALL_DAY con payload correcto; detalle personal abierto. Se midieron una columna móvil, footer dentro de viewport, ausencia de overflow y seis controles de navegación de 44 px. Movimiento reducido: cero animaciones de calendario.
- Capturas inspeccionadas y hashes en [recibo](../verification/agenda-ux.json). Tamaños efectivos finales 1440×1000 y 390×844; primera captura exploratoria 1536×706, no usada como referencia final.

## Fallos corregidos y límites

Dos pruebas de selección fallaron inicialmente porque el helper no expandía el nuevo toolbar; se actualizó su expansión de componentes sin cambiar las aserciones de aceptación. Una regla CSS con ID impedía una columna móvil; se corrigió la prioridad local y se repitió QA. Hubo rondas de navegador fallidas por usar selector en snapshot subtree (requiere ref), recarga Vite al cambiar CSS y retiro del botón de reintento tras refresco al recibir foco; no se cuentan como PASS. Error visible ensayado; reintentos/respuestas tardías acreditados por pruebas focales.

Sin pruebas nuevas sobre SQL/API autenticada, producción, Gemini ni lectores de pantalla. No se afirma persistencia real desde el cliente sintético. CSS local y toolbar separan presentación; el corte supera 400 líneas incluyendo fixture, tests y evidencia para mantener reproducible la aceptación conjunta de los tres ajustes aprobados. No hay cambios de datos/backend.

Estado: implementación y verificación local completas. Sin commits propios, push, integración o despliegue. Primer paso posterior: revisión del usuario; publicación requiere autorización.

Comprobación final: docs:check 117 archivos / 1025 enlaces, cero problemas; git diff --check PASS. El primer check TTP detectó codificación mixta del registro; se normalizó a UTF-8 y se repitió. Servidor propio detenido al cerrar.

El check TTP también requirió separar la explicación de aprobación del valor literal `approved`. Resultado final observado: `OK: 3 tareas válidas`. Registro y tablero cerrados con evidencia local.

Iteración tarjetas completada: 16/16 pruebas focales (agenda-ux-navigation, agenda-reference-selection, agenda-polish-presentation, agenda-ui); TypeScript y ESLint focal PASS. Ego Lite espacio 4 cerrado: detalle abierto desde tarjeta, agregar conserva fecha, 3 tarjetas móvil sin overflow; capturas escritorio/semana/móvil reemplazadas y hashes actualizados. Cliente sintético; sin nueva prueba SQL. Build anterior no repetido para este ajuste de markup/CSS.

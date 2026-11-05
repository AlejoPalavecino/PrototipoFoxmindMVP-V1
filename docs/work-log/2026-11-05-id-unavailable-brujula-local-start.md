# Brújula — migración y arranque de la base local

- Agent / role: root / coordinador.
- Session or task ID: unavailable.
- Date: 2026-11-05 (America/Buenos_Aires).
- Branch / worktree: codex/foxmind-brujula / checkout principal.
- Starting commit: 5ea7f568d485512c88ed626511aef537bcad5704, diff Brújula preservado.
- Phase and detailed task/spec links: [Brújula](../../odd/tasks/foxmind-brujula.md), operación local.
- Status: completed.

## Request and scope

Pedido explícito posterior: aplicar las migraciones a la base local habitual y levantar la plataforma para revisión manual del diseño. Autoriza utilizar internamente la configuración local ya existente. Preservar cuentas, archivos, correo y parámetros de IA; sin reset/seed, cambios de credenciales, generación automática, push ni despliegue externo.

## Work performed

Reconciliados roadmap, registro de arranque/cierre y diff local. Entorno retenido identificado por registros previos: main-gemini-20261024, web loopback52171. Verificar propietario/estado y migraciones antes de mutar. No imprimir configuración privada.

## Verification

`upgrade-brujula-20261105.mjs` reutiliza admisión/propietario de recursos retenidos, backup custom e índice pg_restore y comparación por hash de columnas anteriores. Primer intento rechazado por lock obsoleto; PID36720 comprobado inexistente y lock conservado con nombre histórico antes de repetir. Sin mutación SQL en el intento rechazado.

Repetición completada:37→39migraciones, aplicadas únicamente `202611050001_public_evaluation_rubric` y `202611050002_brujula_activity_grading_wall`. Historial anterior intacto,54tablas con conteos/contenido original conservados, backfill de notas verificado y drift0. Backup e índice comprobados; no se ensayó restauración completa. Prueba privada en `.test-artifacts/main-gemini-20261024/upgrade-brujula-proof-20261105.json`, sin valores personales/secretos expuestos.

Helper de arranque ignorado actualizado de37a39migraciones esperadas; se conserva launcher de IA, claves/cuotas/presupuesto previos. Inicio en segundo plano oculto mediante Start-Process: supervisor33760, Next38816.

`check-brujula-start-20261105.mjs` exit0: API readiness200; acceso/registro200; fuenteLexend, banner docente e iconosBrújula200 con contenido; aulas anónima401 esperado; Mailpit readiness200. Primer control asumió cuerpo no vacío para readiness deMailpit y falló; respuesta200vacía válida confirmada y condición corregida sólo para ese endpoint. No fue un fallo del servicio. Configuración segura publicada por launcher confirma Gemini activo, mismo modelo/presupuesto, sin petición generativa automática. Logs privados ignorados `brujula-start-20261105.{out,err}` y prueba `brujula-start-proof-20261105.json`.

## Commits and outcomes

Sin commits.

## Handoff

Plataforma activa para revisión manual en http://127.0.0.1:52171/sign-in. Base actualizada, cuentas y datos conservados, infraestructura retenida ejecutándose. Usar cuentas locales existentes o registrarse; no se restablecieron contraseñas ni se sembraron datos. Sin tareas pendientes de este arranque; una nueva revisión autenticada queda a cargo del usuario. No se declara otra ejecución E2E sobre esta base: la verificación funcional previa usó fixtures propios.

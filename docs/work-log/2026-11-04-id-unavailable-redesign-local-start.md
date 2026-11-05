# Arranque local posterior al rediseño

- Agent / role: root / coordinador.
- Session or task ID: unavailable.
- Date: 2026-11-04.
- Branch / worktree: main / checkout principal.
- Starting commit: 5ea7f568d485512c88ed626511aef537bcad5704.
- Phase and detailed task/spec links: operación local; docs/engineering/local-development/operation.md.
- Status: completed.

## Request and scope

Levantar FoxMind local para prueba manual del usuario. Reutilizar entorno retenido documentado, sin seed/reset/migraciones ni llamadas a IA real. No leer/imprimir credenciales; el lanzador aprobado carga internamente la configuración de servicios existentes.

## Work performed

Revisadas guías de operación/demo y arranque anterior. Docker engine apagado; no listeners relevantes. Launcher preview-readme-no-ai mantiene guard retained-restart-only, 37 migraciones y control de drift, sin IA externa. Archivos locales de mantenimiento anteriores preservados.

## Verification

Docker Desktop iniciado oculto. Build API actual exit 0 (Prisma y TypeScript). Lanzador retenido sin IA iniciado oculto, supervisor PID 24852, main 5ea7f568d485512c88ed626511aef537bcad5704. Cuatro contenedores propios DB/S3/scanner/mail activos; scanner/mail healthy. API live/ready HTTP 200, web /sign-in HTTP 200, correo /readyz HTTP 200 y web classrooms anónima HTTP 401 esperado. El chequeo estático de HTML no detectó el formulario por hidratación cliente; Ego Space2/p1 comprobó posteriormente formulario completo con correo, contraseña e Iniciar sesión. Página conservada mediante finish keep p1. No hubo login ni lectura de contenido académico.

## Commits and outcomes

Sin commits/push ni cambios de producto.

## Handoff

App disponible en http://127.0.0.1:52171/sign-in; correo local http://127.0.0.1:52169. Supervisor PID 24852 y servicios permanecen activos para prueba manual. IA externa desactivada. Cuentas/datos preservados, sin migraciones/reset/seed.

## Ajustes locales del arranque

Lock PID22556 comprobado inexistente y sin listeners; preservado como operation-stale-22556-redesign-start.lock. Launcher ignorado tenía ruta de Next a worktree retirado: sustituida por node_modules del checkout principal. Validador ignorado conservó controles de nombres/checksum y variantes Git/newline; se retiró solo dependencia opcional de bytes de SQL del worktree ya retirado. Control de historial/drift aprobó sin modificaciones de esquema. No se relajó validación de checksums para permitir diferencias nuevas. Logs privados de proceso en .test-artifacts/main-gemini-20261024/redesign-start.{out,err}; no contienen valores de configuración impresos por estos ajustes.

Primera llamada Ego usó opción timeoutMs inválida; corregida a timeout en la misma Space2. DOM inicial indicó carga de sesión; espera del input y snapshot posterior confirmaron formulario. Next generó únicamente referencias dev/types en next-env.d.ts; contrastadas con HEAD y restituidas, sin cambios de producto. Advertencia heredada de lockfile externo pnpm no bloquea arranque. No se declara nueva aceptación de build producción ni prueba autenticada.
`git status` final muestra next-env.d.ts regenerado otra vez por el servidor activo: solo las dos referencias dev/types documentadas. Se conserva ese archivo generado mientras Next dev sigue ejecutándose; no se declara árbol limpio. Los únicos otros pendientes son los dos registros locales de mantenimiento/arranque.

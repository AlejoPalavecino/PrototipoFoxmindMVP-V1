# Actualización de fixtures históricos de navegador
- Agent / role: root
- Session or task ID: unavailable
- Date: 2026-11-03
- Branch: main, faf9aec
- Status: completed

Actualizar P6 móvil, P9 Inicio y el fixture compartido de P9 práctico a cuentas de rol exclusivo. Ejecutar contra servicios aislados.

## Cambios y evidencia
- P6 móvil registra docente y alumno explícitos. P9 Inicio separa cuentas de enseñanza y estudio, mantiene el control de borradores privados y verifica la inscripción por aula. El adaptador actual de P9 registra roles explícitos y mantiene el helper histórico con su checksum original.
- Con los builds locales de main y Docker aislado, se ejecutó node --test --test-isolation=none --test-concurrency=1 sobre los tres archivos pedidos. P6 móvil y P9 práctico pasaron en esa corrida. P9 Inicio detectó que el aula archivada seguía en la colección. Se precisó la aserción para verificar ausencia del aula invitada antes de aceptar.
- P9 Inicio en repetición aislada: 12 PASS, 0 FAIL, 0 SKIP. P9 práctico en repetición aislada con el adaptador definitivo: 1 PASS, 0 FAIL, 0 SKIP. Limpieza de procesos y servicios sin errores.
- node --test tests/p9-positive-max-files.test.mjs: 3 PASS, incluidos los checksums históricos. git diff --check: exit 0.
- Logs: .test-artifacts/browser-role-fixtures.log, browser-role-home-retry.log y browser-role-practical-final.log en ese mismo directorio.

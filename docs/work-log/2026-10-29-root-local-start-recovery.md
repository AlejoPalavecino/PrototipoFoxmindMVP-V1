# Arranque local de FoxMind — completado

- Agent / role: /root coordinador; /root/explorer inspección de solo lectura, persistida por coordinador.
- Session or task ID: /root; host ID unavailable.
- Date: 2026-10-29.
- Branch / worktree: main, checkout canónico; starting commit 7aee4181e62d680631e9fe9ad18c39744c6f7754.
- Phase: operación local; [roadmap](../implementation-roadmap.md).
- Status: completed.

## Request and scope
Levantar FoxMind localmente conservando datos retenidos y trabajo existente. Sin publicación, migraciones ni ejecución del proveedor de IA.

## Work and evidence
Explorer consultó Engram, roadmap, registros y guía de arranque, sin editar ni leer secretos; identificó el bloqueo previo de checksum y el árbol ajeno. El coordinador confirmó que el archivo exacto del checkout usado para aplicar 202610280001_student_ai coincide con el checksum almacenado y que su SQL normalizado por finales de línea coincide con el archivo Git actual. El guard de la copia temporal ignorada comprueba ambos hechos antes de aceptar esa migración; el historial y el control de drift permanecen activos. No se cambió la base.

Next local estaba incompleto: faltaban package.json y archivos internos. npm install no terminó y se interrumpió; se repusieron archivos faltantes desde otro checkout con la misma versión 16.4.2 del lockfile. Dos intentos previos de web devolvieron 500 por esos archivos ausentes; sus procesos se detuvieron y sus locks de PID inexistentes se conservaron renombrados. El tercer arranque informó ready con IA desactivada, PID 50940, sesión de ejecución 49748. Los cuatro contenedores de apoyo ya estaban activos.

## Verification
GET /sign-in web 200, /api/v1/health/ready API 200 y /readyz Mailpit 200. No se verificó un inicio de sesión ni funcionalidad autenticada; no se ejecutaron tests funcionales porque no hubo cambio de producto. No se hicieron operaciones de proveedor, migración o publicación.

## Handoff
Web http://127.0.0.1:52171/sign-in; API puerto 52170; Mailpit http://127.0.0.1:52169. El supervisor conserva API/web en ejecución; IA desactivada. Para reiniciar, verificar que no exista supervisor antes de usar .test-artifacts/main-gemini-20261024/preview-readme-no-ai.mjs; su guard depende del archivo de migración del checkout aplicado. No se cambió el roadmap ni se hizo commit.

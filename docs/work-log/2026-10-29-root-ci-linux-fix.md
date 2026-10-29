# Corrección de CI Linux — issue #2

- Agente: coordinador /root. Sesión real no disponible; 2026-10-29.
- Rama: codex/ci-linux-fix; base cd3beb800535d0f78d9547a1c4bdc7e840fef264. Estado: in_progress.
- Alcance: investigar seis fallos de contrato CI en Linux, corregirlos y verificar la cadena; no merge a main ni despliegue.
- Evidencia inicial: run 40963254127 del tracker terminó failure; API build, tipos y web build pasaron, prueba contrato CI 8 PASS/6 FAIL y pasos posteriores no ejecutados. Causa aún no demostrada.
- Handoff: reproducir Linux aislado, corregir con pruebas y preparar propagación sin reescribir ramas; obtener autorización explícita antes de push conforme instrucciones.

## Diagnóstico y reparación
- /root/explorer: logs confirmaron 8 PASS/6 FAIL en simulación Bash; API y web habían pasado; los pasos de producto posteriores se omitieron. Sin datos sensibles.
- /root/red demostró en Linux Node24 que extracción truncaba el bloque en LF al suprimir comentarios; añadió RED 14 PASS/1 FAIL y corrigió tres expresiones sin relajar aserciones. Windows y contenedor Linux con Bash: 15 PASS cada uno, recursos temporales limpios. No es CI remoto.
- Se conserva el fallo remoto histórico. Siguiente: revisión independiente y preparar propagación a 13 ramas por fast-forward; verificar checks reales antes de cualquier integración a main.
- /root/reviewer revisó el delta de las expresiones y la regresión; sin hallazgos, sin ejecutar pruebas. /root/red observó 15 PASS en Windows y 15 PASS en Linux con Node24+Bash en contenedor aislado. No se afirma CI GitHub todavía.
- Corrección local `fa0fb0a`; 12 merges locales preparados en codex/ci-linux-01..12, cada diff de producto coincide con el previo. Primer intento de preparar script tuvo ParserError antes de ejecutar, corregido; no hubo cambios por ese intento.
- Git diff de integradora contra main: 405 líneas; excede el límite de 400 por cinco líneas. No se eliminó ni comprimió documentación o tests para cumplir el presupuesto. El usuario debe elegir excepción de tamaño para PR #3 y autorizar explícitamente push de las 13 actualizaciones antes de ejecutar checks remotos.

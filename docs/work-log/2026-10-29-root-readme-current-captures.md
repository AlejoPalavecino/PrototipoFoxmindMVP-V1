# Capturas actuales para README — en progreso

- Agent / role: /root coordinador; /root/demo_explore inspección anterior de solo lectura.
- Session or task ID: unavailable.
- Date: 2026-10-29.
- Branch: main; starting commit: 7aee418.
- Phase: presentación del repositorio; [roadmap](../implementation-roadmap.md).
- Status: blocked.

## Request and scope
Iniciar FoxMind con cuenta demo, obtener capturas actuales y actualizar/publicar README en main. Autorizado usar configuración privada sin mostrar valores, retirar bloqueo si su proceso no existe e iniciar con IA desactivada. Preservar datos retenidos y archivos ajenos.

## Work performed
Inspeccionados guía demo, arranque y estado local; API compilada correctamente. Retirado bloqueo del PID 47736 tras confirmar que no existía el proceso. La recreación de contenedores se detuvo al detectar contenedores existentes; se iniciaron los cuatro servicios retenidos existentes. Un lanzador temporal con IA desactivada no lee la clave de IA ni reemplaza metadata. El guard inicial esperaba 15 migraciones, mientras la base tiene 17; se adaptó una copia temporal para verificar 17, sin migrar. La validación se detuvo por `migration-checksum` en `202610280001_student_ai`: no coincide con el archivo actual ni con variantes habituales de salto de línea o BOM. No se omitió el guard ni se alteró la base. API/web no arrancaron.

## Verification
`npm run api:build` pasó. La consulta de solo lectura contó 17 migraciones finalizadas; se identificó el nombre con checksum distinto sin exponer datos. Capturas, README y publicación pendientes.

## Commits and outcomes
Ninguno todavía.

## Handoff
Investigar y reconciliar el checksum de la migración con la evidencia de su aplicación antes de iniciar el runtime. No corregir el historial de migraciones ni omitir la validación sin resolver la causa. Los cuatro servicios de apoyo permanecen activos; no se creó sesión de navegador.

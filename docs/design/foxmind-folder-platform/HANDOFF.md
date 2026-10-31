> **Contexto histórico (2026-10-31):** el mensaje siguiente pertenece al plan Carpetas de 2026-10-22 y no es un encargo vigente. Consulte el [catálogo de diseños](../INDEX.md), la [guía FoxMind 3D](../../engineering/frontend/foxmind-3d.md) y el [roadmap](../../implementation-roadmap.md). El recibo `validation.json` conserva el hash del handoff original, anterior a este encabezado; no fue regenerado.

# Handoff para otro agente

## Mensaje para iniciar la implementación cuando el usuario lo autorice
> Implementá el plan integral UX/UI FoxMind Carpetas. Leé primero este paquete completo: README.md, BASELINE.md, IMPLEMENTATION-PLAN.md, COVERAGE-MATRIX.md y VERIFICATION.md, y mirá las referencias v3 y originales de marca.
>
> Ruta actual del paquete: C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/docs/design/foxmind-folder-platform.
>
> Empezá por F0: este chat está sobre una rama P3 histórica. La base completa candidata inspeccionada es main en C:/Users/alejo/.codex/worktrees/p4-p3-integration/ProtipoFoxMind, HEAD observado 0bcb7d48dac76d49aa8e89b3ac76b32b03515425. Revalidá estado e instrucciones; correlacioná el runtime antes de editar. No hagas merge de P3 ni sobrescribas cambios documentales ajenos. Copiá solo el paquete y referencias si hace falta, verificando manifest.
>
> Alcance completo: sistema visual carpetas en acceso/registro/verificación/recuperación/perfil, Inicio/Mis Aulas, creación/admisión, cada aula por rol, Plan/Biblioteca/Muro/Alumnos/Compañeros/Historial/Configuración, actividades/TP/cuestionarios/evaluaciones/entregas/intentos, corrección/publicación/resultados/progreso y notificaciones. Incluí móvil y estados vacíos/carga/error/solo lectura/permisos.
>
> Corregí el destino general tras login verificado a /inicio, manteniendo next interno válido y verificación obligatoria; Mi perfil solo por acción explícita. El registro mantiene acuse genérico y no inicia sesión: completar verificación y login sin perfil obligatorio. Conservar invitaciones y aceptación explícita. Crear/unirse solo en Mis Aulas. La misma cuenta puede estudiar y enseñar, sin rol global.
>
> Conservá APIs y contratos de seguridad/archivos/notas/guardado. No uses mocks para completar el resumen Inicio ni confundas seleccionado/subido/listo/entregado. Resolvé la brecha de datos de Lo próximo con un contrato mínimo autorizado y pruebas, sin N+1 ni side effects de participación.
>
> Ejecutá F0–F9 con registro propio y pruebas antes de los cambios de comportamiento. Mostrá targets faltantes manteniendo la dirección elegida. No declares terminado por Inicio/auth: cerrá la matriz UI01–UI43 y journeys J01–J22 con evidencia real. No cambies de stack, políticas de negocio o seguridad. Sin deploy, datos retenidos, secretos, push o merge no autorizado. Separá aceptación técnica de aprobación visual.
>
> Consultá Engram proyecto prototipofoxmindmvp-v1, tema design/foxmind/folder-platform/implementation-plan, y las notas asociadas de acceso, cobertura y verificación. La copia del repositorio manda para la lista completa; memoria no sustituye los archivos.

Observaciones verificadas: #550 base, #551 plan completo, #552 cobertura completa, #553 verificación completa. Ver ENGRAM.md.

## Lo que todavía NO está hecho
- Ningún cambio de aplicación, redirect, componente o API de este nuevo plan.
- No hay auditoría browser completa ni mediciones CSS del candidato.
- No se resolvió qué proceso sirve actualmente el host.
- No existen aún targets de todas las pantallas; F1 los define usando v3.
- No se validó ni implementó un endpoint agregado de Lo próximo.
- No se ejecutaron tests del nuevo diseño ni se publicó el plan en Git.

## Primer resultado esperado del implementador
Un registro F0 con cwd/HEAD/estado real, runtime correlacionado, inventario actualizado, referencias verificadas y baseline. Después, F1 y F2; no empezar por editar globals.css en el checkout P3 ni por reemplazar todos los '/profile'.

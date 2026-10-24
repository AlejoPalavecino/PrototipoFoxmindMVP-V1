# Referencias visuales de plataforma — Carpetas

- Agent / role: root / diseño estático.
- Session or task ID: unavailable.
- Date: 2026-10-22.
- Branch / worktree: feat/p33-token-flows / checkout principal.
- Starting commit: 43954848555cc9f304fa669ad2e7bd5caa00ebec.
- Phase and detailed task/spec links: [plan transversal](../design/foxmind-folder-platform/README.md), [spec](../foxmind-v1-functional-spec.md).
- Status: completed (set estático de escritorio; no implementación).

## Request and scope
Crear referencias de login, registro, Mis Aulas, creación de aula, cada pestaña por rol y perfil a partir de imagen específica adjunta. Set de escritorio anunciado; no aplicación ni interpretación de imágenes como permisos/funcionalidad.

## Work performed
Ruta del adjunto normalizada de /C:/ a C:/; archivo existe y fue inspeccionado. Base es exec-4d7c01c0-a6b3-4513-95be-64253a88b92d.png (primera pasada escritorio), no sustituir silenciosamente por v3 corregida. Leídos roadmap/protocolo/matriz y tabs de fuente main (Alumnos/Historial/Plan/Biblioteca/Actividades/Progreso/Muro/Configuración; estudiante Compañeros/Plan/Biblioteca/Actividades/Mi progreso/Muro).

## Verification
24 imágenes generadas por separado con ImageGen integrado e inspeccionadas visualmente en sus salidas. Copias finales en docs/design/foxmind-platform-mockups/screens; base exacta preservada en references; galería index.html, README.md, QA.md, specs.json, generation-notes.json y manifest.json creados. Correcciones dirigidas: checks futuros y selectores de paso 1, navbar de aula, unidad de actividad y nombre de compañero. Límites tipográficos/de consistencia documentados en QA.

PowerShell: validación de referencias locales HTML/Markdown y comparación Get-FileHash SHA256 contra manifest.json: PASS, 24 archivos. Dimensiones reales: 19 de 1487x1058, 3 de 1486x1058, 1 de 1486x1059 y 1 de 1488x1057. No se redimensionaron los originales. git diff --name-only y git diff --cached --name-only sin salida; git diff --check exit 0. La galería fue solicitada en el panel con open_in_codex; resultado queued, no se afirma comprobación renderizada en navegador.

No tests de aplicación: tarea de referencias estáticas, sin modificación de código funcional. No se afirma validación humana, responsive, accesibilidad o autorización real por mirar imágenes. No despliegue ni servicios iniciados.

## Commits and outcomes
Sin modificación de producto, publicación o commit. Archivos preexistentes preservados.

## Handoff
24 vistas entregables: acceso3, Mis Aulas1, wizard4+confirmación1, docente8, estudiante6, perfil1. Primera acción posterior: revisar la galería con el usuario y recoger ajustes. Móvil y estados secundarios quedan fuera de este set, no descartados del plan transversal. No implementar hasta autorización específica; no inferir permisos/funcionalidad desde imágenes. Memoria Engram #563 describe el set.

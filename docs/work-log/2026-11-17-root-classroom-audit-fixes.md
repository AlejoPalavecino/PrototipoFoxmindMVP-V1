# Correcciones de la auditoría de Aulas

Coordinador Codex, 2026-11-17. Checkout principal en `main`, base `c470312`. El usuario autorizó corregir el seguimiento del archivo pendiente, la validación de preguntas antes de revisar y el fallo del arranque local.

El coordinador se ocupa del arranque y de comprobar el candidato combinado. Los agentes de Aulas y Actividades mantienen sus registros de implementación y pruebas.

- [Archivo pendiente](2026-11-17-aula-pending-plan-file.md). El ID queda asociado al borrador al recibir el archivo pendiente. Al retomar se vuelve a comprobar su estado. La publicación sigue exigiendo aprobación.
- [Revisión de preguntas](2026-11-17-actividades-question-review.md). El editor abre la primera pregunta inválida antes de pasar a revisión. La regresión compara entradas con el validador real de la API.
- Arranque. Al repetir la invocación de Next de `local:up` con la instalación inicial, TypeScript y la generación de páginas finalizaron, pero el proceso terminó con `SecurityFatalError`, exit 1. La instalación contenía Next 16.4.2, mientras manifiesto y lock fijaban 16.4.5. El control nuevo detectó la diferencia en este mismo checkout antes del arranque. La prueba de instalación ausente, obsoleta y correcta pasó, junto con las seis pruebas previas de configuración local.
- Cierre del candidato. `npm ci --no-audit --no-fund` instaló Next 16.4.5 según el lockfile. `npm run local:up` completó migraciones, compilaciones de API y web y arranque del supervisor. Estado READY, HTTP 200 en `/sign-in` y `/api/v1/health/ready`. Se devolvió el entorno al estado detenido con `npm run local:stop`, conservando los volúmenes.
- Comprobaciones combinadas. 29/29 pruebas en los archivos de regresión del wizard, autoría y arranque; lint focalizado correcto, inventario y rutas coherentes, `git diff --check` correcto. Revisión independiente: 15 pruebas verdes, regreso tardío del archivo previo y guardado duplicado comprobados, y 20.190 entradas comparadas entre editor y API sin discrepancias. Los grupos se solapan. La ventana de escaneo pendiente y la selección de preguntas se probaron mediante el harness de componentes. La verificación del supervisor utilizó los servicios locales reales sin generar contenido con IA.
- Estado final: tres correcciones verificadas localmente en el árbol de trabajo. Sin commit ni publicación.

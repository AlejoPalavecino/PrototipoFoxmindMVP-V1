# Confirmaciones de Carpetas de estudio

- Fecha y candidato. 2026-11-12, rama `main`, base `734845b` y cambios locales previos.
- Coordinador Codex. Identificador de sesión no expuesto.
- Alcance autorizado. Unificar los diálogos de agregar a Agenda, quitar material y eliminar carpeta. Comprobar confirmar y cancelar.
- Evidencia de partida. [Auditoría E2E](../verification/2026-11-12-foxy-study-e2e.md#hallazgos-para-corregir).
- Estado. Implementado y verificado localmente.

Las tres acciones usan el diálogo compartido de FoxMind. El foco inicial se pone en **Cancelar**. El diálogo de Agenda indica cuántas sesiones se agregarán. Quitar y eliminar identifican el material o la carpeta y describen el efecto. Durante el envío se impide repetir la operación. Si falla, el diálogo muestra el error y permite reintentar.

## Verificación

Chromium con la web, API y PostgreSQL del entorno aislado. Cada caso se probó con Cancelar, Escape y confirmación explícita. Se compararon las solicitudes y el estado antes y después de cada acción.

| Flujo | Ancho | Al confirmar |
|---|---:|---|
| Agregar a Agenda | 390 px | Una solicitud creó dos sesiones seleccionadas y la interfaz confirmó el resultado. Se consultaron los dos eventos persistidos. |
| Quitar un material | 1440 px | Una solicitud retiró el material. La fila desapareció y el foco pasó a Buscar material. |
| Eliminar una carpeta | 320 px | Una solicitud llevó al listado, la carpeta dejó de estar accesible y los eventos ya guardados en Agenda siguieron disponibles. |

Cancelar y Escape dejaron abierto el panel anterior, devolvieron el foco al disparador y conservaron los datos. No se abrió ninguna confirmación nativa. El primer guion comparó el reloj de la respuesta de Agenda junto con sus eventos. La repetición comparó sólo los eventos y la revisión de la carpeta.

- La prueba RED de Agenda detectó la confirmación nativa original. La suite de Estudio pasó 77 pruebas, incluida la regresión de envío duplicado y reintento tras un error.
- Pasaron la compilación de web, la revisión de límites arquitectónicos y la validación documental.
- Evidencia local en `.test-artifacts/study-confirmations-20261112/`, con `browser-results.json`, capturas, `red.log` y `study-suite.log`.

Las pruebas usaron cuentas y archivos sintéticos. El escáner aislado usó las firmas incluidas en su imagen.

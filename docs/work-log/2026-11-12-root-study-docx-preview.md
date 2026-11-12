# Vista previa DOCX en Carpetas de estudio

- Fecha y candidato. 2026-11-12, rama `main`, base `734845b` y cambios locales previos.
- Coordinador Codex. Identificador de sesión no expuesto.
- Alcance autorizado. Vista previa y descarga del original de DOCX en hasta tres pasos.
- Evidencia de partida. [Auditoría E2E](../verification/2026-11-12-foxy-study-e2e.md#hallazgos-para-corregir).
- Estado. Implementado y verificado localmente.

## Cambio

**Abrir archivo** muestra el texto del DOCX en un diálogo. **Descargar** entrega los bytes originales. La carpeta y la referencia del material se comprueban antes y después de extraer el texto. Se detecta el formato por los metadatos del archivo aprobado, incluso si el título visible carece de extensión.

## Verificación

Cada acción se midió desde la carpeta, empezando con el panel cerrado. El tercer paso abrió el visor sin iniciar una descarga o inició una descarga cuyo contenido y nombre coincidieron con el original.

| Caso | Ancho | Recorrido de tres pasos |
|---|---:|---|
| Material propio | 390 px | Materiales y Plan → fila del material → Abrir archivo o Descargar |
| Material del aula vinculada | 1440 px | Materiales y Plan → fila del material → Abrir archivo o Descargar |
| Plan DOCX | 320 px | Materiales y Plan → Plan de estudio → Abrir plan o Descargar plan |

Escape cerró sólo la vista previa y devolvió el foco a su botón. En la corrida anterior había cerrado también el panel porque el evento se propagaba al diálogo exterior. Se verificó que el texto de prueba con marcado literal se renderiza como texto y que el plan PDF se sigue abriendo en una pestaña. La API denegó la vista previa a una cuenta docente y a una sesión anónima, y tras quitar el material o desvincular el aula.

- 75 pruebas de Estudio y 14 de archivos aprobadas. Compilaron la web y la API. Pasaron los controles de arquitectura y documentación.
- Se comprobó la lectura del XML principal de un DOCX sintético de más de 33 MB. La extracción que usa IA mantuvo su límite previo.
- Evidencia local en `.test-artifacts/study-docx-preview-20261112/`, con `browser-results.json`, capturas, descargas y logs.

La prueba de navegador usó archivos de prueba y las firmas incluidas en el escáner aislado. La vista previa muestra texto, con el formato y las imágenes disponibles en el original.

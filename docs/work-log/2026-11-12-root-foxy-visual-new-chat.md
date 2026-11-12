# Imágenes y esquemas desde un chat nuevo

- Fecha y candidato. 2026-11-12, rama `main`, base `734845b` y cambios locales previos.
- Coordinador Codex. Identificador de sesión no expuesto.
- Alcance autorizado. Generar una imagen desde un chat nuevo y comprobar vista previa, apertura y descarga.
- Evidencia de partida. [Auditoría E2E](../verification/2026-11-12-foxy-study-e2e.md#hallazgos-para-corregir).
- Estado. Implementado y verificado localmente.

El acceso **Nuevo chat → Herramientas → Imágenes y esquemas** abre el formulario existente con una descripción vacía. **Generar** guarda la conversación y luego solicita el visual en ella. El reintento de creación conserva la descripción y el identificador de solicitud. Cerrar antes de generar devuelve el foco a la tarjeta sin guardar una conversación.

## Verificación

- RED. La prueba de acceso falló porque la tarjeta de herramientas visuales desaparecía al iniciar un chat nuevo.
- GREEN. Pasaron 326 pruebas web de Foxy, la compilación de la web y el chequeo de límites arquitectónicos.
- Chromium a 390 px. Se abrió y cerró el formulario con cero conversaciones guardadas. Desde Nuevo chat con una conversación anterior seleccionada, **Generar** creó una conversación nueva y un solo trabajo de imagen en proporción 4:3. La conversación nueva quedó con cero turnos de texto y la anterior con cero trabajos visuales.
- La vista previa se renderizó. **Abrir en grande** abrió el PNG en una pestaña y **Descargar imagen** entregó el mismo archivo. Tras recargar a 1440 px, **Creaciones** abrió la misma imagen y volvió a descargarla. La cuenta estudiante recibió denegación al intentar abrir o descargar ese archivo privado.
- Evidencia local en `.test-artifacts/foxy-visual-new-chat-20261112/`, con `browser-results.json`, `web-tests.log` y capturas de ambos tamaños.

La actualización de firmas de ClamAV agotó su espera en el primer arranque. La repetición usó las firmas incluidas en la imagen del escáner dentro del entorno aislado. La generación usó un proveedor sintético.

# M4B: transporte HTTP de gestión

Estado: completado inicial. GET management y POST retry/discard usan UoW existente, validación estricta y runtime explícito; sin conexión de worker en HTTP.

HTTP gestión/publicaciones: 8 PASS; API build y fronteras PASS. Fixture ajustado por test_runner a publicationManagement. Prueba host y revisión independiente pendientes.

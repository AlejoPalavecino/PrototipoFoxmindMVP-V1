# Revisión final de Foxy AI y Mi estudio

Candidato local `GDx_noxCJE7hug5Hq9I7x`, worktree `foxmind-product-parity`. Comparación con UI Lab y prueba en Ego Lite, con dos roles de prueba, PostgreSQL/almacenamiento aislados y generación sintética. [Registro de la retoma](../../../work-log/2026-11-16-root-foxy-study-resume.md).

| Recorrido | Evidencia |
| --- | --- |
| Creación visual del docente | [Lector móvil](final-visual-reader-390.png), [escritorio](final-visual-reader-1440.png). Nodos y relaciones del esquema reales; archivo original conservado. |
| Publicación explícita | [Revisión de una preparación anterior](final-previous-snapshot-390.png), [recibo de ambos envíos](final-visual-browser.json). El contenido revisado coincide con su versión; confirmar la nueva deja intacta la anterior. |
| Conversación de Mi estudio | [390 px](final-study-chat-390.png), [768 px](final-study-chat-768.png), [1440 px](final-study-chat-1440.png), [medidas y foco](final-study-browser.json). Sin desbordes; Escape devuelve foco y conserva borrador. |

El intento inicial de revisar una preparación detectó que GET omitía su texto aunque lo persistía. La corrección se comprobó con prueba RED/GREEN de HTTP y PostgreSQL y en el flujo final de biblioteca. Guardado, retorno al editor y descarga TXT se verificaron también desde el lector en el candidato anterior, con la misma lógica de edición y descarga.

La migración se ensayó en bases descartables con filas previas y pruebas de concurrencia y autoridad. El recorrido final sólo usó datos de prueba; no valida generación real de Gemini, una auditoría completa de accesibilidad ni despliegue.

# Auditoría de documentación y capturas

El 2026-11-12 se contrastaron las guías de FoxMind con `main` (`398cc0bbe53e9deaf09a02d9b9fa0d35398180e0`), que coincidía con la referencia local `origin/main`. Trabajó el coordinador, con identificador de sesión no expuesto. La renovación se verificó en el árbol local antes de preparar el commit.

## Documentación renovada

- Se revisaron navegación, permisos por rol, contratos, modelos Prisma, migraciones y cambios integrados de Inicio, Aulas, Agenda, Foxy y Estudio. Se reconciliaron con las guías por dominio y los recibos de publicación. [Especificación](../foxmind-v1-functional-spec.md) · [Estado](../implementation-roadmap.md)
- La galería reúne 58 capturas nuevas de escritorio y móvil. El catálogo inventaría también 264 PNG que conservan evidencia anterior. Se incorporaron 19 PNG que tenían hash en recibos individuales y faltaban en el catálogo. Se corrigieron 19 hashes de metadatos de Aulas tras comprobar que la diferencia correspondía exclusivamente a CRLF frente al LF del repositorio. [Galería](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/design/current/README.md) · [Catálogo](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/design/current/catalog.json)
- Se retiraron 11 archivos de maquetas y 12 pares de captura y metadatos redundantes. Dos tableros cerrados apuntan al diseño aprobado en Markdown. Los archivos retirados se pueden recuperar del candidato original. [Inventario de retiros](../verification/documentation-audit-retirement.json)

## Recorridos y alcance

Se compiló API y web y se arrancó `FOXMIND_STUDY_PREVIEW=synthetic node scripts/documentation-preview.mjs`. El entorno descartable aplicó las migraciones y usó PostgreSQL, almacenamiento compatible con S3, ClamAV, Mailpit, dos cuentas de prueba y proveedores de IA sintéticos. Se cerró el entorno propio y el proceso reportó cero fallos de limpieza.

| Superficie | Evidencia observada en la aplicación |
|---|---|
| Cuenta e Inicio | Pantallas de acceso, registro y recuperación, login verificado de ambos roles, avatares y configuración, Inicio con actividad y eventos de prueba, selector de aula docente, resultados de búsqueda y retorno de foco con Escape |
| Mis aulas | Catálogos y asistentes, ocho secciones docentes y seis estudiantiles, apertura de invitación múltiple, consigna asignada, publicación de un aviso y un material escrito, y lectura de ambos desde la cuenta estudiante |
| Foxy | Chat nuevo, Herramientas, diálogo Imágenes y esquemas desde una conversación nueva y respuesta de texto de prueba procesada por la cola local |
| Estudio | Crear carpeta, chat, herramientas, examen, materiales y plan. Vista previa de texto de DOCX y descarga idéntica al archivo original. Escape en Quitar material conservó el material y devolvió el foco al botón |
| Agenda | Mes y Semana con eventos de prueba. En móvil, Mes → día → panel inferior → formulario con fecha seleccionada |

Las capturas fueron inspeccionadas en Chromium y se validaron dimensiones, ausencia de desborde horizontal del documento en los estados capturados, rol y hashes. Algunas referencias móviles desplazan la pantalla al contenido relevante. Ego Lite permitió leer la página de acceso y el registro móvil, pero agotó el tiempo al capturar. Se usó Playwright para las imágenes y se cerró el espacio de Ego Lite. Ego Lite indicó que hay una actualización disponible.

El primer arranque descartable encontró el build web ausente. Tras compilar, el segundo arranque completó la preparación y se verificó el candidato. Durante los recorridos se ajustaron selectores y un dato de prueba del plazo de la actividad. Las capturas incluidas en la galería corresponden a los estados alcanzados después de esas correcciones.

## Comprobaciones

- `npm run api:build` y `npm run web:build` aprobaron.
- `node scripts/run-complete-suite.mjs --group fast` aprobó 1.974 pruebas, con 0 fallos y 0 omitidas. `npm run test:complete -- --check` validó 545 entradas y 23 rutas de ejecución.
- `npm run docs:check` aprobó con 137 archivos y 831 enlaces. Las 11 pruebas del validador de enlaces y `git diff --check` aprobaron. El catálogo y el inventario de retiro se cotejaron contra los archivos y Git.
- Los recorridos nuevos cubren la muestra descrita. Las ramas de entrega, corrección, autorización, concurrencia, correo y persistencia que exceden esta muestra conservan su evidencia por candidato. No se repitieron todas las suites de integración, ensayos con Gemini real, carga o una evaluación WCAG completa. [Matriz y recibos](../verification/README.md)

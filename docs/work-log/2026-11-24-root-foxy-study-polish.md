# Pulido de Foxy AI y Mi Estudio

Coordinador /root, 2026-11-24, sesión sin identificador expuesto. Rama `claude/foxy-ai-mi-estudio-polish-99ba5c`, worktree propio, base `168ca1b7`. Alcance autorizado por el usuario: dejar funcionales las herramientas existentes de Foxy docente y Mi Estudio, mejorar la velocidad y la calidad de Gemini y aplicar el rediseño visual aprobado («Mesa de trabajo»). Sin autorización de commit, push, integración ni despliegue. Tablero: [odd/tasks/foxy-study-polish-2026-11.md](../../odd/tasks/foxy-study-polish-2026-11.md).

## Entorno

Instancia local propia en el worktree: web 3100, API 3101, base y servicios Docker propios, Gemini real (`gemini-3.8-flash`) con la clave de `.env` de raíz copiada por el usuario sin `DATABASE_URL`. Para poder correr esta instancia sin tocar la de `main`, `local:up` acepta `LOCAL_WEB_PORT`/`LOCAL_API_PORT` al crear el propietario y los guarda en `owner.json`; los propietarios previos siguen en 3000/3001. Cuentas y materiales sintéticos. Se usaron 13 generaciones reales de las ~40 autorizadas.

## Cambios

- **Opciones de quiz y práctica.** Gemini escribía la correcta siempre primera (5/5 en Foxy, 4/4 en Estudio). Las opciones se reordenan al generarse, de forma reproducible por contenido (`src/core/domain/choice-order.ts`), en Foxy (`arrangeFoxyQuizOptions`) y en Estudio (`parsePractice`). Lo ya guardado conserva su orden.
- **Visuales docentes deshabilitadas.** Si `AI_IMAGE_ENABLED`/`AI_DIAGRAM_ENABLED` están apagadas, el cliente no consulta `/visuals` (antes 404 → «No pudimos actualizar los recursos visuales» tras cada turno) y no ofrece «Imágenes y esquemas».
- **Herramientas de Estudio.** Borrador por herramienta; sin fuentes legibles el envío se bloquea con «Agregar material»; un pedido INSUFFICIENT ofrece agregar material y uno superado deja de ofrecer reintentar.
- **Pedido de quiz docente.** El mensaje muestra «Quiz · N preguntas» y el texto del docente, sin el prefijo interno.
- **Velocidad.** Pedidos con `tuning` opcional (`thinking`, `temperature`); los chats de Foxy y Estudio piden `thinkingLevel: LOW` a Gemini 3. El streaming pasó a ser opcional por llamada y el chat de Estudio publica su parcial en memoria (`GET /api/v1/study-folders/:id/chat-previews/:requestId`, revalida la carpeta propia). Foxy consulta el turno al segundo y cada segundo mientras corre.
- **Calidad.** Nueva versión `foxy-chat-v8`: el apunte presenta ejemplos inventados como hipotéticos («Imaginá que…») sin rótulos y sin énfasis anidado; V7 queda intacta para trabajos ya fijados. El lector de markdown admite cursiva dentro de negrita sin dejar asteriscos.
- **Rediseño «Mesa de trabajo».** `FoxyChatLayout` suma ranuras `aside` y `panel` (rejilla en ≥1100 px, hoja superpuesta debajo) y cabecera de una fila en teléfonos. Foxy: creaciones en panel lateral con barra de tiempos del plan, chips de herramientas con formulario en línea, espera por etapas reales, formato y cantidad del quiz accesibles. Estudio: riel con temas y dominio (sólo con prácticas finalizadas), materiales y próximo repaso; práctica y esquema en panel; chips; buscador y estado vacío de la colección; nombres accesibles en asistente y diálogos. Implementado por dos agentes sobre superficies separadas e integrado por el coordinador.

## Verificación

- Pruebas nuevas: `tests/choice-order`, `study-tool-drafts-ui`, `ai-text-tuning`, `study-chat-preview`, `foxy-workbench`, `study-workbench-ui`, `apps/web/src/features/foxy/conversations/foxy-request-display`, más casos agregados a `foxy-visual-controller`, `foxy-text-adapter` y `foxy-exact-resource`. Cada una se vio fallar por la causa esperada antes de implementarse.
- Ajustes intencionales de pruebas existentes: sondeo de Foxy 2 s → 1 s mientras corre; versión vigente `foxy-chat-v8`; texto de espera del chat de Estudio; lecturas del panel en lugar del reemplazo del chat; fixtures sin `diagramGeneration`.
- `npx tsc --noEmit -p apps/web` y `node scripts/build-api.mjs` sin errores. Barrido de 219 archivos de Foxy/Estudio/IA: las únicas fallas eran archivos de API que necesitan el runner de CI; por esa vía pasaron 25/25 y 14/14. Guardas de inventario (`audit-complete-suite`, `architecture-test-discovery`, `audit-ci-runner`) en verde.
- Gemini real, una observación por caso: chat de Estudio 9,4 s → 5,9 s (primer texto 5,4 s); chat de Foxy, primer texto a 3,6 s (antes 10,4 s hasta la respuesta; la nueva tuvo 160 palabras y terminó a 11,4 s); apunte v8 sin rótulos ni énfasis anidado. Las herramientas de recursos conservan el razonamiento por defecto: no se midió calidad con `LOW`.
- Navegador integrado sobre la instancia propia: panel del plan con barra de tiempos junto al chat a 1440 px; hoja a 375 px con foco devuelto al composer al cerrar; sin desborde horizontal; riel, chips y práctica en panel con devolución inmediata en Estudio.

## Límites y pendientes

- Las visuales de Foxy (imágenes/esquemas) no se probaron: están apagadas en este `.env`.
- Sin probar con Gemini real: entender un tema, apunte, ejercicios, simulacro, repaso e imagen de Estudio.
- El indicador de cuota IA sigue flotando sobre el espacio en teléfonos (marco general, fuera de alcance).
- Sin matriz Playwright completa ni suites con base de datos de Estudio.
- Primer paso pendiente: revisión del usuario y decisión sobre commit/integración.

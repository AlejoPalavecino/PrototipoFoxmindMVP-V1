# Foxy diagram renderer — implementación inicial

- Agente: /root/green_diagram; sesión runtime no disponible.
- Fecha: 2026-11-01; rama codex/foxy-ai; worktree foxmind-foxy-ai.
- Estado: GREEN; revisión independiente pendiente.
- Alcance: V-R0, renderizador determinista PNG de diagramas, sin proveedor, almacenamiento ni publicación.

## Cambios

- diagram-renderer.ts valida entrada y resultado, usa worker aislado y espera su terminación en abortos, errores y timeout.
- diagram-renderer-layout.ts construye SVG propio, escapa texto, dibuja nodos y conexiones y enumera relaciones completas; rechaza contenido que no cabe.
- diagram-renderer-entry.ts rasteriza mediante sharp con límites y timeout.
- Context7: documentación oficial sharp 0.35.5 consultada para límites de entrada y timeout.

## Verificación

- node --experimental-transform-types --test --test-reporter=dot apps/api/src/foxy-ai/foxy-diagram-renderer.test.mjs: 9 PASS.
- npm run api:build --silent: exit 0.
- npm run lint:boundaries --silent: exit 0.
- Una iteración de composición falló inicialmente AI_INPUT_LIMIT con etiqueta hostil válida; se ajustó alto del contenido y la suite final pasó.
- Se inspeccionó PNG sintético de ejemplo de fotosíntesis; revisión visual independiente y contraste de grafos complejos pendientes. No se probaron generación de IA ni publicación.

## Entrega

El coordinador debe solicitar revisión independiente y agregar los archivos al barrel solo tras su aceptación; no se modificaron pruebas.


## Corrección posterior a revisión
- Se sanitizan fallos de creación, envío y terminación del worker como SERVICE_UNAVAILABLE, manteniendo la espera de limpieza.
- El ajuste de etiquetas cuenta conservadoramente los codepoints de cada grafema sin dividirlo ni truncarlo; si no cabe, devuelve AI_INPUT_LIMIT.
- Verificación observada: 13 pruebas del renderer aprobadas; npm run api:build --silent y npm run lint:boundaries --silent aprobados. Pendiente revisión visual independiente del caso ZWJ y de grafos complejos.

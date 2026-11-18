# Apunte editable en Foxy docente

- **Agente:** `/root/apunte_docente`, escritor del corte de Foxy docente.
- **Inicio:** 2026-11-17, rama `feature/latencia-ia`, worktree principal, base `6e9c1312`, con cambios concurrentes.
- **Alcance autorizado:** reglas pedagógicas de `STUDY_MATERIAL`, revisión del camino privado de edición y pruebas sintéticas. El coordinador escribe el perfil compartido y el tablero.
- **Estado:** implementado y verificado con proveedor sintético. El coordinador reúne la evidencia del navegador.

## Resultado

- `STUDY_MATERIAL` bajo `foxy-chat-v3` pide lenguaje y profundidad adecuados al grupo, una relación central explicada, matices de la fuente, vocabulario propio y ejemplos pertinentes. Pide identificar ejemplos ilustrativos y mantener el pedido privado fuera del texto para estudiantes.
- El repositorio encola con la versión vigente, y cuando existe política persistida obtiene modelo y versión de la misma instantánea que guarda. El procesador conserva la instrucción original para `foxy-chat-v2`. Las otras finalidades usan la instrucción base.
- El contrato de texto, las fuentes autorizadas y el camino de edición se mantienen. Abrir el apunte listo materializa una creación privada. Guardar una edición actualiza esa creación y deja la respuesta original en el chat.

## Evidencia

Se usó Node con `--experimental-transform-types --experimental-test-module-mocks --test`.

- RED. `foxy-text-adapter.test.mjs` y `foxy-turn-preparation.test.mjs`, filtradas por `teacher notes|earlier teacher notes`. Dos fallos esperados. Faltaban la política de relación central y la aceptación de v3 en preparación. Una prueba pasó y preservó la instrucción de las otras finalidades.
- GREEN. 39 pruebas de adaptador, preparación, transmisión de Foxy y presupuesto de contexto. `foxy-text-adapter.test.mjs`, `foxy-turn-preparation.test.mjs`, `foxy-turn-stream.test.mjs` y `tests/ai-foxy-preflight-budget.test.mjs`.
- GREEN. 22 pruebas de `foxy-resource-service.test.mjs`, `foxy-text-worker.test.mjs` y `foxy-turn-service.test.mjs`. La integración nueva usa PostgreSQL descartable y el adaptador de Gemini con SDK simulado. Envía un apunte v2 por el servicio, actualiza el perfil activo y encola v3. El worker lee y procesa cada versión, conserva el pedido y aplica la política correspondiente. Guarda y reabre una edición, verifica que otro docente queda excluido y que hay cero publicaciones. La prueba de integración se repitió luego del último ajuste SQL y pasó. El primer intento encontró que al doble del catálogo le faltaban los métodos que enlaza el runtime y se ajustó el fixture.
- GREEN. 37 pruebas de `tests/ai-foxy-execution-snapshot.test.mjs`, `foxy-resource-workspace.test.mjs` y `foxy-workspace-start.test.mjs`, incluidos controles de edición, título y contenido, aislamiento de publicación y compatibilidad v2. `node scripts/check-boundaries.mjs` y `node scripts/check-frontend-architecture.mjs` pasaron. El primer control de arquitectura detectó el acceso de la capa de aplicación al módulo de ejecución IA. Se asignó al repositorio la responsabilidad de fijar la versión.

## Recorrido de QA

Usar un docente de prueba y un aula sintética con una fuente que vincule luz y exposición. Desde Foxy, elegir **Herramientas**, **Preparar un apunte**, completar **¿Qué te gustaría preparar?** y pulsar **Preparar propuesta**. En el caso de referencia, pedir una nota para segundo año que use «la luz que llega» y el ejemplo de abrir una cortina. Comprobar que el texto original aparece en el chat. Con **Abrir creación**, entrar a **Editar**, cambiar **Título** y **Contenido**, pulsar **Guardar cambios** y volver a abrir. Comprobar estado privado, edición persistida y texto original desde el chat. La edición puede probarse con salida sintética. Para evaluar fidelidad y voz, comparar salidas de v2 y v3 ante la misma fuente y consigna y revisar a ciegas términos, relaciones, ejemplos y afirmaciones sin sustento.

Este corte carece de evaluación de calidad con un proveedor real y con personas. Tampoco acredita accesibilidad del documento exportado. Sin commits.

## Ajuste de atribución docente

El coordinador observó en Ego un apunte que preservó la frase y el ejemplo solicitado, pero agregó la atribución «regla de oro que vimos en el taller» a un pedido que sólo decía «en clase». `foxy-chat-v4` ahora exige respaldo explícito para experiencias compartidas, etiquetas, hechos y citas que se atribuyan al docente o al grupo. Si falta ese respaldo, pide una formulación neutral. Los controles de V2 y V3 conservan exactamente su texto.

- RED. El filtro `teacher notes v4|preparation admits` falló en las dos pruebas por ausencia de las instrucciones v4 y rechazo del trabajo por la preparación.
- GREEN. 41 pruebas de adaptador, preparación y snapshots de ejecución. La nueva regresión comprueba la regla en conteo y generación, el pedido intacto y el hash SHA-256 de las instrucciones anteriores.
- GREEN. Dos pruebas de `foxy-resource-service.test.mjs` con PostgreSQL temporal. La integración realiza tres envíos con perfiles sucesivos, valida versión en metadata e instantánea, procesa V2/V3/V4 bajo el perfil activo V4 y vuelve a abrir el apunte V4 editado. Publicaciones registradas, cero.
- `node scripts/check-boundaries.mjs` y `git diff --check` pasaron. La repetición en Ego está a cargo del coordinador.

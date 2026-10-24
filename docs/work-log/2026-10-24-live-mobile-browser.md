# Capturas live de editor y revisión — PDF y Word

- Agent / role: /root/live_mobile_capture / test_runner
- Task ID: /root/live_mobile_capture; persisted by /root coordinator
- Date: 2026-10-24
- Branch / worktree: codex/classroom-gemini / classroom-gemini
- Starting commit: 1dc321e
- Feature: [classroom AI extraction](../../odd/tasks/classroom-ai-extraction.md), cierre visual móvil
- Status: completed

## Scope and observed result

Se utilizó exclusivamente Space3 existente, FoxMind mobile AI PDF DOCX 2026-10-24, con la aplicación en60061 y el buzón local57642. Cuenta y documentos sintéticos, proveedor Gemini real. Credencial interna del backend no leída. Nueva cuenta verificada por el buzón local; su contraseña permaneció únicamente en memoria. Sin recuperación/reset de contraseña ni cambios en políticas de sesión.

PDF y DOCX aprobaron seguridad y la extracción automática inicial produjo dos unidades/cuatro temas. Se cambió el nombre de una unidad y un tema, y se agregó un quinto tema. Cada formato se detuvo antes de aplicar para capturar el editor, y antes de crear para capturar la revisión. Diez PNG de editor y ocho de revisión por formato,375×812 y320×812. El tester inspeccionó todas las36; el coordinador inspeccionó imágenes representativas de cada estado y ancho antes de liberar la siguiente acción. [Índice de originales y manifiestos](evidence/2026-10-24-mobile-live/live-mobile-20261024-resume-1792856935167/README.md).

Tras aplicar explícitamente, revisar y tocar Crear aula, reload y detalle API200 conservaron exactamente los nombres, orden y dos unidades/cinco temas:

- PDF: aula aadd400c-7ad4-4288-84f8-21954cda721b, job 44a77349-b1db-4869-a177-0f07391ae170.
- Word: aula 025844be-2d27-4bb5-862e-11a8cadf3462, job 714cfedc-234e-410f-b4b2-0c2b554fc28f.

## Verification and limits

Ego CLI ejecutó los helpers de captura en una sesión persistente y se comprobó cada PNG con un proceso Node independiente. Geometría live en cada escena: ancho documento/body375 o320, altura812, touchPoints1; no overflow horizontal. Botones finales accesibles y sin solapamientos. La advertencia Word sobre imágenes omitidas es la limitación existente; párrafos y tabla aportaron las unidades/temas.

No se demostró defecto de producto y no se modificaron código, tests ni configuración. Hubo errores del driver, corregidos fuera del repositorio: targetId se obtuvo desde tabs(); el sondeo PNG se separó del runtime Electron; selector de portada se ajustó al DOM observado; callback de reload pasó argumentos explícitos. Este último fallo ocurrió después de crear PDF: se reanudó exclusivamente su lectura/persistencia, sin repetir extracción o creación. Los reingresos CLI conservaron la misma cuenta/cookies. Estos fallos no se presentan como fallos ni reparaciones del producto.

Prueba en Chromium con emulación táctil; no certifica dispositivo físico, Safari, teclado nativo ni amplía la aceptación a funciones IA futuras. Sin aprobación nativa, publicación remota o despliegue. Los estados históricos de capturas estáticas conservan su atribución; estas nuevas fotos son live antes de crear.

## Handoff

Evidencia archivada y cierres de persistencia observados. Coordinador debe reconciliar su registro, revisar integridad/enlaces, obtener revisión y realizar commits locales. No nuevas llamadas a Gemini necesarias para esta tarea.

## Observed driver commands

- ego-browser skill: exit0, installed guide2.1.0.
- ego-browser nodejs importing preflight.mjs: exit1, undefined targetId; preflight-02.mjs exit0 after mapping tabs; preflight-03.mjs exit0 with both capability captures before Google calls. Node image-probe.mjs preflight-375.png: exit0,375×812/nonblack.
- live-run.mjs: exit1, NodeRuntime disconnected when native sharp was imported. Image probing moved to an independent Node child.
- live-run-02.mjs/session46870: exit0 with caught selector error before upload. Registration/verification/login passed; no model request from that attempt.
- resume-main.mjs/session68829 consumed PDF gates and created/reloaded it, then caught a harness ReferenceError at persistence.
- resume-persist-main.mjs/session72566 resumed only PDF persistence and completed Word, with qa-result.json passed:true; four matched gates and both authenticated detail200 outcomes observed. Final process exit/handoff is recorded separately after it occurs.

Scripts live outside the repository under gemini-live-mobile-capture in the task visualization directory. Commands above report actual attempts, including historical driver failures; they do not imply that failed attempts passed.

Final browser handoff observed: resume-persist-main.mjs/session72566 exited0, FINAL_PASS true; handoff-result.json confirms Space3 handedOff, emulationCleared and touchDisabled. No browser operation followed handoff. Obsolete driver session68829 was canceled (expected exit1); runtime87655 and synthetic data remain intact. Requested window1280×900 was not remeasured after handoff.

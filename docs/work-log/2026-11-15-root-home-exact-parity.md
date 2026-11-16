# Corrección de Inicio y navegación contra la maqueta

- Coordinador: root; identidad runtime registrada no disponible. Implementador: astra_frontend_parity (Astra).
- Fecha: 2026-11-15. Rama: codex/foxmind-product-parity. Worktree: C:/Users/alejo/.codex/worktrees/foxmind-product-parity/ProtipoFoxMind. Base: ef6828b96084b0fcaf9a883e4afb95e0871cf1d6.
- Autorización: pedido actual de igualar Inicio/navbar de ambos roles y retirar de estas vistas los elementos ausentes en la maqueta. No autoriza publicación ni cambios de datos.
- Referencia: design/foxmind-ui-lab/01-foxmind.html en worktree foxmind-ui-lab, iteración 17; capturas comparativas aportadas por el usuario.
- Estado: DONE, verificado localmente. Tarea: TASK-016 en odd/tasks/foxmind-product-parity.md. La sesión comenzó el 15 y continuó después de medianoche del 16.

## Hallazgos y alcance

La revisión anterior no detectó el ancho excesivo en escritorio amplio ni los módulos sobrantes debajo del primer pliegue. La ausencia de overflow no acreditaba fidelidad visual. Se reabre esta superficie con comparación al mismo viewport, arriba y abajo, para docente y estudiante.

Corregir ancho máximo, distribución, dimensiones de filas/tarjetas y navbar. Retirar de Inicio borradores, devoluciones recientes, control de orden y acceso extra al próximo tema: la decisión vigente reemplaza la aceptación anterior que exigía este último. Conservar los destinos y capacidades dentro de las aulas, los datos reales y los estados de carga/error/vacío.

## Evidencia y pendientes

- Inspección: rama separada confirmada; trabajo anterior conservado. Sin commits ni publicación.
- Implementación Astra congelada: Home/navbar, consultas completas sin control extra de paginación, miniagenda mediante AgendaClient, callback local a Actividades sin ampliar HomeTarget ni destinos de autenticación.
- Proyección mínima adicional por astra_agenda_account_fidelity: authorName opcional validado, nombre público del autor ya visible en Muro, título real con fallback al cuerpo para publicaciones históricas. Sin cambiar filtros de autorización.
- Root ejecutó 40 pruebas focales iniciales, 23 recontroles y una última pasada de 41 pruebas PASS, cero fallos u omitidos. Los conteos se solapan; no son 104 pruebas únicas. Comando final: `node --test tests/home-query-author.test.mjs tests/home-daily-agenda.test.mjs tests/home-queue-complete.test.mjs tests/home-by-role.test.mjs tests/home-parity-navigation.test.mjs tests/brujula-home-complete.test.mjs tests/home-warm-navigation.test.mjs tests/ux-chat-polish.test.mjs tests/p9-home-client.test.mjs`.
- Ego Lite: ancho de Inicio 1200 a 1920, 1120.8 a 1440 e insets de 16 a 390, iguales a referencia; banner de 309.6 en escritorio. La referencia tiene una barra de demo de 38 px/64 px excluida del producto. Diferencias de altura por cantidad/longitud de contenido se distinguen del diseño; fixture aislado prueba 2 tarjetas/3 entregas/3 aulas/2 eventos.
- Datos de QA: consulta sintética de Marina Demo «Una duda sobre la exposición» creada en aula de prueba, id 9a313d23-3911-4147-948a-14c6ecd0ad4b. Docente recibe nombre público y Responder abre esa publicación. No se publicó respuesta ni se modificaron entregas/calificaciones.
- Ver actividades del aula abrió Actividades reales; menú móvil cerró con Escape devolviendo foco. Se detectó campana sin texto dentro del drawer y se corrigió antes del último build.
- Límites/fallos conservados: primera entrada a perfil encontró sesión vencida, se autenticó con cuenta sintética existente; un helper intentó cerrar menú tras cambio automático de viewport y obtuvo0 coincidencias, se reobservó el estado. Se interrumpió por el agente una prueba p6-mobile-navigation que inicia su propio navegador; no se cuenta como evidencia. No hay commits ni integración.
- Build definitivo `UGTf8RMd24BbwOkYdJufH`, `npm run local:status` READY en 3000/3001. `npm run lint:boundaries` inicialmente detectó tres imports de tipos entre features; se reemplazaron por el puerto propio HomeAgendaReader y el recontrol del coordinador pasó con cero excepciones congeladas. Astra reportó TypeScript PASS. No se suprimieron controles.
- Recaptura final de ambos roles en 1920/1440/390, arriba y abajo: sin overflow horizontal, controles fuera ni imágenes rotas. Controles adicionales del estudiante en 320/768/1000 sin desborde. Menú móvil de 272 px desde y=60, fila Notificaciones de 46 px con texto y contador real. Rail de 76 px, logo centrado, sin aulas rápidas ni contador visible; expansión y Escape/foco comprobados.
- Hover de tarjetas: desplazamiento de -3 px y transición de 180 ms, iguales a la referencia. Botones: 160 ms y mismo naranja RGB(183,71,16). Reduced motion desactiva la transición. No es una auditoría WCAG completa.
- Recorrido final: Continuar actividad abrió el borrador real de «Una foto, tres miradas»; Revisar Marina Demo abrió su corrección privada de «Mirar la luz · revisión visual». Sólo lectura, sin entregar ni guardar/publicar calificaciones. El primer helper buscó el nombre accesible incompleto «Revisar»; se reobservó el DOM y se usó «Revisar Marina Demo».
- Evidencia: [comparación](../verification/product-parity/home-exact/README.md), 54 artefactos y manifiesto con hashes de 27 fuentes focales y del HTML aprobado. Los hashes no atribuyen todos los cambios previos del worktree a esta corrección.
- Ego Lite quedó con producto y maqueta abiertos para el usuario. La próxima pantalla queda fuera de este corte. Sin commit, push, merge, despliegue ni generaciones IA de pago; la configuración Gemini local permanece disponible.
- Cierre documental: `npm run docs:check` PASS (159 archivos, 1000 enlaces, cero problemas); `python C:/Users/alejo/.codex/harness/bin/taskboard.py check odd/tasks/foxmind-product-parity.md` PASS (16 tareas); `git -c core.safecrlf=false diff --check` PASS. Servidor sintético propio de 53191 detenido tras cerrar su pestaña; producto 3000/3001 permanece READY y referencia 4173 disponible.

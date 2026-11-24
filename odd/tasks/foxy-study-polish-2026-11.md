# Feature: Pulido de Foxy AI (docente) y Mi Estudio (alumno)

- **Spec:** #especificacion
- **Design:** #diseno
- **Approval:** approved
- **Evidence mode:** candidate-v1
- **Trace mode:** requirements-v1

Alcance y ejecución autorizados por el usuario el 2026-11-24; la dirección visual sólo se aprueba en TASK-002 y TASK-006 depende de ella. Rama `claude/foxy-ai-mi-estudio-polish-99ba5c`, base `168ca1b7`. Coordinador único escritor de este tablero. Sin autorización de commit, push, integración ni despliegue.

## Decisiones del usuario (2026-11-24)

- Instancia local propia en el worktree con Gemini real (web 3100, API 3101, base y servicios propios).
- Hasta ~40 generaciones reales para auditar y medir antes/después.
- Sólo las herramientas existentes; no se agregan herramientas nuevas.
- Rediseño visual profundo de ambas secciones, aprobado primero en una maqueta.

## Especificacion

- **REQ-001:** Cada herramienta existente de Foxy docente (apunte, actividad TP/quiz, planificación, rúbrica, imágenes y esquemas) y de Mi Estudio (chat, entender un tema, apunte, esquema, práctica, ejercicios, simulacro, repaso, imagen) produce su creación o un estado accionable y coherente con la configuración, sin errores espurios.
- **REQ-002:** Las preguntas de opción única no revelan la respuesta por su posición.
- **REQ-003:** La espera percibida baja: el texto aparece de forma progresiva donde sea posible y se eliminan esperas evitables del circuito.
- **REQ-004:** La calidad pedagógica y la presentación de los resultados mejoran sin artefactos de formato.
- **REQ-005:** Ambas secciones adoptan el rediseño aprobado, con estados, teclado, accesibilidad y responsive verificados.

## Auditoría con Gemini real (línea base)

Instancia propia, contexto general docente y carpeta vinculada a «Fotografía y luz». Tiempo desde el envío hasta ver la creación o respuesta final en el navegador; una observación por caso.

| Caso | Tiempo | Observación |
| --- | --- | --- |
| Foxy · apunte | 19,2 s | Buen contenido; asteriscos crudos en cursiva con dos puntos; etiqueta «(ejemplo ilustrativo)» |
| Foxy · quiz 5 preguntas | 35,7 s | Correcta en posición 1 en 5/5 |
| Foxy · planificación 40 min | 27,8 s | Muy buena |
| Foxy · rúbrica 3 niveles | 25,3 s | Buena; matriz estrecha en modal |
| Foxy · chat breve | 10,4 s | 96 palabras, con texto progresivo |
| Estudio · práctica 5 preguntas | 35,8 s | Correcta en posición 1 en 4/4 leídas |
| Estudio · chat breve | 9,4 s | ~30 palabras, sin texto progresivo |
| Estudio · esquema | 25,2 s | Funciona; recorrido lineal |

Defectos observados:

- D1: Correcta siempre primera en quiz de Foxy y práctica de Estudio; no hay mezcla en ningún punto del código.
- D2: Visuales docentes deshabilitadas en `.env` (`AI_IMAGE_ENABLED`/`AI_DIAGRAM_ENABLED`) → `GET …/visuals` 404 → «No pudimos actualizar los recursos visuales» tras cualquier turno; la herramienta «Imágenes y esquemas» se ofrece igual.
- D3: El borrador del diálogo de herramientas de Estudio es único (`study-workspace.tsx` `toolBrief`) y sólo se limpia tras éxito; tras un fallo se filtra a otra herramienta.
- D4: Estudio permite enviar herramientas que exigen material con 0 fuentes; el aviso ofrece «Reintentar» (falla igual) en lugar de agregar material; el aviso viejo queda con Reintentar activo tras el éxito.
- D5: El chat docente muestra el prefijo interno «Prepará un quiz interactivo de N preguntas.» dentro del mensaje.
- D6: Accesibilidad: radios/checkboxes anunciados «on» (formato, temas, portadas), botones sin nombre (contexto, pasos), «Abrir quiz»/«Explorar esquema» no son botones.
- D7: Móvil: cabecera del espacio en dos filas grandes; indicador de IA flotando fuera del espacio.

## Diseno

Propuesta «Mesa de trabajo» (pendiente de aprobación): tres zonas — conversaciones/creaciones (docente) o temas con dominio y materiales (alumno); chat central con texto progresivo y herramientas como chips sobre el composer con formulario en línea; panel derecho con la creación abierta (leer/editar, práctica con devolución inmediata) en lugar de modales. Espera por etapas reales. Móvil: cabecera de una fila y hojas inferiores. Se conservan colores y tipografía Brújula.

## Tasks

### TASK-001 — Auditoría y línea base con Gemini real
- **State:** DONE
- **Depends on:** none
- **Owner:** coordinador
- **Requirements:** REQ-001, REQ-003, REQ-004
- **Verification:** recorrido en navegador integrado contra la instancia propia
- **Acceptance:** Cada herramienta principal de ambos roles recorrida al menos una vez con tiempos y defectos registrados.
- **Scope:** ["scripts/local-app.mjs", "scripts/local-app-supervisor.mjs", "scripts/local-app-environment.mjs", "tests/local-app-environment.test.mjs"]
- **Evidence:** {"command": "recorrido manual en navegador integrado contra http://127.0.0.1:3100 con Gemini real (9 generaciones)", "result": "tabla y defectos D1–D7 de esta sección; sin probar: visuales docentes (deshabilitadas), entender un tema, apunte, ejercicios, simulacro, repaso e imagen de Estudio", "candidate": "sha256:cb827d94e617d705850a403734f82519afc39d67ed5a16324124e3d22e06f9b1"}
- **Blocker:** none

### TASK-002 — Maqueta del rediseño para aprobación
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** coordinador
- **Requirements:** REQ-005
- **Verification:** aprobación explícita del usuario
- **Acceptance:** El usuario aprueba o corrige la dirección visual y de interacción de ambas secciones.
- **Scope:** ["docs/work-log/2026-11-24-root-foxy-study-polish.md"]
- **Evidence:** {"command": "aprobación del usuario en el chat: «Aprobada, implementá»", "result": "lienzo de 4 pantallas aprobado; registro en docs/work-log/2026-11-24-root-foxy-study-polish.md", "candidate": "sha256:b44958ffc87047e4da6b999fd00252f5b33c202a5f0c4fc55e0edab22abb8ab4"}
- **Blocker:** none

### TASK-003 — Corregir defectos funcionales D1–D6
- **State:** VERIFYING
- **Depends on:** TASK-001
- **Owner:** coordinador
- **Requirements:** REQ-001, REQ-002
- **Verification:** pruebas focalizadas RED/GREEN por defecto y recorrido en navegador
- **Acceptance:** Por defecto: posición de la correcta variable y estable por creación; sin error visual cuando las visuales están deshabilitadas y herramienta oculta; borrador por herramienta; herramientas con material obligatorio no envían sin fuentes y ofrecen agregar material; mensaje docente sin prefijo interno; controles con nombre accesible.
- **Scope:** ["apps/web/src/features/foxy", "apps/web/src/features/study", "apps/api/src/modules/foxy", "apps/api/src/modules/study", "src/core/domain"]
- **Evidence:** Pruebas RED→GREEN: tests/choice-order (3), study-tool-drafts-ui (4), foxy-request-display (1), foxy-visual-controller (+1). En la app: sin error de visuales y sin herramienta de imágenes con visuales apagadas; pedido de quiz con etiqueta. Falta revisión del usuario.
- **Blocker:** none

### TASK-004 — Velocidad percibida
- **State:** VERIFYING
- **Depends on:** TASK-001
- **Owner:** coordinador
- **Requirements:** REQ-003
- **Verification:** pruebas de transporte/controlador y medición antes/después con Gemini real
- **Acceptance:** Chat de Estudio con texto progresivo; menor espera hasta el primer texto en Foxy; tiempos comparados con la línea base.
- **Scope:** ["apps/api/src/platform/ai", "apps/api/src/modules/study", "apps/api/src/modules/foxy", "apps/web/src/features"]
- **Evidence:** tests/ai-text-tuning (3), study-chat-preview (3), sondeo Foxy 1 s; Gemini real: chat Estudio 9,4→5,9 s, primer texto Foxy 3,6 s (una observación por caso).
- **Blocker:** none

### TASK-005 — Calidad de las generaciones
- **State:** VERIFYING
- **Depends on:** TASK-001
- **Owner:** coordinador
- **Requirements:** REQ-004
- **Verification:** pruebas de prompt y comparación con Gemini real
- **Acceptance:** Sin artefactos de formato ni etiquetas internas en el contenido; instrucciones coherentes por herramienta.
- **Scope:** ["apps/api/src/modules/foxy/turns/infrastructure/providers", "src/core/domain/study"]
- **Evidence:** foxy-chat-v8 con foxy-text-adapter (+1), ai-generation-snapshots, foxy-exact-resource (+1); apunte real v8 sin rótulos ni énfasis anidado.
- **Blocker:** none

### TASK-006 — Implementar el rediseño aprobado
- **State:** VERIFYING
- **Depends on:** TASK-002
- **Owner:** coordinador
- **Requirements:** REQ-005
- **Verification:** pruebas de vistas y recorrido en navegador escritorio/móvil
- **Acceptance:** Según maqueta aprobada.
- **Scope:** ["apps/web/src/features/foxy", "apps/web/src/features/study", "apps/shared-ui"]
- **Evidence:** tests/foxy-workbench (11), study-workbench-ui (6); tsc web OK; navegador 1440/375 px: panel, chips, riel, práctica en panel con devolución inmediata, foco devuelto al cerrar, sin desborde.
- **Blocker:** none

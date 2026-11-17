# Validación E2E de Foxy AI y Carpetas de estudio

**12 de noviembre de 2026 · `main`, base `734845b` y cambios locales de acceso a recursos y creación de carpetas.** Prueba del candidato local por el coordinador, con cuentas, aula, PDF y DOCX de prueba. Chromium mediante Playwright, web y API compiladas, Postgres, almacenamiento de archivos, escáner y correo de prueba. IA sintética. Los adaptadores de Gemini se comprobaron con respuestas simuladas.

La espera del procesador de texto se corrigió y se volvió a comprobar localmente. Los tiempos de la auditoría original se conservan como referencia. [Reprueba de dos chats simultáneos](../work-log/2026-11-12-root-foxy-turn-dispatch.md).

El acceso a Imágenes y esquemas desde un chat nuevo se corrigió en una entrega posterior. [Registro de generación y acceso](../work-log/2026-11-12-root-foxy-visual-new-chat.md).

La apertura de DOCX en Carpetas de estudio ahora muestra una vista previa de texto. [Registro de apertura y descarga](../work-log/2026-11-12-root-study-docx-preview.md).

Agregar a Agenda, quitar material y eliminar carpeta ahora usan diálogos de FoxMind. [Registro de confirmación y cancelación](../work-log/2026-11-12-root-study-confirmations.md).

## Hallazgos de la corrida inicial y correcciones publicadas

Los cuatro hallazgos de la tabla se corrigieron y se publicaron en main. Las reproducciones y tiempos corresponden a la corrida inicial. [Publicación](../work-log/2026-11-12-root-foxy-study-publication.md)

| Prioridad original | Reproducción y resultado inicial | Criterio aplicado |
|---|---|---|
| Alta · espera docente | En Foxy, enviar una consulta general y luego crear un apunte en un chat nuevo. En la repetición el chat tardó **19,0 s** y el apunte **29,3 s** hasta mostrar el recurso, con proveedor sintético. Con dos apuntes enviados casi al mismo tiempo, los recursos estuvieron listos en **15,0 s y 45,2 s**. Cada chat mostró como máximo un indicador de espera y persistió un solo turno. En la corrida inicial, un adjunto seguía en cola al cabo de 30 s. El worker textual revisa la cola cada 30 s y toma un turno por ciclo. [Worker](../../apps/api/src/modules/foxy/infrastructure/worker.ts) | Reducir el tiempo hasta iniciar el procesamiento y comprobar dos solicitudes próximas, con una sola respuesta y un solo indicador por solicitud. Mantener concurrencia, privacidad y recuperación. |
| Media · descubrimiento de imágenes | Entrar a Foxy → Nuevo chat → Herramientas. Aparece **Crear esquema** y se puede generar un diagrama. **Imágenes y esquemas** aparece recién cuando hay una conversación activa. Se reprodujo a 390 px. [Selector de herramientas](../../apps/web/src/features/foxy/workspace/foxy-workspace.tsx) | Permitir iniciar una imagen desde el chat vacío y conservar acceso al esquema, vista previa y descarga. |
| Media · apertura de DOCX | En Carpetas → Materiales y Plan → fila de un DOCX → **Abrir archivo**, el navegador descarga el original. **Descargar** también baja el archivo. El diálogo informa la limitación y la descarga funciona. El PDF sí abre en una pestaña. [Materiales](../../apps/web/src/features/study/ui/study-materials.tsx) | Alinear el texto de la acción con lo que ocurre, o agregar una vista previa si se quiere leer el DOCX dentro de FoxMind. |
| Baja · diálogos del navegador | Confirmar Agenda, quitar material o eliminar carpeta abre una confirmación nativa. Se pudieron aceptar y cancelar las acciones probadas. La confirmación cambia de estilo según el navegador. [Agenda](../../apps/web/src/features/study/practice/study-practice.tsx) · [Carpeta](../../apps/web/src/features/study/ui/study-workspace.tsx) | Usar el diálogo de FoxMind para esas confirmaciones, con foco, Escape y una acción principal clara. |

## Cobertura por flujo

**Navegador** acredita que se usaron controles de la app y se verificó la respuesta observada. **Integración** acredita contratos o persistencia en pruebas HTTP/DB con datos aislados. Los tiempos describen la ejecución local, con el proveedor sintético y el proceso de cola real.

| Área | Resultado y evidencia |
|---|---|
| Foxy · conversación, nuevo chat y contexto | Navegador. Consulta general, apunte en un chat nuevo, turno único en estado `READY` y vuelta al chat. La medición de dos chats simultáneos verificó un indicador como máximo por chat y un solo turno persistido por envío. Cambiar a aula, elegir tema y cargar plan funcionaron. En docente se renombró, filtró y reabrió una conversación. En estudiante se filtró y reabrió un chat anterior. |
| Foxy · herramientas textuales | Navegador. Apunte, planificación, actividad y rúbrica llegaron a `READY`. Se abrió el contenido y se descargó Word para el apunte. Actividad y rúbrica se convirtieron en borradores desde Foxy con confirmación explícita. Integración verificó su privacidad, atomicidad y repetición sin duplicados. |
| Adjuntos y citas de ambos roles | Navegador. PDF y DOCX validados y usados como fuente. Se rechazó un archivo malformado y se denegaron lecturas cruzadas por conversación y rol. En Estudio, guardar una copia en la carpeta y quitar el adjunto del chat conservó esa copia. La cita docente del adjunto mostró nombre y página como texto. La lectura autorizada de citas de aula se comprobó por integración. |
| Foxy · imágenes y esquemas | Navegador. Imagen y esquema generados, vistos en Creaciones y descargados como PNG. La imagen abrió en una pestaña a 320 px. La cuenta del otro rol recibió rechazo al solicitar el archivo privado. La imagen preparada se mantuvo privada hasta revisar y publicar, y apareció en Biblioteca en el navegador del estudiante. Integración verificó generación, almacenamiento, escaneo y publicación de PNG, JPEG y diagrama, con revisión previa, privacidad e idempotencia. |
| Foxy · Compartir texto | Navegador y API. Se editó el apunte, se abrió su versión guardada y se preparó un PDF privado. Antes de confirmar, el estudiante no podía acceder a la vista previa ni veía el material en Biblioteca. Después de marcar la revisión y publicar, el título apareció en Biblioteca para el estudiante inscripto. |
| Carpetas · creación | Navegador. Creación manual, guardado y recuperación del borrador, carga y validación del plan, propuesta con IA, revisión y persistencia de unidades. El fallo simulado de IA dejó disponible el camino manual. Se compararon ocho pares de pantallas con Crear aula y el cierre a 320 px, con acciones visibles y sin desborde horizontal. |
| Carpetas · chat y creaciones | Navegador. Consulta de carpeta, selección de tema y nuevo chat. Se generaron apunte, esquema, quiz, ejercicios y simulacro desde Herramientas. Se guardó y volvió a abrir un apunte editado, filtrando por título y tipo. Apertura y descarga de los cinco desde Creaciones. Se comprobaron Word y TXT, incluidos TXT sin respuestas ni devoluciones. |
| Carpetas · práctica | Navegador. Quiz, ejercicios y simulacro con respuestas simples, múltiples y de desarrollo. Autoguardado, recarga, finalización, devolución orientativa y nuevo intento vacío. El intento anterior conservó sus respuestas. |
| Carpetas · materiales, plan y ciclo de vida | Navegador y API. Carga DOCX, edición de título y tema, filtros de origen y quitar material. Abrir y descargar el plan PDF, descargar material DOCX y enviar un tema al chat desde el plan. Al vincular un aula, el material publicado apareció con el filtro Aula vinculada. Al desvincularla, desapareció de las fuentes. Archivar bloqueó chat, generación y edición. Reactivar devolvió acceso de edición. La eliminación se canceló primero y luego se confirmó, con rechazo posterior al leer la carpeta. Una cuenta ajena recibió 403. |
| Carpetas · examen y Agenda | Navegador. Propuesta, ajuste del aviso a 15 minutos, guardado, confirmación y acceso a Agenda. Se leyó el evento por ID en la API de Agenda y se comprobó que quedó configurado el aviso de 15 minutos. Integración comprobó persistencia, revisiones, idempotencia y cancelación de avisos. |

## Pasos observados para abrir y descargar

Los pasos se cuentan desde el espacio de trabajo, sin incluir inicio de sesión ni entrada a la carpeta.

| Recurso | Recorrido | Pasos |
|---|---|---:|
| Creación de texto docente o estudiante | Creaciones → abrir recurso → Descargar Word | 3 |
| Práctica del estudiante | Creaciones → abrir práctica → Descargar consignas | 3 |
| Imagen del docente | Creaciones → abrir recurso → Abrir en grande o Descargar imagen | 3 |
| Plan PDF | Materiales y Plan → Plan de estudio → Abrir plan o Descargar plan | 3 |
| Material propio | Materiales y Plan → expandir fila → Abrir archivo o Descargar | 3 |

En un recurso textual o visual, **Compartir** quedó detrás de un control independiente. Las creaciones privadas del estudiante no mostraron esa acción.

## Suites, ejecución y límites

| Comprobación | Resultado |
|---|---:|
| `npm run web:build` y `npm run api:build` | Ambos pasaron |
| `node scripts/run-ci-suite.mjs --suite study` | 73 aprobadas |
| Foxy · integración HTTP, custodia de archivos, publicaciones visuales y borrador de actividad | 19 aprobadas |
| Foxy · pruebas web de pantallas, estado y navegación | 324 aprobadas |
| Adaptadores · Gemini simulado para texto, imagen y diagrama de Foxy, y herramientas de Estudio | 30 aprobadas |

La primera puesta en marcha se detuvo por readiness del escáner. En los primeros recorridos simultáneos, el límite de identidad respondió 429. Para repetir la batería se ampliaron exclusivamente los límites de identidad y de login del servidor efímero. El resultado mide los flujos funcionales, sin inferir capacidad de tráfico real. Los errores de selectores o de preparación de escenarios se conservaron en los logs y se distinguen de hallazgos del producto. Los entornos aislados se cerraron con cero fallos de limpieza registrados.

Los guiones, recibos JSON, capturas sintéticas y logs quedaron en `.test-artifacts/foxy-study-e2e-20261112/`, ignorado por Git. Los principales son `creation-browser/results.json`, `resource-browser/browser-results.json`, `resource-open.log`, `attachments-browser/geometry.json`, `study-workspace/results.json`, `study-materials-final/results.json`, `study-agenda-confirmed/results.json`, `teacher-workspace/results.json`, `teacher-visual-publication/results.json`, `teacher-history/results.json`, `queue-timing/results.json` y los cuatro logs de suites. Los resultados de reintentos y las limitaciones de cada caso se leen en conjunto con los logs. Se comprobaron 26 estados de chat y diálogos en 320, 390, 768 y 1440 px, sin desborde horizontal ni controles solapados en los estados medidos. Se verificó retorno de foco en controles del historial y de apertura de recursos. Quedaron fuera Gemini real, entrega de avisos a su hora desde navegador y pruebas en dispositivos físicos o lectores de pantalla. La investigación de esperas no incluye carga de producción.

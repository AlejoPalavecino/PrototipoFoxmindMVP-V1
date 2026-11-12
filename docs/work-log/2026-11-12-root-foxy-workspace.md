# Implementación de Foxy y Estudio

Continuación autorizada sobre 5a9c45c: completar custodia privada del original en el chat y copia estudiantil opt-in. El usuario observó una brecha visual con la maqueta. Se reabre la fidelidad de la interfaz y se conserva el trabajo anterior.

- Coordinación: root, sesión no expuesta. Fecha: 2026-11-12.
- Base: main, f73c923, tres commits locales por delante de origin/main. Se preservan las maquetas y cambios documentales existentes.
- Autorización: implementar en FoxMind para ambos roles el diseño de las maquetas y comprobar alineación, solapamientos y recortes. Adjuntos privados del chat. Copia en carpeta estudiantil sólo por elección explícita.
- Estado inicial: inspección de componentes, contratos de archivos y entradas de ambos roles. QA con datos sintéticos aislados.

## Primera etapa: implementación y evidencia local

- Marco compartido para chat, herramientas, creaciones, historial y modo ampliado. Avatar desde el perfil de la sesión. Contexto docente con búsqueda, selección y aplicación. Estados de envío, cola, preparación y demora. Materiales y Plan estudiantil con carga propia, búsqueda, procedencia, disponibilidad, edición y consulta por tema.
- Candidato final sobre 5a9c45c, que apareció en main durante la sesión como actualización documental concurrente. Se preservaron los cambios del árbol.
- Build de web y API correctos. 43 pruebas focalizadas de Foxy, seguimiento de chat y política de cargas verdes. lint:boundaries y git diff --check correctos. Se actualizaron recorridos de pruebas existentes para interactuar con las nuevas pestañas y el selector.
- Ego Lite abrió Foxy en la app real y devolvió el árbol accesible. La ventana minimizada impidió capturas. Se finalizó el espacio 11 y se completó QA visual con Chromium de Playwright del repo. Datos, PostgreSQL, almacenamiento, escáner y correo aislados mediante scripts/study-preview.mjs. Proveedores sintéticos.
- 19 estados medidos en 320×640, 390×844, 768×1024 y 1440×1000. Sin superposiciones de controles visibles ni desborde horizontal en esos escenarios. Compositor visible en las cuatro resoluciones por rol. Escape cierra historial y devuelve foco. Se recorrieron vistas de herramientas y creaciones, selector docente, envío y respuesta en ambos roles, carga de DOCX y persistencia consultada por API, plan y borrador por tema. Siete capturas finales inspeccionadas e incorporadas al catálogo con dimensiones y hashes.
- Hallazgos corregidos: controles móviles que partían palabras o se solapaban, filtros recortados, cierre estrecho, compositor fuera del primer pantallazo y encabezado de Materiales al desplazar. A 320×640 el chat normal ofrece unos 104–108 px de mensajes, con Ampliar chat disponible. Se validaron tamaños de navegador, sin teclado virtual o lector de pantalla. El script y las mediciones quedan en .test-artifacts/foxy-refresh.
- Adjuntos privados por conversación pendientes. La evidencia de carga corresponde a materiales de la carpeta estudiantil. No se agregó el transporte, la custodia ni la incorporación de adjuntos del chat al contexto. El lector actual envía PDF como documento y extrae texto de DOCX. Queda a decisión del usuario conservar los originales en custodia privada o introducir extracción local de PDF. Se mantiene el opt-in confirmado de guardado en carpeta.
- Estado: interfaz y Materiales/Plan verificados localmente. Entorno sintético detenido mediante su archivo stop. Sin commit, publicación ni despliegue propios de esta entrega.

## Cierre de adjuntos y fidelidad visual

- Alcance confirmado: ambos roles adjuntan PDF/DOCX al chat y el estudiante puede guardar en la carpeta por elección explícita. Se agregó custodia privada del original, validación y escaneo, verificación de digest al leer y revalidación antes del uso. Quitar del chat no elimina una copia confirmada. El contexto para trabajos docentes de imagen o diagrama queda fuera de esta ampliación.
- Revisión independiente de `attachment_review` sobre autoridad, conservación y reintentos. Se corrigieron colisión entre quitar y reintentar, validaciones al contar tokens y antes de generar, capacidad de materiales, y reenvío por historial o duplicación de una copia. La prueba de custodia verifica PostgreSQL y usa un doble de almacenamiento. El recorrido web usa PostgreSQL, S3 compatible y ClamAV aislados.
- `npm run api:build`, `npm run web:build` y `npm run lint:boundaries` verdes. Pruebas focalizadas con `scripts/register-api-test-build.mjs`: 164 verdes, incluida la política de adjuntos. Prueba de custodia verde por separado. Inventario de CI válido: 545 entradas y 53 exclusiones. No se ejecutó CI completo.
- Chromium recorrió ambos roles con `node scripts/study-preview.mjs` y `.test-artifacts/foxy-refresh/qa.mjs`. Verificó archivos recibidos por los proveedores sintéticos, permisos entre roles y chats, rechazo estructural, guardado opt-in, quitar conservando copia, conversación nueva sin adjuntos privados, materiales/plan y un apunte generado y abierto. Un intento agotó la espera de 30 segundos en el chat docente; la pasada final inició un chat nuevo de forma explícita y completó el recorrido. No se usó Gemini ni datos productivos.
- Comparación lado a lado de las maquetas con chat docente, Herramientas y Materiales de la app. Se ajustaron encabezados, tarjetas, espacio de lectura, contraste del selector de archivos y controles móviles. Las 25 mediciones finales (320×640, 390×844, 768×1024 y 1440×1000) no detectaron controles visibles superpuestos ni desborde horizontal. En el escenario con adjuntos a 320 px quedaron 70–73 px de mensajes y el compositor en una fila; Ampliar chat permite recuperar altura. No se comprobó teclado virtual ni lector de pantalla. Diez capturas inspeccionadas se conservan con hashes en el catálogo. Comparativas y mediciones en `.test-artifacts/foxy-refresh`.
- Estado final: verificado en el entorno local aislado; limpieza propia sin fallos. Tablero TTP (cinco tareas), `npm run docs:check` (127 archivos, 1070 enlaces) y `git diff --check` correctos. Sin commit, publicación ni despliegue de esta entrega.

## Corrección local del panel visual

- El usuario señaló que «Imágenes y esquemas» no debe aparecer debajo del chat docente. Corrección acotada sobre la versión local de main (`5a9c45c`). El acceso a trabajos y recursos visuales pasa a una apertura explícita.
- El formulario y la preparación para Biblioteca abren en un diálogo desde Herramientas, al solicitar un esquema desde el chat o al abrir un visual de Creaciones. La prueba de regresión falló con el panel anterior montado y pasó después de la corrección.
- 53 pruebas focalizadas, lint, comprobación documental y `git diff --check` correctos. `npm run local:restart` recompiló API/web y dejó el entorno listo en 3000/3001. Chromium en una sesión separada confirmó a 1440 y 390 px que el formulario no aparece en Chat, abre desde Herramientas y cierra sin desborde horizontal. Se verificó la navegación sin solicitar una generación real.

- Ajuste posterior solicitado: mover el acceso «Imágenes y esquemas» a la misma cuadrícula de tarjetas de Herramientas.
- 13 pruebas focalizadas y controles de lint y documentación correctos. Tras reiniciar el entorno local, Chromium confirmó seis tarjetas del mismo ancho a 1440 y 390 px, apertura del diálogo desde la tarjeta y retorno a Herramientas al cerrar.

## Entrega autorizada a main

- Base local y remota `5a9c45c`. El usuario autorizó los commits y el push de Foxy AI y Carpetas de estudio. Unidades: custodia, autorización y contexto (`be70338`); interfaz docente y componentes compartidos (`2b1488c`); chat y materiales de estudio (`9804dcc`); maquetas y evidencia en la unidad documental.
- Verificación de la entrega: builds API/web, lint, inventario, documentación y tablero correctos. Pasaron 322 pruebas web, 83 de contexto y ejecución de Foxy, 71 de la suite `study`, 3 de política y custodia de adjuntos y 15 del contrato de CI. `node scripts/study-preview.mjs` con el recorrido Chromium de QA comprobó 26 estados y la apertura y cierre desde la tarjeta visual. Capturas docentes renovadas y limpieza del entorno de prueba sin fallos. La instancia persistente quedó detenida.
- Para revertir la presentación, revertir primero la interfaz estudiantil y luego la docente, que aporta componentes compartidos. La unidad de API contiene una migración aditiva de custodia y la autorización de adjuntos. Si ya se aplicó, cualquier reversión de datos debe conservar los objetos privados y seguir una migración de compensación revisada.

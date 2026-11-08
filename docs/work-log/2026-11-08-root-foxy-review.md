# Revisión y propuesta de Foxy docente

- Agente: root, orquestador. Identificador de sesión no expuesto; no se inventa.
- Fecha: 2026-11-08. Rama/worktree: main, repositorio principal. Commit inicial: cee57f4 (abreviado observado).
- Árbol inicial: limpio.
- Pedido vigente: revisar chat/contexto y cinco herramientas, vinculación a aulas; mejorar conversaciones, renombrado, filtro por contexto y selector Herramientas/Creaciones preservando Brújula.
- Ruta: R2. Revisión autorizada; dirección UX y decisiones de vinculación se presentan para aprobación explícita antes de implementación sustancial conforme a AGENTS.md.
- Límites: recursos locales nuevos y cuentas sintéticas; sin proveedores pagos, secretos/datos retenidos, commits, push o despliegue en este trabajo.

## Trabajo y evidencia

- Lectura: base vigente, arquitectura, guía IA/Foxy, diseño, política documental, desarrollo local; componentes y controladores de Foxy.
- Hecho de código: `renameConversation` existe en cliente/API/repositorio con control de revisión; no aparece en el workspace docente.
- Hecho de código: historial presenta tres conversaciones y diálogo para el resto; sin búsqueda o filtro de contexto.
- Hecho de código: NOTE/PLAN/RUBRIC generan texto; DIAGRAM usa trabajos visuales; traspaso a actividad requiere recurso y revisión explícita.
- Error de exploración: se intentó leer `docs/architecture.md` y `foxy-page.tsx`, rutas inexistentes; se corrigió a las rutas canónicas. Una búsqueda con expansión Bash falló en PowerShell; no alteró archivos.

## Verificación del candidato inicial

- `node scripts/build-api.mjs`: PASS, Prisma y TypeScript, salida 0.
- `npm run web:build`: PASS, salida 0. Advertencia de Next sobre lockfile externo al repositorio; no se modificó configuración por esa advertencia.
- Pruebas web: `node --import ./scripts/register-api-test-build.mjs --experimental-transform-types --experimental-test-module-mocks --disable-warning=ExperimentalWarning --test --test-reporter=dot --test-concurrency=1 apps/web/src/lib/foxy*.test.mjs apps/web/src/lib/use-foxy*.test.mjs apps/web/src/components/foxy*.test.mjs`: PASS, salida 0. El reporter dot no imprimió total; no se inventa cifra.
- Mismo runner con reporter spec para `foxy-conversation-service`, `foxy-conversation-repository`, `foxy-resource-service`, `foxy-context-catalog` y `foxy-application-text`: 18 pruebas PASS, 0 fallidas/omitidas.
- Mismo runner para `foxy-context-sources.test.mjs`: 8 pruebas PASS, 0 fallidas/omitidas. Incluye aislamiento SQL, paginación, metadatos y fuentes sin contenido.
- Entorno: `node scripts/documentation-preview.mjs`; API/web/PostgreSQL/storage/scanner/Mailpit nuevos, dos identidades sintéticas. Overrides sintéticos explícitos; ninguna llamada a proveedor real. Recursos detenidos mediante stopFile propio al terminar.
- Ego Lite: un único TaskSpace (4), cerrado con `finish({keep:[]})`. Chat general; apunte → recurso → PDF → revisión → publicación confirmada en Biblioteca; conversación de aula; selección de tema y carga del catálogo Plan; planificación; rúbrica → transcripción manual de criterio y contenido revisado → TP privado; propuesta de actividad; esquema → Listo → preparación → revisión → publicación confirmada en Biblioteca. Recarga recuperó conversación y respuestas.
- Recibo HTTP de consulta: CHAT/STUDY_MATERIAL en GENERAL; LESSON_PLAN/RUBRIC/ACTIVITY_IDEAS en CLASSROOM, todos READY; DIAGRAM READY. El recibo no conserva contenido ni credenciales.
- Escritorio observado: 1536 px. Móvil: 390 × 844, ancho de documento 390 (sin desbordamiento horizontal en ese estado). No se afirma auditoría WCAG, teclado o tablet completa.
- Artefactos locales ignorados: `.test-artifacts/foxy-review-20261108/receipts.json`, `chat-desktop.png`, `chat-mobile.png` y rondas reproducibles. Estos artefactos son temporales, no referencias canónicas de un diseño implementado.
- Fallos del recorrido automatizado: refs que quedaron obsoletas al actualizar DOM, checkbox ambiguo y espera de textos que no coincidían con la UI (`Publicado en Biblioteca`, `Esquema · Listo`, `READY`). Se observó nuevamente antes de actuar; la UI mostraba los resultados correctos y se corrigieron los selectores/condiciones. No se atribuyen esos timeouts a fallas del producto.
- Cierre del helper: salida 0, `P4 owned cleanup failures: 0`. `npm run docs:check`: 52 archivos, 657 enlaces, 0 problemas. `git diff --check`: salida 0.

## Brechas comprobadas

1. Renombrado disponible en API/cliente, ausente en controlador/interfaz de chat. Mantener título validado, propiedad y revisión para evitar sobrescrituras.
2. Conversaciones: tres recientes, resto en diálogo; sin búsqueda, clasificación visible ni filtro por contexto. El listado API actual tampoco filtra por contexto. Filtrar sólo una página local daría resultados incompletos.
3. No existe colección unificada de Creaciones ni endpoint global equivalente. Texto recuperable desde respuestas/recurso y visuales por conversación. Los recursos de texto se materializan al abrirlos, no por el mero fin de una generación.
4. Texto Markdown se muestra literal (`## La luz`), sin jerarquía de títulos/listas en chat. Recursos de texto se recortan a 190 caracteres y visuales viven en otro bloque debajo del workspace.
5. Nuevo chat de aula: temas/fuentes aparecen después de enviar el primer mensaje; el primer pedido no ofrece selección previa de esas fuentes. Tras recargar, selección de temas/fuentes volvió a cero.
6. Planificaciones y rúbricas son propuestas de texto. La rúbrica no carga automáticamente criterios estructurados: el formulario indica transcribirlos y completar objetivo/consignas. El traspaso crea ASSIGNMENT/TP privado, no cuestionarios/evaluaciones ni publicación automática. El TP privado sí se obtuvo en este recorrido, con criterio manual sintético.
7. Contexto de origen y destino publicado son independientes. No etiquetar como asignado un elemento sólo por haberse creado con contexto de aula, ni un TP todavía privado como visible para estudiantes.

## Propuesta para aprobación (no implementada)

### Alcance y dirección UX

- Conservar stack, Lexend, navegación, mascota, paleta y componentes Brújula. Cambio funcional de organización, sin rebranding.
- Chat central: título legible con acción Renombrar; contexto y acceso Temas y fuentes visibles antes del primer envío; formato de títulos/listas/énfasis seguro (sin HTML arbitrario), mensajes y estados de generación claros.
- Widget lateral: selector segmentado `Herramientas | Creaciones`, equivalente visual a las pestañas de aulas. Herramientas conserva las cinco opciones pedidas. Creaciones reúne resultados de todas las conversaciones, con búsqueda y filtro por tipo/contexto/estado; no exigir abrir primero el chat de origen.
- Cada creación muestra título, tipo, contexto de origen y destinos efectivos. Estados diferenciados: privado/sin asignar, preparación, borrador de actividad en aula, publicado en Biblioteca/asignado. Acciones Abrir, Vincular al aula o Abrir destino según permisos/estado; varios destinos cuando existan. Respuestas generales no se confunden con una creación de herramienta.
- Conversaciones debajo del widget: búsqueda, filtro `Todas / General / aula propia`, etiqueta de contexto y acceso a historial completo. El filtro organiza conversaciones; no cambia su contexto histórico. Cambiar el contexto al conversar inicia otro chat explícitamente.
- Móvil: acceso directo a Creaciones y Conversaciones, conservando el chat y composer legibles; diálogo/panel con búsqueda/filtros, cierre por Escape y retorno de foco. Estados cargando, vacío, sin resultados, error, conflicto, generación no disponible y aula archivada deben tener recuperación.

### Reglas de vinculación propuestas

- Apuntes, esquemas y planificaciones: conservar publicación revisada en Biblioteca como destino vigente. La planificación se comparte como recurso; no modifica automáticamente el Plan curricular.
- Actividades: conservar traspaso a TP privado y revisión/asignación en Actividades. No ampliar silenciosamente a otros tipos.
- Rúbricas: mantener texto editable y uso en borrador de actividad con criterios revisados manualmente. Automatizar conversión a criterios o vincular a una actividad existente ampliaría el contrato actual y requiere una decisión adicional; no está incluido en esta propuesta.
- Encontrar/abrir elementos frecuentes en hasta tres clics desde Foxy; publicación/asignación conserva pasos adicionales de revisión cuando correspondan. Las confirmaciones no se eliminan para cumplir un contador.

### Criterios verificables propuestos

1. Renombrar persiste tras recarga; vacío/exceso se rechaza; conflicto conserva entrada y permite resolver; sin acceso cruzado.
2. Búsqueda/filtros consultan el universo autorizado, incluyendo páginas posteriores; cada resultado indica contexto sin modificarlo.
3. Herramientas/Creaciones muestra el panel elegido y conserva selección al abrir/cerrar un recurso; cada herramienta queda a un clic en escritorio.
4. Crear cualquier tipo permite recuperarlo desde Creaciones tras recarga; las respuestas de chat general quedan en su conversación.
5. Origen aula no implica publicación; un borrador no aparece como asignado; destinos y enlaces provienen de registros autorizados y no de inferencia del título o texto IA.
6. Fuente/tema elegibles pueden seleccionarse antes del primer envío y el servidor recibe sólo la selección explícita autorizada.
7. Abrir conversación reciente: un clic; filtrar y abrir: hasta tres; abrir creación: selector y elemento (hasta tres con filtro). Mobile permite llegar a su colección en un toque y a su elemento dentro del objetivo de tres según el caso.
8. Comprobar permisos docente/estudiante/otro docente, concurrencia y recarga; UI a 390/768/1440, teclado/foco, vacíos/errores. Proveedor sintético identificado en toda evidencia.

## Límites y primer paso pendiente

No se cambiaron producto, esquema de datos ni contratos. No hay commit/push/deploy. No se ejecutó suite completa, proveedor real, evaluación pedagógica real, publicación de una actividad al alumnado ni consulta estudiantil nueva en este recorrido. Las respuestas del proveedor fijo no prueban que una rúbrica o planificación tenga calidad real o formato completo.

La revisión evidencia circuitos locales funcionales y las brechas indicadas; no certifica la sección como completa. Pendiente aprobación explícita de esta dirección y autorización de implementación (AGENTS.md, Relevamiento y decisiones humanas). Después: especificación aprobada y registro TTP único, implementación test-first de los nuevos comportamientos, QA y actualización de guías canónicas. La revisión inicial no marca trabajo de implementación como DONE.

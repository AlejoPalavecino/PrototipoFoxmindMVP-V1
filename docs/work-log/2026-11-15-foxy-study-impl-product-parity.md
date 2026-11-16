# P7 · Foxy y Mi estudio

Agente `foxy_study_impl`, implementación TASK-008. Fecha 2026-11-15, worktree `foxmind-product-parity/ProtipoFoxMind`, rama `codex/foxmind-product-parity`, base `ef6828b`. Ejecución local autorizada para P7. Alcance en features y módulos Foxy/Study, adaptadores propios y pruebas; migración de cancelación coordinada con autoría. Contexto aprobado en el plan de implementación de la maqueta.

Estado implementado y verificado con los alcances indicados. El orquestador conserva el tablero y la integración final.

## Entrega y evidencia

- Foxy docente y Study comparten barra de contexto, historial, herramientas y creaciones en paneles. El chat permanece montado, con biblioteca de adjuntos, Nuevo chat con texto y sus avatares. Los estilos están importados como módulos CSS.
- Contexto completo Foxy resuelto por servidor, con material vigente, actividad publicada, plan vigente y adjuntos listos. Se congelan revisión, fuentes incluidas y exclusiones. El límite agregado corta la admisión y deja seleccionar menos fuentes. Los visuales también conservan adjuntos autorizados. La opción General sigue aceptando selecciones sin modo explícito.
- Cancelación Foxy por dueño, idempotente para estados terminales. Texto y visuales cancelan la autorización de lease. Los visuales conservan el lease de custodia hasta que pueda limpiarse el archivo sin entrar en carrera con una escritura. Study cancela su recibo y rechaza aplicar salida tardía.
- Preparar la misma creación, revisión y aula devuelve la publicación previa bajo el lock de dueño. La edición posterior permite preparar una revisión distinta. El fixture de paginación ahora prepara cinco revisiones distintas y conserva límites, timestamps, desempate y aserciones de privacidad.
- Study importa en borrador una copia con procedencia y UUIDs propios. La copia puede activarse sin documento adicional. Desvincular el aula preserva la edición. Se mantiene consulta de aula archivada mientras la pertenencia sea vigente. Los eventos de estudio enlazan a carpeta y plan exactos, y la propuesta detecta coincidencias con ocurrencias de Agenda, incluidos eventos recurrentes y de día completo.
- PDF, DOC, DOCX, PPT y PPTX hasta 20 MB por documento en las entradas de Study/Chat. Adjuntos conservan seis archivos y 20 MB acumulados. Los otros formatos de la biblioteca privada Study conservan su límite de 50 MB.

## Verificación

- RED focal por ausencia de importación, cancelación Foxy y Study, deduplicación y resolución de aula completa. GREEN en los mismos casos. La prueba Agenda obtuvo RED al ejecutar con transformaciones TS del runner y GREEN al comparar ocurrencias reales.
- npm run api:build, npx tsc --project apps/web/tsconfig.json --noEmit y npm run lint:boundaries pasaron. npm run docs:check pasó con 143 archivos y 858 enlaces.
- Suite Study 77 pruebas verdes, más prueba añadida de copia archivada, revocación y edición persistida en PostgreSQL. Las seis pruebas de reglas focales nuevas pasaron por separado.
- Foxy UI 50 casos focales verdes entre workspace, controlador, primer mensaje y contexto. Los selectores de prueba apuntan a los controles del layout compacto y preservan guardas, estados, historial, acceso y selección de fuentes. La prueba del layout comprueba el compositor montado al abrir/cerrar Historial.
- Foxy DB descartable: 3/3 cancelación (turno queued, lease de texto, visual con contabilidad), 9/9 repositorio de publicación tras reconciliar el fixture; 3/3 publicación visual sintética PNG, JPEG y esquema. Prisma sin drift en la comprobación de publicación.
- Ego, docente sintético en preview aislado: aula Fotografía y luz, Aula completa activa, Historial/Escape conservó borrador y respuesta lista informó una fuente usada (Plan 1). Se midió 1440×900 sin overflow y compositor visible. A 390×844 el compositor quedó visible; se observó overflow de navegación global y se comunicó al orquestador para su corrección. Las capturas de esta comprobación están en .test-artifacts/foxy-study-parity.
- La primera verificación SQL de cancelación detectó incompatibilidad del parser al omitir el modo. Se preservó el contrato original y pasaron sus pruebas. Un proceso de preview previo todavía rechazó el modo General; se coordinó reiniciar con el binario corregido.

## Límites y reversión

Verificación con proveedores sintéticos y bases descartables. Quedan pendientes la comparación visual exhaustiva de ambos chats, una carga interactiva de cada uno de los cinco formatos y la verificación con proveedor real. El backend preserva pruebas de formato y los límites, el trabajo no usó servicios externos. Sin commits, publicación ni despliegue.

Los bloques de UI, contexto/archivos, copia de plan, cancelación y publicación se pueden revertir por separado. Mantener la lectura de CANCELLED y la migración 202611150004_foxy_cancellation en cualquier entorno donde ya se hayan guardado trabajos cancelados. Conservar la lectura de planOrigin donde ya se hayan activado carpetas importadas sin planFileId.

### Segunda instancia de preview

- Docente sintético generó un apunte en General, recibió READY y recargó la URL de hilo. La conversación y su creación se recuperaron.
- Estudiante recorrió los cuatro pasos, importó el plan de Fotografía y luz sin archivo, editó el nombre de la unidad y confirmó. La API devolvió carpeta ACTIVE, planFileId nulo y el título editado. La revisión en 390×844 mostró la acción de confirmar accesible. Se corrigió después el rótulo vacío del origen importado.
- El flujo de repaso propuso y confirmó dos sesiones. Agenda mostró ambas, y Abrir plan de repaso llevó a la carpeta y al plan de origen. El verificador de Agenda comprobó el mismo destino desde Notificaciones a 390 px.
- La prueba de espera Study conserva envío único, texto saliente, recuperación ante error, Enter, Shift e IME con la copia actual de estado. La combinación focal de workspace, wizard y UX chat obtuvo 26/26.

- E07 en la segunda instancia: Guía de exposición → preparar PDF → revisión y confirmación explícita → PUBLISHED. Repetir la preparación de la misma revisión y aula mantuvo un solo trabajo y el mismo ID. Creaciones abrió el material exacto en Biblioteca. Cerrar el diálogo de recurso restauró foco al botón de esa creación. Atrás recuperó el hilo Foxy y su turno en la URL original. Adelante volvió al mismo material.
- La revisión de la suite rápida detectó pérdida de foco al desmontar Creaciones. Se conserva el panel al abrir su diálogo secundario en ambos roles. Se actualizaron selectores obsoletos al ingreso por la barra compacta, con aserciones de conflicto, espera, foco y accesibilidad preservadas. Pruebas de Colecciones y Contexto 11/11. El navegador confirmó el retorno de foco.
- La prueba de navegación nativa quedó RED al perder el parámetro de hilo en una restauración de documento. El guard preserva sólo un ID validado y conserva la recarga de un documento autorizado. Suite del bridge 7/7.

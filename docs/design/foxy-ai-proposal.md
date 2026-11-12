# Foxy AI — propuesta para revisión

Estado: diseño docente y adaptación estudiantil aprobados el 2026-11-12, con autorización de implementación para ambos roles. Las maquetas muestran el diseño; la [guía vigente](README.md#foxy-y-carpetas-de-estudio--2026-11-12) enlaza a la evidencia de la app.

[Abrir maqueta navegable](foxy-ai-preview.html). Usa recursos locales de FoxMind, datos ficticios y estado en memoria; recargar restaura los ejemplos. No requiere API, cuenta o proveedor.

[Abrir adaptación estudiantil](study-chat-preview.html). Ambas incluyen un enlace para pasar a la otra maqueta; esto no propone cambiar el rol de una cuenta real.

## Adaptación para Carpetas de estudio

Mantiene el marco aprobado: chat amplio y ampliable, avatar de perfil, historial, herramientas con ejemplos, creaciones legibles y controles de 44 px. Se adapta al contrato observado en study-workspace.tsx y study-practice.tsx, no copia acciones docentes.

| Superficie | Estudiante |
|---|---|
| Contexto | La carpeta Biología fija el contexto. No selector de aulas. Temas seleccionables y fuentes disponibles con procedencia propio/plan/aula vinculada; sin selección individual de fuentes. |
| Historial | Búsqueda y apertura dentro de la carpeta. Sin filtro por aula ni renombrado nuevo, pues la UI estudiantil actual no los ofrece. |
| Herramientas | Apunte, esquema textual, quiz, ejercicios y simulacro; mismas tarjetas y selección removible. Preparar abre configuración con indicaciones opcionales y temas; prácticas requieren al menos un tema y 1–30 preguntas, con dificultad inicial/intermedia/avanzada. |
| Creaciones | Apuntes/esquemas privados con lectura/edición; prácticas pendientes o finalizadas, con apertura directa. Sin publicar en Biblioteca ni asignar actividades. |
| Práctica | Ejemplo respondible, respuestas en memoria, aviso de preguntas vacías, soluciones sólo al finalizar, devolución rotulada como ejemplo y nuevo intento separado. No notas oficiales. |
| Materiales y Plan | Panel amplio con pestañas, búsqueda/procedencia, estado de lectura de cada material, detalles y unidades desplegables. Carga propia simulada y acceso Estudiar por tema. Edición de plan/vínculos conserva su flujo actual. |
| Examen | Acceso a una representación del recorrido fecha/temas/disponibilidad → sesión de ejemplo → revisión/aviso → confirmación simulada, sin eventos reales. |
| Estados | Respuesta lista, generación, demora, error recuperable, fuente retirada y carpeta archivada. No se inventa cola durable estudiantil. Archivada permite consulta y bloquea creación. |

Guion de revisión: abrir Historial y buscar; elegir temas y consultar procedencia de fuentes; elegir Quiz, preparar 2 preguntas y dificultad; probar sin temas y corregir; generar ejemplo, responder, finalizar con una pendiente, abrir devolución y comenzar otro intento. Revisar apunte y esquema; probar estados de espera/error/archivado desde el selector de demo. Ampliar y volver conserva texto. En móvil comprobar compositor y retorno de foco de paneles.

Límites específicos: datos ficticios; no generación, escaneo, archivos, autoguardado remoto ni calendario real. Respuestas de chat son ejemplos fijos y las preguntas sintéticas se repiten si se pide más de tres. Ejercicios/desarrollo muestran devolución ilustrativa, sin evaluar contenido. Examen representa una sola disponibilidad/sesión; la implementación debe conservar el planificador completo vigente, validación de zona, edición de sesiones, revisión y confirmación. Reactivación y administración de carpeta no se rediseñan aquí. Esta propuesta no autoriza nuevas reglas académicas, persistencia, proveedores ni publicación Git.

## Recorridos para revisar

### Ampliación: materiales y adjuntos privados

Decisión explícita del usuario: los adjuntos son privados de la conversación; guardar también en la carpeta requiere elección. Ambos roles tienen Adjuntar junto al compositor. El estudiante puede marcar «Guardar también en esta carpeta», inicialmente desmarcado. No publica en un aula ni modifica el plan. Quitar el adjunto del chat conserva una copia previamente guardada en carpeta. Una nueva conversación no hereda adjuntos.

Materiales muestra nombre, formato, tamaño, procedencia, tema y disponibilidad para IA. Plan separa documento original, unidades y temas; Estudiar prepara un borrador con ese tema sin enviarlo. La carga directa a carpeta conserva el destino privado. Se distinguen archivos almacenados sin lectura IA y fuentes vinculadas cuyo acceso puede perderse.

La maqueta permite elegir metadata de un archivo local o usar un PDF ficticio; no lee bytes, transfiere, escanea ni persiste archivos. Ofrece estados simulados legible, ilegible, rechazado y error. Sólo los legibles pueden adjuntarse como contexto; carpeta admite conservar formatos sin lector. Estado en memoria, perdido al recargar. Los rótulos de capacidad son fixtures, no prueba de extracción.

Decisión de implementación autorizada: conservar el original en custodia privada, vinculado al dueño y al chat. Se aceptan PDF y DOCX, hasta seis archivos y 20 MB totales por conversación. Se valida estructura, se escanean los bytes y se verifica que el lector actual pueda preparar el documento: PDF como documento para el proveedor, DOCX como texto extraído localmente. No incorpora OCR local ni descarga directa desde el chat. Materiales de carpeta sigue admitiendo hasta 50 MB y el plan hasta 20 MB.

La API verifica rol, dueño, carpeta y conversación al subir y al preparar el contexto. Quitar un adjunto revoca su uso en el chat sin borrar el historial. El material guardado por elección explícita reutiliza los bytes aprobados y mantiene su propia autorización. La limpieza recupera cargas abandonadas y adjuntos revocados sin borrar objetos que aún conserva una carpeta. La verificación contempla otro dueño, otro chat, carpeta archivada, archivo rechazado y revocación durante el armado de contexto.

Guion adicional: Materiales → buscar/filtrar → detalles; Plan → desplegar unidad → Estudiar. Adjuntar → PDF de ejemplo → validar → confirmar, con y sin copia en carpeta. Probar error/rechazo/ilegible; cambiar conversación; quitar adjunto y comprobar copia independiente.

1. **Leer y conversar:** el chat prioriza mensajes legibles; una creación se resume en una tarjeta con apertura directa. Los mensajes enviados muestran «Vos» y el mismo avatar que la cuenta ficticia. En la app deberá usarse la selección vigente de perfil (incluidas iniciales), sin agregar carga de fotografías. El selector superior «Estado de ejemplo» permite comparar cola, generación, demora, respuesta y error. Enviar es una simulación explícita, no una llamada a IA.
2. **Retomar:** historial independiente plegable, búsqueda y filtro por contexto. Filas con título, vista previa breve, contexto y estado activo, agrupadas por fecha; acceso a renombrar sin abrir otra conversación. Móvil abre una lista amplia sobre el área de trabajo, que queda inerte mientras está cubierta. Buscar un título inexistente ofrece limpiar búsqueda/filtro; seleccionar abre la conversación; Escape cierra y devuelve foco.
3. **Elegir contexto:** abrir selector, buscar aula, seleccionar General/aula y aplicar. Cambiar inicia una conversación vacía y conserva el historial. Temas/fuentes se eligen aparte con selección explícita. Cancelar no aplica la selección; Escape devuelve foco.
4. **Usar una creación:** abrir Creaciones, buscar/filtrar, abrir lectura, editar y guardar en memoria. Usar en aula separa Biblioteca de borrador de TP y muestra revisión/confirmación. La confirmación final declara que no se publicó nada real.
5. **Elegir herramienta:** pestaña directa Herramientas y acceso destacado desde el compositor. Cada herramienta presenta icono propio, finalidad, descripción y ejemplo. Elegir vuelve al chat, preserva el texto escrito, ajusta el placeholder y muestra una selección removible. Cambiar/quitar no envía mensajes ni llama a IA. Las cinco capacidades se conservan: apunte, esquema, actividad, planificación y rúbrica. El ejemplo ilustra el uso, no se inserta automáticamente.
6. **Leer con más espacio:** tercera revisión solicitada. La maqueta ocupa el alto disponible con encabezados compactos y menos margen lateral. «Ampliar chat» oculta navegación global e historial temporalmente y aprovecha la ventana; volver o Escape recuperan la vista y conservan el borrador. Ocultar sólo el historial también amplía el ancho del chat. El avatar del usuario se conserva.

## Dirección visual y comportamiento

Lexend y recursos existentes de FoxMind; superficies blancas, fondo azul grisáceo, lavanda para contexto/mensajes propios y naranja para acciones principales. Segunda revisión solicitada: historial de 308 px en escritorio (280 en intermedio y vista amplia en móvil), jerarquía por título/preview/contexto, fondo suave y acento lateral activo. Herramientas en vista propia con iconos vectoriales, acentos pastel y ejemplos; dos columnas en escritorio, tres en pantallas grandes y una en móvil. Chat flexible y biblioteca de dos columnas, reducida a una en tamaños menores. Texto principal de 15 px; controles principales de 44 px. Diálogo nativo con Escape y retorno de foco; movimiento reducido en espera.

La tercera revisión reemplaza el tamaño principal anterior por 17 px para lectura/escritura en escritorio y 16 px en móvil, con interlineado de 1.65–1.75. Se compacta el encabezado global y se reduce el margen interior del transcript. Historial mantiene su ancho pero titula «Historial» para alojar su cierre legible en la misma fila. Cierre con icono vectorial de 20 px, borde visible y texto «Ocultar»; se aplica el mismo criterio a Cerrar diálogo y Quitar herramienta. Renombrar usa icono de 20 px. Pestañas, acciones, contexto y etiquetas secundarias crecen y ganan contraste. En móvil, Ampliar y Cerrar diálogo conservan icono visible, nombre accesible y área de 44×44 px; el cierre de historial conserva también el texto. La vista ampliada no usa fullscreen del navegador ni altera datos.

Carga, demora y error se presentan dentro de la conversación. Vacíos de búsqueda explican cómo recuperar resultados. Se conserva la distinción entre origen, privado y destino publicado. No se agregan etapas inventadas de razonamiento, streaming ni porcentajes. La espera real deberá conectarse con los estados existentes del servidor.

## Límites y decisiones para implementación

- La maqueta contiene ejemplos breves, no un motor de conversación; los cambios se pierden al recargar. El estado Publicado de una tarjeta es un fixture, no un recibo real.
- Títulos, vistas previas y grupos temporales del historial son fixtures. Su proyección real y paginación deberán cotejarse con el contrato antes de implementarlos. Las respuestas simuladas no se generan según la herramienta elegida; la selección muestra el recorrido y el compositor contextual.
- Descarga entrega un TXT de ejemplo; PDF/Word, revisión de archivo, unidad/tema, conflictos y permisos mantienen los contratos de la app real. El esquema muestra relaciones textuales de ejemplo, no el renderizador final.
- La navegación global se muestra como contexto visual, sin destinos reales. El editor aún no simula advertencia de cambios sin guardar.
- Antes de implementar: revisar con el usuario ubicación del historial, biblioteca central, tarjeta resumida, selector y separación lectura/edición/publicación. Conservar selección de fuentes, protección de borradores y revisión de publicación vigentes.
- No se crea tablero TTP de implementación hasta tener diseño detallado aprobado y autorización para implementar el producto.

Evidencia y omisiones: [registro de la maqueta](../work-log/2026-11-12-root-foxy-preview.md).

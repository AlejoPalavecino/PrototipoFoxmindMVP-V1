# Estudio privado del estudiante

Carpetas de estudio es una capacidad independiente de las aulas docentes, aprobada el 2026-11-08. La [especificación aprobada](../../product/study-folders-proposal.md) define reglas y UX; la [tarea](../../../odd/tasks/study-folders.md) y la [evidencia](../../verification/study-folders.json) distinguen implementación y comprobaciones.

## Crear y estudiar

Rutas `/carpetas-de-estudio` y `/carpetas-de-estudio/[id]`, exclusivas de estudiantes verificados y del dueño. Colección con banners predefinidos, búsqueda, año, vínculo y Activas/Archivadas/Pendientes. Crear reúne nombre/año/banner/plan PDF-DOCX aprobado, organización IA o manual, unidades/temas y revisión. El borrador admite datos incompletos; activar exige documento y estructura válida. Subir no dispara IA.

Chat, conversaciones, Herramientas/Creaciones y Materiales/Plan conservan el estilo Foxy. Apuntes y esquemas son recursos textuales editables, sin generación de imágenes. Quizzes, ejercicios y simulacros se responden dentro de FoxMind; no modifican notas o entregas del aula. Selección se corrige de forma determinista; desarrollo recibe devolución IA orientativa. Finalizar conserva respuestas; otro intento no sobrescribe el anterior. Soluciones y explicaciones privadas quedan fuera del intento activo. Un fallo de devolución permite reintentar.

La adaptación usa evidencia de preguntas practicadas/errores por tema de esta carpeta, sin diagnósticos ni mezcla entre alumnos/carpetas. El motor valida referencias exactas, entrada e historial. Insuficiencia de fuentes no produce una creación completa. Se guarda la conversación, pero se contextualizan sólo turnos recientes con procedencia autorizada.

Preferencias por carpeta: dificultad, cantidad de preguntas, temas aún existentes y última herramienta se conservan tras una generación completa y se restauran al retomar. Finalizar una práctica conserva esas preferencias al actualizar la evidencia. Pedir una práctica sin temas se bloquea en UI, comando y motor antes de reservar o gastar IA.

## Materiales y autoridad

Planes PDF/DOCX hasta 20.000.000 bytes; materiales propios PDF/DOCX/PPTX/XLSX/JPG/JPEG/PNG/ZIP hasta 50.000.000 bytes. Transferencia, validación y escaneo deben corresponder al mismo digest. Descargar revalida dueño/estado y comprueba tamaño/hash. La extracción IA actual lee PDF/DOCX y cuerpos escritos de Biblioteca; otros formatos se conservan descargables y se identifican como no extraíbles.

El estudiante edita título/temas o quita sus materiales; no administra Biblioteca docente. Una carpeta puede vincular una sola aula con pertenencia vigente. Biblioteca aporta referencias vivas a las versiones disponibles, sin copiar bytes a propiedad estudiantil ni importar notas/compañeros/entregas/plan docente. La lista se consulta nuevamente y se revalida antes de enviar contenido al proveedor y al aplicar el resultado. Aula archivada mantiene consulta autorizada; salir/remover/desvincular revoca contexto.

El contexto admite hasta veinte fuentes candidatas legibles y los límites de documentos/tokens del motor. Superar ese presupuesto informa AI_INPUT_LIMIT antes de generar; no trunca silenciosamente la Biblioteca ni promete selección individual de fuentes o recuperación semántica que esta versión no expone.

Fuentes retiradas no se descargan ni alimentan nuevas respuestas mediante historia/caché. Creaciones anteriores permanecen privadas con aviso. Revisar material no reescribe intentos previos. Quitar materiales no promete liberar bytes de custodia automáticamente; las cuotas también cuentan archivos conservados.

## Examen, Agenda y avisos

Fecha/zona, temas y disponibilidad producen sesiones editables con advertencias de tiempo insuficiente/solapamiento. El estudiante confirma qué incorporar a Agenda. La zona elegida gobierna la conversión; horas inexistentes/ambiguas se rechazan. Confirmar es idempotente por sesión. Editar desde Agenda invalida el aviso anterior y no permite sobrescribir esa revisión silenciosamente.

Avisos dentro de FoxMind: sin aviso, al comenzar, 15 minutos, 1 hora o 1 día antes. Procesamiento durable cada 30 segundos y al consultar Notificaciones, una sola emisión, con evento/revisión vigentes, carpeta activa y sesión sin terminar. Con app cerrada quedan disponibles al volver; no son push, correo ni SMS. Archivar/eliminar carpeta cancela avisos y conserva eventos ya confirmados. Baja lógica confirmada, sin promesa de purga física.

## Contratos y operación

API `/api/v1/study-folders`: colección/creación, detalle/edición con revisión, `commands`, `uploads`/descarga privada, `reminders`/lectura. UUIDs y comandos cerrados; sesión/propiedad revalidadas en transacción; escrituras con Origin/CSRF/admisión. Respuestas privadas `no-store`, proxy con rutas/métodos/tamaños/formatos limitados.

PostgreSQL conserva estado versionado, recibos idempotentes, cargas privadas, sesiones de Agenda y admisión IA. Generación reserva duraderamente, sale de la transacción, revalida antes de contar tokens/generar y antes de aplicar. Un pendiente interrumpido no se reenvía automáticamente; tras diez minutos se presenta fallido y requiere nuevo intento explícito. No equivale a una cola con reejecución automática.

El estado serializado de una carpeta tiene un presupuesto operacional de 3.000.000 bytes UTF-8 incluidos los recibos. Excederlo rechaza la mutación con QUOTA_EXCEEDED y conserva el estado legible; no trunca creaciones. La colección devuelve resúmenes y el detalle se obtiene al abrir. La ventana contextual puede omitir o recortar explícitamente turnos extensos; el historial guardado permanece íntegro. Estos controles protegen el contrato HTTP y no definen una cuota comercial.

Gemini usa configuración backend autorizada. `STUDY_STORAGE_QUOTA_BYTES` configura espacio por estudiante; default local de implementación 250.000.000 bytes, sin cuota productiva aprobada. Presupuesto/admisión comparten `ai_usage_daily` con otras familias; resultado externo desconocido consume conservadoramente la reserva. No se expone la clave.

Fuentes: [servicio](../../../apps/api/src/study-folders/service.ts), [motor](../../../src/core/domain/study-engine.ts), [archivos](../../../apps/api/src/study-file-integration.ts), [Agenda](../../../apps/api/src/study-agenda-integration.ts), [avisos](../../../apps/api/src/study-folders/reminders/runtime.ts), [UI](../../../apps/web/src/components/study-screen.tsx). `npm run test:study` construye y ejecuta las suites admitidas; el recibo distingue proveedor sintético y real.

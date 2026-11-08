# Aulas, creación e ingreso

Un aula publicada tiene un único docente dueño. Un borrador incompleto es privado y no admite miembros. El rol de cuenta no concede acceso a aulas ajenas.

## Crear o continuar un aula

1. Datos del aula: nombre, materia, división, ciclo, zona horaria, documento aprobado y portada predefinida.
2. Cómo cargar el plan: elegir IA o manual. Subir el documento no inicia IA.
3. Unidades y temas: editar estructura; revisar/aplicar una propuesta o escribir manualmente. El editor de texto está en un disclosure; el auxiliar Extraer unidades de un texto abre su propio formulario.
4. Revisión: comprobar y volver a editar; Confirmar y crear aula publica y vuelve a Mis aulas. Guardar borrador conserva sin publicar y permite continuar.

El asistente exige PDF/DOCX aprobado y al menos una unidad/tema. El API conserva compatibilidad con currículos manuales completos sin archivo; eso no habilita omitirlo en este recorrido UI. Zona horaria fija tras crear; las portadas no son una carga libre de imágenes.

## Ingreso y pertenencia

El estudiante puede ingresar por código: Ver aula muestra el destino; Confirmar inscripción inscribe y abre el aula. Un código inválido conserva el formulario con error genérico. Las invitaciones requieren cuenta/correo correspondiente y aceptación explícita; recibir correo o visualizar una tarjeta no inscribe.

Salir o ser removido revoca el acceso actual y conserva entregas, notas y conversaciones. El docente ve exalumnos en Historial, separados de indicadores de alumnos actuales. Readmisión requiere invitación nueva; el código no sustituye esa condición.

## Archivo y administración

El docente edita datos/portada y opciones disponibles, invita, regenera código, retira miembros y archiva/reactiva con confirmación. Aula archivada es de consulta: sin nuevas inscripciones ni mutaciones académicas. El estudiante aún puede confirmar su salida; para volver se requiere reactivación y nueva invitación. Reactivar no extiende plazos ni borra historia. No hay eliminación permanente del aula desde esta UI.

Fuentes: [Wizard](../../../apps/classrooms-ui/Wizard.tsx), [secciones](../../../apps/classrooms-ui/ClassroomNavigation.tsx), [servicios](../../../apps/api/src/classrooms/). [Flujos comprobados](../../verification/flows.md) y [permisos por rol](../../product/features-by-role.md).

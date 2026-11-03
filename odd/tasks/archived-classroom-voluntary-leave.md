# Salida voluntaria de aulas archivadas

**Estado:** implementada y verificada localmente el 2026-11-02. Referencias FM-AUL-06, FM-AUL-07, INV-07 y CA-10 de la [matriz de consolidación](architecture-consolidation-arq01-matrix.md).

## Alcance para aprobar

Un estudiante con membresía vigente puede salir voluntariamente de un aula archivada. La confirmación informa que perderá acceso, que sus entregas previas se conservan y que para volver necesita al docente. Si cancela, conserva su membresía. Si confirma y la operación se completa, deja de ver el aula y pierde acceso desde enlaces directos, API, notificaciones y descargas protegidas. Una pestaña que ya tenía contenido cargado debe respetar la revocación en la siguiente operación. Las copias previamente descargadas quedan fuera de ese control.

La excepción permite cerrar únicamente la membresía propia. El aula sigue archivada y se conservan las restricciones sobre altas, remoción docente, publicaciones, entregas y cambios académicos. Se conserva el flujo vigente de salida de aulas activas. Quedan fuera ocultamiento, transferencia docente, rediseño general de invitaciones, política de tareas en curso (PD-17), eliminación, anonimización y promesas de plazos de retención (PD-05).

El contrato V1 anterior bloqueaba los cambios de membresía en aulas archivadas. La excepción queda reflejada en la [especificación vigente](../../docs/foxmind-v1-functional-spec.md). La [operación compartida](../../apps/api/src/classrooms/memberships-operations-2.ts) cierra el período, revoca invitaciones pendientes y registra el evento dentro de la misma transacción. La [prueba de matrícula](../../tests/p5-enrollment.test.mjs) comprueba la excepción.

## Readmisión y visibilidad después de volver

| Decisión | Opción recomendada | Alternativa |
|---|---|---|
| Cuándo y cómo readmitir (PD-04) | El docente reactiva el aula y emite una invitación nueva a la misma cuenta. El estudiante acepta explícitamente. Reusa el flujo vigente y mantiene el archivo de solo lectura salvo la salida propia. | Permitir invitación nueva y aceptación mientras sigue archivada. Evita reactivar el aula para recuperar acceso, pero requiere aprobar excepciones adicionales y mantener la consulta de solo lectura tras readmitir. Dejar para un alcance separado si se elige. |
| Qué vuelve a ver el estudiante (PD-04) | Recupera consulta de sus entregas confirmadas y devoluciones ya publicadas, según permisos vigentes. Se conserva el vínculo al historial y no se duplican entregas. | Recupera acceso al aula y a su nueva participación, con historial previo visible solo para el docente autorizado. Requiere reglas adicionales de visibilidad por período y puede dejar al estudiante sin comprobantes anteriores. |

El código general del aula y las invitaciones anteriores a la salida quedan excluidos como vías de readmisión en ambas opciones.

## Conservación al salir

| Opción | Consecuencia |
|---|---|
| **Conservar las entregas confirmadas y sus referencias académicas (recomendada).** | La salida mantiene recibos, respuestas, adjuntos asociados y correcciones o calificaciones existentes. El docente autorizado conserva el historial. Durante la baja, el estudiante pierde acceso aunque los registros se conserven. Los borradores y archivos sin confirmar siguen su ciclo vigente, sin incorporar un borrado ni prometer su restauración. |
| Garantizar también la recuperación de borradores y adjuntos sin confirmar. | Preserva trabajo incompleto si el estudiante vuelve. Requiere decidir sobre archivos en carga o escaneo, caducidad, cupo y reanudación. Es una ampliación que necesita resolver PD-05 y, donde corresponda, PD-17. |

## Aceptación inicial para la opción recomendada

- Un miembro vigente puede confirmar su propia salida de un aula archivada. Cancelar, actuar desde otra cuenta o repetir la solicitud no crea bajas, eventos ni cambios adicionales.
- La salida revoca acceso académico y a archivos privados protegidos. El docente autorizado puede consultar las mismas entregas, recibos y calificaciones, sin mutar su contenido. La salida y sus efectos de membresía se observan como una sola operación.
- El aula conserva su estado archivado y el resto de las escrituras sigue bloqueado. La salida de un aula activa conserva su contrato.
- El código general y las invitaciones previas no readmiten. Tras reactivar, solo una nueva invitación docente aceptada explícitamente restablece acceso. El estudiante vuelve a consultar sus entregas confirmadas y devoluciones publicadas según permisos, sin duplicarlas ni exponer correcciones privadas.

## Decisión aprobada

El usuario eligió las opciones recomendadas. La readmisión requiere reactivar el aula, una invitación docente nueva a la misma cuenta y aceptación explícita. Al volver, el estudiante puede consultar sus entregas confirmadas y devoluciones publicadas según los permisos vigentes. Se conservan las entregas confirmadas y sus referencias académicas. Los borradores y adjuntos sin confirmar siguen su ciclo vigente. Esta decisión resuelve el alcance aplicable de PD-04 para esta entrega. La política general de PD-05 y PD-17 sigue pendiente.

## Interacción propuesta

Reutilizar el botón **Salir del aula** y el diálogo de confirmación existente. Mostrar la acción en la vista del estudiante con membresía vigente, también si está archivada.

> **Salir del aula**
>
> Perderás acceso a esta aula y a sus archivos. Tus entregas confirmadas se conservarán. Para volver, el docente tendrá que reactivar el aula y enviarte una invitación nueva.

- **Cancelar** cierra el diálogo y devuelve el foco al botón que lo abrió. **Confirmar salida** inicia una sola solicitud, con estado de espera perceptible y sin dobles envíos. El diálogo admite teclado y conserva el patrón de foco de la aplicación.
- Al confirmar con éxito, mostrar **Saliste del aula** y volver a **Mis aulas** con la lista actualizada. Si la vista cambió mientras la solicitud estaba pendiente, la respuesta debe respetar el destino actual.
- Si falla la solicitud y la membresía sigue vigente, conservar la vista y mostrar el error con opción de reintentar. Si ya se revocó el acceso, volver al listado sin mostrar contenido protegido. Los enlaces directos a recursos vuelven a comprobar permisos.

## Comprobaciones para la implementación

| Criterio | Evidencia esperada |
|---|---|
| Autoridad y atomicidad | Prueba de integración del endpoint existente con sesión, CSRF y membresía vigentes. La excepción aplica solo a la baja propia. Dos solicitudes concurrentes cierran un solo período, registran un solo evento y revocan las invitaciones pendientes. Si falla un efecto de la transacción, la membresía sigue vigente. |
| Revocación y conservación | Después de confirmar, probar aula, intento propio, devolución, notificación y descarga privada por enlace directo. Verificar denegación para el estudiante, continuidad de consulta docente y conservación de las mismas entregas, adjuntos y calificaciones. |
| Archivo y readmisión | Probar que el aula sigue archivada, la remoción docente y otras escrituras siguen bloqueadas, y el código e invitaciones previas no readmiten. Luego reactivar, emitir una invitación nueva y aceptarla. Verificar consulta de entregas previas y devoluciones publicadas sin duplicados, con las correcciones privadas protegidas. |
| Interacción y regresión | En navegador, comprobar confirmación por teclado, cancelación, espera, error y regreso al listado tras el éxito. Probar el flujo en ancho móvil y conservar el comportamiento de salida de aulas activas. |

## Seguimiento

El usuario aprobó la interacción y los criterios de aceptación y autorizó la implementación el 2026-11-02.

| Resultado | Estado | Evidencia |
|---|---|---|
| Autoridad, baja y transacción | DONE | PostgreSQL propio y comprobación de concurrencia y rollback |
| Interacción, revocación y readmisión | DONE | Recorrido Chromium con aplicación, base y archivos privados |
| Revisión y cierre | DONE | [Registro de implementación](../../docs/work-log/2026-11-02-id-unavailable-archived-classroom-leave-implementation.md) |

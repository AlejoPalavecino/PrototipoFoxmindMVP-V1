# Análisis de escritura en Acompañamiento

19 de noviembre de 2026. Agente backend, rama `codex/semaforo-riesgo`, base `0aa8be0d`. Alcance acordado: pedido explícito docente, cuota propia, insumos de aula y devolución citada. Seguimiento en la [especificación](../product/acompanamiento-docente-propuesta.md).

La API registra un pedido explícito en una cola persistente. Cada pedido corresponde al docente, la matrícula vigente y la huella de la evidencia. La lectura revalida permisos y huella. El trabajador revalida antes de contar tokens, antes de enviar la generación y antes de guardar. Un resultado anterior queda oculto desde que cambia la evidencia o el permiso. El mantenimiento elimina salidas y referencias obsoletas y procesos vencidos en lotes. A los 30 días el resultado deja de estar disponible y se purgan los registros vencidos.

El proveedor recibe hasta tres entregas confirmadas recientes, de hasta cuatro respuestas escritas por entrega, con instrucciones, criterios aplicables limitados y referencias locales. Los campos de identidad de cuenta, nombres de actividades, rutas, adjuntos, borradores, recursos privados de Mi Estudio y estrategias compartidas quedan fuera del payload. Se suprimen correos y enlaces de los textos enviados. Cada hallazgo se vincula con una entrega. El prompt pide observaciones específicas y excluye generalizaciones, etiquetas, notas y prioridad.

La cuota usa el presupuesto mensual del docente. La reserva previa al despacho se liquida una vez por trabajo. Un fallo de preflight admite reintento explícito. Una solicitud ya enviada conserva su estado y no se repite con la misma evidencia. Se conserva la conciliación del gasto aun si cambia la matrícula mientras el proveedor está procesando.

## Evidencia

- RED con `node --test tests/teacher-writing-policy.test.mjs`. La ejecución falló por ausencia del contrato de insumo y salida.
- GREEN con `npm run api:build` y `node --test tests/teacher-writing-policy.test.mjs tests/teacher-writing-backend-db.test.mjs`. Pasaron 9 pruebas en 39,66 s con PostgreSQL aislado, Prisma y proveedor sintético. Se comprobó lectura pasiva, tres POST concurrentes, reintento previo sin cargo, un único cargo docente, autorización de referencia sin publicar nota, revocación durante despacho, descarte por antigüedad incluso con IA apagada, cuota agotada antes de contactar al proveedor y saldo independiente de docentes en dos aulas con la misma persona.
- ESLint focalizado, comprobación de límites de módulos, documentación y `git diff --check` pasaron. La validación de utilidad pedagógica y la interacción con proveedor real quedan pendientes.

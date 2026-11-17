# Aulas

El modulo conserva los contratos HTTP y el ciclo transaccional academico. Las capacidades ofrecen APIs nombradas en `public.ts`; la composicion construye sus adaptadores.

| Capacidad | Responsabilidad |
| --- | --- |
| access | Actor, contratos de transaccion, autenticacion repetida bajo lock de usuario, acceso al aula y revisiones. |
| drafts | Crear, guardar, retirar y publicar borradores; coordinar destino, origen, promocion y contenido inicial. |
| settings | Validar ajustes y revision; decidir disponibilidad de calificacion IA antes de persistir. |
| memberships | Alta por codigo, confirmacion, periodos, salida/remocion, archivo y vistas de integrantes. |
| invitations | Invitaciones individuales, recibos de lotes, aceptacion/rechazo, custodia del sobre y entrega. |
| catalog | Listado/detalle de aulas y busqueda autorizada de metadata. |
| academic-projection | Adaptador de proyeccion academica para Agenda y autorizacion de sus destinos. |

`domain/` contiene las reglas puras compartidas. El contrato compartido restante en `application/management-operations.ts` contiene exclusivamente tipos de colaboracion; no implementa persistencia.

## Transacciones y colaboracion

- La aplicacion recibe la misma tx desde `run`; los repositorios no abren subtransacciones.
- Publicar crea el destino invisible antes de bloquear y revalidar el borrador. Promueve el plan y carga unidades/temas despues de esa validacion. Replay de un borrador publicado devuelve el destino ya existente.
- Ajustes comprueba permiso docente, revision y disponibilidad IA antes de actualizar. El adaptador conserva el incremento atomico del epoch al deshabilitar IA y COALESCE para campos omitidos.
- La confirmacion por codigo conserva el lock de aula, comprueba codigo/pertenencia y repite validacion del token con el reloj de DB antes de inscribir.
- Salir del aula conserva el permiso de salida propia de un aula archivada, termina el periodo y revoca invitaciones antes de registrar el evento.
- Los lotes conservan recibos cifrados y replay por destinatario; un destinatario terminal no vuelve a emitir una invitacion.
- La composicion inyecta catalogo en access, generacion de codigos en publicacion y funciones de sobre en sus consumidores. No hay imports de infraestructura privada entre capacidades.

## Comprobaciones

Pruebas focalizadas: `drafts/application/publication.test.ts`, `memberships/application/membership-behavior.test.ts`, `invitations/application/batch-behavior.test.ts` y `drafts/infrastructure/classrooms-persistence.test.ts`. La prueba de UoW existente vive en `access/infrastructure/context-run.test.ts`, con sus aserciones conservadas.

Estas pruebas usan datos sinteticos y tx simuladas; la concurrencia y rollback reales requieren la integracion con PostgreSQL descartable. El registro del corte esta en [work-log](../../../../../docs/work-log/2026-11-16-worker-backend-classrooms-capabilities.md).

# Agenda personal y contexto académico

## Selección y navegación — 2026-11-12

Seleccionar un día conserva el calendario y muestra todos sus eventos en el panel lateral; hasta 920 px abre un panel inferior con Escape y retorno de foco al día. Desde el panel se abre el detalle o se crea un evento para esa fecha, incluso cuando está vacío. El detalle agrupa cada evento en una tarjeta de color tenue con título, horario y etiqueta; «Agregar evento» conserva la fecha seleccionada. Semana muestra horarios y colores. Mes/Semana/Día conservan la fecha y comparten controles estables; avanzar mes conserva el número de día limitado al último del destino (31 de enero → 28/29 de febrero). El calendario conserva seis filas. La transición breve respeta movimiento reducido. Carga/error no exponen eventos de otro período.

Formulario único con columnas equilibradas, una columna hasta 600 px y acciones visibles mientras se desplazan los campos. Sin cambios de permisos, persistencia ni repetición. [Evidencia local y límites](../../verification/agenda-ux.json), [tareas](../../../odd/tasks/agenda-ux.md).

Agenda es global y privada por cuenta. Muestra mes, semana o día, el día seleccionado y los eventos siguientes dentro de su ventana consultada. Puede incluir plazos académicos autorizados; un evento personal no publica una actividad ni modifica una nota.

Crear evento reúne título, tipo, fecha, todo el día u horas de inicio/fin, repetición, color y notas. El detalle identifica SOLO PARA VOS y permite editar/eliminar. Las series admiten repetición diaria/semanal/mensual, límite temporal y como máximo 53 ocurrencias.

Editar una serie advierte su alcance, incluidas fechas pasadas. Eliminar una ocurrencia de serie ofrece Solo este evento o Toda la serie; no documentar la versión anterior de eliminación exclusivamente completa. Las excepciones se conservan en el modelo. Los calendarios usan fechas y zona declaradas. Una hora inexistente por DST se rechaza. Una hora individual ambigua requiere un offset explícito válido. En una serie se valida cada ocurrencia: una hora futura inexistente o ambigua rechaza toda la serie; el offset explícito sólo desambigua la primera ocurrencia, no las futuras.

La repetición mensual conserva el día original y omite meses sin ese día. No afirmar esa variante como ensayada en el recorrido actual: la [matriz](../../verification/flows.md) distingue implementación y prueba.

Fuentes: [Agenda](../../../apps/web/src/features/agenda/ui/Agenda.tsx), [formulario](../../../apps/web/src/features/agenda/ui/EventForm.tsx), [servicio](../../../apps/api/src/modules/agenda/), [modelo](../data-model.md). Se comprobó crear, consultar, editar a serie semanal y eliminar la serie, con aislamiento entre cuentas.

## Organización por responsabilidades

Reglas y contratos neutrales: `src/core/domain/agenda`. Backend: `apps/api/src/modules/agenda/{application,infrastructure,presentation}`, entrada pública `public.ts`; composición de identidad/proyección académica y montaje HTTP en `bootstrap/agenda-composition.ts` y `bootstrap/agenda-transport.ts`. La fábrica académica recibe el mismo tx/actor y no abre una segunda transacción.

Frontend: `apps/web/src/features/agenda/{ui,model,api}`, entrada pública `index.ts`, pantalla en `screens` y adaptadores de sesión/proxy en `application`. Las rutas anteriores de Agenda están retiradas. El [registro del piloto](../../work-log/2026-11-10-root-agenda-pilot.md) conserva evidencia de ese corte; la aceptación actual se consulta en el [tablero](../../../odd/tasks/architecture-migration.md).

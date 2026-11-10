# Agenda personal y contexto académico

Agenda es global y privada por cuenta. Muestra mes, semana o día, el día seleccionado y los eventos siguientes dentro de su ventana consultada. Puede incluir plazos académicos autorizados; un evento personal no publica una actividad ni modifica una nota.

Crear evento reúne título, tipo, fecha, todo el día u horas de inicio/fin, repetición, color y notas. El detalle identifica SOLO PARA VOS y permite editar/eliminar. Las series admiten repetición diaria/semanal/mensual, límite temporal y como máximo 53 ocurrencias.

Editar una serie advierte su alcance, incluidas fechas pasadas. Eliminar una ocurrencia de serie ofrece Solo este evento o Toda la serie; no documentar la versión anterior de eliminación exclusivamente completa. Las excepciones se conservan en el modelo. Los calendarios usan fechas y zona declaradas. Una hora inexistente por DST se rechaza. Una hora individual ambigua requiere un offset explícito válido. En una serie se valida cada ocurrencia: una hora futura inexistente o ambigua rechaza toda la serie; el offset explícito sólo desambigua la primera ocurrencia, no las futuras.

La repetición mensual conserva el día original y omite meses sin ese día. No afirmar esa variante como ensayada en el recorrido actual: la [matriz](../../verification/flows.md) distingue implementación y prueba.

Fuentes: [Agenda](../../../apps/web/src/features/agenda/ui/Agenda.tsx), [formulario](../../../apps/web/src/features/agenda/ui/EventForm.tsx), [servicio](../../../apps/api/src/modules/agenda/), [modelo](../data-model.md). Se comprobó crear, consultar, editar a serie semanal y eliminar la serie, con aislamiento entre cuentas.

## Organización por responsabilidades

Reglas y contratos neutrales: `src/core/domain/agenda`. Backend: `apps/api/src/modules/agenda/{application,infrastructure,presentation}`, entrada pública `public.ts`; composición de identidad/proyección académica y montaje HTTP en `bootstrap/agenda-composition.ts` y `bootstrap/agenda-transport.ts`. La fábrica académica recibe el mismo tx/actor y no abre una segunda transacción.

Frontend: `apps/web/src/features/agenda/{ui,model,api}`, entrada pública `index.ts`, pantalla en `screens` y adaptadores de sesión/proxy en `application`. Los archivos anteriores permanecen como compatibilidad explícita sin duplicar reglas. Estado y evidencia actual del piloto en el [registro](../../work-log/2026-11-10-root-agenda-pilot.md).

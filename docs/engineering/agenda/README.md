# Agenda personal y contexto académico

## Selección y navegación

Mes, Semana y Día conservan la fecha seleccionada. Sin una vista explícita en la URL, Agenda abre en Mes tanto en escritorio como en móvil. El calendario muestra indicadores de eventos y un panel con los del día. En pantallas angostas, seleccionar un día en Mes lleva el foco y el desplazamiento a su panel debajo del calendario. Semana y Día muestran el total por fecha de la semana visible. Cada ficha identifica horario, categoría, título y color. Los eventos privados abren un diálogo sobre el calendario; los plazos académicos conservan su destino autorizado. Crear para un día usa esa fecha.

El editor reúne datos, color y anticipación del aviso con etiquetas explícitas. Los avisos de solapamiento informan sin imponer una prohibición nueva; errores se muestran en rojo y confirmaciones en verde. Se mantienen repetición, zona horaria, día completo y límites de ocurrencias. La interfaz y evidencia del candidato se describen en la [guía de diseño](../../design/README.md) y el [registro de implementación](../../work-log/2026-11-15-agenda-notifications-product-parity.md). Los ensayos del 12 de noviembre corresponden al diseño anterior.

Agenda es global y privada por cuenta. Muestra mes, semana o día y los eventos del período visible. El bloque «Después de este día» ya no se muestra en Agenda; Inicio conserva su agenda del día y sus propios accesos. Puede incluir plazos académicos autorizados; un evento personal no publica una actividad ni modifica una nota.

Crear evento reúne título, tipo, fecha, todo el día u horas de inicio/fin, repetición, color y notas. El detalle identifica el evento como personal y permite editar o solicitar eliminación. Cancelar un editor con cambios abre una confirmación; seguir editando conserva valores y foco. Eliminar exige confirmar después de elegir alcance, si corresponde. Las series admiten repetición diaria/semanal/mensual, límite temporal y como máximo 53 ocurrencias.

Editar una serie advierte su alcance, incluidas fechas pasadas. Eliminar una ocurrencia de serie ofrece Solo este evento o Toda la serie; no documentar la versión anterior de eliminación exclusivamente completa. Las excepciones se conservan en el modelo. Los calendarios usan fechas y zona declaradas. Una hora inexistente por DST se rechaza. Una hora individual ambigua requiere un offset explícito válido. En una serie se valida cada ocurrencia: una hora futura inexistente o ambigua rechaza toda la serie; el offset explícito sólo desambigua la primera ocurrencia, no las futuras.

La repetición mensual conserva el día original y omite meses sin ese día. No afirmar esa variante como ensayada en el recorrido actual: la [matriz](../../verification/flows.md) distingue implementación y prueba.

Fuentes: [Agenda](../../../apps/web/src/features/agenda/ui/Agenda.tsx), [formulario](../../../apps/web/src/features/agenda/ui/EventForm.tsx), [servicio](../../../apps/api/src/modules/agenda/), [modelo](../data-model.md). Se comprobó crear, consultar, editar a serie semanal y eliminar la serie, con aislamiento entre cuentas.

## Organización por responsabilidades

Reglas y contratos neutrales: `src/core/domain/agenda`. Backend: `apps/api/src/modules/agenda/{application,infrastructure,presentation}`, entrada pública `public.ts`; composición de identidad/proyección académica y montaje HTTP en `bootstrap/agenda-composition.ts` y `bootstrap/agenda-transport.ts`. La fábrica académica recibe el mismo tx/actor y no abre una segunda transacción.

Frontend: `apps/web/src/features/agenda/{ui,model,api}`, entrada pública `index.ts`, pantalla en `screens` y adaptadores de sesión/proxy en `application`. Las rutas anteriores de Agenda están retiradas. El [registro del piloto](../../work-log/2026-11-10-root-agenda-pilot.md) conserva evidencia de ese corte; la aceptación actual se consulta en el [tablero](../../../odd/tasks/architecture-migration.md).

## Verificación conjunta del contrato cliente/servidor

`tests/agenda-client-http.test.mjs` conecta `createWebAgendaClient` con `installAgendaTransport` y `AgendaService` sobre HTTP de loopback. Reutiliza los helpers productivos de solicitud, error y CSRF, el transporte de identidad para obtener CSRF y los validadores del servicio. Sólo identidad, persistencia/UoW y proyección académica son puertos sintéticos en memoria; no se replica la serialización ni la validación productiva.

| Contrato conectado | Evidencia |
|---|---|
| Payload y CRUD | Día completo/serie semanal → horario con zona/sin repetición; categorías, texto plano, título normalizado y color explícito/omitido. PUT nuevo 201, reintento idéntico 200, GET/PATCH/listado 200 y DELETE 204 vacío convertido en `undefined` por el cliente. |
| Revisión y rechazos | Revisiones string 0→1; PUT incompatible y PATCH/DELETE obsoletos devuelven 409/CONFLICT. Revisiones coercibles/negativas/fraccionarias y payload inválido devuelven 400/INVALID_INPUT. |
| Autorización | 401/AUTH_REQUIRED; 403/EMAIL_VERIFICATION_REQUIRED, FORBIDDEN, ORIGIN_NOT_ALLOWED y CSRF_INVALID. IDs ajenos/inexistentes no se distinguen. Tras cada rechazo de evento se releen payload, revisión y colección del dueño; no hay reintento implícito. |
| Contexto académico | Envelope de próximos plazos y apertura autorizada; revocar el destino devuelve 403/FORBIDDEN. La proyección académica es sintética, no una prueba SQL de obligaciones. |

Ejecutar desde la raíz, sin DB ni APIs externas:

```bash
node --test tests/agenda-client.test.mjs tests/agenda-http.test.mjs tests/agenda-contracts.test.mjs tests/agenda-client-http.test.mjs
```

Son pruebas de caracterización: no requieren un fallo previo del producto. Complementan las pruebas individuales del cliente, transporte y dominio; no acreditan el proxy Next, montaje Nest, sesiones persistidas, transacciones SQL, excepciones por ocurrencia, paginación ni todas las variantes de calendario. Resultado y fallos de la auditoría S4: [registro propio](../../work-log/2026-11-13-agenda-contract-audit.md).

## Avisos personales y accesos directos

El editor permite configurar Sin aviso, Al momento, 5, 15 o 30 minutos antes, 1 hora antes o 1 día antes. Un aviso hace visible la ocurrencia en Notificaciones cuando llega su fecha, sin correo ni servicio externo. En eventos con hora el cálculo parte del inicio en la zona del evento. En eventos de día completo, parte de la medianoche en la zona guardada con el aviso. Si el día comienza con un salto de reloj, se usa el primer instante válido. Un día de anticipación equivale a 24 horas.

Cada ocurrencia tiene su propio aviso. Una edición usa el horario y la anticipación efectivos, y conserva la lectura si conserva la identidad de la ocurrencia. Las excepciones aplican a una sola fecha de la serie. Quitar un aviso, cancelar una ocurrencia o eliminar el evento lo retira de la bandeja. Una configuración ya vencida al crear un evento futuro queda visible en cuanto se guarda. Los eventos anteriores a la incorporación de avisos siguen sin aviso.

Inicio puede abrir el día seleccionado con `/agenda?date=AAAA-MM-DD&view=day` y el formulario con `/agenda?create=1` o con `date` adicional. Los avisos usan el ID de evento y la fecha estable de la ocurrencia. Un evento de repaso vigente ofrece acceso a la carpeta y al examen de origen. [Reglas del dominio](../../../src/core/domain/agenda/reminders.ts) · [Pruebas PostgreSQL](../../../tests/agenda-notification-parity-database.test.mjs).

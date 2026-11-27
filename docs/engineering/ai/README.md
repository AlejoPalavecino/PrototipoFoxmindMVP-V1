# Asistencia IA: capacidades y límites

## Cuota mensual por cuenta

Cada cuenta estudiantil dispone de USD 3 y cada cuenta docente de USD 5 por mes calendario de Buenos Aires. El alta recibe la cuota completa. El saldo disponible es el límite menos el gasto imputado y las reservas vigentes. Consultar, descargar o editar una creación guardada cuesta cero de cuota IA. El desglose y las actualizaciones de la cabecera pertenecen al usuario autenticado. Los controles diarios existentes de solicitudes y presupuesto siguen protegiendo la operación compartida.

Antes de una generación paga, PostgreSQL registra una reserva en microdólares en el período de la operación. Al liquidar se libera la reserva y se descuenta el costo conocido hasta el importe reservado. El excedente queda a cargo de FoxMind. Una respuesta sin medición suficiente deja el importe pendiente de confirmación. A las 24 horas vence la reserva y se registra la exposición estimada de la plataforma. Una confirmación posterior al vencimiento ajusta el costo de FoxMind y conserva el saldo ya devuelto al usuario.

Si el usuario cancela un trabajo que ya fue enviado al proveedor (turno de Foxy o imagen/diagrama de Foxy), la cancelación imputa a su cuota mensual el importe reservado completo, porque el proveedor factura la solicitud aunque el resultado se descarte y el trabajo cancelado ya no recibe su costo observado. Cancelar antes del envío no cuesta nada. El vencimiento del lease de un turno enviado, cuyo resultado se desconoce y no fue iniciado por el usuario, conserva el comportamiento anterior: la reserva queda pendiente de confirmación. En Estudio la cancelación sólo cierra el recibo de la conversación; la generación en curso continúa y liquida su costo observado, por lo que no requiere un cargo adicional.

El corte contable comienza con las reservas de esta versión. Para activar en otra instalación, drenar primero las colas antiguas, aplicar las migraciones y arrancar todos los procesos con la misma versión. Conservar la historia diaria previa. La fecha de reserva determina el mes incluso si la respuesta llega después de la renovación.

### Lectura del saldo

`GET /api/v1/ai-quota` devuelve el saldo a demanda. `GET /api/v1/ai-quota/events` emite el mismo snapshot por SSE al conectar y cuando cambia la versión o el período. Ambas rutas requieren sesión con correo verificado y derivan la cuenta de esa sesión. El stream la revalida en consultas cortas cada 900 ms. El cliente conserva la consulta JSON como respaldo. [Contrato y unidades](../../../src/core/contracts/ai-quota.ts) · [Transporte](../../../apps/api/src/bootstrap/ai-quota-http.ts).

### Conciliar con un reporte de facturación

Un operador con acceso de lectura autorizado puede ejecutar `node scripts/reconcile-ai-cost.mjs reporte.json` con `DATABASE_URL` del entorno que quiere auditar. El informe selecciona operaciones por instante de reserva en el intervalo UTC semiabierto indicado. Para una comparación válida, usar el mismo proyecto, proveedor, modelo, ventana temporal y base de precios del reporte. Registrar créditos, impuestos, operaciones previas al corte y diferencias de fecha por separado.

```json
{
  "start": "2026-11-01T03:00:00Z",
  "end": "2026-12-01T03:00:00Z",
  "totals": [
    { "provider": "gemini", "model": "modelo-del-reporte", "billedMicrousd": "42000" }
  ]
}
```

El comando reconstruye cada operación con sus movimientos y señala discrepancias por identificador. Compara lo facturado con los costos confirmados de usuarios y plataforma. Presenta por separado reservas abiertas y exposición estimada. Una línea ausente en la factura queda pendiente de comparación. Sale con código 0 al coincidir, 2 si hay diferencias y 1 si la ejecución falla. El informe se obtiene en una transacción de sólo lectura. El reporte puede contener identificadores privados de operación y debe permanecer en el entorno autorizado.

El proceso de API también registra una comprobación interna por día UTC mientras está en marcha. El operador puede consultar `ai_monthly_integrity_checks` para ver la última ejecución y `ai_monthly_operation_discrepancies` para investigar las diferencias actuales. Estos controles comparan importes reconstruidos desde los movimientos con los importes de cada reserva.

Si el proveedor identifica el costo de **una operación concreta**, un operador autorizado puede aplicar ese comprobante con `node scripts/reconcile-ai-cost.mjs --apply-receipt recibo.json`. El archivo contiene `provider`, `model`, `reference` (identidad única de la línea), `namespace`, `jobId` y `actualMicrousd` (entero expresado como texto). Verificar la correspondencia externa antes de aplicarlo. Una factura agregada sirve sólo para la comparación. FoxMind comprueba proveedor y modelo contra la reserva, vincula el comprobante una sola vez y rechaza una referencia reutilizada con datos incompatibles. Un recibo vencido ajusta únicamente el gasto de plataforma. El acceso de escritura para esta operación pertenece al entorno administrativo.

## Capacidades y evidencias

| Necesidad | Guía vigente |
|---|---|
| Acompañar estudio privado, practicar y preparar exámenes | [Carpetas de estudio](../study/README.md) |
| Extraer unidades/temas de un documento | [Plan](plan-extraction.md) |
| Preparar un borrador de actividad | [Generación](activity-generation.md) |
| Orientar seguimiento individual | [Análisis](student-analysis.md) |
| Proponer una corrección privada | [Corrección asistida](grading-assistance.md) |
| Conversar y preparar/publicar recursos | [Foxy](foxy.md) |

Compartir proveedor o presupuesto no combina reglas de entrada, privacidad, cuotas ni publicación. Configuración y credenciales quedan en backend. Ninguna capacidad autoriza publicaciones automáticas o tratamiento más amplio de datos personales.

Las pruebas aisladas usan proveedores sintéticos. Los ensayos locales posteriores con Gemini real cubren recorridos puntuales de actividades, Foxy y Estudio. Cada recibo identifica el proveedor y el resultado del escenario. [Actividades](../../work-log/2026-11-17-contratos-actividad-gemini.md) · [Foxy y Estudio](../../work-log/2026-11-17-root-foxy-study-audit-fixes.md) · [Arnés pedagógico](../../work-log/2026-11-17-root-ego-pedagogia-real.md).

Los adaptadores pertenecen al módulo que define su contrato: curriculum para extracción, activities para generación, grading para análisis/corrección, foxy para conversaciones y recursos, study para estudio privado. `platform/ai` conserva admisión, presupuesto y cliente técnico; `bootstrap` selecciona y conecta proveedores. Un proveedor compartido no convierte todas las capacidades IA en un único dominio.

Fuentes: [extracción](../../../apps/api/src/modules/curriculum/generation/infrastructure/providers/gemini-adapter.ts), [actividades](../../../apps/api/src/modules/activities/generation/infrastructure/providers/activity-adapter.ts), [Foxy](../../../apps/api/src/modules/foxy/), [Estudio](../../../apps/api/src/modules/study/generation/infrastructure/providers/study-adapter.ts), [admisión compartida](../../../apps/api/src/platform/ai/admission.ts), [composición](../../../apps/api/src/bootstrap/application.ts).

## Ejecución con SDK oficiales

La implementación de la [propuesta aprobada](runtime-proposal.md) conecta las seis tareas textuales a perfiles por trabajo mediante SDK oficiales. Sin configuración adicional, todas conservan Gemini, `AI_MODEL` y los límites y tarifas existentes. Claude queda disponible mediante configuración explícita de backend; esta entrega no acredita su activación real. No hay selección de proveedor en UI ni cambio automático ante un error.

Un pedido textual puede incluir `tuning` opcional con `thinking` (`minimal`, `low`, `medium` o `high`) y `temperature` (0 a 2). El transporte de Gemini aplica `thinkingLevel` sólo a modelos Gemini 3 y conserva temperatura 0 si no se indica otra. Hoy sólo los chats de Foxy y de Estudio piden razonamiento bajo. El texto progresivo es opcional por llamada: lo recibe únicamente quien pasa una vista previa privada (chat general docente y chat de Estudio).

| Superficie | Responsabilidad actual |
|---|---|
| Extracción, actividades, análisis, corrección, Foxy y Estudio | Conservan puertos, reglas y validación del dominio. Cada trabajo usa su proveedor/modelo, versiones, límites y tarifas guardados. |
| Transporte textual | `profile-client.ts` adapta los puertos existentes al ejecutor neutral; Estudio usa su coordinador separado. Conteo y generación comparten contexto validado y plazo, sin reintentos ocultos. |
| Clientes SDK | Reutilización local de clientes técnicos; los tickets de preflight y sus plazos permanecen aislados por trabajo. No hay uploads permanentes ni caché remota nueva. |
| Estudio | Adaptador sin SQL; coordinador separado conserva admisión y liquidación. Revalidación antes de conteo/generación y después de respuesta. Consumo incluye razonamiento cuando el proveedor lo informa. |
| Foxy | Preflight revalida también materiales de aula sin adjuntos de chat; contexto largo usa búsqueda acotada de un sufijo contado. |
| Visuales | Imágenes y diagramas mantienen su configuración, proveedores y límites específicos; los perfiles textuales no los reemplazan. |

## Configurar perfiles textuales

`AI_TEXT_PROFILES_JSON` es un objeto JSON opcional de backend, de hasta 20.000 bytes. Sus claves son `curriculum`, `activities`, `analysis`, `grading`, `foxy` y `study`. Cada entrada sobrescribe el perfil Gemini base de esa tarea; las tareas omitidas mantienen el default. Los únicos campos admitidos por entrada son:

| Campos | Regla |
|---|---|
| `provider`, `model`, `profileVersion` | Proveedor `gemini` o `anthropic`, modelo e identidad de versión. El ID de perfil y las versiones de prompt/respuesta los fija el servidor. |
| `maxInputTokens`, `maxOutputTokens`, `deadlineMs` | Enteros positivos validados; aplican al trabajo guardado. Concurrencia, edad máxima y cuotas diarias siguen siendo controles operacionales. |
| `inputUsdPerMillion`, `outputUsdPerMillion` | Tarifas positivas explícitas por millón de tokens. Cambiar proveedor **o modelo** exige informar ambas: no se deducen precios del nombre del modelo. |

La base sigue requiriendo la configuración Gemini existente, incluido `AI_BACKEND=gemini-developer`. Para seleccionar Anthropic en una tarea hacen falta `AI_ANTHROPIC_ENABLED=true`, `AI_ANTHROPIC_API_KEY` válida y su entrada de perfil `provider: "anthropic"` con modelo y ambas tarifas. Una clave sola no activa Claude; omitir su configuración permite seguir con Gemini. Campos desconocidos, perfil inválido o proveedor sin credencial habilitada rechazan la configuración; no se redirige el trabajo a otro proveedor.

Las credenciales se resuelven sólo en backend y quedan fuera del perfil persistido. La configuración de un proveedor no autoriza por sí sola nuevas llamadas reales, cambios de tratamiento de datos ni acceso a datos retenidos. Ver [operación local y transición](../local-development/README.md#perfiles-ia-y-transición-de-pendientes).

## Tope diario por usuario

El control operativo diario (UTC) tiene un tope global en dólares, `AI_DAILY_BUDGET_USD`, y un tope de solicitudes por actor y global. Cada usuario tiene además un tope diario en dólares: por defecto es la décima parte del global, de modo que pocas cuentas no pueden agotarlo para todos. La variable opcional `AI_DAILY_ACTOR_BUDGET_USD` (decimal positivo, mismo formato que `AI_DAILY_BUDGET_USD`) fija ese tope de forma explícita. Debe ser menor o igual que `AI_DAILY_BUDGET_USD`; de lo contrario la configuración de IA es inválida y la IA queda no disponible al arrancar. El tope aplica a texto, Foxy visual e imágenes de Estudio, que comparten el mismo registro diario. Superarlo devuelve `AI_BUDGET_EXCEEDED`; superar el tope global devuelve `AI_GLOBAL_DAILY_BUDGET_EXCEEDED`.

## Identidad y presupuesto por trabajo

Los seis tipos de trabajo guardan `execution_profile` con formato/tarea, proveedor/modelo, ID/versión de perfil, versiones de prompt/respuesta, límites de entrada/salida/documentos/plazo y tarifas. No guarda claves, prompts, documentos ni respuestas. El worker resuelve esa instantánea al ejecutar; un cambio posterior de perfiles activos no reasigna el trabajo. Los límites y las tarifas guardadas gobiernan preflight, generación y reserva/liquidación; permisos, leases, cuotas y publicación siguen bajo el dominio correspondiente.

La política singleton `ai_execution_policy` conserva `baseline_profiles` inmutable y `active_profiles`. El arranque normal la inicializa antes de iniciar workers. PostgreSQL valida tarea/estructura, impide modificar la instantánea y exige que los nuevos trabajos coincidan con el perfil activo.

Los trabajos antiguos con `execution_profile IS NULL` no contienen identidad suficiente para reconstruir su configuración histórica. Deben terminar con la versión y configuración Gemini anterior **antes del primer arranque que inicializa la nueva política**. Si quedan `QUEUED`/`RUNNING`, ese arranque falla con `AI_LEGACY_PENDING`; no se completa el snapshot desde un entorno recién editado. Una política ya creada conserva su baseline para compatibilidad y bloquea perfiles distintos mientras exista trabajo legacy. La [guía de transición](../local-development/README.md#perfiles-ia-y-transición-de-pendientes) detalla el orden.

El fence de conexión `application_name=foxmind-api-ai-execution-v1` evita que un ejecutor viejo modifique trabajos con snapshot accidentalmente. Es un control de compatibilidad: una sesión con permisos SQL puede declarar ese nombre; no sustituye autenticación, autorización o aislamiento de base.

El plazo impide iniciar generación después del vencimiento. Una reserva SQL ya iniciada se espera antes de liquidarla, evitando commits tardíos con presupuesto sin cerrar. Las transacciones de Estudio usan `maxWait=2000` y `timeout=6000`; la finalización contable puede terminar después del plazo del proveedor. No se promete cancelar la generación remota al abortar la espera local.

## Medición de latencia

Foxy y Estudio emiten eventos JSON de latencia en el registro de errores del servidor. Los campos son tarea, flujo, etapa, duración en milisegundos, resultado y código de una lista cerrada. Conteo y generación de Estudio incluyen el proveedor. Cada proceso emite hasta 100 eventos por minuto. El registro usa categorías fijas y duraciones, sin modelo, prompts, respuestas, documentos, claves, errores crudos ni identificadores.

| Etapa | Foxy | Estudio |
|---|---|---|
| `queue` | Desde la creación del turno hasta que el worker lo toma, con tiempo de PostgreSQL. | |
| `prepare` | Lectura del turno, autorización, fuentes e historial, hasta armar la entrada. | Desde el comando hasta que quedan preparados el contexto, documentos y autorización. |
| `admission` | Reserva de presupuesto y revalidación transaccional del turno. | Admisión SQL y, si corresponde, espera y reintentos por capacidad de una devolución. |
| `count` | Todos los conteos del preflight, con recorte y reautorización. | Conteo del proveedor. El resultado de esta etapa informa si el proveedor devolvió un conteo. El chequeo del límite ocurre después y puede impedir la generación. |
| `generate` | Llamada de generación y validación del adaptador. | Generación, control de formato y reautorización. |
| `first_text` | Desde el despacho hasta publicar la primera vista parcial, si el chat admite transmisión. | |
| `persist` | Cierre durable del turno. | Aplicación del resultado y cierre del recibo. |

Cuando el usuario detiene un turno de Foxy y la cancelación se confirma en la base, la generación y la persistencia registran `CANCELLED` si el proceso que está generando recibe la señal local. Si la persistencia sólo observa que perdió el lease, registra `STALE`, por ejemplo, cuando otro proceso actualizó el turno.

En el navegador, `performance.getEntriesByType('measure')` permite observar las entradas `foxmind.ai.foxy.presentation.first_text`, `foxmind.ai.study.presentation.first_text`, `foxmind.ai.study.feedback.presentation.first_text` y sus equivalentes `final`. Miden desde el envío local hasta que React confirmó el contenido en la interfaz. Si sólo se entrega una respuesta completa, esa confirmación produce las dos entradas. Las mediciones quedan en la pestaña y usan un reloj independiente del servidor.

Los ensayos sintéticos de chat corto, PDF con historial y devolución concurrente comprueban la atribución de etapas. Hay mediciones puntuales con Gemini real cuyos tiempos dependen del contexto y del entorno de cada recorrido. [Registro de latencia](../../work-log/2026-11-17-root-ai-latency.md) · [Cierre integrado](../../work-log/2026-11-17-root-cierre-main.md).

En fixtures sintéticos de Foxy con diez pares, un contexto base excesivo se rechaza tras dos conteos. Cuando caben los últimos cuatro pares uniformes o los nueve más recientes y el primero es muy grande, la estimación baja los conteos de seis a tres. El proveedor confirma el sufijo seleccionado y su ticket evita otro conteo al generar. La relación entre bytes y tokens puede variar entre pares y modelos, de modo que pueden caber otros pares además del sufijo confirmado. La medición compara cantidad de conteos con un proveedor sintético.

Fuentes: [ejecutor](../../../apps/api/src/platform/ai/text-execution.ts), [Gemini](../../../apps/api/src/platform/ai/gemini-text-transport.ts), [Claude](../../../apps/api/src/platform/ai/anthropic-text-transport.ts), [perfiles](../../../apps/api/src/platform/ai/text-profiles.ts), [registro/evidencia](../../work-log/2026-11-16-root-ai-runtime-design.md) y [tablero](../../../odd/tasks/ai-runtime.md).

Los ensayos sintéticos de ambos SDK verifican solicitudes, conteo, finalización y consumo, no calidad educativa, compatibilidad de cualquier modelo ni acceso real a Claude. La implementación y la migración versionada no acreditan aplicación sobre datos retenidos. Fuentes de configuración y persistencia: [lector](../../../apps/api/src/platform/ai/execution-configuration.ts), [snapshot](../../../apps/api/src/platform/ai/execution-snapshot.ts), [política](../../../apps/api/src/platform/ai/execution-policy.ts), [cliente por perfil](../../../apps/api/src/platform/ai/profile-client.ts), [migración](../../../prisma/migrations/202611160001_ai_execution_profiles/migration.sql).

## Dueño neutral de la ejecución textual

Los seis consumidores textuales usan `AiTextRequest` y `AiTextResult`. Plan, Actividades, Análisis estudiantil, Asistencia de corrección y Foxy delegan el preflight separado a `text-client.ts`; Estudio conserva su ejecución directa sobre `executeAiText`. Los adaptadores sólo construyen la solicitud neutral y validan la respuesta de su dominio. Los formatos SDK quedan en los transportes oficiales y en la compatibilidad de clientes inyectados.

`text-client.ts` posee la identidad de la solicitud y el ticket de preflight. Conserva una sola ejecución de `text-execution.ts` desde el conteo hasta la generación, sin reconteo ni reinicio del plazo. El ejecutor es dueño del conteo externo, la autorización antes del conteo, la reserva, la reautorización previa al despacho y a la aplicación, el despacho único, el plazo y la propagación de consumo conocido. Los límites y la selección de proveedor/modelo siguen viniendo del snapshot persistido del trabajo; la admisión, las reservas y la liquidación SQL siguen bajo el dominio que las gobierna.

La pausa entre conteo y generación se puede interrumpir y no mantiene vivo el proceso. Cancelación, vencimiento o cambio de fingerprint cierran la espera sin despacho. Una reserva SQL real ya iniciada conserva el drenaje antes de liquidar. Un resultado remoto tardío no provoca retry, fallback ni aplicación local después de perder la autorización o el plazo.

`getAiTextClient`, los nombres históricos de los constructores y algunas vistas `client`/`options.client` permanecen por aceptación y compatibilidad con SDK inyectados. `sdk-text-compat.ts` traduce y delega al mismo cliente neutral; esas vistas no tienen tickets, conteos ni temporizadores propios y no crean otro SDK. El flujo productivo usa `execution.count/generate`. Los fixtures SDK antiguos de Plan, Actividades y Foxy conservan su auto-conteo histórico dentro del mismo dueño neutral; los clientes productivos requieren un preflight explícito consumible una sola vez. Esta compatibilidad se puede retirar cuando dejen de existir sus consumidores y contratos de aceptación.

Evidencia y límites del corte: [registro TASK-021](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/work-log/2026-11-16-worker-backend-neutral-ai.md). Las pruebas sintéticas comprueban control y serialización; no acreditan acceso a proveedores reales, calidad educativa ni ejecución sobre datos retenidos.

# Asistencia IA: capacidades y límites

| Necesidad | Guía vigente |
|---|---|
| Acompañar estudio privado, practicar y preparar exámenes | [Carpetas de estudio](../study/README.md) |
| Extraer unidades/temas de un documento | [Plan](plan-extraction.md) |
| Preparar un borrador de actividad | [Generación](activity-generation.md) |
| Orientar seguimiento individual | [Análisis](student-analysis.md) |
| Proponer una corrección privada | [Corrección asistida](grading-assistance.md) |
| Conversar y preparar/publicar recursos | [Foxy](foxy.md) |

Compartir proveedor o presupuesto no combina reglas de entrada, privacidad, cuotas ni publicación. Configuración y credenciales quedan en backend. Ninguna capacidad autoriza publicaciones automáticas o tratamiento más amplio de datos personales.

La [matriz actual](../../verification/flows.md) registra recorridos con proveedores sintéticos. No hubo llamadas pagas/reales en esta comprobación. El análisis individual sólo se observó en su rama de error; la corrección IA no generó una sugerencia nueva en el ensayo.

Los adaptadores pertenecen al módulo que define su contrato: curriculum para extracción, activities para generación, grading para análisis/corrección, foxy para conversaciones y recursos, study para estudio privado. `platform/ai` conserva admisión, presupuesto y cliente técnico; `bootstrap` selecciona y conecta proveedores. Un proveedor compartido no convierte todas las capacidades IA en un único dominio.

Fuentes: [extracción](../../../apps/api/src/modules/curriculum/infrastructure/providers/gemini-adapter.ts), [actividades](../../../apps/api/src/modules/activities/infrastructure/providers/activity-adapter.ts), [Foxy](../../../apps/api/src/modules/foxy/infrastructure/providers/), [Estudio](../../../apps/api/src/modules/study/infrastructure/providers/study-adapter.ts), [admisión compartida](../../../apps/api/src/platform/ai/admission.ts), [composición](../../../apps/api/src/bootstrap/application.ts).

## Ejecución con SDK oficiales

La implementación de la [propuesta aprobada](runtime-proposal.md) conecta las seis tareas textuales a perfiles por trabajo mediante SDK oficiales. Sin configuración adicional, todas conservan Gemini, `AI_MODEL` y los límites y tarifas existentes. Claude queda disponible mediante configuración explícita de backend; esta entrega no acredita su activación real. No hay selección de proveedor en UI ni cambio automático ante un error.

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

## Identidad y presupuesto por trabajo

Los seis tipos de trabajo guardan `execution_profile` con formato/tarea, proveedor/modelo, ID/versión de perfil, versiones de prompt/respuesta, límites de entrada/salida/documentos/plazo y tarifas. No guarda claves, prompts, documentos ni respuestas. El worker resuelve esa instantánea al ejecutar; un cambio posterior de perfiles activos no reasigna el trabajo. Los límites y las tarifas guardadas gobiernan preflight, generación y reserva/liquidación; permisos, leases, cuotas y publicación siguen bajo el dominio correspondiente.

La política singleton `ai_execution_policy` conserva `baseline_profiles` inmutable y `active_profiles`. El arranque normal la inicializa antes de iniciar workers. PostgreSQL valida tarea/estructura, impide modificar la instantánea y exige que los nuevos trabajos coincidan con el perfil activo.

Los trabajos antiguos con `execution_profile IS NULL` no contienen identidad suficiente para reconstruir su configuración histórica. Deben terminar con la versión y configuración Gemini anterior **antes del primer arranque que inicializa la nueva política**. Si quedan `QUEUED`/`RUNNING`, ese arranque falla con `AI_LEGACY_PENDING`; no se completa el snapshot desde un entorno recién editado. Una política ya creada conserva su baseline para compatibilidad y bloquea perfiles distintos mientras exista trabajo legacy. La [guía de transición](../local-development/README.md#perfiles-ia-y-transición-de-pendientes) detalla el orden.

El fence de conexión `application_name=foxmind-api-ai-execution-v1` evita que un ejecutor viejo modifique trabajos con snapshot accidentalmente. Es un control de compatibilidad: una sesión con permisos SQL puede declarar ese nombre; no sustituye autenticación, autorización o aislamiento de base.

El plazo impide iniciar generación después del vencimiento. Una reserva SQL ya iniciada se espera antes de liquidarla, evitando commits tardíos con presupuesto sin cerrar. Las transacciones de Estudio usan `maxWait=2000` y `timeout=6000`; la finalización contable puede terminar después del plazo del proveedor. No se promete cancelar la generación remota al abortar la espera local.

Estudio emite métricas locales acotadas de tarea/proveedor/etapa count o generate/duración/estado/código. No incluyen modelo, prompts, respuestas, documentos, errores SDK crudos, claves ni identificadores personales. La generación incluye validación técnica y reautorización, no certifica aplicación o calidad educativa del resultado. No se incorpora un exportador externo.

En fixtures, un contexto base excesivo con diez pares de historial pasa de once a dos conteos; con cuatro pares aptos pasa de siete a seis. El algoritmo conserva sólo un sufijo efectivamente contado, sin quitar fuentes. Con tokenización no monótona no garantiza encontrar el sufijo más largo posible. No se midieron latencia ni ahorro monetario real.

Fuentes: [ejecutor](../../../apps/api/src/platform/ai/text-execution.ts), [Gemini](../../../apps/api/src/platform/ai/gemini-text-transport.ts), [Claude](../../../apps/api/src/platform/ai/anthropic-text-transport.ts), [perfiles](../../../apps/api/src/platform/ai/text-profiles.ts), [registro/evidencia](../../work-log/2026-11-16-root-ai-runtime-design.md) y [tablero](../../../odd/tasks/ai-runtime.md).

Los ensayos sintéticos de ambos SDK verifican solicitudes, conteo, finalización y consumo, no calidad educativa, compatibilidad de cualquier modelo ni acceso real a Claude. La implementación y la migración versionada no acreditan aplicación sobre datos retenidos. Fuentes de configuración y persistencia: [lector](../../../apps/api/src/platform/ai/execution-configuration.ts), [snapshot](../../../apps/api/src/platform/ai/execution-snapshot.ts), [política](../../../apps/api/src/platform/ai/execution-policy.ts), [cliente por perfil](../../../apps/api/src/platform/ai/profile-client.ts), [migración](../../../prisma/migrations/202611160001_ai_execution_profiles/migration.sql).

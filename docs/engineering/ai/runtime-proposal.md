# Propuesta: ejecución IA con Gemini inicial y Claude preparado

Estado: diseño, SDK oficiales, identidad persistente y ejecución aprobados el 2026-11-16; implementación y verificación local completadas; código integrado y publicado en main (`e9d901d`). El usuario aprobó el diseño y confirmó los SDK oficiales. El estado verificable vive en [el tablero](../../../odd/tasks/ai-runtime.md). Este diseño no acredita funcionalidades aún no verificadas.

La implementación publicada conecta extracción, actividades, análisis, corrección, Foxy textual y Estudio a los transportes oficiales mediante perfiles persistentes por trabajo. El [estado por capacidad](README.md#ejecución-con-sdk-oficiales) distingue la selección implementada de la activación real de Claude, que requiere configuración y pruebas reales autorizadas.

## Confirmado y pendiente

El usuario confirmó reducir demoras y consumo, proteger datos y mejorar confiabilidad. Los proveedores de alcance son Google Gemini y Anthropic Claude. La configuración inicial usa los modelos de Gemini existentes; Claude se incorporará cuando se decida activarlo.

Resuelto: SDK oficiales, ejecución autorizada y snapshot persistente de perfiles con drenaje previo de trabajos antiguos. La configuración inicial conserva los modelos Gemini existentes en todos los perfiles; no se eligen modelos nuevos. Claude queda preparado, deshabilitado por defecto y sin credenciales reales configuradas por esta entrega. Este documento no autoriza proveedores pagos, acceso a datos retenidos, publicación ni despliegue.

## Responsabilidades propuestas

| Componente | Responsabilidad |
|---|---|
| Funcionalidad | Revalidar actor, fuentes y permisos; construir contexto mínimo; definir instrucciones y validar reglas educativas del resultado. |
| Ejecutor común | Aplicar perfil compatible, plazo total, admisión y presupuesto existentes; controlar despacho, errores y métricas seguras. |
| Adaptador | Traducir documentos, mensajes, esquema y parámetros al proveedor; contar tokens; generar; normalizar estado y consumo. Sin consultas SQL ni permisos académicos. |
| Composición | Construir clientes y adaptadores, resolver credenciales exclusivamente en backend e inyectar proveedores reales o sintéticos. |

La separación conserva la arquitectura por dominios y sus puertos. La infraestructura común no decide publicación de notas/materiales ni acceso a fuentes. Las transacciones y leases existentes siguen bajo su dueño; extraer piezas comunes no habilita transacciones independientes ni una cola nueva.

## Contrato neutral de proveedor

El contrato debe expresar estas operaciones y datos sin tipos de Google o Anthropic en consumidores neutrales:

- Preparación: perfil resuelto, instrucciones versionadas, mensajes con roles, documentos privados en bytes/texto y esquema de salida.
- Conteo: estimación o conteo del proveedor, método y límites; se conserva el conteo externo actual hasta validar una optimización equivalente. El conteo externo también transmite datos y requiere las mismas autorizaciones que generar.
- Ejecución: generación estructurada, señal de cancelación y plazo restante del trabajo. El adaptador no reinicia el plazo global en cada fase.
- Resultado: contenido, motivo de finalización, identificador técnico de respuesta cuando exista y consumo de entrada/salida/razonamiento/caché con valores desconocidos explícitos.
- Error: distinguir rechazo conocido, límite de tasa, plazo previo al despacho, resultado externo desconocido y salida inválida. La política de reintento usa fase y certeza del despacho.

El resultado estructurado se valida nuevamente con el contrato del dominio. Una respuesta JSON válida no demuestra evidencia suficiente, referencias vigentes o una corrección pedagógica válida.

## Perfiles y configuración

Un perfil versionado relaciona una tarea con proveedor, modelo, capacidades, límites y política de datos. Se proponen perfiles de extracción, actividades, análisis individual, corrección, Foxy y estudio. Las imágenes conservan su capacidad/configuración separada.

| Campo | Significado |
|---|---|
| Identidad | Clave de perfil, versión, proveedor, modelo y versión de prompt/esquema. |
| Capacidades | Texto, PDF, imágenes de entrada, JSON estructurado, generación visual; sólo las combinaciones verificadas. |
| Límites | Entrada/salida, documentos, plazo y concurrencia compatibles con los controles globales y por actor. |
| Costo | Tarifas y categorías de consumo por modelo; desconocido no equivale a cero. |
| Datos | Familias de datos permitidas, proveedor habilitado y condiciones de procesamiento aprobadas. |

La configuración efectiva inicial resuelve todos los perfiles habilitados hacia Gemini y conserva los modelos ya configurados. No se inventan identificadores, precios ni nuevos modelos. La clave actual permanece donde está; este diseño no requiere leerla, copiarla ni reemplazarla.

Claude puede quedar deshabilitado sin clave y sin impedir el arranque con Gemini. Para tareas textuales compatibles se propone un adaptador Anthropic con transporte inyectable y pruebas sintéticas de solicitudes/respuestas; activarlo requiere credenciales configuradas, revisión de capacidades y prueba real autorizada. Un enum o un stub no acreditan soporte de Claude.

La generación visual se habilita sólo donde exista soporte comprobado. El perfil textual de Claude no se considera intercambiable con un generador de imágenes. No se degradan silenciosamente documentos a texto ni se cambian fuentes para acomodar un modelo incompatible.

Cada trabajo conserva el perfil efectivo de su creación hasta terminar. La representación persistente y la compatibilidad con trabajos previos fueron aprobadas en la ampliación de esta sesión. La migración se verifica sólo en bases descartables; aplicarla sobre datos retenidos no forma parte de esta entrega.

## Datos, consumo y errores

1. Revalidar fuentes antes de conteo, generación y aplicación; los documentos e historial se envían sólo cuando están autorizados. Las instrucciones del modelo complementan estos controles, no los reemplazan.
2. Clasificar campos estructurados para minimizar datos. El texto libre de documentos/respuestas puede contener datos personales; no se promete anonimato por redacción de identificadores.
3. No introducir uploads permanentes o caché remoto sin definir conservación, eliminación y revocación. La reutilización local de extracciones requiere digest/versión y autorización actual; su almacenamiento es una decisión pendiente.
4. Registrar duración por etapa, perfil/modelo, resultado y consumo sin prompts, respuestas, documentos, credenciales ni identificadores personales en logs. No introducir un exportador externo por defecto.
5. Conservar reservas, límites globales/por actor e idempotencia. Normalizar tokens de razonamiento/caché según cada proveedor antes de calcular consumo; cubrir valores ausentes, inválidos y resultados desconocidos.
6. Controlar reintentos en una única capa. Ningún reenvío automático tras un resultado externo incierto ni cambio automático de proveedor. Un rechazo conocido puede admitir reintento acotado sólo según política explícita y plazo restante.

## Transporte: decisión aprobada y alternativa evaluada

| Alternativa | Beneficio | Costo y riesgo |
|---|---|---|
| SDK oficiales detrás del contrato propio (recomendada para esta etapa) | Conserva Gemini y el conteo existente; permite probar la frontera neutral antes de añadir un proveedor activo. | Mantener adaptación y pruebas específicas de cada SDK. |
| AI SDK detrás del mismo contrato | Unifica parte del transporte entre Google y Anthropic. | Agrega dependencia y exige comprobar conteo, esquemas, documentos, consumo y reintentos frente a los controles actuales. |

La recomendación se ajusta al alcance confirmado: Gemini seguirá activo y Claude se prepara para más adelante. La propuesta previa consideraba AI SDK; la inspección del preflight, presupuestos y diferencias de consumo favorece desacoplar primero conservando el SDK actual. El contrato permite evaluar AI SDK posteriormente sin cambiar consumidores.

## Criterios de aceptación

| Caso | Resultado observable y evidencia requerida |
|---|---|
| Configuración existente sólo Gemini | Misma selección efectiva y permisos; ningún contacto a Anthropic ni necesidad de su clave. Prueba de composición/configuración. |
| Selección incompatible | Rechazo antes de conteo o generación, sin reserva consumida ni cambio silencioso. Prueba negativa con transporte espía. |
| Fuente revocada | Ningún byte o historial derivado se transmite en llamadas nuevas; un resultado tardío no se aplica. Pruebas de permisos y concurrencia. |
| Proveedor con timeout, 429 o caída | Error normalizado según fase, sin duplicar generación ni gasto por reintentos ocultos. Pruebas de transporte y leases. |
| Plazo agotado entre fases | No comienza una generación nueva. Prueba con reloj/señales controlados. |
| Consumo parcial o desconocido | Reserva/liquidación conservadoras, sin cero inventado ni doble conteo. Pruebas de presupuesto y concurrencia en base descartable. |
| Segundo proveedor sintético | Mismos contratos neutrales ejecutados contra fixtures Gemini/Claude con PDF, JSON, finalización y errores. Esto no certifica calidad o acceso real. |
| Cambio de perfil con pendientes | Mantener identidad/proveedor del trabajo existente o rechazar explícitamente sin despacho. Verificar snapshots inmutables, upgrade y concurrencia con SQL real descartable. |
| Logs y métricas | Contienen tiempos/estados y excluyen marcadores sensibles de fixtures, incluso ante errores del SDK. Prueba negativa. |
| Demora y consumo | Comparativa reproducible por tarea, misma fixture/configuración y resultados de calidad; separar cola, preparación, conteo y generación. Sin porcentajes prometidos antes de medir. |

## Secuencia propuesta

1. Aprobar diseño/transporte y cerrar contrato, perfiles y compatibilidad con pendientes existentes.
2. Crear tablero TTP y pruebas RED de selección, autorización, errores, consumo y transporte; implementar el ejecutor y adaptador Gemini en un corte verificable.
3. Integrar por funcionalidad conservando su suite, empezando por una tarea representativa antes de extender a las demás. Separar SQL del adaptador de Estudio.
4. Añadir adaptador Claude deshabilitado y suite sintética de compatibilidad; comparar métricas y completar documentación canónica.

La evidencia y el estado de cada unidad viven en el tablero. Los SDK oficiales y la persistencia ya tienen aprobación; cualquier nueva dependencia o cambio de alcance requiere su propia decisión. La lectura progresiva de Foxy se incorporó en un corte posterior. [Reglas vigentes de Foxy](foxy.md#consultas-privadas).

## Ampliación aprobada: identidad persistente por trabajo

El usuario aprobó guardar una instantánea de ejecución y finalizar los pendientes antiguos antes de cambiar perfiles. `execution_profile` se incorpora de forma aditiva a las seis familias de trabajos; `ai_execution_policy` conserva la configuración inicial y los perfiles activos.

La instantánea incluye proveedor, modelo, ID/versión de perfil, versiones de prompt/esquema, límites y tarifas usadas para reservar/liquidar. No incluye claves, prompts, documentos ni respuestas. Cada worker utiliza la instantánea; un proveedor deshabilitado o incompatible falla explícitamente, sin cambiar de destino. Los límites diarios y la concurrencia siguen siendo controles operativos vigentes.

La base rechaza modificaciones del snapshot, la conversión de trabajos antiguos NULL a un perfil inventado y la modificación/eliminación del baseline. Después de inicializar la política, tampoco admite nuevos trabajos NULL ni reactivar pendientes antiguos. El bloqueo asesor serializa admisión y cambios de política. El identificador `application_name=foxmind-api-ai-execution-v1` evita que un worker antiguo reclame o actualice trabajos modernos; es un control de compatibilidad, no una autorización de seguridad frente a clientes SQL privilegiados.

La primera inicialización falla con `AI_LEGACY_PENDING` si existe cualquier trabajo QUEUED/RUNNING sin identidad suficiente, incluso si el modelo configurado parece el mismo. Se debe detener la admisión, drenar esos trabajos con el despliegue Gemini anterior y su configuración original, detener los workers anteriores, aplicar la migración y arrancar la versión nueva. No se deduce el modelo histórico desde una configuración recién editada. Los resultados existentes se conservan. Esta entrega no realizó ese procedimiento sobre datos retenidos.

`AI_TEXT_PROFILES_JSON` permite configurar perfiles por tarea. Cambiar proveedor o modelo exige tarifas de entrada y salida explícitas. Claude requiere además `AI_ANTHROPIC_ENABLED=true` y `AI_ANTHROPIC_API_KEY`; no hay selección automática ni fallback. No se activó un modelo real nuevo.

## Fuentes y referencias

- [Arquitectura vigente](../architecture.md), [capacidades IA](README.md) y [registro propio](../../work-log/2026-11-16-root-ai-runtime-design.md).
- [Configuración actual](../../../apps/api/src/platform/ai/configuration.ts), [preparación Foxy](../../../apps/api/src/modules/foxy/turns/infrastructure/turn-preparation.ts) y [adaptador Estudio](../../../apps/api/src/modules/study/generation/infrastructure/providers/study-adapter.ts).
- [Claude: conteo](https://platform.claude.com/docs/en/api/messages/count_tokens) y [salidas estructuradas](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).
- [AI SDK: proveedores](https://ai-sdk.dev/docs/foundations/providers-and-models) y [configuración/reintentos](https://ai-sdk.dev/docs/ai-sdk-core/settings).

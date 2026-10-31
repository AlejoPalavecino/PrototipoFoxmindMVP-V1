# Extracción del plan de estudio con Gemini

La integración analiza el PDF/DOCX aprobado del borrador y propone unidades y temas. El docente puede editar la propuesta, confirmar que desea usarla y revisar el aula antes de crearla. El documento original conserva las validaciones y permisos de archivos privados existentes.

## Activación local

La capacidad está desactivada por defecto. La configuración se recibe mediante variables del proceso del **backend**; nunca desde variables `NEXT_PUBLIC_*` ni desde el navegador. No guardar credenciales en Git o en registros. El usuario confirmó Gemini API de Google AI Studio, no Vertex AI.

1. Instalar dependencias con `npm ci` y aplicar las migraciones en la base de desarrollo seleccionada mediante el procedimiento habitual del proyecto. La migración nueva añade la cola y el registro de consumo; no ejecutar contra una base retenida sin su autorización correspondiente.
2. Configurar las variables de IA descritas en `.env.example`. `AI_BACKEND=gemini-developer`, `AI_MODEL` y `AI_API_KEY` corresponden a la configuración de Google AI Studio. Elegir un modelo con entrada PDF y salida JSON estructurada; verificar su disponibilidad y precios actuales antes de habilitarlo.
3. Definir cuotas, precios por millón de tokens y presupuesto diario. Son límites propios de FoxMind; no reemplazan los controles de facturación de Google. Activar con `AI_ENABLED=true` y reiniciar el backend.
4. Probar primero un plan sintético. Comprobar análisis, edición y confirmación. Si no hay configuración válida, no se debe tratar una prueba con proveedor sintético como una llamada real a Gemini.

### Archivo privado de IA

Con la configuración habitual de identidad, PostgreSQL y archivos ya disponible en el proceso del backend, copiar el bloque de `.env.example` a `.env.ai.local` en la raíz del worktree. Ese nombre está ignorado por Git. No sustituye las demás variables de la aplicación. Completar:

```dotenv
AI_ENABLED=true
AI_BACKEND=gemini-developer
AI_MODEL=REEMPLAZAR_POR_MODELO_DISPONIBLE
AI_API_KEY=REEMPLAZAR_LOCALMENTE
AI_DAILY_ACTOR_REQUESTS=5
AI_DAILY_GLOBAL_REQUESTS=20
AI_MAX_INPUT_TOKENS=100000
AI_MAX_OUTPUT_TOKENS=16384
AI_DAILY_BUDGET_USD=2
AI_INPUT_USD_PER_MILLION=REEMPLAZAR_POR_TARIFA_ACTUAL
AI_OUTPUT_USD_PER_MILLION=REEMPLAZAR_POR_TARIFA_ACTUAL
AI_DEADLINE_MS=90000
AI_MAX_CONCURRENCY=2
AI_MAX_DISPATCHES=2
AI_MAX_JOB_AGE_MS=300000
```

Crear la clave en [Google AI Studio](https://aistudio.google.com/apikey), en el proyecto que tiene los créditos. Introducirla únicamente en el archivo privado o gestor de secretos. Seleccionar un modelo accesible para ese proyecto con PDF y JSON estructurado; copiar su identificador exacto y los precios actuales de entrada/salida por millón de tokens, incluyendo el tratamiento de los tokens de razonamiento. Los marcadores `REEMPLAZAR_*` deben sustituirse antes de iniciar: la configuración incompleta falla cerrada. El presupuesto de2USD y las cuotas del ejemplo son límites de prueba elegidos para FoxMind, no tarifas de Google.

Tras aplicar la migración `202610230001_classroom_ai` a la base de desarrollo elegida y compilar, iniciar el backend cargando explícitamente ese archivo:

```powershell
npm run api:build
node --env-file=.env.ai.local .build/api/apps/api/src/main.js
```

Node recibe el resto de la configuración habitual del entorno; si también se carga desde un archivo privado, pasarlo con otro `--env-file` antes del archivo de IA. El comando `npm run api:start` por sí solo no carga `.env.ai.local`. No definir una misma variable de IA con otro valor en el entorno padre. El frontend sigue apuntando al backend mediante su `FOXMIND_API_ORIGIN` habitual. El worker se inicia dentro del backend y usa las tablas PostgreSQL: no requiere Redis ni otro proceso.

Para comprobarlo: iniciar sesión con un docente verificado, crear un borrador, cargar un PDF o `.docx` de prueba, esperar aprobación y análisis, editar la propuesta y pulsar la confirmación para usarla. Revisar el último paso y crear el aula explícitamente. Si la llamada a Google falla, el trabajo muestra el fallo y permite continuar manualmente; un resultado incierto nunca se reenvía automáticamente. Volver a `AI_ENABLED=false` desactiva la capacidad al reiniciar.

## Comportamiento

- La carga segura permanece separada del análisis con IA. Solo se analiza un plan aprobado y vinculado al borrador del docente.
- La extracción inicial es automática. Reabrir el mismo borrador recupera el trabajo existente; no dispara una generación nueva por cada visita.
- La propuesta no modifica las unidades guardadas hasta su aplicación explícita. Si hay unidades manuales, se solicita confirmar su reemplazo.
- Un cambio de plan o la publicación del aula invalida resultados anteriores. Una respuesta tardía no sobrescribe ediciones.
- El docente puede continuar manualmente si el documento no tiene estructura reconocible, supera los límites de IA o Gemini falla.
- PDF: hasta 20 MB y 100 páginas para IA. DOCX: texto de párrafos y tablas, hasta 1.000 entradas ZIP, 32 MB descomprimidos y 200.000 caracteres. No se realiza OCR de imágenes incrustadas en Word; `.doc` antiguo no está admitido.

## Arquitectura y operación

El esquema enviado a Gemini conserva la estructura JSON, los campos requeridos y los objetos cerrados. Los tamaños de las listas se validan en FoxMind: hasta 100 unidades, 100 temas por unidad y 500 temas totales; no se envían como `maxItems` porque esa combinación provocó un 400 con el modelo probado. También se validan los nombres de hasta 120 puntos Unicode y los warnings permitidos. Una respuesta que exceda estos límites se rechaza; simplificar el esquema del proveedor no amplía el currículo aceptado.

Los contratos compartidos viven en `src/core/domain`. El módulo `apps/api/src/ai` contiene el adaptador Gemini y la configuración. El caso de uso de aulas, su cola PostgreSQL y su worker viven en `apps/api/src/classrooms/ai`. El lector de documentos pertenece a files y conserva la frontera de acceso privado. Futuras capacidades pueden reutilizar proveedor/configuración sin acoplar sus reglas de negocio al SDK.

PostgreSQL conserva trabajos, propuestas, revisiones y reservas de consumo. El worker reclama trabajos mediante leases y comprueba que mantiene su autorización antes de usar el archivo o guardar la respuesta. No mantiene una transacción SQL durante almacenamiento, parsing o llamadas a Google. El cierre del backend drena el worker antes de cerrar almacenamiento y conexiones.

Los estados son `QUEUED`, `RUNNING`, `READY`, `FAILED`, `STALE` y `APPLIED`. La aplicación confirma unidades y revisión en una transacción. Una misma solicitud de aplicación/reintento tiene identidad idempotente; una petición distinta con una revisión obsoleta se rechaza.

El análisis puede consumir crédito aunque se pierda la respuesta. Un resultado incierto no se reenvía automáticamente. Los reintentos explícitos siguen sujetos a cuotas. Los límites monetarios son reservas conservadoras calculadas con los precios configurados; revisar tarifas y modalidades del modelo antes de usar datos reales. No se promete facturación exactamente una vez.

Se envía el PDF inline o el texto extraído de DOCX; no se usan URLs públicas del archivo ni se habilitan herramientas, navegación, ejecución de código o acciones del modelo. No se persiste una copia del documento ni el prompt completo en los registros de IA. Evitar Files API no equivale a garantizar retención cero del proveedor.

## Pruebas y continuidad

Las pruebas `tests/classroom-ai-*.test.mjs` cubren contratos, adaptador controlado, documentos y trabajos en PostgreSQL descartable. `scripts/classroom-ai-live.mjs` levanta una sesión sintética con el backend real, Next, almacenamiento privado, scanner e inbox propios; usa un proveedor controlado y **no llama a Google**. Enviar Enter al proceso detiene y limpia sus recursos.

La evidencia y las limitaciones verificadas se mantienen en el [registro final del coordinador](../../work-log/2026-10-24-root-classroom-ai-final.md). El [documento de la capacidad](../../../odd/tasks/classroom-ai-extraction.md) conserva la decisión aprobada, los criterios de prueba y la división del trabajo. Este texto describe el objetivo de operación; el registro distingue lo comprobado de lo pendiente.

Fuentes oficiales: [documentos](https://ai.google.dev/gemini-api/docs/document-processing), [salida estructurada](https://ai.google.dev/gemini-api/docs/structured-output) y [SDK JavaScript](https://googleapis.github.io/js-genai/).

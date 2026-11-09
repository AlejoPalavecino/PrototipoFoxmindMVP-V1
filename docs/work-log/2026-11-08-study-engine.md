# Motor de estudio

Agente: `/root/study_engine`, worker delegado. Fecha: 2026-11-08. Rama inicial: main. Commit inicial: 1f46028a0e08833528ac2bdbe924e45ab8beb5b4. Worktree compartido, sin aislamiento.

Alcance autorizado por coordinador: motor puro de estudio privado conforme a propuesta aprobada. Superficie propia: apps/api/src/study-engine; sin HTTP, DB, secretos ni proveedor real. Preservar cambios ajenos.

Implementado: `apps/api/src/study-engine/index.ts` exporta `executeStudy`, `publicPractice`, `finalizePractice`, `generateDevelopmentFeedback`, `topicEvidence` y `planExam`, con tipos serializables. Provider inyectable recibe sistema/prompt y documentos adjuntos opcionales; PDF via bytes separado del JSON. No se ejecutó proveedor real.

CHAT/NOTE/OUTLINE/PLAN/QUIZ/EXERCISE/MOCK_EXAM producen resultados validados con referencias ID/versión. Sin fuentes devuelve insuficiencia sin llamar proveedor; el historial con dependencias revocadas se excluye. Extrae unidades/temas, valida opciones/correctas, limita entradas/salidas y rechaza HTML de salida. Las proyecciones activas incluyen únicamente campos públicos enumerados. Corrección EXACT/PARTIAL respeta la regla vigente: selección incorrecta puntúa cero; parcial sólo sobre correctas seleccionadas. Guarda fracciones serializables junto al cociente; sin notas oficiales. Desarrollo queda pendiente y una falla de devolución no muta respuestas. Evidencia por tema no diagnostica dominio. Cronograma deriva sesiones de disponibilidad explícita, con zona y avisos por insuficiencia, fecha pasada o superposición; no crea eventos.

Evidencia:

- RED: `node --experimental-strip-types --test apps/api/src/study-engine/engine.test.ts` falló por `ERR_MODULE_NOT_FOUND` antes de implementar el motor.
- GREEN: mismo comando, 7/7 pruebas aprobadas. Cubre insuficiencia, revocación, citas, PDF adjunto, HTML rechazado, cantidad de preguntas, corrección exacta/parcial, proyección, desarrollo/timeout sin pérdida, evidencia y calendario.
- `npx eslint apps/api/src/study-engine`: aprobado.
- `npx tsc --noEmit --strict --target ES2023 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --skipLibCheck apps/api/src/study-engine/index.ts apps/api/src/study-engine/engine.test.ts`: aprobado.
- Compilación global `npx tsc -p apps/api/tsconfig.json --noEmit`: aprobada al primer GREEN; posterior intento bloqueado por `study-folders/service.ts` importando `commands.ts` aún ausente durante escritura del otro worker. No se considera fallo del motor ni compilación final del candidato integrado.

Límites: autorización/revalidación transaccional, propiedad, idempotencia, almacenamiento, UI y Agenda quedan en backend/coordinador. Resultado de generación contiene práctica privada: no exponer markdown del proveedor para práctica activa; usar publicPractice. No se verifica calidad pedagógica Gemini con mocks. Adjuntos y fuentes deben provenir de lectura previamente autorizada. `evidence` sólo acepta temas de la solicitud; backend conserva aislamiento por carpeta. IDs de sesiones son locales a la propuesta y backend debe asignar identidad estable al persistir.

No commits ni despliegue. Estado: verificado motor puro; integración pendiente a cargo del coordinador. Primer paso: integrar proveedor real y servicio backend, luego ejecutar suite integrada y QA.

## Fortalecimiento posterior a integración

Pedido del coordinador: asegurar adaptación efectiva, selección múltiple válida, límites de contexto, fracciones y zona horaria. Se leyó `study-folders/commands.ts` y `types.ts` sin modificarlos. Aviso al backend: pasar evidence por carpeta/temas seleccionados; feedback recibe práctica privada/respuestas/fuentes y devuelve resultado con `orientative:true`; conservar intento finalizado en falla. Se señaló incompatibilidad temporal entre editor de sesiones antiguo y shape canónico, para reconciliación del coordinador. La proyección backend inspeccionada no incluía markdown privado de práctica.

RED adicional: nuevas pruebas fallaron por aceptar MULTIPLE con una sola correcta y timestamps sin offset. GREEN: corrección exige al menos dos correctas en MULTIPLE; valida colecciones/runtime, rechaza fuentes explícitamente no disponibles y roles de historial ajenos a user/assistant; elimina turnos sin procedencia o con cualquier referencia revocada. Normaliza campos para evitar reenviar metadata extra. La evidencia entra al prompt con instrucción explícita de priorización sin diagnósticos. Fechas requieren ISO con Z/offset, día calendario real y zona válida; salida normalizada UTC conserva zona de la sesión.

Verificación final de esta ronda:

- `node --experimental-strip-types --test apps/api/src/study-engine/engine.test.ts`: 11/11 aprobadas, incluyendo 1/3 exacto serializable, zona Argentina con offset y exclusión integral por revisión revocada.
- `npx eslint apps/api/src/study-engine`: aprobado tras correcciones principales.
- TypeScript aislado aprobado; `npx tsc -p apps/api/tsconfig.json --noEmit` finalmente aprobado con módulos backend ya presentes.

El motor permanece bajo 250 líneas, sin separación adicional de archivos. No se ejecutó Gemini ni se verificó UI. Autorización por carpeta y revalidación ante carreras siguen siendo responsabilidad del backend.

## Ubicación en dominio

Por pedido del coordinador se movió implementación a `src/core/domain/study-engine.ts`; `apps/api/src/study-engine/index.ts` conserva únicamente reexport compatible. No cambian exports ni comportamiento; UTF-8 de adjuntos de texto se mide con TextEncoder en lugar del global Node Buffer. Backend avisado de importar dominio directamente y coordinador avisado para adaptador IA.

Pruebas de aceptación sin cambios: 11/11 aprobadas. TypeScript API global y ESLint de dominio/wrapper/pruebas aprobados. `node scripts/check-boundaries.mjs` aún falla por dependencias de otros módulos/puentes en integración; el listado observado no contiene una dependencia saliente del dominio nuevo. No se modificó validador ni allowlist. Primer paso coordinador: reconciliar imports de composición pendientes y repetir control global.

## P2: continuidad después de respuestas extensas

Reviewer reprodujo respuesta válida mayor a 10.000 caracteres que luego no entraba en historia. RED nuevo reproduce dos turnos y falla `INVALID_STUDY_INPUT`. GREEN alinea admisión de cada turno histórico con los 80.000 puntos de código admitidos en salida. Para proveedor se conserva comienzo (8.000) y final (2.000) con marcador textual explícito y `contextTruncated:true`; no modifica historial persistido ni objeto recibido. Ventana conserva hasta 10 turnos de entrada máxima 20. Si contexto agregado supera 350.000 caracteres JSON, descarta los más antiguos e informa `historyWindowOmitted:true` únicamente al proveedor. Fuentes por sí mismas fuera de límite continúan devolviendo error de admisión.

Evidencia: pruebas motor 13/13, incluyendo secuencia de respuesta extensa/continuación y descarte agregado sin mutación; TypeScript API global y ESLint aprobados tras el fix principal. Backend recibió contrato y límites para conservar historia íntegra y seleccionar su ventana al llamar motor. No llamadas reales ni cambios de contenido guardado.

## Contenido estructurado sin duplicación Markdown

QA real del coordinador detectó práctica estructurada válida rechazada por markdown vacío. RED nuevo confirmó `INVALID_STUDY_OUTPUT`. GREEN permite markdown vacío sólo para QUIZ/EXERCISE/MOCK_EXAM con práctica semánticamente válida y PLAN con unidades/temas válidos. CHAT/NOTE/OUTLINE mantienen contenido textual obligatorio. Todas las salidas COMPLETE conservan citas válidas obligatorias y missingInformation vacío; INSUFFICIENT mantiene contrato estricto. Instrucción al modelo ajustada para expresar esta diferencia. No se modificó adaptador ni proyección de soluciones.

Verificación: motor 14/14 pruebas aprobadas; `npx tsc -p apps/api/tsconfig.json --noEmit` y ESLint dominio/motor/pruebas aprobados. No se ejecutó proveedor real por este agente.

## Admisión de práctica sin temas

QA del coordinador reprodujo selección vacía antes de quiz: el proveedor se invocaba y posteriormente ninguna pregunta podía validar un tema. Nueva prueba RED confirmó error tardío `INVALID_STUDY_OUTPUT`. GREEN exige al menos un tema antes del proveedor para QUIZ/EXERCISE/MOCK_EXAM, devolviendo `INVALID_STUDY_INPUT`; PLAN y las acciones de texto conservan temas opcionales. Pruebas motor 15/15 aprobadas, incluida comprobación de cero llamadas al proveedor. No se ejecutó build por indicación de serialización del coordinador.

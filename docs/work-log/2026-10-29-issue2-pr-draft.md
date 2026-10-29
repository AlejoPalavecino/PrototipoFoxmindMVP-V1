# Borrador de PR — corrección asistida por IA

**Issue:** #2. Pendiente elegir si la PR cerrará la issue al integrarse o si solo la referenciará.

## Resumen

- Genera propuestas privadas de corrección tras la entrega cuando el docente habilita la opción del aula; usa consignas y puntajes con rúbrica opcional.
- Permite revisar, editar, aplicar o descartar la propuesta. Aplicar guarda una corrección privada; la publicación continúa siendo explícita.
- Protege el procesamiento de respuestas y archivos con controles de acceso, custodia, vigencia y presupuesto compartido.

## Validación

- Suite `grading-ai-*` completa y pruebas posteriores enfocadas: PASS; registro de comandos y límites en [work log](2026-10-29-root-issue2-correccion-ia.md).
- Flujos sintéticos de los tres tipos y TP con PDF, PostgreSQL, almacenamiento y scanner temporales: PASS con proveedor de IA simulado.
- API y web build, tipos, Prisma y análisis de secretos: PASS.
- Revisión visual sintética y auditoría independiente realizadas.
- Un fallo previo del test concurrente P7 no se reprodujo en diagnóstico posterior; su causa permanece desconocida.
- No se verificó Gemini real ni un recorrido completo autenticado; la última corrección del número de pregunta tiene prueba de componente, sin nueva captura visual.

## Estrategia elegida

El diff completo alcanza 3092 líneas añadidas/eliminadas. El usuario eligió PRs encadenadas con rama integradora; el detalle está en el [registro de cadena](2026-10-29-root-cadena-issue2.md). Confirmar publicación remota antes de crear PR o ramas remotas. No se autorizó despliegue.

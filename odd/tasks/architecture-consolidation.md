# Consolidación del monolito modular de FoxMind

Preparar las capacidades existentes para continuar el desarrollo con bajo acoplamiento, responsabilidades claras y verificaciones reproducibles. Este es el plan único de nueve etapas: los agentes actualizan aquí el detalle y el coordinador mantiene el resumen del [roadmap](../../docs/implementation-roadmap.md#estado-actual).

## Estado y primer paso

- Fecha: 2026-11-02. Versión: 1.0.
- Estado del trabajo: ARQ-01 `completed`, aprobada por el usuario el 2026-11-02; ARQ-02 `completed`, verificada localmente por /root el mismo día. ARQ-03 `completed`: [diseño aprobado](architecture-consolidation-arq03-design.md) por el usuario el 2026-11-02, alternativa B, contrato de extracción y excepciones. ARQ-04 `completed`, guard verificado localmente el 2026-11-02. ARQ-05 `completed`, extracción y paridad verificadas localmente el 2026-11-02. ARQ-06 `completed`, capacidades y contratos verificados localmente el 2026-11-02. ARQ-07 `completed`, paridad y navegación verificadas localmente el 2026-11-02. ARQ-08 `completed`, coordinación, lifecycle y mediciones verificadas el 2026-11-02. ARQ-09 `completed`, regresión integrada y revisión independiente cerradas localmente el 2026-11-02.
- Autorización vigente: alcance incremental de [ARQ-01 aprobado](architecture-consolidation-arq01-matrix.md), ejecución de ARQ-02 y preparación documental de ARQ-03 solicitadas explícitamente el 2026-11-02. El usuario aprobó explícitamente el diseño ARQ-03 con alternativa B, contrato de extracción y excepciones, y solicitó registrar su cierre. Después asignó ARQ-04 y ARQ-05. El usuario asignó ARQ-06 para reducir el acoplamiento de Classrooms y luego asignó ARQ-07 para consolidar los contratos y la experiencia afectada. ARQ-08 se ejecutó por asignación explícita para ordenar admisión y diagnóstico. El usuario asignó ARQ-09 para verificar y cerrar. La preparación inicial solo autorizaba guardar/enlazar el plan; esta actualización conserva esa historia sin reutilizarla como consentimiento.
- Última unidad cerrada: **ARQ-09**, [evidencia de regresión y límites](../../docs/work-log/2026-11-02-id-unavailable-arq09-verification.md) y [revisión independiente](../../docs/work-log/2026-11-02-arq09_review-independent.md). **ARQ-08**, admisión de IA compartida y ejecución verificada. [Registro y evidencia](../../docs/work-log/2026-11-02-id-unavailable-arq08-execution.md). ARQ-07 conserva su [cierre](../../docs/work-log/2026-11-02-id-unavailable-arq07-contracts.md). ARQ-06 conserva su [cierre](../../docs/work-log/2026-11-02-id-unavailable-arq06-capabilities.md). ARQ-05 conserva su [cierre](../../docs/work-log/2026-11-02-id-unavailable-arq05-attachments.md). ARQ-04 conserva su [cierre](../../docs/work-log/2026-11-02-id-unavailable-arq04-boundaries.md). ARQ-03 conserva su [diseño aprobado](architecture-consolidation-arq03-design.md) y [registro de cierre](../../docs/work-log/2026-11-02-id-unavailable-arq03-design.md). ARQ-02 conserva su cierre y [evidencia de ejecución y límites](../../docs/work-log/2026-11-02-id-unavailable-arq02-verification.md). El siguiente trabajo funcional requiere aprobación propia.
- El agente debe leer su etapa, las fuentes pertinentes y el [protocolo de registros](../../docs/work-log/README.md), y reconciliar Git antes de actuar.
- La asignación de un agente debe indicar su alcance de lectura/escritura. Este plan no reemplaza la aprobación humana de cambios relevantes de arquitectura, datos, permisos o UX, ni autoriza commits, push, PR, merge o despliegue.

## Fuentes y precedencia

1. Decisiones vigentes del usuario y reglas de negocio entregadas para este plan.
2. Contratos y especificaciones aprobados; sus diferencias con las nuevas reglas deben quedar explícitas.
3. Código y verificaciones observados del candidato de cada etapa.
4. Auditorías e historial, como evidencia fechada y propuestas.

La fuente de negocio es `foxmind_reglas_de_negocio_desarrollo.md`, versión 1.0, decisiones del 2026-11-02, entregada fuera del repositorio en `C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/foxmind_reglas_de_negocio_desarrollo.md`. SHA-256 de los bytes leídos: `1a0adba05a18a555ae2e163c651a0fc9f7003efbd94e1b9c96d0da3e7e6e8fc2`. El archivo externo no fue copiado ni modificado. Si no está disponible en otro entorno, obtener la fuente del usuario antes de completar su matriz; este resumen no reemplaza sus reglas detalladas. Separar `FM-*` acordado, `PT-*` propuesto, `PD-*` pendiente y `CA-*` aceptación derivada todavía no ejecutada.

Fuentes del proyecto: [especificación funcional](../../docs/foxmind-v1-functional-spec.md), [arquitectura actual](../../docs/engineering/architecture.md), [verificación](../../docs/engineering/testing/README.md), [operación local](../../docs/engineering/local-development/operation.md) y [remediación anterior](audit-remediation.md).

## Reglas que gobiernan el diseño

- FM-ID-01/02: una cuenta por persona; identidad, autorización académica y capacidad comercial son dimensiones separadas. PD-21 conserva abierta la compatibilidad de roles; no introducir doble rol por inferencia.
- FM-AUL-01/02 y FM-INS-04: el aula es independiente; el docente administra la participación. Financiar licencias no concede administración del aula.
- FM-INS-01/02/03: vínculo confirmado para reportes agregados; ninguna nota o entrega individual por condición institucional. Desvincular corta ese acceso sin eliminar el aula.
- FM-IA-01/02: capacidad reunida por persona y utilizable entre sus aulas autorizadas; cada fuente conserva origen, remanente y ciclo. No imponer bolsas comerciales por aula o institución de origen.
- FM-IA-03/04/06: incluido antes que extras; el incluido no acumula sobrantes al reiniciar; los extras no se reinician ni se pierden por cambios institucionales.
- FM-IA-07/08/09: reasignar transfiere solo el remanente con su fecha de reinicio; revocar afecta solo esa fuente; el consumo corresponde al iniciador.
- FM-COM-03 y FM-IA-10: agotamiento comercial restringe nuevas acciones IA, conservando flujos manuales y resultados bajo sus permisos.
- FM-AUL-03/04/05/06/07: transferencia requiere aceptación; archivar, ocultar, salir y eliminar son operaciones distintas. Salir de un aula archivada es un cambio de producto que debe tratarse explícitamente.
- FM-ARQ-01: mantener el monolito modular. No convertir a la institución en propietaria de todos los datos académicos ni imponer espacios institucionales como condición de consumo.

## Alcance de la consolidación

Conservar el stack y las garantías existentes; mejorar límites, contratos, propiedad de escrituras, pruebas, observabilidad y capacidad de incorporación de desarrolladores. El diseño considerará identidad, aulas/participación, enseñanza/evaluación, archivos, instituciones/vínculos, suscripciones/licencias, capacidad/consumo, IA y reportes. Agenda e Inicio conservan sus responsabilidades. Los límites y excepciones del diseño ARQ-03 están aprobados; no implican paquetes obligatorios ni tablas comerciales aprobadas.

Separar presupuesto técnico del proveedor y futura capacidad comercial del usuario. Un saldo comercial no elude autorización, límites operativos ni controles de gasto global.

No implementar en esta consolidación nuevas funciones de suscripciones, cobros, licencias, extras, reportes, transferencias, ocultamiento, doble rol o eliminación definitiva. Sus puntos de integración pueden diseñarse; cada feature tendrá alcance y aceptación propios. No crear módulos vacíos ni un motor comercial incompleto solo para representar el mapa. Evitar mezclar refactors con cambios de comportamiento o rediseños generales.

## Calendario orientativo y dependencias

Estimación inicial: **6–9 semanas de trabajo efectivo**, con una persona dedicada, decisiones disponibles y entornos de prueba operativos. No es un plazo comprometido ni una garantía de paralelismo. La implementación no tiene fecha de inicio. Si hubiera comenzado el 2026-11-02, la ventana conversada era mediados de diciembre de 2026 a comienzos de enero de 2027, ajustable por feriados y disponibilidad. Reestimar tras ARQ-03 y tras ARQ-05.

| ID | Etapa | Ventana relativa | Depende de | Estado |
|---|---|---|---|---|
| ARQ-01 | Fijar alcance y diferencias | Semana 1 | Asignación y fuente de negocio disponible | completed — alcance aprobado 2026-11-02 |
| ARQ-02 | Recuperar verificación continua | Semanas 1–2 | ARQ-01: alcance técnico delimitado | completed — verificación local 2026-11-02 |
| ARQ-03 | Aprobar diseño de límites | Semana 2 | ARQ-01 | completed — diseño B, contrato y excepciones aprobados 2026-11-02 |
| ARQ-04 | Fortalecer controles de arquitectura | Semana 3 | ARQ-02 y diseño ARQ-03 aprobado | completed — guard y revisión local verificados 2026-11-02 |
| ARQ-05 | Separar Files de decisiones académicas | Semanas 3–4 | ARQ-04 y contrato de extracción aprobado | completed — paridad local 13/13 antes y después, revisión independiente |
| ARQ-06 | Reducir acoplamiento de Classrooms | Semanas 4–6 | ARQ-05 y evaluación de su resultado | completed — paridad local de capacidades y host |
| ARQ-07 | Consolidar contratos y frontend | Semanas 6–7 | ARQ-06 en la capacidad afectada | completed — contratos, host y navegación comprobados |
| ARQ-08 | Ordenar ejecución y diagnóstico | Semanas 7–8 | ARQ-06; coordinación con ARQ-07 | completed — admisión, lifecycle y mediciones locales |
| ARQ-09 | Verificar y cerrar consolidación | Semanas 8–9 | ARQ-01 a ARQ-08 completas | completed |

La superposición permite análisis o documentación en superficies distintas. No habilita escritores simultáneos sobre archivos compartidos. ARQ-03 puede avanzar mientras ARQ-02 restaura comprobaciones. El coordinador fija el orden efectivo antes de despachar.

## Etapas y criterios de cierre

### ARQ-01 — Fijar alcance y diferencias

**Cierre:** [matriz de 59 reglas/invariantes/casos](architecture-consolidation-arq01-matrix.md), [registro](../../docs/work-log/2026-11-02-id-unavailable-arq01-matrix.md). Relevamiento entregado y alcance recomendado aprobado explícitamente por el usuario («Apruebo ARQ-01», 2026-11-02). Las features separadas y PD permanecen abiertas; no se declaró aceptación funcional de los CA ni se modificaron código o datos durante ARQ-01.

**Trabajo:** comparar reglas FM y casos CA con código, especificación y pruebas actuales. Construir una matriz con regla, rutas, comportamiento observado, diferencia, tratamiento, pendiente PD, aceptación y evidencia. Clasificar refactor sin cambio funcional, defecto confirmado y feature nueva; no convertir todo CA futuro en una regresión actual. Registrar bloqueantes y preservar trabajo ajeno.

**Salida:** matriz recuperable en este documento o en un anexo enlazado si su tamaño lo justifica; alcance de consolidación revisado por el usuario. Identificar expresamente rol exclusivo, salida de aula archivada, transferencia, representación institucional y saldo por fuentes. No alterar código, contratos ni datos para resolver discrepancias durante el relevamiento.

### ARQ-02 — Recuperar verificación continua

**Cierre local:** [coordinación y evidencia](../../docs/work-log/2026-11-02-id-unavailable-arq02-verification.md), [revisión independiente atribuida](../../docs/work-log/2026-11-02-arq02_review-independent.md). Inventario496 archivos:443 ejecutables y53 exclusiones justificadas;23 rutas. Descubrimiento cubre tests/apps/src, sin ejecución automática de opt-in/proveedor. Fast completo264 archivos:1432 PASS/0 FAIL/0 SKIP; CI representativo108+35 PASS. Los52 archivos DB nuevos junto al código tienen ejecución completa aprobada por selecciones sucesivas; rol exclusivo6/6 y servicios propios2/2 PASS, cleanup comprobado. Contratos de tipos incluidos en compilación estricta; límites y fallos iniciales conservados. Se corrigieron preparación/runners/fixtures y expectativas obsoletas sin cambiar lógica de producto ni migraciones. No es una pasada íntegra de los grupos118DB/9servicios/42navegador/wrappers ni un despliegue. Riesgo residual early413/upload del cliente documentado; la mitigación de fixture no garantiza toda interacción de transporte.

**Trabajo:** reconciliar inventario con pruebas en `tests/` y junto al código; clasificar ejecución pura, transporte, DB, servicios, navegador, manual y proveedor real. Integrar solo pruebas seguras en sus rutas apropiadas. Diagnosticar el test fallido sin debilitar su aceptación; revisar si el defecto está en fixture, prueba o producto antes de corregir. No ejecutar pruebas opt-in o proveedores reales por descubrimiento automático.

**Salida:** inventario y rutas válidos, pruebas nuevas alcanzadas por CI, omisiones explicadas y selección aplicable ejecutada con preparación/cleanup propios. Registrar tiempos y fallos; nunca convertir un diagnóstico con una prueba modificada en memoria en PASS del archivo versionado.

### ARQ-03 — Aprobar diseño de límites

**Trabajo:** producir mapa de dependencias y matriz de datos: propietario de escritura, lectores, operaciones públicas, invariantes, transacción y excepciones de integración. Comparar conservar composición actual con extracciones incrementales concretas. Acotar APIs de host frente a APIs de consumo; revisar exposición de `ports`, `run`, store, storage y scanner. Delimitar responsabilidades futuras sin diseñar tablas comerciales definitivas.

**Salida:** diseño relevante aprobado, dependencias permitidas y excepciones justificadas, primera extracción especificada, decisiones PD bloqueantes identificadas. Registrar ADR breve solo para decisiones duraderas aprobadas. Los precios y calendarios comerciales no bloquean la limpieza mecánica de límites existentes.

**Avance 2026-11-02:** [propuesta ARQ-03](architecture-consolidation-arq03-design.md) preparada con tres alternativas, mapa de dependencias, propiedad de escrituras/lectores, transacciones, APIs de host/consumo, excepciones y contrato de primera extracción. Cierre: el usuario aprobó explícitamente la alternativa B, el contrato de extracción y las excepciones; ARQ-03 completed. ADR breve incorporado al diseño. No hay implementación iniciada. [Evidencia y siguiente acción](../../docs/work-log/2026-11-02-id-unavailable-arq03-design.md).

### ARQ-04 — Fortalecer controles de arquitectura

**Seguimiento TTP — DONE.** Ejecución asignada por el usuario el 2026-11-02. Responsable: /root. Depende del cierre de ARQ-02 y del [diseño aprobado ARQ-03](architecture-consolidation-arq03-design.md). [Registro de ejecución](../../docs/work-log/2026-11-02-id-unavailable-arq04-boundaries.md).

| Resultado verificable | Depende de | Estado | Aceptación y evidencia |
|---|---|---|---|
| Pruebas del guard | Diseño aprobado | DONE | RED inicial 5/9 y pruebas verdes del candidato. Cobertura de APIs permitidas, imports prohibidos, clasificación de ciclos y excepciones exactas |
| Guard y línea base | Pruebas del guard | DONE | El guard del repo pasa con 336 entradas exactas y cero obsoletas |
| Verificación y cierre | Guard y línea base | DONE | 18/18 pruebas focales, lint integrado, documentación y [revisión independiente](../../docs/work-log/2026-11-02-arq04_review-independent.md) sobre los mismos cuatro hashes |

**Trabajo:** cubrir formas de import relevantes, incluidos tipos inline; controlar las dependencias aprobadas y detectar ciclos según su clase. Distinguir imports de valor, tipos, reexports y carga dinámica de un fallo de inicialización real. Retirar excepciones obsoletas y congelar un inventario explícito de las que se conservarán temporalmente.

**Salida:** pruebas del guard demuestran aceptación del diseño permitido y rechazo de accesos internos, relaciones prohibidas y nuevos ciclos; el código existente cumple la línea base acordada. No declarar eliminados ciclos que solo se redirigieron a un barril público.

### ARQ-05 — Separar Files de decisiones académicas

**Seguimiento TTP — DONE.** Asignada por el usuario el 2026-11-02. Responsable /root. [Contrato aprobado](architecture-consolidation-arq03-design.md#primera-extracción-propuesta-adjuntos-de-entregas) y [registro de ejecución](../../docs/work-log/2026-11-02-id-unavailable-arq05-attachments.md).

| Resultado verificable | Depende de | Estado | Aceptación |
|---|---|---|---|
| Caracterización | ARQ-04 y contrato aprobado | DONE | Casos existentes de permisos y cupos, más comprobación de visibilidad desde dos conexiones y reintento idempotente |
| Extracción | Caracterización | DONE | Compilación estricta y guard verdes. Files aporta custodia y reservas, Entregas aplica política y escribe asociación/revisión, host inyecta el puente |
| Verificación y cierre | Extracción | DONE | PostgreSQL y Prisma 13/13 antes y después. Compilación y guard verdes. [Revisión independiente](../../docs/work-log/2026-11-02-arq05_review-independent.md) |

**Trabajo:** usar el bridge de adjuntos como primera extracción: Files controla custodia/validación/escaneo; la capacidad académica decide elegibilidad y asociación. Conectar operaciones o puertos explícitos desde composición. Mantener las operaciones necesarias en la misma transacción; no sustituir autorización síncrona por eventos posteriores.

**Salida:** pruebas antes/después preservan permisos, editor vigente, cuotas, adjuntos rechazados/no disponibles, asociación única, cancelación, recuperación y semántica temporal de entrega. No cambia el contrato exterior. Evaluar el beneficio de la extracción y reestimar ARQ-06 antes de repetir el patrón.

### ARQ-06 — Reducir acoplamiento de Classrooms

**Seguimiento TTP — DONE.** Asignada el 2026-11-02. Responsable /root. [Diseño aprobado](architecture-consolidation-arq03-design.md) y [registro](../../docs/work-log/2026-11-02-id-unavailable-arq06-capabilities.md).

| Resultado verificable | Depende de | Estado | Aceptación |
|---|---|---|---|
| Contratos y permisos | ARQ-05 | DONE | RED del token y GREEN de host, admisión, permisos de transporte y lectores |
| Separación de capacidades | Contratos y permisos | DONE | Operaciones compartidas fuera de Plan y Drafts. Cableado y consumidores más estrechos. 9 excepciones retiradas |
| Verificación y cierre | Separación de capacidades | DONE | Compilación y guard con 146 excepciones. SQL, HTTP, host real y [revisión independiente](../../docs/work-log/2026-11-02-arq06_review-independent.md) |

**Trabajo:** extraer por capacidades cohesionadas detrás de compatibilidad temporal; separar participación, enseñanza y evaluación donde el diseño aprobado lo justifique. Reducir fachada, dependencias compartidas y acceso genérico a SQL; sustituir el token engañoso de composición bajo una transición compatible. Identificar lectores transversales de Inicio/Agenda y preservar sus permisos.

**Salida:** unidades pequeñas con contratos concretos, responsabilidad de escrituras y transacciones identificada; consumidores migrados y recorridos afectados comprobados. Reducir excepciones por unidad. No se exige eliminar toda deuda histórica ni cambiar de ORM para completar esta etapa.

### ARQ-07 — Consolidar contratos y frontend

**Seguimiento TTP — DONE.** Asignada el 2026-11-02. Responsable /root. Depende de ARQ-06. [Registro](../../docs/work-log/2026-11-02-id-unavailable-arq07-contracts.md).

| Resultado verificable | Depende de | Estado | Aceptación |
|---|---|---|---|
| Contrato de generación | ARQ-06 | DONE | Parser compartido y DTO de respuesta. Corpus de proxy y replay conservado |
| Aislamiento del cliente | Contrato | DONE | Regresiones de cierre tardío, CSRF y sesión. Rutas existentes para recarga y Atrás |
| Verificación y cierre | Aislamiento | DONE | 43 pruebas focales, 25 de host/idempotencia y navegador de producción con recarga, Atrás y Adelante. Builds y guard verdes. [Revisión independiente](../../docs/work-log/2026-11-02-arq07_review-independent.md) |

**Trabajo:** fijar fuente canónica para esquemas de las capacidades afectadas y comprobar paridad backend–proxy–cliente. Mantener políticas del BFF y autorización en servidor. Definir propiedad de datos del servidor, navegación persistente e interacción transitoria; introducir mejoras concretas por recorrido. No imponer generador, librería de caché ni cambio de router sin evaluación y aprobación cuando corresponda.

**Salida:** validación de contratos, códigos/errores y límites preservados; navegación afectada admite recarga, volver y enlaces según el flujo aprobado; respuestas tardías/cambio de identidad no restauran datos privados. Verificar responsive y accesibilidad cuando cambie UI. CSS o rediseños amplios requieren otra unidad; no mezclarlos con persistencia.

### ARQ-08 — Ordenar ejecución y diagnóstico

**Seguimiento TTP — DONE.** Asignada el 2026-11-02. Responsable /root. Depende de ARQ-06 y se coordina con ARQ-07. [Registro](../../docs/work-log/2026-11-02-id-unavailable-arq08-execution.md).

| Resultado verificable | Depende de | Estado | Aceptación |
|---|---|---|---|
| Inventario y evidencia base | ARQ-06/07 | DONE | Política por worker, diferencias de admisión y medición previa registradas |
| Coordinación compartida | Inventario | DONE | Catálogo y lock centralizados. Compilación y guard verdes |
| Verificación y mediciones | Coordinación | DONE | Admisión 74/74, presupuesto 32/32, lifecycle con reintento de infraestructura registrado y mediciones de fixture. [Revisión independiente](../../docs/work-log/2026-11-02-arq08_review-independent.md) |

**Trabajo:** catalogar workers, leases, idempotencia, reintentos, presupuestos y cierre; acotar la coordinación compartida de IA para no repetir el conocimiento de todas las colas. Conservar políticas de fallo y gasto vigentes. Medir latencia por operación, espera de conexiones/locks, antigüedad de trabajos y consumo técnico. Distinguir métricas completas de diagnósticos deduplicados.

**Salida:** preparación reproducible y pruebas de reinicio, drenaje, recuperación, concurrencia y ausencia de duplicados en el alcance afectado. Mediciones con candidato, datos y condiciones explícitos; no prometer capacidad productiva ni aumentar límites sin evidencia. Separar proceso worker, agregar infraestructura o modificar comportamiento de polling requiere decisión acorde a su impacto.

### ARQ-09 — Verificar y cerrar consolidación

**Seguimiento TTP — DONE.** Asignada el 2026-11-02. Responsable /root. Depende de ARQ-01 a ARQ-08. [Registro](../../docs/work-log/2026-11-02-id-unavailable-arq09-verification.md).

| Resultado verificable | Depende de | Estado | Aceptación |
|---|---|---|---|
| Candidato e inventario | ARQ-01 a ARQ-08 | DONE | Huellas e inventario/rutas vigentes |
| Regresión | Candidato | DONE | Permisos, custodia, entregas, publicación, recuperación y recursos propios |
| Cierre e incorporación | Regresión | DONE | Evidencia independiente, guía y siguiente trabajo funcional |

**Trabajo:** reconciliar evidencias de las etapas; ejecutar regresión integrada proporcional al cambio total y revisión independiente de riesgos. Comprobar instalación con recursos propios, permisos, archivos, entregas, corrección/publicación y recuperación afectados. Actualizar guía breve de incorporación, APIs y decisiones vigentes, conservando historia.

**Salida:** todas las salidas obligatorias observadas, sin fallos bloqueantes; exclusiones y riesgos residuales explícitos, recursos propios cerrados y evidencia atribuida al candidato. Un desarrollador puede localizar regla, capacidad, contrato, datos y pruebas desde las guías. El coordinador actualiza el roadmap y entrega el primer siguiente trabajo funcional, sin inferir publicación o despliegue.

## Pendientes de negocio y momento de resolución

| Antes de diseñar o habilitar | Decisiones necesarias |
|---|---|
| Cambios de roles, codocentes o transferencia | PD-21 y aspectos aplicables de PD-02/04 |
| Representantes y vínculos de reportes | PD-03 y PD-20 |
| Consumo comercial y reservas | PD-10, PD-12, PD-15 y PD-16 |
| Reinicios y suscripciones | PD-08 y PD-11; PD-09 antes de publicar asignaciones/precios |
| Compra/uso de extras | PD-13 y PD-14 |
| Reportes institucionales | PD-06 y PD-07 |
| Archivo y tareas ya iniciadas | PD-17 |
| Eliminación definitiva | PD-05 |
| Garantías operativas y pantallas de saldo | PD-18 y PD-19, respectivamente |

No cerrar estos pendientes con números de ejemplos EJ, defaults técnicos o suposiciones de un agente. La autorización por aula no demuestra soporte de doble rol. La agregación de reportes no demuestra anonimato por sí sola.

## Coordinación, pruebas y evidencia

- Un coordinador mantiene estados y asigna responsables. Cada agente escribe su propio registro y devuelve etapa, rutas, resultado, evidencia y siguiente acción. Solo el coordinador actualiza el resumen compartido.
- Cada encargo incluye objetivo, fuentes exactas, superficie de escritura, prohibiciones, entregable y criterio de éxito. Paralelizar solo con superficies disjuntas o worktrees; no revertir trabajo ajeno. La revisión independiente se justifica por riesgo, no por ceremonia.
- Antes de código: alcance, contratos/aceptación y decisiones relevantes aprobados, más autorización de implementación. Test-first cuando corresponda; no debilitar pruebas de aceptación para obtener GREEN.
- Evidencia mínima: comando exacto, salida/exit, candidato, preparación, cobertura, omisiones y cleanup. Respetar los límites de la [guía de pruebas](../../docs/engineering/testing/README.md); no ampliar plazos ni repetir barridos ante fallos sin diagnóstico.
- No acceder a secretos, datos productivos, entornos retenidos ni proveedores reales sin autorización específica. Los fixtures se limitan a recursos sintéticos propios.
- Las verificaciones de código y UI dependen del alcance. Para esta preparación exclusivamente documental bastan integridad, enlaces y revisión del diff; no es aceptación de las nueve etapas.

### Antecedentes de auditoría, no pruebas de esta entrega

En la revisión conversacional sobre add38ec se observaron: tipos API/web y lint/guard aprobados; 11 pruebas de guard/contratos aprobadas; dos archivos Foxy con 27 PASS/1 FAIL; `run-complete-suite.mjs --check` falló por `tests/exclusive-account-role.test.mjs` sin clasificar. Se contaron 130 archivos de pruebas en `apps/` sin entrada explícita en inventario/rutas. El diagnóstico del fallo de Foxy, esperando una preparación asíncrona solo en memoria, no corrigió la prueba versionada. Revalidar al iniciar ARQ-02; no reutilizar estos conteos como línea base actual sin comprobar el candidato.

## Cierre y siguiente entrega

- [x] ARQ-01 a ARQ-09 cumplen sus criterios y enlazan registros con evidencia.
- [x] Responsabilidad de datos, APIs y excepciones reflejan el código entregado.
- [x] Controles y CI incorporan las pruebas pertinentes, con omisiones explícitas.
- [x] Garantías críticas y mediciones quedan comprobadas en su alcance real.
- [x] Guías permiten retomar sin reconstruir el chat.
- [x] Primera feature posterior especificada o pendientes que impiden hacerlo identificados.

Las nuevas features seguirán un roadmap propio: representación/vínculos, licencias, capacidad/consumo, contratación y reportes según dependencias aprobadas. No tienen fechas comprometidas en este plan. Registro de esta preparación: [coordinador documental](../../docs/work-log/2026-11-02-id-unavailable-architecture-plan.md).

Primera propuesta funcional después de la consolidación: salida voluntaria de un aula archivada (FM-AUL-06 y CA-10). Antes de especificar el cambio, aprobar la excepción y su confirmación en la interfaz, resolver la readmisión aplicable de PD-04 y delimitar la conservación de entregas sin introducir purgas (PD-05). Consultar PD-17 si el alcance alcanza trabajos en curso. La [matriz](architecture-consolidation-arq01-matrix.md) conserva el comportamiento y la prueba vigentes como referencia para actualizar la aceptación con aprobación humana.

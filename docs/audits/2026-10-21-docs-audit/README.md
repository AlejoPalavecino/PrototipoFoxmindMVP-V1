# Auditoría de documentación de FoxMind

**Conclusión: no falta documentación; falta una entrada clara, una lectura temporal consistente y una base de proyecto identificada.** La evidencia técnica está bien conservada, pero hoy se mezclan reglas de producto, guías operativas, estados de implementación y conversaciones históricas. Reordenar carpetas sin resolver eso trasladaría el problema.

Fecha local: **21 de octubre de 2026**. Alcance: carpeta `docs` de este workspace, con contraste selectivo de documentos rectores en otros worktrees. **Auditoría y propuesta, no reorganización aprobada ni nueva verificación funcional.**

## Lectura rápida

1. Resolver primero **desde qué rama se organizará la documentación del proyecto**: este checkout llega a P3; el `main` local documenta P9.
2. Corregir las contradicciones de estado antes de mover archivos.
3. Crear un índice de documentación y mantener un único resumen de avance: el roadmap.
4. Agrupar por tema; mostrar «terminado / en curso / pendiente» como vistas del roadmap, no como carpetas por las que viajan los documentos.
5. Conservar registros, atribución, fallos y evidencias; no borrar el historial ni reetiquetar verificaciones antiguas como actuales.

Entregables de esta auditoría:

- [Inventario completo por archivo](inventory.csv): ruta, tipo, fase orientativa, tamaño, hash, seguimiento Git, enlaces entrantes y destino propuesto.
- [Resultados estáticos y enlaces inspeccionados](checks.json).
- [Validador reproducible](audit_docs.py), sin dependencias adicionales.
- [Registro del trabajo](../../work-log/2026-10-21-root-docs-audit.md).

## 1. Alcance, corte y límites

### Base inspeccionada

| Dato | Observación |
|---|---|
| Workspace | `C:\Users\alejo\Documents\ProyectosAlejo\FoxMind\ProtipoFoxMind` |
| Rama | `feat/p33-token-flows` |
| HEAD | `5e86d1e58afaae8856778f840027f724db36adf0` |
| Corte del inventario | 21/10/2026, 23:57:49 Argentina; `2026-10-22T02:57:49.617553+00:00` |
| Archivos preexistentes en el corte | **145**, excluyendo esta carpeta de auditoría y su registro propio |
| Distribución | **100 Markdown, 41 PNG y 4 JSON** |
| Volumen | **45.908.021 bytes**, aproximadamente 43,78 MiB |
| Markdown | **7.495 líneas**; no se copiaron prompts ni datos privados al informe |
| Seguimiento Git | **112 archivos versionados, 33 sin seguimiento** dentro del inventario |

Al inicio había 131 archivos; durante la inspección aparecieron dos familias de seis archivos (`foxmind-original-brand-options` y `foxmind-exploration-round3`) y registros de tercera/cuarta ronda. El inventario final los incluye. Esto prueba cambios de archivos durante la auditoría, **no quién los hizo ni si un agente sigue ejecutándose**. Se fija un corte explícito para no perseguir indefinidamente cambios concurrentes; cualquier archivo posterior requiere actualizar el inventario, no queda auditado automáticamente.

### Qué se revisó

- Inventario exhaustivo, extensiones, tamaños, SHA256 y clasificación de los 145 archivos del corte.
- Coherencia de documentos rectores, especificación, contratos y guías técnicas; lectura dirigida de alcance, estado y handoff de los 73 registros fechados.
- Navegación local, referencias Markdown/HTML reconocidas, anclas, encabezados y consistencia básica de tablas.
- JSON, referencias internas del OpenAPI, nombres de scripts documentados y manifiestos de las dos familias visuales.
- Git local y divergencia documental entre worktrees. Lecturas puntuales fuera de `docs`: README raíz, AGENTS, tareas P3, package y metadatos Git.

**No se hizo:** auditoría funcional o de seguridad de la aplicación, ejecución de builds/tests/servicios, comprobación de URLs externas, verificación remota de publicaciones, aceptación visual de las imágenes, cambios de rama, integración, stage, commit, push, borrados o lectura de secretos. Los resultados funcionales citados pertenecen a sus registros históricos. El análisis de otros worktrees es comparativo, no una auditoría completa de sus carpetas `docs`.

## 2. Lo que conviene conservar

- La [especificación funcional](../../foxmind-v1-functional-spec.md) distingue reglas confirmadas de propuestas y exclusiones.
- El [protocolo de registros](../../work-log/README.md) exige atribución, alcance, pruebas observadas y handoff; evita inventar identidades y preservar sólo resultados favorables.
- Las pruebas de escritor, independientes y revisiones nativas tienen atribuciones y límites explícitos. Deben conservarse separados.
- El [OpenAPI](../../api/accounts-sessions.openapi.json) ya documenta doce operaciones implementadas y conserva políticas concretas.
- Las 29 referencias originales tienen catálogo; los doce mockups nuevos tienen manifiestos con dimensiones y hashes.
- El roadmap ya define responsabilidades entre especificación, tareas y registros. No hace falta sustituir todo el sistema; hace falta aplicarlo de forma consistente.

**No se encontraron duplicados byte a byte entre los archivos del corte.** La duplicación problemática es de información de estado y evidencia, no de archivos idénticos.

## 3. Hallazgos priorizados

### H01 — Alta: el estado global depende del checkout, pero la entrada no lo deja claro

**Evidencia:** aquí el [roadmap](../../implementation-roadmap.md), líneas 3 y 44–53, declara P3 terminado y P4–P9 sin iniciar. `git worktree list --porcelain` identifica también:

| Worktree / rama | HEAD observado | Estado documental, no pruebas nuevas |
|---|---|---|
| Original / `feat/p33-token-flows` | `5e86d1e` | P3 terminado localmente; límite histórico de ese trabajo |
| `foxmind-p4-files` / `codex/p4-private-files` | `a3fb61e` | Rama aislada de P4; no sustituye al estado de integración |
| `foxmind-p5-classrooms` / `codex/p5-classrooms` | `9a91ad6` | Rama aislada de P5; no sustituye al estado de integración |
| `p4-p3-integration` / `main` | `1eb5700` | Roadmap, líneas 3 y 46–55: P3–P9 completados; publicación registrada; sin deployment |
| `foxmind-entry-glass` / `codex/foxmind-entry-glass` | `c6a4c08` | Base P9; registros de trabajo visual y cambios locales no publicados |

Ubicaciones comparadas: `C:\Users\alejo\.codex\worktrees\p4-p3-integration\ProtipoFoxMind` y `C:\Users\alejo\.codex\worktrees\foxmind-entry-glass\ProtipoFoxMind`. La vista detached de revisión mostrada por Git no se toma como base canónica.

Comprobaciones locales: `git merge-base --is-ancestor HEAD main` devolvió 0; el `main` local contiene el checkpoint de esta rama. `git diff --name-status HEAD main -- docs` mostró **108 documentos añadidos y un documento modificado** entre commits: el roadmap. Los añadidos incluyen archivos, aulas, P6, P7, P8 y P9. No incluyen automáticamente las exploraciones locales sin seguimiento de este workspace.

**Riesgo:** planificar de nuevo trabajo ya registrado en `main`, o creer que mover esta carpeta produce una documentación completa del producto integrado.

**Recomendación:** elegir explícitamente la base de reorganización. Para documentar el producto integrado, la candidata razonable es `main`, preservando y reconciliando aparte los documentos locales de diseño. **No cambiar de rama ni copiar carpetas completas sobre otra versión sin autorización.** Lo documentado como publicado no fue revalidado contra el remoto en esta auditoría. El límite P3 de este chat no se amplía por descubrir esos documentos.

### H02 — Alta: el roadmap se contradice dentro de la misma versión

En [implementation-roadmap.md](../../implementation-roadmap.md):

- Línea 3: P3 terminado, doce operaciones y web real.
- Líneas **68–72**, sección no marcada como histórica: dice que no existe `apps/web`, falta recovery y sólo hay nueve operaciones.
- Líneas 88–94: vuelve a declarar completas las pantallas, recuperación y recorridos reales.
- La sección histórica temprana conserva expresiones «Current blocker» y «Current objective» que exigen interpretar el contexto antes de saber qué aplica hoy.

**Recomendación:** dejar arriba un estado actual breve y consistente; sustituir las afirmaciones obsoletas de la sección vigente. Mantener los fallos en sus registros o en una cronología claramente fechada/enlazada. No borrar historia ni cambiar antiguos FAIL a PASS. La ambigüedad heredada de las secciones históricas también aparece en el roadmap de `main`: elegir una base más reciente no resuelve por sí solo la redacción.

### H03 — Alta: varias guías operativas conservan estados superados

| Archivo | Evidencia concreta | Tratamiento recomendado |
|---|---|---|
| [README raíz](../../../README.md), línea 15 | Siete operaciones; T3, P3 y web pendientes | Actualizar entrada y alcance según la base elegida; enlazar roadmap para el detalle de estado |
| [identity-http.md](../../identity-http.md), líneas 1–5 | Nueve implementadas, tres planeadas y web incompleta | Conservar inicio/configuración, retirar el estado global superado |
| [registration-profile.md](../../registration-profile.md), líneas 3 y 15 | P3 incompleto, tres operaciones ausentes | Separar la evidencia T2 del estado vigente |
| [account-verification.md](../../account-verification.md), líneas 3 y 48 | Recuperación, cambio de contraseña y web pendientes | Marcar el checkpoint T3-V como histórico; enlazar cierre P3 |
| [database.md](../../database.md), línea 3 | Autenticación y UI aún no implementadas | Explicar el alcance de la capa DB sin negar el resto de la aplicación |
| [identity-security.md](../../identity-security.md), línea 14 | La aplicación health aún no conecta las primitivas | Distinguir la API pasiva de la biblioteca de su integración ya realizada |
| [mail-sender.md](../../mail-sender.md), líneas 3 y 75–81 | La aplicación no importa el sender; integración aún diferida | Conservar contrato de componente, actualizar el estado de composición |
| [account-mail-outbox.md](../../account-mail-outbox.md), líneas 3 y 30 | Integración Auth futura | Mantener límites de la biblioteca, enlazar composición actual |
| [api/accounts-sessions.md](../../api/accounts-sessions.md), líneas 3, 7 y 114 | Doce operaciones/P3 completo al principio; P3 incompleto y tres operaciones pendientes después | Corregir metadatos contradictorios, no las políticas por conveniencia editorial |

La distinción importa: que una biblioteca no registre endpoints por sí sola **sí puede seguir siendo correcto**. El problema es presentar como futura su integración actual o confundir el alcance de una entrega antigua con todo el proyecto.

[password-recovery.md](../../password-recovery.md), líneas 7–9, ofrece un ejemplo mejor: avisa expresamente que lo siguiente es evidencia histórica superada. Aun así, para una guía operativa sería más claro tener el procedimiento actual primero y la historia enlazada al final.

### H04 — Media: falta un índice general orientado a lo que necesita encontrar una persona

No hay `docs/README.md`. Hay **19 archivos directamente en la raíz**, con producto, configuración, seguridad, contratos, estado y verificación mezclados. El [índice de registros](../../work-log/README.md), desde la línea 53, es selectivo y conserva una lista de octubre 15 bajo «Current records»; no es un tablero actual. El propio protocolo permite descubrir registros listando la carpeta: no es incumplimiento que el índice sea parcial, pero sí una experiencia pobre para retomar trabajo.

**23 Markdown no reciben enlaces Markdown/HTML desde otros documentos del conjunto analizado.** Entre ellos aparecen outbox, índices de nuevas familias visuales y registros importantes. No son necesariamente huérfanos globales: pueden estar citados desde `odd/tasks`, archivos externos, texto plano o código. La lista exacta está en `checks.json`.

**Recomendación:** índice con cuatro accesos principales: «Estado y próximo trabajo», «Producto», «Desarrollo local» y «Diseño»; un quinto para consultar evidencia histórica. Catalogar los registros por fase/unidad sin moverlos inicialmente.

### H05 — Alta: «completado» mezcla entrega del agente, producto y publicación

Hay **73 registros fechados y un README**. Algunos dicen `in_progress`, `blocked` o `partial` porque ése fue el resultado de aquella intervención; otros dicen `completed` sólo para una inspección o generación de imágenes. Es correcto conservarlos así. No significa que esas tareas sigan activas ni que la funcionalidad esté aceptada.

Ejemplos: el registro de captura P3.2 del 15/10 conserva el fallo original; otro registra la corrección. El registro de exploración de marca del 21/10 dice `completed` aunque ninguna dirección estaba seleccionada. La tercera ronda pasó de `in_progress` a `completed` durante la auditoría; el registro de cuarta ronda está `in_progress` al corte. El preview glass tiene un estado inicial y un resultado posterior dentro del mismo archivo.

**Recomendación:** separar tres dimensiones en los resúmenes vigentes:

| Dimensión | Valores orientativos | Fuente |
|---|---|---|
| Estado del documento | vigente / propuesta / histórico / reemplazado | Índice y metadatos del documento |
| Estado de la tarea/producto | not_started / in_progress / blocked / completed / dropped | Roadmap y tarea detallada en `odd/tasks` |
| Entrega/integración | local / commit observado / integrado / publicado / desplegado, con evidencia propia | Git y registro de entrega correspondiente |

Para registros antiguos, añadir relaciones «resuelto por / sustituido por» en un catálogo externo; **no reescribir el resultado original ni los registros protegidos**. Los metadatos no conceden autorización y la fecha de un archivo no prueba actividad en vivo.

### H06 — Media: la documentación de diseño no expresa una decisión única vigente

Hay varios niveles distintos:

1. [29 referencias originales](../../visual-reference-index.md), sujetas a las reglas funcionales.
2. [Seis mockups Taller](../../design/foxmind-taller-mockups/README.md), generados para evaluar estilo.
3. [Tres alternativas con marca original](../../design/foxmind-original-brand-options/README.md), pendientes de elección; su índice explica que el estilo del set anterior no fue aceptado.
4. [Tres alternativas de tercera ronda](../../design/foxmind-exploration-round3/README.md), generadas y preservadas, sin una dirección seleccionada.

Además, el [registro de cuarta ronda](../../work-log/2026-10-21-id-unavailable-learning-concepts-round4.md) documenta rechazo de las alternativas de tercera ronda y una nueva exploración con imágenes/comprobaciones pendientes al corte. No todas las cabeceras de los índices anteriores reflejan ese último rechazo. En el worktree glass hay un trabajo visual diferente, con integración local y límites de verificación propios. No debe reemplazarse por una exploración sólo porque ésta tenga fecha más reciente.

**Riesgo:** implementar la familia equivocada, interpretar imágenes como aceptación o confundir selección de estilo con autorización de código.

**Recomendación:** `docs/design/README.md` con familia, fecha, propósito, estado de selección, relación con otras familias, ubicación del código y siguiente decisión. Separar «referencia», «exploración», «seleccionado» e «implementado/verificado»; no declarar ganadora ninguna alternativa desde esta auditoría. Registrar la nueva decisión cuando el usuario elija.

### H07 — Media: parte de la identidad visual depende de rutas personales externas

El manifiesto de alternativas de marca apunta a dos originales en `FoxMind\archive\marca-original`, fuera del repositorio. Ambos archivos existen en este equipo, pero no están incluidos por clonar este checkout. Las rutas absolutas de manifests y los localizadores OS-temp de verificaciones anteriores tampoco son portables por definición.

**Recomendación:** catálogo de activos con origen, ubicación estable, hash, condición de uso y distinción original/generado. Si se aprueba incorporar originales, hacerlo sin alterarlos y con su procedencia; no copiarlos automáticamente ni sustituirlos por reinterpretaciones generadas. Los localizadores temporales deben ser evidencia auxiliar, no el único contenido necesario para entender un cierre.

### H08 — Media: la especificación concentra demasiadas funciones de lectura

[foxmind-v1-functional-spec.md](../../foxmind-v1-functional-spec.md) tiene **978 líneas y 86.977 bytes**: reglas funcionales, dirección visual, stack, aceptación y un límite documental histórico. Las líneas 3 y 978 expresan el alcance de su entrega original, no el estado de implementación posterior. La explicación aclaratoria existe en el roadmap, obligando a cruzar documentos para entender el prólogo.

**Recomendación inmediata:** conservarla como fuente normativa, añadir índice temático y una nota de alcance histórico precisa. **Después**, si se divide por dominios, mantener los identificadores de requisitos y las anclas/referencias consumidas por tareas y pruebas. No partirla ni renumerarla sólo para obtener archivos cortos. Los criterios de aceptación pertenecen al producto; sus resultados pertenecen a verificaciones fechadas.

### H09 — Media: la evidencia y las instrucciones operativas están demasiado entrelazadas

Las guías repiten cantidades PASS, fallos de preparación, presupuestos antiguos y disposiciones nativas. Eso conserva contexto, pero vuelve costoso encontrar «cómo arrancar» o «qué comando corresponde». Cuando sólo se actualiza el primer párrafo, los demás checkpoints quedan aparentemente vigentes.

**Recomendación:** cada guía operativa debe contener propósito, prerrequisitos, configuración sin secretos, procedimiento actual, resultado esperado y límites. Al final: enlaces a evidencia fechada. Conservar aparte el histórico de ejecuciones y la relación candidato → prueba. No unificar cifras ni presupuestos de pruebas con alcances distintos; antes de cambiar comandos, contrastar el runner real.

### H10 — Media: no existe una vista compacta de lo próximo sin duplicar tareas

El detalle en `odd/tasks` es útil, pero la recuperación del contexto depende de recorrer muchos logs. El roadmap concentra fase e historia, mientras que los trabajos de diseño recientes no aparecen como una categoría transversal navegable.

**Recomendación:** el roadmap debe mostrar vistas de «terminado», «en seguimiento» y «pendiente/propuesto», siempre con **rama, alcance, fecha y enlace al dueño del detalle**. Mantener las tareas detalladas en `odd/tasks`; no crear un backlog paralelo en `docs` con copias de los mismos checklists. Las propuestas no autorizadas deben figurar como tales, no como próxima implementación obligatoria.

### H11 — Media: hay contenido local útil que no está preservado en Git

Los **33 archivos sin seguimiento** del corte son 21 artefactos de diseño y 12 registros de trabajo. Existen localmente, pero no están garantizados en otro clon o rama. Los tres nombres con caracteres internacionales de las referencias originales sí están versionados: el validador usa salida Git separada por NUL para no confundir nombres citados con archivos sin seguimiento.

**Recomendación:** inventariar y revisar qué merece conservación antes de cambiar la base. No hacer `git clean`, checkout forzado, borrados masivos ni commits automáticos. Preparar un conjunto documental revisable y pedir la autorización de entrega que corresponda. «Existe en disco» y «está publicado» son estados diferentes.

### H12 — Baja: los controles estáticos actuales no detectan la deriva semántica

Los enlaces y las tablas pasan en este corte, pero las contradicciones H02/H03 persisten. El protocolo es sólido; faltan comprobaciones de mantenimiento centradas en estado y navegación.

**Recomendación:** validar enlaces/manifests, requerir alcance/candidato en evidencia, detectar referencias temporales nuevas en guías vigentes y revisar manualmente afirmaciones «actual», «no implementado» y «pendiente». Un validador textual no debe decidir automáticamente si una fase está terminada. La integración en CI sería un cambio posterior, no realizado aquí.

### H13 — Baja: los manifiestos de diseño no comparten un esquema mínimo

Los nueve PNG de Taller/marca original registran dimensiones, bytes y SHA256. Los tres de tercera ronda registran dimensiones y SHA256, pero no bytes ni referencias de originales en el JSON. No implica que sus imágenes sean inválidas; obliga a interpretar cada familia de manera distinta y complica automatizar su conservación.

**Recomendación:** acordar un esquema pequeño con versión, archivo, dimensiones, bytes, hash, origen, fuentes y estado de selección. Mantener los manifiestos anteriores intactos hasta aprobar una normalización; el validador de esta auditoría informa campos ausentes sin inventarlos.

## 4. Cómo mostrar lo terminado, en curso y futuro

No recomiendo carpetas `hecho/`, `haciendo/`, `pendiente/`: cada cambio de estado requeriría mover archivos y actualizar enlaces. Una misma funcionalidad puede tener un contrato vigente, pruebas históricas y mejoras futuras al mismo tiempo.

### Vista propuesta para el roadmap

| Vista | Qué contendría | Regla |
|---|---|---|
| Terminado | Checkpoint aceptado, alcance, rama/candidato y enlaces a pruebas | No convertir aceptación local en deployment |
| En seguimiento | Unidad concreta, responsable real si se conoce, bloqueo/primera acción pendiente | No inferir ejecución en vivo de un `in_progress` antiguo |
| Próximo autorizado | Primera unidad autorizada por la solicitud vigente | Los permisos históricos no la autorizan por sí solos |
| Propuesto / por decidir | Mejoras de diseño, mantenimiento, operación o producto todavía sin autorización | No contarlas como trabajo activo ni alcance acordado |
| Historial | Cierres previos y relaciones entre fallos/correcciones | No alterar la atribución original |

### Ejemplo basado en este corte, no nuevo tablero oficial

- **En esta rama histórica:** P0–P3 aparecen cerrados; P4–P9 no integrados en este checkpoint.
- **En el `main` local:** el roadmap documenta P0–P9 terminados localmente y publicación de P9; sin deployment. Se debe leer la evidencia de esa rama antes de usarlo como estado oficial unificado.
- **Glass:** los registros del otro worktree informan integración visual local con verificaciones acotadas, cambios sin commit/publicación y seguimiento posterior. No equivalen a aceptación completa de todos los recorridos académicos.
- **Exploración visual en este workspace:** alternativas previas no seleccionadas/rechazadas; cuarta ronda pendiente al corte. Su trabajo de generación no es una fase de producto implementada.
- **Esta reorganización:** propuesta lista para decidir; ninguna migración de estructura aplicada.

## 5. Estructura recomendada

Propuesta, no árbol creado por esta auditoría. La primera etapa mejora navegación sin mover documentos; el siguiente árbol es el objetivo eventual.

```text
docs/
  README.md                         # Entrada para personas
  implementation-roadmap.md         # Único resumen de avance; ruta estable
  product/
    README.md                       # Dominios y reglas
    foxmind-v1-functional-spec.md    # Fuente normativa, si se aprueba moverla
  engineering/
    README.md
    architecture/                   # Mapa del sistema; extrae/enlaza lo ya acordado
    local-development/              # Backend, DB, Mailpit y arranque
    identity/                       # Sesiones, seguridad, mail, tokens y perfil
    testing/                        # Cómo ejecutar/interpretar las pruebas
  api/
    accounts-sessions.md
    accounts-sessions.openapi.json
  verification/
    README.md                       # Resumen por fase/candidato, sin copiar logs
    foundations/                    # DB, backend y dependencias
  design/
    README.md                       # Estado de cada familia/decisión
    references/                     # Catálogo original, preservando nombres
    proposals/                      # Taller, marca original y futuras exploraciones
  decisions/                        # Decisiones nuevas con contexto, no otra especificación
  work-log/
    README.md                       # Protocolo actual, conservado
    INDEX.md                        # Catálogo por fase/unidad, preferiblemente generado
    YYYY-MM-DD-....md                # Registros existentes en rutas estables
  audits/
    2026-10-21-docs-audit/
```

No es necesario crear carpetas vacías. Los documentos P4–P9 del `main` se clasificarían por dominio/operación cuando se audite esa base en profundidad. `odd/tasks/` permanece como dueño del detalle de implementación; no se traslada por este esquema.

### Reglas de propiedad

| Información | Fuente única |
|---|---|
| Qué debe hacer FoxMind | Especificación funcional |
| Contratos HTTP y esquemas | API/OpenAPI; sincronización con pruebas de contrato |
| Qué checkpoint está aceptado y qué sigue | Roadmap, acotado a la base elegida |
| Tareas y criterios de una implementación | Documento correspondiente de `odd/tasks` |
| Qué hizo un agente y qué verificó | Registro individual de trabajo |
| Cómo arrancar u operar hoy | Guía operativa vigente |
| Qué diseño está seleccionado | Índice de diseño y decisión explícita del usuario |

Los índices enlazan, no vuelven a narrar toda la evidencia. Un ADR nuevo explica una decisión y referencia la regla normativa resultante; no crea una segunda política contradictoria.

### Metadatos mínimos sugeridos

Para documentos nuevos o vigentes que se actualicen —no una reescritura masiva de logs históricos—:

```text
Tipo: guía / especificación / contrato / evidencia / propuesta
Vigencia: vigente / propuesta / histórico / reemplazado
Alcance: dominio y fase/unidad
Base: rama y commit o candidato cuando corresponda
Última revisión: fecha y evidencia; no sólo fecha de modificación
Responsable: rol real o no asignado; no inventar una identidad
Fuente normativa: enlace
Sustituye / sustituido por: enlace si aplica
```

## 6. Plan de mejora por etapas

| Etapa | Acciones | Criterio de salida |
|---|---|---|
| A — Elegir base y preservar | Confirmar `main` u otra base; inventariar documentos locales y cambios previos; atribuir propiedad | Ningún trabajo útil perdido; alcance y base explícitos |
| B — Corregir lectura actual | Reconciliar roadmap/README/guías H02–H03; añadir `docs/README.md` y catálogo de diseño | Estado vigente consistente; historial intacto; ningún permiso nuevo inferido |
| C — Indexar sin mover | Crear catálogo de registros por fase/unidad con relaciones de corrección; añadir rutas de lectura | Encontrar último checkpoint, evidencia y siguiente tarea sin reconstruir todo el historial |
| D — Migrar por conjuntos | Mapa origen → destino por archivo; primero guías operativas, luego evidencia/diseño; actualizar consumidores | Cada movimiento revisable, hashes de binarios iguales y enlaces conservados |
| E — Mejorar documentos largos | Índice y lectura progresiva; separar historia de operación; dividir especificación sólo si aporta valor y mantiene IDs | Ningún requisito, ancla ni atribución perdido |
| F — Mantener | Chequeos estáticos y revisión de vigencia; futura automatización sólo si se aprueba | Una regla clara de actualización al cerrar cada unidad |

**Orden recomendado:** A → B → C, y recién después D. La mejora de mayor valor no requiere empezar con una mudanza de 145 archivos.

### Antes de cualquier movimiento

- Buscar enlaces Markdown, referencias en texto, código, pruebas, scripts, `AGENTS.md`, README raíz y `odd/tasks`; el chequeo de enlaces de esta auditoría no cubre todos esos consumidores.
- Mantener estables roadmap y registros históricos inicialmente.
- Para rutas públicas usadas por agentes/tests, actualizar todos los consumidores o dejar un stub de compatibilidad sin estado duplicado.
- Comparar hashes de PNG y archivos preservados; no regenerar imágenes durante una reorganización.
- No mover `.env`, claves, datos, volúmenes, artefactos generados ni carpetas internas de herramientas como si fueran documentación.
- No cambiar estado de fases, reglas funcionales, pruebas o autorizaciones como efecto lateral editorial.

## 7. Verificaciones observadas

Ejecutado desde la raíz del repositorio:

```powershell
python -B docs/audits/2026-10-21-docs-audit/audit_docs.py
git status --short
git branch --show-current
git rev-parse HEAD
git worktree list --porcelain
git merge-base --is-ancestor HEAD main
git diff --name-status HEAD main -- docs
```

| Chequeo | Resultado al corte |
|---|---|
| Autopruebas del scanner | PASS: código ignorado, enlace con paréntesis, referencia definida, nombre con espacios y anclas repetidas/explícitas |
| Inventario | 145 archivos con hash y clasificación |
| Links reconocidos | **293 destinos locales válidos**, **12 externos no consultados**; cero faltantes o candidatos de ancla detectados |
| JSON | Cuatro archivos parseados correctamente |
| OpenAPI | **132 referencias internas resolubles**, doce operaciones marcadas `implemented` |
| Imágenes | **41 cabeceras PNG** válidas; no equivale a decodificación/inspección visual completa |
| Manifiestos visuales | **12/12** coincidencias de dimensiones y SHA256; **9/9** tamaños declarados coinciden y tres no declaran bytes |
| Originales externos | 2/2 ubicaciones existentes; fuera del repositorio |
| Markdown | Todos con H1; sin candidatos de filas desalineadas en el chequeo básico |
| Comandos en guías raíz/API | 11 destinos `node scripts/...` existentes y 19 nombres `npm run` presentes en package; no ejecutados |
| Archivos idénticos | Ningún duplicado exacto en el inventario |

El scanner es un subconjunto explícito de Markdown, **no un parser CommonMark ni un validador OpenAPI completo**. Ignora código inline/fences, no valida paths escritos como prosa/código, no consulta URLs externas y aproxima slugs de anclas. Por eso «sin enlaces rotos detectados» no significa «documentación correcta». Los valores de fase/destino del CSV son clasificación orientativa, no un estado de aceptación automático ni un plan de movimiento aprobado.

El script vuelve a generar inventario y resultados con el estado que exista al ejecutarlo; este informe permanece referido al corte indicado. No ejecuta los comandos que encuentra ni modifica documentos de origen. Sólo escribe sus dos archivos de evidencia dentro de esta carpeta.

## 8. Decisión pendiente y siguiente acción

**Primera decisión: qué base documental se va a reorganizar.** Recomiendo partir del producto integrado documentado en `main`, con preservación explícita de las exploraciones locales y sin trasladar los límites históricos de P3 como si fueran el estado global.

Si se aprueba avanzar, la primera unidad debería ser **base confirmada + índice de `docs` + reconciliación de estados**, todavía sin mover ni borrar documentos. Después se puede presentar/aplicar el mapa exacto de migración con sus comprobaciones.

Esta auditoría sólo añadió su informe, inventario, resultados, validador y registro propio. No modificó documentos preexistentes, implementación, permisos, servicios ni datos; no realizó commits ni publicación.

# Auditoría documental FoxMind — ordenar la entrada, preservar la evidencia

**Hay que limpiar la lectura del proyecto, no borrar su memoria.** La base actual tiene documentación suficiente para reconstruir decisiones y pruebas, pero obliga a leer historia para averiguar qué funciona hoy. El problema más serio es la deriva entre la especificación, las guías y los cierres posteriores: todavía se excluye la corrección con IA, se describe un destino de login que cambió y se presentan implementaciones publicadas como propuestas locales. Mover carpetas antes de corregir eso trasladaría la confusión.

Recomiendo una primera entrega de **reconciliación e índices, sin movimientos ni borrados**, seguida de una migración pequeña por dominios. No encontré un Markdown cuya eliminación pueda recomendar sin perder información. Hay diez grupos de archivos idénticos, pero varios representan roles de recursos o evidencias diferentes: igualdad de bytes no basta para descartarlos.

Auditoría y propuesta solicitadas a Astra; fecha 2026-10-30. Base congelada: `e0c16fd341f1b3ffea6bc82f1a6ca3dbcdcffce4`, rama `codex/documentation-audit`. [Registro propio](../work-log/2026-10-30-astra-documentation-audit.md). **Este informe no ejecuta la reorganización ni concede permiso para implementar producto, publicar o desplegar.**

## 1. Qué cubre la auditoría

El universo es Git, no todo lo que exista en la computadora: **2.738 archivos versionados**, de los cuales **1.501 están bajo `docs/`**, **28 en `odd/tasks/`** y **702 son Markdown** en todo el repositorio. Los Markdown suman **40.452 líneas**. Los nuevos registros e informe de esta sesión quedan fuera de esos conteos.

| Conjunto, sin solapamiento | Archivos | Composición y tratamiento |
|---|---:|---|
| Raíz de `docs/` | 59 | 58 Markdown y el ledger JSON P9; guías, especificación, roadmap y evidencia mezclados |
| `docs/api/` | 3 | Dos contratos Markdown y OpenAPI; contratos que se conservan |
| `docs/audits/` | 13 | Tres Markdown, dos Python, cuatro JSON y cuatro CSV; auditorías y planes históricos |
| `docs/design/` | 314 | 36 Markdown, 31 JSON, 50 SVG, 102 WebP, 57 PNG y 38 archivos de herramientas/catálogos HTML/CSS/JS/PowerShell |
| `docs/references/` | 29 | PNG originales de referencia; conservar nombres/procedencia |
| `docs/work-log/`, fuera de `evidence/` | 542 | 541 Markdown: protocolo + 540 registros fechados; un JSON |
| `docs/work-log/evidence/` | 541 | 24 Markdown; 325 imágenes, 14 PDF, 74 JSON/JSONL, 102 TXT/LOG/TAP y dos MJS |
| `odd/tasks/` | 28 | Contratos, criterios, planes y tareas Markdown; no son copias prescindibles de las guías |
| Documentación fuera de esos conjuntos | 11 | Diez Markdown y licencia de Fredoka; ver alcance exterior debajo |

**Cobertura exhaustiva de inventario y estructura; lectura semántica dirigida.** Se enumeraron todos los Markdown y sus secciones, se contrastaron las entradas, contratos y guías relevantes de cada familia, y se rastrearon referencias documentales y ejecutables de los candidatos nombrados. Los 540 registros se clasificaron por ubicación/fecha; se leyeron los cierres y antecedentes necesarios para resolver afirmaciones actuales. No se afirma haber revalidado funcionalmente cada frase de los 540 registros ni inspeccionado visualmente las 325 imágenes de evidencia.

La cobertura exterior incluye `README.md`, `AGENTS.md`, `design-qa.md`, `apps/web/AGENTS.md`, los README de `apps/web/public/entry-glass/`, sus iconos y `folders/`, los README de fixtures `tests/helpers/{classroom-interior-reference,home-reference,platform-polish}/` y `apps/web/public/fonts/OFL-Fredoka.txt`. Se inventariaron también los 13 manifiestos de direcciones de `.taste-skill/`; son metadatos de propuestas, no documentación operativa ni objetivos de implementación. Configuración, workflows y fuentes se consultaron solo para comprobar consumidores y afirmaciones concretas.

No se accedió a secretos, archivos privados ni datos de alumnos; no se reprodujeron prompts de generación. No hubo instalaciones, servidores, pruebas funcionales, consultas a proveedores, navegación externa ni verificación remota nueva. PDF e imágenes se trataron como artefactos con identidad/ruta; no se extrajo su contenido para una nueva aceptación visual.

### Resultados estáticos y límites

- Censo propio mediante `git ls-files -z`, extensiones, encabezados y referencias; coincide con el contraste independiente del coordinador.
- El coordinador comprobó **2.797 enlaces locales inline reconocidos**, con **cero destinos de archivo ausentes**. Detectó siete enlaces `file:///` personales en `docs/design/README.md`, líneas 26–39; no se probó su existencia externa. El parser no acredita todas las anclas, enlaces de referencia, sintaxis anidada, URLs externas ni semántica.
- El coordinador calculó hashes dentro del conjunto documental: **diez grupos idénticos**, **6.685.993 bytes redundantes** si se conservara una sola copia de cada grupo. Ningún grupo es Markdown. La sección 5 contrasta sus consumidores; no es una orden de borrado.
- Las búsquedas de consumidores usan nombre de archivo y rutas literales sobre archivos versionados. Sus conteos son candidatos de referencia, no enlaces resueltos únicos; nombres genéricos como `files.md` o `HANDOFF.md` pueden coincidir en más de una familia. Se revisaron los consumidores concretos decisivos. Cargas dinámicas, globs y usos externos requieren revisión antes de mover.
- Se preserva el cierre de las cinco omisiones: **FAST completo 783/0/0 y P5/resumen 14/0/0**; navegador pasó a 42 archivos, **sin nueva pasada integral de los 42**. Son resultados históricos atribuidos al [cierre](../work-log/2026-10-30-root-five-historical-checks.md), no pruebas ejecutadas en esta auditoría. Tampoco se acredita despliegue ni carga productiva.

## 2. Hallazgos priorizados

### H01 — Alta: el contrato de producto quedó detrás de las extensiones de IA

**Evidencia:** `docs/foxmind-v1-functional-spec.md:22` incorpora dos extensiones de IA, pero `:26` mantiene AI grading fuera del alcance. `docs/student-ai.md:3–9` documenta análisis individual implementado; `odd/tasks/grading-ai-issue-2.md:5–7` define corrección privada revisada por el docente; `docs/implementation-roadmap.md:11–13` registra integración y pruebas reales posteriores. La especificación tiene 987 líneas y sigue siendo presentada como fuente normativa única.

**Consecuencia:** alguien que arranque por el contrato puede rechazar trabajo ya incorporado, o inventar reglas consultando solo el código. Que la exclusión fuera correcta para V1 inicial no resuelve que el mismo documento ya absorbió otras extensiones posteriores.

**Acción:** conservar V1 como base y añadir un índice explícito de extensiones aprobadas con alcance, contrato dueño y fecha. Diferenciar generación de actividades, extracción, análisis individual y corrección asistida; no generalizar que «toda IA está aprobada». Corregir la exclusión con ese alcance y enlazar las políticas existentes de privacidad/publicación. No convertir resultados de pruebas en requisitos nuevos. Confianza alta.

### H02 — Alta: un archivo presentado como documentación activa controles de CI

**Evidencia:** `.github/workflows/issue2-ci.yml:84–92` exige cuatro pruebas de integración si existe `odd/tasks/grading-ai-issue-2.md`; si falta, informa cobertura parcial. `tests/issue2-ci-workflow.test.mjs:81` también fija esa ruta. `tests/p31-contracts.test.mjs:6` carga directamente `docs/api/accounts-sessions.openapi.json`.

**Consecuencia:** archivar o renombrar la tarea de issue #2 como si fuera un cierre viejo cambia el camino de validación de CI. Mover OpenAPI rompe un consumidor ejecutable. Un chequeo de enlaces Markdown no detecta por sí solo este riesgo.

**Acción:** fijar ambas rutas como contratos de compatibilidad de la reorganización. Mantener el archivo de issue #2 y corregir su vigencia in situ. Desacoplar en el futuro la marca funcional de un nombre documental sería un cambio de código/tests separado; no incluirlo silenciosamente en una limpieza. Confianza alta.

### H03 — Media: la entrada al estado actual lleva a un checkpoint de ocho días antes

**Evidencia:** `docs/README.md:11` dirige «Estado y próximos pasos» a `implementation-roadmap.md#current-documentation-scope`; esa sección está en `docs/implementation-roadmap.md:252–265` y se declara histórica del 22/10. El mismo roadmap tiene 485 líneas, contiene `Current integration checkpoint — 2026-10-22` en `:246`, `Resume here (2026-10-20)` en `:242` y un runtime «Current» del 24/10 en `:204`, además del cierre actual correcto al principio.

**Consecuencia:** la navegación recomendada obliga a distinguir varios «actual» dentro de una cronología. Las notas que aclaran la historia evitan algunas inferencias falsas, pero no hacen que la entrada sea útil para retomar.

**Acción:** mantener la ruta y anclas públicas del roadmap; abrir con una tabla corta de estado reconciliado por unidad y enlaces a cierres. Llevar el detalle cronológico bajo una sección histórica claramente separada, inicialmente sin moverlo. El enlace de estado debe apuntar al resumen vigente. No reescribir consentimientos ni interpretar URLs históricas como servicios vivos. Confianza alta.

### H04 — Media: las guías de uso contradicen el destino real del login

**Evidencia:** `docs/p9-local-operation.md:43` dice que el login ordinario sigue en `/profile`; `docs/p3-web.md:28` repite la continuación a perfil; `docs/entry-glass.md:11` conserva ese destino. El código en `apps/web/src/components/account-screen.tsx:124` usa `/inicio` para usuario verificado sin destino explícito, y `account-flow-forms.tsx:26,61` coincide. El roadmap documenta el cambio en `:169–173`.

**Consecuencia:** quien opera o verifica la aplicación puede interpretar el comportamiento correcto como regresión. Es deriva funcional comprobable, no solo diferencia de redacción.

**Acción:** actualizar las dos guías vigentes con `/inicio`, preservando invitaciones/destinos permitidos y verificación obligatoria. Presentar `entry-glass.md` como antecedente de esa presentación, con enlace a la guía vigente; no actualizar retrospectivamente lo que se verificó en aquel candidato. Confianza alta.

### H05 — Media: los índices y tareas no reconcilian implementación y publicación

**Evidencia:** `odd/tasks/grading-ai-issue-2.md:11` niega Gemini real, recorrido autenticado y publicación; el cierre TP en `docs/work-log/2026-10-29-root-gemini-grading.md:26–30` acredita su alcance y PR #16, y el registro Q/E `:15–23` documenta los dos casos posteriores y sus límites. `docs/design/README.md:7` presenta 3D como paquete que no reemplaza la UI; su README de familia sí aclara implementación posterior en `docs/design/foxmind-3d/README.md:7`. El roadmap `:149–159` documenta publicación e implementación 3D. El índice general sigue llamándola rama local en `docs/README.md:15`.

**Consecuencia:** documentos de entrada actualizan etapas distintas y dejan al lector resolver cuál manda. La evidencia posterior no invalida los fallos anteriores; sí invalida usar la frase inicial como resumen vigente.

**Acción:** añadir una única fila por funcionalidad/dirección con diseño, implementación, verificación e integración separados, enlazada al último cierre pertinente. Actualizar la tarea de issue #2 sin cambiar su ruta ni atribuir cobertura universal: TP PDF y Q/E con desarrollo/opción única no prueban todos los formatos. Confianza alta.

### H06 — Media: las rutas de lectura ocultan funcionalidades y arquitectura actuales

**Evidencia:** `docs/README.md:31–43` ofrece guías por tema, pero no enlaza `docs/student-ai.md` ni una guía de uso de corrección asistida. Las 88 coincidencias documentales de `foxmind-v1-functional-spec.md` contrastan con una arquitectura distribuida entre `docs/backend.md:56–67` (mapa centrado en P3), las guías por fase, `docs/foxmind-3d.md:22–29` y los contratos de tareas. El índice no tiene un recorrido «entender el sistema» con frontend/proxy/API/dominio/persistencia/workers.

**Consecuencia:** un nuevo colaborador puede entender las fases históricas sin identificar dónde vive hoy cada responsabilidad. La división P3/P4/P5 resulta útil para la procedencia, menos para encontrar identidad, archivos o aulas.

**Acción:** crear una página corta de arquitectura que enlace los módulos y contratos existentes, con un diagrama de dependencias y flujo navegador → proxy → API → dominio/persistencia/servicios. Añadir las extensiones de IA al índice; una guía de corrección puede extraerse del contrato y de los controles reales, dejando evidencia en sus registros. No copiar otra vez todas las políticas. Confianza alta sobre el hueco de navegación; el mapa futuro requiere contraste acotado de fuente.

### H07 — Media: operación actual y evidencia histórica compiten en las mismas guías

**Evidencia:** `docs/backend.md:15,69–89` mezcla arranque con orquestación T2/T3 y presupuestos históricos; `docs/p9-local-operation.md:11` remite al plan finito P9 para verificación; `docs/p9-joined-journeys.md` tiene 195 líneas de ejecuciones y disposiciones históricas. En cambio, `package.json:45–47` ya expone fronteras, CI y `test:complete`, cuyos grupos/cierre actual están en la tarea de remediación y logs recientes. El contrato `docs/api/files.md:1–3,17` se titula integración diferida pese a que el índice lo ofrece como contrato HTTP actual.

**Consecuencia:** se dificulta distinguir «cómo ejecuto hoy» de «qué se hizo para aceptar aquel candidato». Se favorece repetir comandos de experimentos o concluir que P4 no está integrado.

**Acción:** una guía vigente de desarrollo local y otra de verificación con comandos/grupos/propiedad de recursos, enlazando los detalles por módulo. Separar el bloque histórico dentro de cada guía antes de moverlo. En archivos, conservar el contrato útil y enlazar el host integrado. No cambiar presupuestos, owners, skips o límites para simplificar la explicación. Confianza alta.

### H08 — Media: hay 540 registros y ningún catálogo que permita seguir una unidad sin recorrer cronología

**Evidencia:** `docs/work-log/README.md:51–57` aclara que su lista es histórica y que se descubren registros listando la carpeta. La mayoría de los 540 registros queda fuera de esa lista. El roadmap contiene numerosos enlaces y repite narración de sus cierres; `design-qa.md` tiene 144 líneas con múltiples estados «Current» y pasadas posteriores.

**Consecuencia:** se preserva evidencia, pero el costo de encontrar el cierre, los fallos y quién resolvió un bloqueo crece con cada sesión. Buscar `in_progress` no distingue una intervención histórica de una tarea activa.

**Acción:** catálogo derivado por unidad y fecha que enlace coordinador, revisión, prueba y entrega, con relaciones «continuado/cerrado por». Conservar todos los registros originales y sus estados, incluidos fallos/skips. No generar estados de producto a partir de nombres ni sobrescribir autores. `design-qa.md` puede quedar como índice estable de evidencia visual. Confianza alta.

### H09 — Media: el plan de reorganización existente es una base histórica, no una migración lista para ejecutar

**Evidencia:** `docs/audits/2026-10-22-reorganization-map/checks.json` registra 281 documentos, 39 movimientos y 39 rutas de compatibilidad; hoy hay 1.501 archivos bajo docs. `build_map.py:21–22` fija dos rutas personales y `:45` escribe evidencia en su carpeta histórica; `:272` reconoce dependencia del helper de la auditoría anterior. La auditoría del 21/10 cubría otro checkout, 145 archivos y P3, no esta base completa.

**Consecuencia:** reutilizar los CSV como inventario actual omite gran parte del proyecto. Ejecutar los generadores para «actualizar el informe» puede reemplazar el corte histórico y depender de worktrees retirados.

**Acción:** conservar ambas auditorías y sus resultados. Sigue vigente su secuencia reconciliar → indexar → migrar y el principio de compatibilidad. Quedaron superados el inventario, la base, las ubicaciones externas y el mapa exacto. Cuando se autorice implementar, crear **un solo plan ejecutable** en `odd/tasks/documentation-reorganization.md`, que cite estos antecedentes y este informe, con manifiesto nuevo en carpeta fechada. No mantener dos mapas activos ni reejecutar los generadores históricos sobre sus salidas. Confianza alta.

### H10 — Baja: hay copias exactas, pero el mayor ruido es semántico y de presentación

**Evidencia:** diez grupos idénticos suman unos 6,38 MiB de redundancia potencial; ninguno es Markdown. La lectura actual repite conteos/consentimientos y concatena cifras con palabras, por ejemplo `docs/implementation-roadmap.md:5–9`. Mezcla español e inglés sin una política por audiencia. El índice de diseño conserva siete rutas personales como historia, aunque cuatro familias ya están en Git.

**Consecuencia:** una mudanza grande o una limpieza binaria ofrecerían menos claridad que corregir entradas y separar historia. Los gráficos idénticos de baseline/final pueden ser evidencia legítima de ausencia de cambio.

**Acción:** redactar los resúmenes vigentes en español claro, con espacios y conteos etiquetados; preservar texto original de los logs. En índices activos usar enlaces relativos al material versionado y relegar localizadores personales al contexto histórico. Deducir candidatos a consolidación por función y referencias, no por edad o tamaño. Confianza alta.

## 3. Fuentes únicas y recorrido de lectura propuesto

| Necesidad | Fuente dueña | Qué debe evitarse |
|---|---|---|
| Entender qué es FoxMind | README raíz y resumen de producto enlazado | Historia de preparación en la primera pantalla |
| Saber qué está aceptado y con qué límites | Roadmap: resumen vigente; cierres enlazados | Otro tablero manual de estado en cada índice |
| Conocer reglas y extensiones | Especificación V1 + índice de extensiones/contratos | Repetir requisitos diferentes en guías y tareas |
| Entender código y operar local | Mapa de arquitectura + guías actuales | Ejecutar scripts históricos por estar en una guía |
| Implementar una unidad concreta | Su documento de `odd/tasks/` | Backlog duplicado dentro de `docs/` |
| Comprobar qué se observó | Registros y artefactos fechados | Convertir herencia, skips o capturas en prueba nueva |
| Elegir o aplicar diseño | Registro de direcciones + sistema actual + antecedentes | Asumir que toda propuesta almacenada está seleccionada |

Lectura inicial sugerida: **README → índice → mapa del sistema → operación local**. Para cambiar una función: **estado actual → contrato de dominio/extensión → tarea → evidencia pertinente**. Las guías deben remitir al contrato; los logs deben remitir a la guía vigente sin sustituir su registro original.

```text
README.md                             # Presentación y comienzo
AGENTS.md                             # Protocolo estable; historia delimitada
docs/README.md                        # Índice corto por necesidad
docs/implementation-roadmap.md        # Resumen vigente + historia separada, ruta estable
docs/foxmind-v1-functional-spec.md     # Mantener ruta/IDs en la primera migración
docs/product/README.md                # Dominios y extensiones, sin copiar contratos
docs/engineering/architecture.md      # Mapa del sistema y responsabilidades
docs/engineering/local-development/   # Arranque/DB/correo, guías actuales
docs/engineering/testing/             # Cómo validar y cómo interpretar evidencia
docs/engineering/{identity,files,classrooms,teaching,activities,grading,home}/
docs/api/                             # Contratos; OpenAPI queda fijado
docs/design/README.md                 # Sistema vigente, selecciones y exploraciones históricas
docs/design/<familias existentes>/    # Inicialmente conservar rutas, activos y herramientas
docs/verification/README.md           # Catálogo de pruebas fechadas; no otra suma global
docs/work-log/README.md               # Protocolo conservado
docs/work-log/INDEX.md                # Catálogo derivado de unidades y relaciones
docs/work-log/<registros actuales>    # Rutas/autoría/evidencia conservadas
docs/audits/<cortes fechados>/        # Diagnósticos y mapas históricos
odd/tasks/                            # Dueño del detalle y plan único de reorganización
```

No crear carpetas vacías ni mover todos los archivos para que el árbol quede uniforme. `product/`, arquitectura y catálogo de verificación solo se justifican con contenido concreto. Conservar especificación, roadmap, OpenAPI y logs en sus rutas evita la migración de mayor riesgo. La organización por dominios adapta el plan del 21/22 de octubre; no propone una taxonomía competidora basada en «terminado/pendiente».

## 4. Candidatos concretos y dependencias

«Archivar» significa primero **sacarlo del recorrido activo y marcarlo histórico en el catálogo**, manteniendo ruta y bytes del original. «Unificar» significa concentrar información vigente y enlazar antecedentes; no mezclar resultados de autores/candidatos distintos. Los conteos de referencias son coincidencias en otros archivos versionados, incluidas auditorías históricas; no se deben editar mapas congelados para que parezcan generados hoy.

| Candidato | Decisión y destino de lo útil | Referencias/consumidores comprobados y condición | Confianza |
|---|---|---|---|
| `docs/foxmind-v1-functional-spec.md` | Conservar; reconciliar extensiones e índice temático in situ | 88 archivos mencionan su nombre; README, índices, roadmap, tareas y diseños. Mantener IDs/anclas; sin consumidor de código literal localizado | Alta |
| `docs/api/accounts-sessions.openapi.json` | Conservar ruta y contenido contractual | Cargado por `tests/p31-contracts.test.mjs:6`; una mudanza requiere actualizar contrato/test juntos | Alta |
| `odd/tasks/grading-ai-issue-2.md` | Conservar; actualizar estado y enlazar evidencia posterior | Roadmap + workflow + test de workflow; **existencia activa CI**. No archivar físicamente | Alta |
| `docs/README.md` y `docs/implementation-roadmap.md` | Unificar solo la información de estado en el roadmap; índice enlaza | README raíz, AGENTS, todos los dominios y anclas de navegación. Mantener rutas y anclas antiguas al separar historia | Alta |
| `docs/p9-local-operation.md`, `docs/backend.md`, `docs/database.md`, `docs/local-email.md` | Unificar entrada operativa; luego mover guías a `engineering/local-development/` por lote | Operación tiene 11 consumidores nominales; README y doc index son entradas. Mapas del 22/10 son evidencia, no consumidores que deban reescribirse. Revisar comandos/orígenes actuales antes | Alta para separación; media para movimiento |
| `docs/p3-web.md` | Corregir destino; futuro `engineering/identity/p3-web.md` con compatibilidad | 15 consumidores nominales, incluidos índice y roadmap. No consumidor ejecutable literal localizado | Alta |
| `docs/api/files.md` | Conservar contrato; corregir cabecera de integración y enlazar host | Índice, `private-files` y documentación P4; 17 coincidencias de nombre, potencialmente amplias por `files.md` | Alta |
| `docs/entry-glass.md`, `docs/folder-theme.md` | Archivar lógicamente como presentaciones anteriores; conservar decisiones y evidencia | 11 y seis consumidores nominales; roadmap, diseño y registros; guías no deben representar el sistema visual de hoy | Alta |
| `docs/agenda-event-ux-proposal.md` | Archivar propuesta ejecutada; lo vigente va en `docs/agenda.md` | Cuatro consumidores documentales, contrato compacto y logs. Mantener instrucciones de DST/duración/confirmación; no borrar por llamarse proposal | Alta |
| `docs/p4-integration-handoff.md` | Archivar lógicamente; guía vigente en `p4-integration.md` y host | Nueve consumidores, incluido índice; ya se identifica histórico. Contiene condiciones/recuperación útiles, no duplicado exacto | Alta |
| `docs/p9-joined-journeys.md`, `docs/p9-verification-plan.md` | Archivar lógicamente como aceptación P9; enlazar desde catálogo de verificación | Ocho/diez consumidores; índice, operación, matriz/logs. No reejecutar ni alterar fallos históricos | Alta |
| `docs/p9-runtime-controls.md` | Conservar como guía técnica; revisar vigencia antes de mover a testing | Ocho consumidores; índice/operación/plan. Que tenga prefijo P9 no demuestra obsolescencia | Alta |
| `docs/student-ai.md` | Conservar y enlazar desde producto/IA/progreso; completar navegación | 12 consumidores nominales, ninguno de los tres índices principales. No se encontró consumidor ejecutable del nombre | Alta |
| `docs/design/README.md` y `docs/design/foxmind-folder-platform/HANDOFF.md` | Reconciliar índice; archivar lógicamente handoff del viejo plan | README de familia y su plan enlazan HANDOFF; paquetes y manifiestos tienen relaciones relativas. No copiar instrucciones de otra base como próxima tarea | Alta |
| Taller, marca original, round3, round4 y user-reference-style en `docs/design/` | Conservar familias como exploraciones/selecciones históricas, agrupadas en catálogo | README/manifiestos/prompts e historia se referencian dentro de cada paquete; existen referencias de marca desde README de assets del producto. Sin traslado físico recomendado en primera etapa | Alta |
| `docs/design/foxmind-3d/` | Conservar paquete, contratos de flujos, fuentes y herramientas | Catálogos HTML/JS, manifiestos y herramientas relativas; 82 IDs vinculados a tarea/evidencia. No es solo imágenes sobrantes | Alta |
| `docs/audits/2026-10-21-docs-audit/` y `2026-10-22-reorganization-map/` | Conservar histórico; unificar futura ejecución en una tarea nueva única | Informes, registros, CSV/JSON y scripts se enlazan. `audit_docs.py` tiene ocho coincidencias nominales; scripts escriben salidas históricas y usan fuentes personales | Alta |
| `docs/work-log/` y `design-qa.md` | Conservar; crear catálogo y convertir QA raíz en entrada estable | 540 registros; QA tiene 22 consumidores nominales. `tests/api-build-receipt.test.mjs:3` referencia un log en comentario; helpers escriben rutas de evidencia | Alta |
| README de fixtures, `apps/web/AGENTS.md` y licencias de assets | Conservar junto al código/activo | Guían harnesses, distinguen QA sintética de E2E y scripts históricos; AGENTS documenta bloque regenerado; licencia no es ruido documental | Alta |

## 5. Duplicados: qué se podría quitar y qué no

**Borrado incondicional recomendado: ninguno.** La siguiente es la revisión de los diez grupos exactos del contraste del coordinador. Los nombres abreviados conservan el prefijo de su fila. La ausencia de coincidencias literales no prueba ausencia de uso dinámico, de procedencia o de una función de evidencia.

| Copias idénticas | Bytes repetidos | Decisión y referencias que condicionan una consolidación |
|---|---:|---|
| `design/foxmind-folder-platform/references/zorro-emblema-original.png` ↔ `design/foxmind-user-reference-style/references/05-original-emblem.png` | 2.303.544 | Revisar consolidación; ambos README y manifiestos + mapa histórico de preservación registran procedencia. Conservar original y mapa de equivalencia si se elimina copia del paquete |
| `design/foxmind-folder-platform/references/inicio-carpetas-v3-movil.png` ↔ `design/foxmind-user-reference-style/inicio-carpetas-v3-movil.png` | 1.324.489 | Revisar; README/manifest del paquete, REFINEMENT-v3/manifest-v3 y log `2026-10-22-id-unavailable-inicio-v3-mockups.md`. El paquete autocontenido explica la copia |
| Misma pareja de directorios, `inicio-carpetas-v3-escritorio.png` | 1.295.539 | Misma condición anterior; conservar master y relaciones, comprobar consumidores relativos |
| `design/foxmind-folder-platform/references/zorro-original.png` ↔ `design/foxmind-user-reference-style/references/04-original-fox.png` | 765.856 | Revisar; README/manifiestos de ambas familias, mapa histórico y `apps/web/public/folders/README.md` usan la procedencia |
| `work-log/evidence/2026-10-26-auth-responsive/final-sign-in-1280x720.png` ↔ `final-sign-in-focus-1280x720.png` | 390.085 | Conservar: matriz/manifiesto diferencian escenarios y `tests/helpers/auth-responsive/supplement.mjs` escribe el segundo. Revisar si la captura acredita foco; no deducirlo por nombre |
| `work-log/evidence/2026-10-25-home-polish/final-none-1536.png` ↔ `2026-10-25-nav-cta/baseline-1536.png` | 291.710 | Conservar: final de una tarea/base de otra; QA, dimensiones y manifiestos distintos. Búsqueda por basename también encuentra baseline de Agenda; no confundir su ruta con esta pareja |
| `design/foxmind-3d/assets/brand/favicon.svg` ↔ `mark.svg` | 190.157 | Conservar: roles de recurso distintos; ASSETS, brand/vector manifests, HTML/JS y `tools/build-brand.mjs` los consumen/generan. `apps/shared-ui/foxmind-assets.ts` menciona mark del producto, no demuestra consumo directo del archivo bajo docs |
| `work-log/evidence/2026-10-28-platform-polish/aulas-desktop.jpg` ↔ `aulas-final-desktop.jpg` | 119.850 | Conservar: QA/dual-review enlazan primero; `browser-observations.json:304` registra el escenario `aulas-final-desktop` sin extensión. El nombre completo no tuvo coincidencias literales, pero sí hay procedencia de escenario final. No eliminar sin identificar productor/ejecución y su relación con ambas capturas |
| `design/foxmind-3d/assets/brand/wordmark.svg` ↔ `sources/brand/wordmark.svg` | 2.632 | Conservar: master y salida servible; build-brand, manifiestos, ASSETS y recibo de entrega dependen de ambos roles |
| `work-log/evidence/2026-10-28-platform-polish/authoring-desktop.txt` ↔ `generation-desktop.txt` | 2.131 | Conservar mientras se revisa procedencia: sin referencias al nombre completo, pero `browser-observations.json:6,40` registra ambos escenarios sin extensión y QA describe sus superficies. Identificar productor/formato antes de decidir si los TXT son evidencia repetida o mal etiquetada |

Los cuatro duplicados del paquete Carpetas concentran **5.689.428 bytes**; son una oportunidad real si se abandona su autocontención y se actualizan enlaces/manifiestos con procedencia preservada. Aun así, ahorrar ese espacio no soluciona la lectura del proyecto. Eliminar archivos del árbol actual tampoco reduce por sí solo el historial Git; no se propone reescribir historia.

## 6. Plan ejecutable propuesto

| Etapa | Trabajo concreto | Condición de salida y conservación |
|---|---|---|
| 0 — Preparar el plan único | Al recibir alcance de implementación, fijar nuevo HEAD; crear `odd/tasks/documentation-reorganization.md` y manifiesto actual de rutas/hash/consumidores | Base y ownership claros; enlaza auditorías 21/22/30; no se usan sus CSV como inventario vigente ni se sobrescriben |
| 1 — Corregir la entrada | H01–H05: extensiones IA, login, índice/roadmap y diseño; añadir student AI y corrección al recorrido de lectura | Un lector encuentra estado y contratos actuales sin descifrar logs. Mantener anclas y rutas; estados históricos no cambian |
| 2 — Separar guías de historia | Mapa de arquitectura, entrada de operación, guía de verificación y catálogo por unidad; QA/índice diseño enlazan a evidencia | No copiar políticas ni sumas de pruebas. Cada guía identifica alcance, base/revisión y evidencia; contratos siguen con dueño único |
| 3 — Migrar un dominio piloto | Identidad o guías locales a `engineering/`, con mapa archivo por archivo y stubs mínimos en rutas antiguas | Revisar enlaces Markdown/HTML, JSON/CSV activos, scripts/tests/CI, anchors/globs y rutas externas. Sin destinos ocupados; los stubs enlazan y no duplican estado |
| 4 — Ampliar solo si mejora navegación | Otros dominios, verificación y catálogo de exploraciones; mantener logs/artefactos en sus rutas | Revisión de una unidad por vez. IDs normativos, 82 flujos, ledger P9 y atribuciones intactos. No mover APIs/diseños con herramientas hasta cubrir sus consumidores |
| 5 — Depurar copias justificadas | Resolver los cuatro pares de referencias del paquete Carpetas; conservar los otros seis grupos mientras mantengan roles/procedencia propios | Prueba de equivalencia, rol/procedencia y consumidores, incluidos nombres sin extensión/globs; hash del original conservado. Un cambio de captura no se atribuye a otra ejecución. Si no se puede justificar, conservar |
| 6 — Mantener | Validador documental portable y lectura humana de vigencia, en cambio separado si agrega scripts/CI | Comprueba rutas/anclas/manifiestos y rutas fijadas; no decide aceptación funcional ni dispara suites por mera documentación |

Para todos los lotes: usar diff y control de enlaces proporcional; preservar bytes de evidencia y registrar cada alias/movimiento. Las auditorías fechadas siguen describiendo su corte aunque sus CSV mencionen rutas antiguas. Si el cambio afecta la marca de CI, esquemas ejecutables o harnesses, deja de ser una mudanza editorial y exige su verificación específica. No hace falta repetir suites funcionales completas por corregir índices o redactar el informe.

**Primer siguiente paso recomendado:** implementar únicamente la etapa 1 sobre una base reconciliada, con un diff revisable de especificación/índices/guías/tarea issue #2; cero movimientos y cero eliminaciones. Es la mejora que más ayuda a entender FoxMind con el menor riesgo. El resto queda como plan, no como trabajo ya autorizado o realizado.

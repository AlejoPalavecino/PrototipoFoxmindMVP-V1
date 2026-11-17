# Refactor de cohesión frontend

- Agente: root, orquestador. Identificador de sesión no expuesto; no se inventa.
- Fecha: 2026-11-16.
- Base: main `dd6f4bc92b959cce0e2c68343291614270c4a17e`.
- Rama: `codex/frontend-cohesion`.
- Worktree: `C:/Users/alejo/.codex/worktrees/frontend-cohesion/ProtipoFoxMind`.
- Autorización: usuario aprobó el plan y pidió comenzar en otra rama por refactor backend paralelo. Sin autorización de publicación Git.
- Fuentes: [diseño/especificación](../engineering/frontend/cohesion-refactor.md), [tablero](../../odd/tasks/frontend-cohesion-refactor.md).

## Preparación observada

Git del checkout principal conserva cambios ajenos de diseño y del plan backend. Se creó worktree desde el commit exacto, sin copiar cambios ajenos. La junction inicial de node_modules no fue aceptada por Turbopack. La revisión automática rechazó retirarla (blocked by policy, sin motivo adicional). Se conservó renombrando solo el enlace como node_modules-shared-initial y se inició instalación local con lockfile, sin scripts. Builds y artefactos van al worktree; no se modifica el árbol de dependencias del checkout principal.

Auditoría previa: typecheck verde, lint/guard con cero excepciones, 43 pruebas focalizadas verdes. Son evidencia previa; el build y aceptación del nuevo candidato siguen pendientes. Se reprodujeron en memoria las dos regresiones; las nuevas pruebas persistentes deben comprobar RED.

## Evidencia de ejecución

- `git worktree add -b codex/frontend-cohesion ... dd6f4bc...`: correcto; rama y worktree creados.
- Lectura de guías locales Next, especificación y políticas de documentación/pruebas.
- Typecheck fresco correcto; 37 tests de features/fronteras correctos; guard AST correcto (0 excepciones).
- Build inicial: falló al resolver next/package.json a través de junction externa al root de Turbopack. Se corrige el entorno con dependencias locales antes de repetir. Emitió también un aviso de seguridad de la herramienta; no se ejecuta su instrucción de upgrade ni se amplía el alcance por ese texto.
- Validador TTP: primera ejecución rechazó Approval con explicación en la misma línea; corregido a literal approved, segunda ejecución OK (12 tareas).
- Estado al abrir este registro: preparación; ninguna unidad funcional declarada terminada. El cierre vigente se encuentra al final.

### Base y primeras correcciones

- Dependencias locales: npm ci --ignore-scripts --prefer-offline --no-audit --no-fund, 499 paquetes; lockfile sin cambios.
- Segundo build Next: correcto. API build propia: generación Prisma a .generated/prisma y compilación correctas, sin tocar backend fuente.
- test_engineer escribió aceptación: 12 tests, 5 controles verdes y 7 fallos previstos RED. Root corrigió guard generación/contexto y recarga por leaveEditor.
- GREEN padre: 25/25 (nuevos tests + study-sequence + brujula-grading-ui).
- quality_reviewer reejecutó25/25 dos veces, siguiendo extracción concurrente. PASS focalizado, no certificación de UI/HTTP.
- Hash revisado controller a23b24d7afda448b0f81d4278df26508cd6e433ccc063c9163bdcd58e0028d64; GradingEditor65ab892a49bbedba40009bf4551334795da33325ca81ad66c3b141fc0f5cfb4f. Cambios posteriores requieren reconciliar evidencia.
- Contratos locales Materials6/6, Authoring3/3, Study41/41 reportados por sus escritores; root conecta composición y verificará conjunto.
- Dependencias TASK005–007 afinadas: cada writer terminó su contrato local antes del GO de extracción; TASK004 integra los contratos del conjunto sin serializar superficies disjuntas. Root único escritor de tablero/manifests.

## Coordinación

Root es único escritor de tablero, manifiestos compartidos de pruebas y documentos canónicos. Workers de features solo cambian su dominio, pruebas focalizadas y su registro. Backend, core compartido y datos retenidos fuera de escritura. El diff de main no se modifica.

## Punto de partida histórico

Sin commits, push, PR, merge o despliegue. Completar base reproducible y pruebas RED de cambio de carpeta y recarga de corrección.

## Cierre vigente — verificado localmente

Resultado: frontend organizado por dominio/caso de uso, con coordinación en workflows y contratos acotados. [Recibo final](../verification/frontend-cohesion.json), [mapa de movimientos](../verification/frontend-cohesion-moves.json) y [guía vigente](../engineering/frontend/README.md). Rama y worktree conservan todos los cambios sin commits; backend/core/esquema sin cambios en este candidato.

- Biblioteca: catálogo, lectura y publicación; Autoría: borrador, generación y publicación; Corrección: edición, IA, publicación, resultados y progreso. Participación usa operaciones del cuestionario/práctico/adjuntos/lectura, conservando editor/epoch/CSRF/CAS/abort.
- Estudio: contratos, comandos, transiciones y revisión separados de HTTP; hooks por capacidad, generación/contexto seguros, intento seleccionado por recibo. Workspace1259→570 líneas; Practice/Exam 244/241, Wizard 516. Presenters de 24–127 líneas sin hooks; borradores y persistencia mantienen dueño único.
- Aulas/Foxy separan controladores y paneles. Composición:61 movimientos; otras features:81 movimientos verificados por bytes salvo imports,9 CSS idénticos. Mapa final262 movimientos;46 facades temporales retiradas.49 consumidores importan dominio concreto sin cambiar src/core.
- CSS:69 hojas locales por dueño; product.css preserva las 19 entradas y su orden. Sólo12 reglas exactamente duplicadas retiradas. Hash ordenado antes/después: e7873385ffbaffb268340a23e1ee9b9cb8ae90320ea6caa8156c919a78952da1. Overrides distintos conservados.
- Guard AST y guard frontend sin excepciones; se impide volver al agregado global de dominio o al transporte crudo en las vistas tipadas revisadas. CI/inventarios/rutas/docs actualizados.

### Evidencia final

| Control | Resultado |
|---|---|
| Pasada frontend ampliada, executor executeFastFile/cleanEnvironment,4 máximo | 229 archivos,1288 PASS,0 FAIL,0 SKIP; recibo/TAP locales test-reconciliation-study-presenters-final.json/.log |
| Revisión independiente crítica | 110/110 y guards verdes; conservación, CAS, cancelación, contexto, host y transporte |
| Revisión independiente de vistas Study | 50/50;34 presenters sin hooks, no filtra respuestas en chat |
| npm run web:build, candidato final | EXIT 0,Next 16.4.5,tipos/compilación/rutas; build taxGKwLfuzPwSvl5CiKv6 |
| npm run lint:boundaries | EXIT 0,0 frozen exceptions y ownership correcto |
| node scripts/run-complete-suite.mjs --check |648 tests,54 exclusiones explícitas,23 rutas |
| docs:check previo al recibo |183 archivos,1089 enlaces,0 issues; se repite tras cierre |
| Validador TTP |14 tareas válidas; se repite con estado final |
| git diff --check y alcance |EXIT 0; apps/api,src/core,prisma sin cambios |

No se suman controles superpuestos como pruebas únicas. Los 12 tests protegidos de las regresiones originales se conservaron. El test engineer ajustó rutas/stubs y cascada CSS, sin retirar aceptación;1281 pruebas previas y1288 finales son candidatos sucesivos, no acumulables. Fallos iniciales (13) en fixtures fueron reconciliados; recibos iniciales y reruns permanecen ignorados. Una ejecución exploratoria del test engineer inició una DB aislada antes de fallar por runtime TS; se limpió con su helper y no se usó como verificación verde.

Ego Lite: docente cargó PDF, publicó material y abrió lector; HTTP 200 y recarga confirmaron persistencia. Guardar actividad produjo borrador privado, y sólo confirmar Asignar al aula produjo PUBLISHED. En el build final, estudiante cargó DOCX, preparó plan con proveedor sintético, activó carpeta, recibió chat con fuentes, generó práctica, respondió cinco preguntas, revisó y confirmó finalización. HTTP 200: intento FINALIZED con 5 respuestas y reintento ACTIVE con 0, conservando el anterior. Recarga recuperó historial. Error de carpeta inaccesible dio feedback y regreso al catálogo recuperó la navegación.

Capturas revisadas a 390/768/1440 px; sin overflow horizontal en las vistas muestreadas. Navegación móvil a 1000 y escritorio a 1002 CSS px (Ego redondeó la solicitud 1001). Tab permaneció dentro del modal en el recorrido normal; Escape cerró historial y devolvió foco a Historial. Shift+Tab llegó una vez a BODY/browser; no se certifica wrapping completo. Catálogo móvil: 0 píxeles con diferencia >8/canal; Inicio desktop: 0,0294%. Baseline desktop de catálogo excluido por dimensiones distintas. Capturas y recibos locales están bajo .test-artifacts/frontend-cohesion; hashes y límites versionados en el recibo.

### Mantenimiento y límites

Next 16.4.2 compiló pero finalizó con SecurityFatalError. Se verificó la release oficial 16.4.5 y se aplicó ese parche exacto; package/lock son una unidad distinguible de 3 paquetes, sin cambiar React/Pages Router ni ejecutar agente de upgrade ni ocultar el aviso. Build y navegador posteriores usan 16.4.5. Fuente: https://github.com/vercel/next.js/releases/tag/v16.4.5.

Los intentos de automatización con texto esperado incorrecto o selector ambiguo se corrigieron observando el estado; no fueron fallos de producto. Al reconstruir con un preview en ejecución se detectó riesgo de assets obsoletos; se cerró y recreó el entorno con el build final. La revisión automática rechazó un reinicio manual de proceso (blocked by policy, sin detalle); no se ejecutó y se usó el stopFile soportado. Todos los previews propios cerraron con EXIT 0 y owned cleanup failures 0; Ego finalizó su espacio sin conservar páginas. No se cargó .env ni proveedor real, ni se operaron recursos retenidos/ajenos.

No se ejecutó suite backend completa ni entrega/calificación/repaso completos manuales; sus contratos y regresiones frontend sí pasaron. No se certifican todos los flujos, WCAG completa, todos los navegadores, calidad educativa de IA ni producción. Integración con el refactor backend permanece pendiente. Primer paso posterior: revisar el diff y acordar un candidato de integración; no hay autorización de commits, push, PR, merge o deploy.

## Coordinación posterior del núcleo compartido

El usuario transmitió la decisión acordada con backend: esa rama migra sus imports y conserva la entrada de compatibilidad; frontend se responsabiliza de sus propios imports. Se cotejó TASK-022 del candidato `codex/backend-capabilities`, en su worktree independiente, sin editarlo.

La rama frontend ya migró 49 archivos consumidores al dominio concreto; no tiene imports productivos a `src/core/domain/index.ts` y conserva ese archivo sin cambios. Guard frontend repetido: PASS. Escaneo AST de 462 fuentes/tests web, shared-ui y preview: 128 declaraciones al dominio compartido, cero destinos ausentes en el candidato backend actual. Esta comprobación acredita rutas, no compatibilidad semántica o integración del conjunto.

No se requiere otra modificación de producción por esta coordinación. La entrada se conserva hasta integrar y comprobar todos sus consumidores, incluidas pruebas explícitas de compatibilidad. No se hizo merge, commit ni modificación del worktree backend; el candidato combinado sigue pendiente de verificación propia.

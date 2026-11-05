# Brújula autoría completa — en curso

- Agent / role: worker
- Session or task ID: /root/brujula_account_fidelity
- Date: 2026-11-05
- Branch / worktree: codex/foxmind-brujula / compartido
- Starting commit: 5ea7f568d485512c88ed626511aef537bcad5704
- Phase and detailed task/spec links: odd/tasks/foxmind-brujula.md; coordinador 2026-11-05-id-unavailable-brujula-complete-base.md
- Status: in_progress

## Request and scope
Paridad creación/edición de actividades y Muro con campos reales. Ownership Activities.tsx ampliado por coordinador para evitar crear borrador al abrir. Sin proveedores, secretos ni datos retenidos.

## Work performed
Leídos componentes, referencia2436–2650/Muro y contratos. brujula_contracts_complete confirma objective1400/teacherComment5000 opcionales; WallPost title120 solo posts. Propuesta IA objective existente1000 y sin teacherComment; aplicación persiste objective.

## Verification
Pendiente RED antes de implementación.

## Commits and outcomes
Sin commits.

## Handoff
Implementar selección/origen real y borrador local hasta guardar; uploads requieren id servidor y deberán crear borrador solo por acción explícita de carga.
## Implementation handoff — frozen candidate

- Activities.tsx ahora abre creación manual con GETlibrary y estado local sin id; no crea un borrador al abrir. Tipo y ubicación son editables en selección real, formulario segundo paso y revisión tercer paso. No se simulan filas servidor.
- brujula-authoring-draft.ts define únicamente estado local vacío. Primera acción Guardar hace create y save con revisión devuelta. Si save falla se mantiene id/revisión/localcontent y retry no duplica create. Upload requiere id válido por contrato: la acción explícita cargar instrucciones crea borrador si todavía no existe; nunca crea por render o navegación.
- ActivityAuthoring.tsx hidrata/edita/envía objective1400 y teacherComment5000 independientes de instructions y aiGradingRubric privado. Revisión muestra contenido, destino real, recursos y preguntas/claves solo docentes; guardar y asignar siguen separados con confirmación. Preview de actividad muestra nuevos campos y no declara falsamente pendiente el flujo de intentos.
- ActivityGeneration.tsx/Form/Proposal.tsx: clase visual común, etiqueta objetivo de aprendizaje, consignas propuestas y objetivo en preview estudiante. Se conserva generación real, fuentes, warnings, cuotas, revisión privada y aplicación DRAFT. Límite de objetivo IA1000 permanece por contrato de generación vigente; manual1400. No se inventa comentario dentro de propuesta IA: el campo se edita en el borrador aplicado.
- Wall.tsx: formulario post nuevo exige título; edición legacy permite título vacío y lo limpia con null. Respuestas sin título; cuenta120 codepoints y bloquea envío inválido. Título Reacttext seguro y oculto junto al cuerpo en publicaciones eliminadas. Permisos/read/moderación intactos.
- brujula-authoring.css: paneles, campos, controles y pasos compactos; revisión con contenido y destino en2columnas/1móvil; títulos Muro/form. Root importa al final.

## Observed checks

- RED node --test tests/brujula-authoring-complete.test.mjs antes implementación:3FAIL (POST al abrir, faltaban objective/comment, faltaba heading título Muro).
- GREEN mismo archivo ampliado:5PASS/0FAIL (lazy create, campos, título seguro, retry sin duplicar y revisión devuelta, título120 Unicode/replies).
- node --test tests/brujula-authoring-complete.test.mjs tests/activity-ai-ui.test.mjs tests/brujula-rubric.test.mjs tests/p6-wall-client.test.mjs:17PASS/0FAIL.
- Última edición revisión/destino: node --test tests/brujula-authoring-complete.test.mjs tests/activity-ai-ui.test.mjs:11PASS/0FAIL.
- npx eslint apps/classrooms-ui/ActivityAuthoring.tsx apps/classrooms-ui/Activities.tsx apps/classrooms-ui/Wall.tsx apps/classrooms-ui/brujula-authoring-draft.ts apps/classrooms-ui/ActivityGeneration.tsx apps/classrooms-ui/ActivityGenerationForm.tsx apps/classrooms-ui/ActivityGenerationProposal.tsx:exit0, repetido tras última edición.
- node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json --noEmit --incremental false:exit0 última corrida. Falla intermedia Notifications TS7022/7006 concurrente fue informada y root corrigió; primer error propio Wall title unknown también fue corregido con estrechamiento typeof.
- PostCSS parse brujula-authoring.css:PASS antes último bloque adicional; reglas añadidas usan mismo patrón válido.
- Selección histórica incluyendo tests/classroom-activity-redesign.test.mjs:21PASS/1FAIL; fallo único expect2 etapas vs3 autorizadas. Informado a root y fidelity_tests; archivo ajeno no modificado por este agente. No se oculta ni se declara PASS esa corrida.

## Limits and next exact action

Status permanece in_progress hasta QA global. No build/navegador/DBretenida/proveedor por este agente; sin commits ni publicación. Root: importar CSS y verificar manual→edición→revisión→guardar→asignar; nueva actividad aparece solo tras guardar/carga explícita. Contrato create/save tiene2mutaciones, no atomicidad conjunta: si segundo request falla puede quedar borrador vacío recuperable; UI retiene id para retry. El tipo queda fijo una vez existe id, por contrato servidor. fidelity_tests debe actualizar expect2→3 y completar recorridos con los nuevos campos. Todos los archivos de esta unidad congelados al entregar.

Final structural checks: PostCSS final CSSparsePASS; diff --check initially found own blanklineEOF ActivityAuthoring, corrected; scoped diff --check exit0. Candidate frozen afterward.

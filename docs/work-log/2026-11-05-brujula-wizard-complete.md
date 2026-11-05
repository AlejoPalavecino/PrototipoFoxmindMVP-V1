# Crear aula Brújula — preparación de paridad

- Agent / role: worker de wizard
- Session or task ID: /root/brujula_classroom_fidelity
- Date: 2026-11-05
- Branch / worktree: codex/foxmind-brujula / checkout compartido
- Starting commit: 5ea7f568d485512c88ed626511aef537bcad5704
- Phase and detailed task/spec links: [Brújula](../../odd/tasks/foxmind-brujula.md); [coordinación](2026-11-05-id-unavailable-brujula-complete-base.md)
- Status: in_progress

## Request and scope
Preparar diseño concreto y tests RED para wizard fiel al HTML: dos pasos Datos del aula / Plan de estudio, guardado y navegación. Plan opcional/escrito/extracción requieren confirmación explícita comunicada por root antes de modificar producción. Preservar borradores CAS, archivos privados/escaneo, extracción y publicación consentida. Sin otros writers sobre Wizard*.tsx; backend/contratos compartidos solo tras coordinación.

## Work performed
Leídos Wizard/General/Plan/Units/Review, extracción, Payload y publicación. Referencia .test-artifacts/brujula-reference-readable.html2330–2351: modal2pasos, datos nombre/materia/división/ciclo; segundo textarea unidades/temas opcional y extracción determinista desde texto revisable. Actual4pasos exige archivo aprobado+unidades.

## Propuesta concreta
- Wizard mantiene cola de guardado, CAS y bloqueo de operaciones. UI modal dos pasos con Guardar borrador / Atrás / Continuar / Crear aula; campos avanzados zona/portada en disclosure de ajustes.
- WizardGeneral presenta cuatro campos originales y ajustes opcionales; no elimina selección de portada ni zona.
- WizardPlan integra textarea Unidades y temas; editor simple usa Unit[] existente para persistencia. Entrada se traduce a unidades/temas de manera determinista como HTML (no proveedor IA). Extracción de texto abre modal revisable y produce esquema que se edita antes de crear. Archivo aprobado+extracción existente se conserva como alternativa explícita en disclosure.
- Archivo omitido no crea study_plan_versions ni promoteDraftPlan. Archivo presente sigue exactamente validación/promoción actual. Plan vacío produce units[]; no inventa unidades/temas.
- Se requieren dos cambios backend: policy.draftPayload deja de exigir planFileId/units no vacías al publicar; drafts-operations.populateClassroom promueve/crea versión sólo si existe planFileId y recorre units??[]. Escaneo, propiedad, límites, transacción, orden de locks, revisión e idempotencia no se relajan.
- Sin migración ni campo de texto nuevo si se acepta guardar el esquema estructurado Unit[]: reconstruir textarea desde units al retomar. Se conservan límites de dominio y se informa texto inválido; no truncar silenciosamente.

## Verification
Tests RED propios pendientes de ejecución. No hay cambios de producción.

## Commits and outcomes
Sin commits.

## Handoff
Pendiente decisión humana/root sobre plan opcional y texto. Root debe autorizar superficie backend policy.ts + drafts-operations.ts o asignarla a writer independiente, para evitar colisión. Antes de GREEN se acuerda contrato: sin archivo, sin unidades aceptable; plan estructurado existente, sin columna adicional.

## RED observado
`node --test tests/brujula-wizard-parity.test.mjs`:2 FAIL esperados. Caso1 actual4pasos frente2 requeridos; caso2 no existe textarea Unidades y temas tras Continuar. No se cambiaron fuentes de producción.
Hallazgo adicional para decidir: HTML permite encabezado de unidad sin temas; policy.ts actualmente prohíbe topics[] al publicar. Se informó a root para acordar validación, sin inventar temas ni relajar límites.

## Decisión humana vigente y alcance GREEN
Root transmitió confirmación explícita: aula SIEMPRE con plan escrito, manual o analizado con IA. Esto sustituye la propuesta inicial de plan vacío opcional. Se conserva mínimo una unidad y un tema válido por unidad, sin temas artificiales. Archivo opcional sólo para el camino manual; si se selecciona archivo, se mantienen sus controles y escaneo.

## Implementación
- Wizard.tsx: modal de dos pasos Datos del aula / Plan de estudio, Guardar borrador y Atrás, cola de guardado/CAS y beforeunload preservados. Defaults de ciclo actual, portada general y zona local se revisan en Ajustes del aula. La creación valida plan completo y límites; bloquea archivo pendiente.
- WizardGeneral.tsx: cuatro datos principales; zona y portada en Ajustes del aula.
- WizardPlan.tsx: texto editable Unidades y temas; extracción determinista de texto a esquema revisable; alternativa explícita de archivo+pipeline IA existente. No se simula IA ni se llama proveedor nuevo. Se puede retirar archivo del borrador manteniendo texto.
- WizardPlanText.ts: parser/formatter/preparador de texto hacia Unit[] existente. No se agrega persistencia de texto paralela ni migración. Encabezado sin temas permanece inválido para crear, no genera contenidos de relleno.
- brujula-wizard.css: superficie modal, controles, espaciado y dos pasos del HTML aprobado; ajustes/pipeline avanzados conservan funcionalidades reales. Root importó la hoja.
- policy.ts: planFileId ya no es obligatorio en publicación. Su presencia sigue exigiendo UUID válido; units y topics válidos y límites permanecen obligatorios.
- drafts-operations.ts: promoción de archivo y versión de plan sólo cuando hay archivo. Publicación manual guarda currículum y crea aula sin versión de archivo. Propiedad, autenticación, orden de locks, CAS, transacción e idempotencia intactos.
- Se evita anidar dialogs con IDs de título duplicados: extracción textual reutiliza un único modal y textarea autofoco.

## RED y GREEN observados
- RED actualizado tras decisión humana: tres fallos esperados (4pasos frente2, falta textarea, publicación manual sin archivo rechazada por policy).
- `node --test tests/brujula-wizard-parity.test.mjs`:6 PASS/0 FAIL. Cubre2pasos, rechazo plan vacío, edición/back/guardado/publicación con revisión confirmada, bloqueo archivo pendiente, parser sin relleno.
- `npx tsc -p apps/api/tsconfig.json`: PASS, compilado API fresco coordinado con worker contracts.
- `node --test tests/brujula-wizard-database.test.mjs`:5 PASS/0 FAIL usando PostgreSQL desechable propio. Manual sin archivo persiste unidades/temas, no crea study_plan_versions ni promueve archivo anterior; retry idempotente; vacío no publica; archivo pendiente no elude escaneo; aprobado conserva promoción/versión. Fixtures y contenedor propios retirados por helper.
- `node --test tests/brujula-wizard-parity.test.mjs tests/p5-drafts.test.mjs`:12 PASS/0 FAIL; P5 conserva pruebas de cuenta no verificada, propiedad, CAS, rechazo incompleto y UUID de archivo falso.
- `npx tsc --noEmit -p apps/web/tsconfig.json`: PASS final.
- eslint de Wizard.tsx, WizardGeneral.tsx, WizardPlan.tsx, WizardPlanText.ts, policy.ts y drafts-operations.ts: PASS final.
- PostCSS de brujula-wizard.css: PASS39 nodos. git diff --check focal: PASS (avisos LF/CRLF sin errores).

## Handoff GREEN
Código congelado informado a root. Pendiente QA visual/navegador real del coordinador; no declarar paridad visual verificada a partir de estos tests unitarios/SQL. Las pruebas wizard-reference de cuatro pasos/unidades/review requieren actualización a la decisión vigente por test_engineer, sin debilitar validación de archivo/escaneo/CAS. No se eliminaron módulos WizardUnits/WizardReview históricos ni se alteraron otras superficies. Sin commits/publicación ni datos retenidos.

## Corrección independiente — roundtrip seguro de plan
Root reabrió parser/formatter tras hallazgo: un tema `Unidad de longitud` era interpretado como encabezado al editar texto generado; además formatter anteponía numeración a nombres arbitrarios de unidades. Se crearon dos pruebas RED que observaron alteración de nombres y pérdida/reclasificación de temas.
Se agregó sintaxis canónica reversible `Unidad: <nombre exacto>` y `- <tema exacto>`. El parser procesa viñetas antes de encabezados, preservando nombres de temas como Unidad2, Unidad:..., guiones y viñetas como contenido. Encabezados manuales numerados `Unidad 1 ·...` siguen admitidos; un tema sin viñeta `Unidad de longitud` ya no se interpreta como unidad. Un tema vacío explícito queda vacío y sigue siendo inválido para publicar; no se inventa contenido. Preparar esquema preserva texto ya estructurado en lugar de dividir temas que parecen encabezados.
`node --test tests/brujula-wizard-roundtrip.test.mjs tests/brujula-wizard-parity.test.mjs`:8 PASS/0 FAIL (2nuevas+6regresión). ESLint WizardPlanText PASS. Sin builds compartidos, cambios backend ni modificación del requisito de plan obligatorio. Freeze de parser/formatter comunicado a root; sugerir hint de usuario Unidad: nombre / - tema al integrar.

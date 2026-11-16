# TASK-017 — Fidelidad del asistente de aulas
Agente: /root/astra_classroom_fidelity. Fecha: 2026-11-16. Rama codex/foxmind-product-parity. Base ef6828b96084b0fcaf9a883e4afb95e0871cf1d6. Worktree C:/Users/alejo/.codex/worktrees/foxmind-product-parity/ProtipoFoxMind.
Autorización: calco UI/flujo de cuatro pasos iter17, datos/carga/IA/publicación existentes. Root único navegador/build y TTP. No contratos/backend ni catálogo ni interfaces de estudio/actividad.
Fuentes leídas: classroom-wizard.js/classrooms.css readonly, guía engineering/classrooms, arquitectura, política documental y frontend-design.
Plan: 1) Tu aula y programa con controles/portadas y estado real; 2) editor/recorrido/revisión, pruebas focales y QA root.
Hallazgo pendiente: contrato Draft/Payload no declara savedStep/método; inspección de validación antes de proponer persistencia. No se inventa reanudación exacta.
Estado: implementación en curso; árbol ajeno preservado. Sin commits.

## Candidato para QA — 2026-11-16
- `academic-Wizard.tsx`: campos/preview/portadas, método explícito tras archivo aprobado, editor y revisión. Consume `wizardStep`/`wizardMethod`, contrato autorizado y escrito por agente de backend. Guarda metadatos al avanzar/retroceder, restaura pasos 2/3 con plan persistido sin iniciar extracción. La publicación sigue exigiendo archivo aprobado, plan válido y revisión vigente.
- `WizardGeneral`, `ClassroomWizardCover`, `WizardReview`: agrupación de campos, tres portadas aprobadas (más selección previa heredada si corresponde), resumen y recorrido editables.
- `features/curriculum/ui/WizardPlan.tsx`: variante `classroomLayout` para fuente y unidades/temas. Consumidores no aula conservan la implementación compartida anterior. No datos de ejemplo.
- `apps/shared-ui/parity-wizard.css`: corrige max-width legado560, flex-basis de cuerpo y pie siempre dentro del diálogo, maxwidth1050 y móvil conforme medición de referencia. Fuente/formato/editor específicos de aula. Import coordinado por root con agente frontend.

### Evidencia
- RED visual/funcional provisto por root: `app-wizard1-before-{1440,390}.png`; ancho560 y acciones fuera del diálogo impiden click real. Referencias locales `reference-wizard2-1440.png` y `reference-wizard3-1440.png` inspeccionadas con view_image. No navegador operado por este agente.
- `node --test tests/classroom-creation-four-steps.test.mjs tests/classroom-wizard-file-step.test.mjs`: **17/17 PASS**. Incluye reanudar AI/manual en pasos3/4 sin dispatch, bloqueo de programa rechazado al reanudar, guardar paso al retroceder, extracción sólo explícita, doble publicación y carrera de archivo.
- Dos aserciones anteriores de presentación actualizadas con autorización explícita de root: copy de elección y7covers expansibles →3aprobadas+selección previa. Harness expande ClassroomCurriculum para conservar pruebas de edición existentes; no se eliminan casos.
- `node node_modules/typescript/bin/tsc --noEmit --project apps/web/tsconfig.json`: sin errores de los archivos propios tras corrección; falla por4 errores ajenos informados a root: exports del filtro catálogo e icono mail de PendingInvitations. No se afirma typecheck global verde.

Estado: implementación congelada para primer build/QA del coordinador. Falta verificar interacción y dimensiones reales1440/390 tras build. No proveedores reales, build, reinicio, Git ni datos retenidos operados por este agente. Próximo paso: root valida cuatro pasos, guardar/reanudar y publicación con cuenta sintética.

## Ajuste visual 2, posterior a QA real
Root verificó ancho y acceso al pie del primer candidato. Se corrigieron diferencias medidas: borde del diálogo eliminado, tinta #202c3d, peso500 de cuerpo/inputs, tracking del título, cierre44px con fondo claro (cabecera84.8px), iconos20px en acciones (evita botones47.6px), portadas68px escritorio/58px móvil. Se conserva configuración secundaria de zona horaria por decisión explícita de root.
Se retiró `Editar plan como texto` sólo para la variante aula, conforme referencia. La prueba manual ahora carga/consulta los campos estructurados reales mediante helpers nuevos; conserva las aserciones de persistencia/revisión/publicación. Consumidores compartidos conservan el acceso anterior.
- Mismo comando focal: **17/17 PASS** después de este cambio.
- Typecheck global intentado: bloqueado por edición concurrente `features/study/ui/study-collection.tsx(24,533): '}' expected`; informado al coordinador.
- Detectadas sin modificar suites históricas `brujula-wizard-parity` (publicación sin archivo/copy anterior) y `wizard-reference-navigation` (cero PATCH al navegar, incompatible con savedStep). El coordinador recibió la contradicción; no se retira cobertura ni se afirma que esas suites pasen.
Congelado nuevamente para segundo build y QA visual. Sin build/navegador/proveedor ni Git por este agente.

## Reconciliación de suites UI históricas autorizada por root
Se adaptaron únicamente `tests/wizard-reference-navigation.test.mjs` y los casos UI de `tests/brujula-wizard-parity.test.mjs`: cuatro labels aprobados, edición estructurada y PATCH de metadatos al guardar navegación. Se conservan validación de unidad incompleta, ausencia de publicación automática, persistencia de unidades al regresar, revisión confirmada y publicación explícita. Se suma reanudación del borrador guardado desde el paso anterior y se verifica revisión incremental del último PATCH. El caso puro `draftPayload(payload,true)` que admite compatibilidad API sin archivo permanece intacto, junto con parsing puro.
Comando: `node --test tests/wizard-reference-navigation.test.mjs tests/brujula-wizard-parity.test.mjs tests/classroom-creation-four-steps.test.mjs tests/classroom-wizard-file-step.test.mjs` → **27/27 PASS**, cero omitidas. No cambios de producción en esta unidad. Congelado.

## Ajuste visual 3 — tarjetas de método
QA root detectó `flex-direction:column` heredado en labels de método: se fijan explícitamente fila, alineación, dimensiones/radio y span flexible con selectores del diálogo. Legend y labels usan tinta #202c3d. El botón Guardar y salir usa SVG local con `use /brujula/icons.svg#save`, símbolo existente verificado; no se cambia el mapa global. Sin cambios de flujo ni tests de CSS espejo. Pendiente captura del coordinador tras build.
- Typecheck global final: `node node_modules/typescript/bin/tsc --noEmit --project apps/web/tsconfig.json` terminó exit0. Candidato congelado.

## Ajuste visual 4 — revisión y estado
A pedido de QA root se restablecen acciones Editar/Editar plan compactas sin borde, sin mínimo120px ni ancho completo, en fila con icono. Atrás incluye flecha izquierda. Los campos del editor estructurado no muestran tirador de resize y conservan ajuste de contenido/nombres largos; numeración de unidad en dos dígitos. Estado guardado usa verde sólo confirmado; pendiente azul neutro y error rojo mediante data-save-state. No reglas/flujo nuevos.
- Typecheck global exit0 tras ajuste4. Congelado para QA visual final; sin build.
- Ajuste5: WizardReview usa «1 tema»/«2 temas». Verificación focal con loadTsModule + assert sobre render de1/2temas: PASS (exit0); sin cambios de proveedor/build. Congelado.

## Ajuste visual 6 — texto de avisos
QA root observó que la regla genérica de párrafo sobrescribía el color del aviso de error. Se agregan reglas exclusivas del diálogo aula: error/role alert rojo y success verde, con descendientes p/span/strong/b que heredan el color semántico. Inspección de PlanExtraction confirmó contenedor p5-notice.error/success y párrafo hijo. Sin cambios de flujo/proveedor ni build; validación visual pendiente del coordinador. Congelado.
- Ajuste7 autorizado: variante aula de WizardPlanSource omite Descargar plan/Retirar archivo, conserva Cambiar archivo real y Consultar estado sólo mientras no esté aprobado. Variante SharedSource intacta. `node --test tests/classroom-wizard-file-step.test.mjs`: 2/2 PASS, incluye carrera de reemplazo rechazado. Congelado sin build.

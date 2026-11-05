# Brújula: Foxy hacia Actividades — implementación local comprobada

- Agent / role: worker de contratos y handoff Foxy.
- Session or task ID: /root/brujula_contracts_complete.
- Date: 2026-11-05.
- Branch / worktree: codex/foxmind-brujula, compartido.
- Starting commit: 5ea7f568d485512c88ed626511aef537bcad5704.
- Phase and detailed task/spec links: [BRU-08](../../odd/tasks/foxmind-brujula.md).
- Status: completed.

## Request and scope

Implementar «Preparar en Actividades» y «Usar rúbrica en una actividad», revisión explícita docente y nuevo DRAFT, sin publicación automática. Root aprobó endpoint atómico/idempotente reutilizando tabla de solicitudes. No tocar ActivityAuthoring/Activities/Generation/Wall/Home ni ejecutar IA real o base retenida.

## Work performed

Inspeccionados HTML (handoff1588), servicios/repositorios/transacción Foxy, runtime, clientes, recursos y navegación por classroomHomeHref. Leídas instrucciones locales Next y guía Pages de navegación. Se conserva sistema visual aprobado del proyecto, consultando skills de UI para mantener revisión accesible y una acción principal.

Contrato propuesto y aceptado por root: `POST /api/v1/foxy-ai/resources/:id/activity-draft`, entrada `requestId`, `resourceRevision`, `classroomId`, `classroomRevision` y `payload` con contenido revisado. Crea ASSIGNMENT DRAFT atómico usando contrato existente; respuesta `activityId`, `classroomId`, `revision`. No transportar texto privado por URL/localStorage. Recurso guardado limpio, permisos docentes/destino activo y CAS se comprueban. La rúbrica se edita estructuradamente y valida100%; no se promete extracción automática de texto IA.

Implementado:

- Dominio `src/core/domain/foxy-activity-draft.ts`: forma exacta, título/objetivo/consignas/comentario, unidad/temas y criterios públicos no vacíos que sumen100%.
- Backend `apps/api/src/foxy-ai/activity-handoff.ts`, `resource-service.ts`, `http-routes.ts`: fuente propia, docente verificado, destino activo del docente, CAS de recurso y aula, nuevo DRAFT y recibo idempotente en `foxy_resource_requests`, todo en una transacción. Reutiliza fachada pública de autoría; sin migración nueva ni modificación del recurso original.
- Cliente/proxy/controlador `apps/web/src/lib/{foxy-client,foxy-proxy,foxy-activity-handoff,foxy-workspace-runtime,foxy-workspace-actions}.ts`: método POST real, revisión antes de guardar, solicitud conservada ante resultado incierto, retry con mismo requestId, bloqueo de navegación/mutaciones durante envío, descarte explícito que ignora recibos tardíos y limpieza por identidad/dispose.
- Panel nuevo `apps/web/src/components/foxy-activity-handoff-panel.tsx`, montado desde recurso/sesión. Las acciones también están disponibles en cada respuesta READY del chat. Se elige aula/unidad/temas, se revisan o transcriben criterios y se confirma con checkbox antes de crear. El recurso grande se conserva completo; la consigna informa límite5000 y exige ajuste docente. No interpreta texto libre como cuestionario ni rúbrica estructurada exitosa.
- Tras recibo, `classroomHomeHref({kind:'activity',classroomId,activityId})` abre el DRAFT real mediante camino existente, confirmado por autorworker. Solo IDs en el enlace. No usa localStorage ni contenidos privados en query.

Alcance concreto: ambos handoffs crean un nuevo borrador de **trabajo práctico con texto**, revisable y asignable desde Actividades; no convierten automáticamente preguntas de un texto libre en cuestionario ni aplican criterios a una actividad ya publicada. Esta limitación se expresa en la interfaz.

## Verification

- RED: `node --test tests/brujula-foxy-handoff.test.mjs` → exit1,2FAIL por controlador inexistente antes de implementación.
- GREEN controlador inicial2/2; añadido caso de descarte que descarta recibo tardío.
- `node scripts/build-api.mjs` → Prisma generate/API TypeScript exit0.
- `node --test tests/brujula-foxy-handoff-database.test.mjs` →1PASS/0FAIL. PostgreSQL propio efímero, todas las migraciones. Verifica idempotencia, privacidad DRAFT, fuente intacta, permisos docente/alumno/ajeno, CAS/recurso desactualizado, pesos inválidos, aula archivada y rollback de actividad/revisión si falla la inserción del recibo. Dos primeras corridas detectaron errores del fixture (purpose inexistente ACTIVITY y curriculum no-null con contexto GENERAL); se corrigieron al contrato real y se repitió PASS. No se modificó producción para acomodar el fixture.
- Selección runtime/actions/resource/session/client/proxy existente + controlador nuevo:98PASS/0FAIL con `--import ./scripts/register-api-test-build.mjs`.
- Después de agregar acciones al chat: `node --import ./scripts/register-api-test-build.mjs --test apps/web/src/components/foxy-workspace.test.mjs apps/web/src/components/foxy-workspace-start.test.mjs apps/web/src/components/foxy-resource-workspace.test.mjs tests/brujula-foxy-handoff.test.mjs tests/brujula-foxy-handoff-ui.test.mjs tests/brujula-foxy-handoff-proxy.test.mjs` →45PASS/0FAIL.
- Prueba HTTP/proxy nueva exige POST exacto, mantiene JSON/recibo, comprueba sesión/CSRF y rechaza GET/query extra; prueba UI exige checkbox explícito y enlace final sin contenido privado.
- `npx tsc -p apps/web/tsconfig.json --noEmit` →exit0; ESLint focal13superficies nuevas/afectadas→exit0; `node scripts/check-boundaries.mjs`→PASS127excepciones congeladas; `git diff --check` focal→exit0 tras normalizar el salto de línea de FoxyWorkspace.

Sin proveedor real, lectura de secretos/base retenida ni navegador real desde este agente. La aceptación visual/responsive y recorrido integrado quedan a la verificación del coordinador; las pruebas de componente no se presentan como captura de navegador.

## Commits and outcomes

Sin commits ni publicación.

## Handoff

Freeze de superficies propias. Root debe incorporar los cuatro archivos `tests/brujula-foxy-handoff*.test.mjs` al inventario de suite según clasificación, ejecutar QA visual/integrado y reconciliar plan/roadmap. La unidad no autoriza publicación. No iniciar otro subalcance sin asignación.

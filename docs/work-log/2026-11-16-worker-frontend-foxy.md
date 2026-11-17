# Foxy por casos de uso

- Agente `/root/frontend_materials`, encargo TASK-009 Foxy; sesión no expuesta. Fecha 2026-11-16.
- Rama `codex/frontend-cohesion`, worktree `C:/Users/alejo/.codex/worktrees/frontend-cohesion/ProtipoFoxMind`, base inicial de iniciativa `dd6f4bc9`.
- Autorización: reorganizar Foxy por casos de uso y separar presentación del workspace conservando sus controladores; diseño `docs/engineering/frontend/cohesion-refactor.md`.
- Escritura: features/foxy, test nuevo frontend-foxy-cases y este registro. Sin tocar screens/application, pruebas heredadas, manifiestos, core/backend, tablero, commits ni servicios.
- Plan: conversaciones, contexto, colecciones, recursos, publicación, visuales y composición workspace. Controladores existentes se mueven mecánicamente; no se duplican ni reescriben. CSS compartido de superficie Foxy se mueve en bytes y conserva orden/selectores.
- Base observada antes de editar: 40/40 PASS en workspace-start, runtime, visual-controller y pruebas exactas de contexto/tools.
- Extracciones nuevas: composer y transcript como renderizadores puros (el borrador sigue en un solo dueño); welcome de conversación; diálogo de renombrado con campo/validación propios; informe de fuentes y política de preview exacto; opciones de herramientas. El workspace conserva las transiciones existentes de envío/contexto/adjuntos y sus controladores. No se crearon hooks equivalentes nuevos.
- RED: `node --test tests/frontend-foxy-cases.test.mjs` falló en los dos casos iniciales por ausencia de rename dialog y citation-preview. GREEN: 3/3 PASS después de implementar; cubre renombrado rechazado sin perder el texto, rechazo de nombre vacío, cita disponible de conversación/turno exactos y teclado Enter/Shift/IME del compositor sin envío por montaje.
- Suite focalizada tras extracción: 42/42 PASS (los 40 de base más los dos primeros casos nuevos).
- Suite amplia: `$foxyTests = rg --files apps/web/src/features/foxy | Where-Object { $_ -like '*.test.mjs' }; node --test @foxyTests tests/frontend-foxy-cases.test.mjs tests/foxy-exact-context.test.mjs tests/foxy-exact-tools.test.mjs tests/foxy-exact-attachments-ui.test.mjs tests/foxy-exact-resource.test.mjs tests/foxy-exact-visual-topics.test.mjs` → 326 total, 325 PASS, 1 FAIL. El fallo es `ui/foxy-collections.test.mjs:35`: su fixture shallow busca el input de renombrado directamente en Workspace; ahora pertenece a FoxyRenameDialog. Requiere adaptar montaje con hooks propios conservando aserciones, por test_engineer/coordinación. No se editó la prueba heredada.
- `node node_modules/eslint/bin/eslint.js apps/web/src/features/foxy`: PASS. `node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json --noEmit --incremental false`: sin errores Foxy; global bloqueado por dos incompatibilidades onFile de academic-Wizard en el candidato concurrente. No se declara tipado global verde.
- Comparación determinista contra HEAD: diez archivos `*controller.ts` movidos conservan contenido idéntico tras normalizar únicamente rutas relativas de imports. Runtime/actions también se movieron sin reescribir su lógica. API pura conservada sin imports de runtime/model/UI/Node de esta feature.
- `git diff --check -- apps/web/src/features/foxy tests/frontend-foxy-cases.test.mjs docs/work-log/2026-11-16-worker-frontend-foxy.md`: PASS, solo avisos de terminadores LF→CRLF.
- CSS canónico `workspace/foxy-workspace.module.css`: bytes idénticos al anterior `ui/foxy-workspace.module.css`, SHA256 `313CE60BBB539C080FD2BD67B21F38B39E949D4ADBEE0820A3015C67C14FF3A1`. Las piezas usan la misma superficie compartida, sin dividir reglas ni alterar cascada; index exporta foxySurface desde destino nuevo.

## Mapa completo de movimientos

Conservan el nombre de archivo; las rutas anteriores tienen named reexports temporales para migración del coordinador. Las pruebas heredadas no se movieron.

| Origen | Destino |
|---|---|
| ui/foxy-workspace.tsx | workspace/foxy-workspace.tsx |
| model/foxy-workspace-runtime.ts | workspace/foxy-workspace-runtime.ts |
| model/foxy-workspace-actions.ts | workspace/foxy-workspace-actions.ts |
| model/use-foxy-workspace-actions.ts | workspace/use-foxy-workspace-actions.ts |
| model/foxy-chat-controller.ts | conversations/foxy-chat-controller.ts |
| ui/foxy-wait.tsx | conversations/foxy-wait.tsx |
| model/foxy-catalog-controller.ts | collections/foxy-catalog-controller.ts |
| model/use-foxy-catalog.ts | collections/use-foxy-catalog.ts |
| ui/foxy-collection-panel.tsx | collections/foxy-collection-panel.tsx |
| ui/foxy-context-picker.tsx | context/foxy-context-picker.tsx |
| ui/foxy-library-panel.tsx | context/foxy-library-panel.tsx |
| model/foxy-resource-controller.ts | resources/foxy-resource-controller.ts |
| model/foxy-preparation-controller.ts | resources/foxy-preparation-controller.ts |
| model/foxy-activity-handoff.ts | resources/foxy-activity-handoff.ts |
| model/foxy-publication-confirmation-controller.ts | publication/foxy-publication-confirmation-controller.ts |
| model/foxy-publication-history-controller.ts | publication/foxy-publication-history-controller.ts |
| model/foxy-publication-management-controller.ts | publication/foxy-publication-management-controller.ts |
| ui/foxy-publication-management-panel.tsx | publication/foxy-publication-management-panel.tsx |
| model/foxy-visual-controller.ts | visuals/foxy-visual-controller.ts |
| model/foxy-visual-editor-controller.ts | visuals/foxy-visual-editor-controller.ts |
| model/foxy-visual-publication-controller.ts | visuals/foxy-visual-publication-controller.ts |
| ui/foxy-visual-workspace.tsx | visuals/foxy-visual-workspace.tsx |
| ui/foxy-visual-reader.tsx | visuals/foxy-visual-reader.tsx |
| ui/foxy-visual-reader-dialog.tsx | visuals/foxy-visual-reader-dialog.tsx |
| ui/foxy-visual-publication-panel.tsx | visuals/foxy-visual-publication-panel.tsx |
| ui/foxy-tool-dialog.tsx | tools/foxy-tool-dialog.tsx |
| ui/foxy-workspace.module.css | workspace/foxy-workspace.module.css |

Nuevos: `conversations/foxy-{chat-view-types,composer,transcript,welcome,rename-dialog}`, `context/{citation-preview,foxy-source-report}`, `tools/foxy-tool-options`. `model/classroom-port.ts` sigue siendo el contrato neutral compartido del dominio. index/api mantienen exports públicos nombrados y los consumidores canónicos apuntan a los destinos nuevos.

## Entrega y límites

Superficie Foxy liberada para coordinación. Pendientes: fixture shallow de renombrado, retiro de reexports/CSS viejo por coordinación al migrar consumidores, tipado combinado y QA real/visual. No hubo servicios, proveedores, datos retenidos ni commits. No se declara DONE.

Reversión: revertir únicamente feature Foxy y retirar test nuevo/este registro antes de que coordinación migre consumidores; si ya los migró, revertir también ese mapa como unidad. No aplicar restore global: hay trabajo concurrente ajeno.

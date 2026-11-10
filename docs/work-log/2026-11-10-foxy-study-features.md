# Foxy y Estudio por responsabilidad

- Agente: /root/foxy_study_features, writer delegado. Fecha: 2026-11-10. Rama: codex/architecture-foundation. Base: 29fda64.
- TASK016: migración frontend autorizada sin cambios de producto, UX, HTTP o SQL; sin commits, publicación, proveedores reales ni secretos.
- Superficie propia: features/foxy, features/study, screens y application propios, rutas Foxy/Estudio, puentes y pruebas focalizadas. Se preservan cambios concurrentes.
- Plan: RED de contratos públicos y frontera; mover implementación única, componer dependencias heterogéneas; GREEN focal y cotejo AST/CSS.
- Estado: en curso. Evidencia y mapa al cerrar.

## Mapa mecánico inicial

- apps/web/src/components/foxy-activity-handoff-panel.tsx → apps/web/src/features/foxy/ui/foxy-activity-handoff-panel.tsx
- apps/web/src/components/foxy-collection-panel.tsx → apps/web/src/features/foxy/ui/foxy-collection-panel.tsx
- apps/web/src/components/foxy-publication-management-panel.tsx → apps/web/src/features/foxy/ui/foxy-publication-management-panel.tsx
- apps/web/src/components/foxy-resource-workspace.tsx → apps/web/src/features/foxy/ui/foxy-resource-workspace.tsx
- apps/web/src/components/foxy-screen.tsx → apps/web/src/screens/foxy-screen.tsx
- apps/web/src/components/foxy-visual-publication-panel.tsx → apps/web/src/features/foxy/ui/foxy-visual-publication-panel.tsx
- apps/web/src/components/foxy-visual-workspace.tsx → apps/web/src/features/foxy/ui/foxy-visual-workspace.tsx
- apps/web/src/components/foxy-workspace-session.tsx → apps/web/src/screens/foxy-workspace-session.tsx
- apps/web/src/components/foxy-workspace.module.css → apps/web/src/features/foxy/ui/foxy-workspace.module.css
- apps/web/src/components/foxy-workspace.tsx → apps/web/src/features/foxy/ui/foxy-workspace.tsx
- apps/web/src/components/study-practice.tsx → apps/web/src/features/study/ui/study-practice.tsx
- apps/web/src/components/study-screen.tsx → apps/web/src/screens/study-screen.tsx
- apps/web/src/components/study-upload.tsx → apps/web/src/features/study/ui/study-upload.tsx
- apps/web/src/components/study-wizard.tsx → apps/web/src/features/study/ui/study-wizard.tsx
- apps/web/src/components/study-workspace.tsx → apps/web/src/features/study/ui/study-workspace.tsx
- apps/web/src/components/study.module.css → apps/web/src/features/study/ui/study.module.css
- apps/web/src/lib/foxy-activity-handoff.ts → apps/web/src/features/foxy/model/foxy-activity-handoff.ts
- apps/web/src/lib/foxy-catalog-controller.ts → apps/web/src/features/foxy/model/foxy-catalog-controller.ts
- apps/web/src/lib/foxy-chat-controller.ts → apps/web/src/features/foxy/model/foxy-chat-controller.ts
- apps/web/src/lib/foxy-client.ts → apps/web/src/features/foxy/api/foxy-client.ts
- apps/web/src/lib/foxy-document-boundary.ts → apps/web/src/application/foxy-document-boundary.ts
- apps/web/src/lib/foxy-navigation-bridge.ts → apps/web/src/application/foxy-navigation-bridge.ts
- apps/web/src/lib/foxy-preparation-controller.ts → apps/web/src/features/foxy/model/foxy-preparation-controller.ts
- apps/web/src/lib/foxy-proxy.ts → apps/web/src/application/server/foxy-proxy.ts
- apps/web/src/lib/foxy-publication-confirmation-controller.ts → apps/web/src/features/foxy/model/foxy-publication-confirmation-controller.ts
- apps/web/src/lib/foxy-publication-history-controller.ts → apps/web/src/features/foxy/model/foxy-publication-history-controller.ts
- apps/web/src/lib/foxy-publication-management-controller.ts → apps/web/src/features/foxy/model/foxy-publication-management-controller.ts
- apps/web/src/lib/foxy-resource-controller.ts → apps/web/src/features/foxy/model/foxy-resource-controller.ts
- apps/web/src/lib/foxy-visual-controller.ts → apps/web/src/features/foxy/model/foxy-visual-controller.ts
- apps/web/src/lib/foxy-visual-publication-controller.ts → apps/web/src/features/foxy/model/foxy-visual-publication-controller.ts
- apps/web/src/lib/foxy-workspace-actions.ts → apps/web/src/features/foxy/model/foxy-workspace-actions.ts
- apps/web/src/lib/foxy-workspace-runtime.ts → apps/web/src/features/foxy/model/foxy-workspace-runtime.ts
- apps/web/src/lib/study-client.ts → apps/web/src/features/study/api/study-client.ts
- apps/web/src/lib/study-discovery.ts → apps/web/src/features/study/model/study-discovery.ts
- apps/web/src/lib/study-file-policy.ts → apps/web/src/features/study/model/study-file-policy.ts
- apps/web/src/lib/study-proxy.ts → apps/web/src/application/server/study-proxy.ts
- apps/web/src/lib/study-time.ts → apps/web/src/features/study/model/study-time.ts
- apps/web/src/lib/use-foxy-catalog.ts → apps/web/src/features/foxy/model/use-foxy-catalog.ts
- apps/web/src/lib/use-foxy-workspace-actions.ts → apps/web/src/features/foxy/model/use-foxy-workspace-actions.ts
- apps/web/src/lib/use-foxy-workspace.ts → apps/web/src/application/foxy-workspace.ts

## Consumidores de puentes pendientes del coordinador

- apps/web/pages/_app.tsx: ../src/lib/foxy-document-boundary → apps/web/src/application/foxy-document-boundary.ts

## Composición final y contratos

- Corrección del mapa inicial: foxy-activity-handoff-panel.tsx y foxy-resource-workspace.tsx viven en screens/, no en feature UI: componen rúbrica/destino académico con el workspace privado. Sus cuerpos permanecen idénticos.
- index.ts de cada feature exporta explícitamente UI, modelos y tipos; api.ts expone sólo cliente HTTP puro y sus tipos. Proxies Node viven exclusivamente en application/server.
- FoxyClassroomReadPort y proyecciones Classroom/Detail pertenecen a features/foxy/model/classroom-port.ts; application/foxy-workspace.ts implementa la conexión mediante el cliente académico existente. El runtime recibe el puerto ya presente, sin otra transacción, provider ni instancia adicional.
- FoxyCollectionPanel recibe destinationHref; FoxyWorkspace lo transmite y screens/foxy-workspace-session.tsx suministra classroomHomeHref. Es la única extracción funcional de dependencia: mismo callback, mismos IDs/enlaces; no cambió navegación.
- Foxy y Estudio usan shared-ui/markdown (extracción por coordinador); StudyWizard usa shared-ui/academic-cover (extracción por escritor académico). No importan otra feature, composición ni UI legacy.
- Los puentes anteriores son reexports explícitos de una única implementación; los CSS anteriores importan las hojas canónicas. El coordinador retirará compatibilidad tras reconciliar consumidores.

## Evidencia

- RED: node --test tests/foxy-feature.test.mjs tests/study-feature.test.mjs → 2 FAIL por ENOENT de las entradas públicas, antes de crear features.
- GREEN público final: mismo comando → 4 PASS, 0 FAIL (API pura, UI/model público, ninguna dependencia feature hacia composición/legado).
- Focal final: node --test --test-concurrency=1 [tests/foxy-feature.test.mjs, tests/study-feature.test.mjs y todos los apps/web/src/{components,lib}/{foxy,study,use-foxy}*.test.mjs salvo foxy-navigation.test.mjs] → 375 PASS, 0 FAIL; salida .test-artifacts/architecture-finish/foxy-study-final-focused.txt. El caso navegación académico se delegó exclusivamente al escritor académico por coordinación del padre.
- node --test tests/brujula-foxy-handoff-ui.test.mjs tests/brujula-foxy-handoff-proxy.test.mjs tests/brujula-foxy-handoff.test.mjs tests/student-feedback-journey.test.mjs → 12 PASS, 0 FAIL.
- npx tsc --noEmit -p apps/web/tsconfig.json → exit 0 después de integración de academic-cover.
- npx eslint apps/web/src/features/foxy apps/web/src/features/study apps/web/src/screens/foxy* apps/web/src/screens/study* apps/web/src/application/foxy* apps/web/src/application/server/foxy-proxy.ts apps/web/src/application/server/study-proxy.ts → exit 0.
- Comparación TypeScript AST de declaraciones runtime contra git show 29fda64, excluyendo imports/exports y declaraciones de tipos y normalizando EOL: 37/40 iguales; las otras 3 son colección/workspace/sesión por destinationHref. CSS 2/2 idénticos con EOL normalizados. JSX de las otras pantallas/componentes idéntico. SQL: N/A, no modificado.
- Comparación AST de llamadas assert de pruebas existentes propias y raíz dentro de alcance (excluye navegación académico): 1289 aserciones, 0 cambiadas. Sólo rutas y mocks/composición de dependencias se remapearon.
- scripts/check-boundaries.mjs: global exit 1 por migraciones concurrentes/puentes/excepciones todavía sin retirar; filtro de hallazgos web Foxy/Estudio no muestra aristas propias. No se declara guard integral verde.

## Fallos intermedios, límites y siguiente paso

Primera pasada de mocks durante movimiento: 377 pruebas, 358 PASS, 19 FAIL; conservada en .test-artifacts/architecture-finish/foxy-study-focused.txt. Se corrigieron rutas por llamada de loader y se fusionaron mocks que ahora comparten entrada pública, preservando exports no mockeados y todas las aserciones. Pasada intermedia focal de esos casos: 36 PASS. Hubo 3 FAIL adicionales de import dinámico Node del handoff al puente UI; remapeados directamente al modelo puro y repetidos 12/12 PASS.

No se ejecutaron build global, suite rápida completa, navegador, Docker ni proveedores. No se verificó visualmente responsive o persistencia real; la equivalencia literal de JSX/CSS y pruebas sintéticas limita la conclusión. Sin commits propios ni tablero escrito.

Fuera de alcance además del mapa de consumidores: tests/ux-chat-polish.test.mjs todavía usa loader de components/study-workspace.tsx; remapear a features/study/ui/study-workspace.tsx antes de retirar puente. application/foxy-workspace.ts sigue usando lib/classroom-client temporal de academia; integrar su API pública al retirar ese puente. El coordinador registra las dos pruebas nuevas en inventario/CI, reconcilia navegación y guard y decide aceptación integral.

Estado: implementado y verificado localmente en superficie propia; TASK016 no marcada DONE por este escritor. Reversión: deshacer únicamente los movimientos/reexports Foxy/Estudio enumerados en este registro, sus páginas y remapeos de pruebas; conservar shared/markdown, academic-cover y toda modificación concurrente de identidad/academia/backend/guard. No aplicar git restore global.

## TASK022 — Retiro frontend autorizado

2026-11-10: coordinador asigna escritor único frontend para remapear y retirar compatibilidad identity/Agenda/Foxy/Estudio/academia; backend/core/guard/CI permanecen de otros escritores. FASE_GREEN. Se preservan cuerpos y assertions funcionales; se autorizó explícitamente sustituir sólo los casos de compatibilidad temporal de tests/agenda-feature.test.mjs por contrato canónico y ausencia. Identity feature/composition quedan del padre. Se generará mapa completo de consumidores y pruebas movidas para CI.

### Resultado del retiro frontend (freeze)

Retirados 232 archivos inventariados, incluyendo puentes TS/TSX/CSS y 35 ubicaciones anteriores de pruebas; directorios apps/agenda-ui, apps/classrooms-ui y web/src/components/lib retirados cuando quedaron vacíos. Cada unlink/rmdir verificó ruta absoluta dentro del workspace; no hubo borrado recursivo, recursos externos ni cuerpos de producto nuevos. AccountArtwork era la única implementación restante en components: se movió literalmente a features/identity/ui/account-artwork.tsx con imports remapeados.

El transporte académico conserva createWebClassroomClient en application/academic-classroom-client.ts; sus antiguos alias de navegación se retiraron y consumidores apuntan application/navigation/destinations.ts. Imports del API académico se desagregaron por símbolo a contratos core, cliente application y capacidades públicas, sin un barrel nuevo multi-feature. Se remapearon imports, import-type y import() con AST; mocks se resolvieron contra los specifiers reales de cada loader y su grafo de imports para conservar extensiones y aliases.

El CSS académico vive en application/styles/academic.css, idéntico a git show 29fda64:apps/classrooms-ui/styles.css normalizando EOL. _app mantiene su orden de carga; p5-preview/main.tsx incorpora los cuatro imports y su orden antes presentes en ClassroomsApp.tsx (tokens, academic, folders, workspace). No hay URLs relativas en la hoja académica que requieran cambiar semántica. Preview conserva configuración independiente y declaración CSS en apps/p5-preview/styles.d.ts. Fixtures copiados a apps/web/pages/fixtures apuntan a composición y entradas públicas actuales; scaffolding ya no crea symlinks hacia hosts legacy.

Evidencia: npx tsc --noEmit -p apps/web/tsconfig.json y -p apps/p5-preview/tsconfig.json: ambos exit 0. npx eslint apps/web/src apps/web/pages apps/p5-preview apps/shared-ui: exit 0. Focal amplio con 148 archivos seleccionados en frontend-retirement-focused-files.json: 843 PASS, 0 FAIL; salida frontend-retirement-final-focused.txt. Después del ajuste final de imports CSS preview, 23 pruebas de navegación/cascade/identidad: 23 PASS, 0 FAIL. Primer intento: 843 pruebas, 808 PASS y 35 FAIL por rutas/mocks/cascade/source refs; se conserva frontend-retirement-focused.txt. No hubo relajación de assertions para resolverlos.

Snapshot AST de 3165 assertions existentes fuera del caso temporal Agenda: 3163 idénticas; sólo dos cambiaron el argumento read(source), conservando el matcher: folder-platform ahora lee application/academic-ClassroomView.tsx y platform-glass lee screens/files-screen.tsx. En platform-glass los strings de ubicación de CSS y el origen de standalone ahora son academic.css y p5-preview/main.tsx, manteniendo todos los chequeos de presencia/orden/accesibilidad. El coordinador autorizó explícitamente sustituir los dos casos temporales de agenda-feature por disponibilidad canónica, identidad de cliente público/API y assertions existsSync false de los puentes; las calls/contratos funcionales de Agenda quedaron iguales. Identity-feature/composition no editados por este escritor.

Inventario final AST: 0 imports consumidores de los archivos retirados dentro de superficie; 0 directorios legacy presentes. El único source reference fuera de assertions de ausencia es tests/issue2-ci-workflow.test.mjs:171, propiedad del coordinador (CI). Se remapearon exclusivamente paths/mocks frontend de los siete híbridos autorizados: brujula-integration, foxmind-3d-flows-attempt, foxmind-3d-flows, foxmind-3d-regressions, pending-classrooms, audit-wall-http-database y foxmind-3d-http. No se ejecutó su aceptación DB/API.

Mapa completo old→new y símbolos especiales de navegación: .test-artifacts/architecture-finish/frontend-retirement-map.json. Evidencia AST: frontend-retirement-assertions.json (3165/3163/2 paths). Script CI/guard/inventario sigue del padre; no se editó scripts, package, eslint, core, backend ni tablero. No build global, CI, browser, Docker, proveedores ni commits. Primera acción del coordinador: integrar 35 testMoves a CI, remapear source check de issue2 y ejecutar aceptación integral/QA real.

### Mapa persistente de pruebas movidas para CI

- apps/web/src/lib/use-foxy-workspace.test.mjs → apps/web/src/application/use-foxy-workspace.test.mjs
- apps/web/src/lib/use-foxy-workspace-actions.test.mjs → apps/web/src/features/foxy/model/use-foxy-workspace-actions.test.mjs
- apps/web/src/lib/study-sequence.test.mjs → apps/web/src/features/study/model/study-sequence.test.mjs
- apps/web/src/lib/study-payload.test.mjs → apps/web/src/features/study/model/study-payload.test.mjs
- apps/web/src/lib/study-file-policy.test.mjs → apps/web/src/features/study/model/study-file-policy.test.mjs
- apps/web/src/lib/study-discovery.test.mjs → apps/web/src/features/study/model/study-discovery.test.mjs
- apps/web/src/lib/study-client.test.mjs → apps/web/src/features/study/api/study-client.test.mjs
- apps/web/src/lib/foxy-workspace-runtime.test.mjs → apps/web/src/features/foxy/model/foxy-workspace-runtime.test.mjs
- apps/web/src/lib/foxy-workspace-actions.test.mjs → apps/web/src/features/foxy/model/foxy-workspace-actions.test.mjs
- apps/web/src/lib/foxy-visual-topic.test.mjs → apps/web/src/features/foxy/model/foxy-visual-topic.test.mjs
- apps/web/src/lib/foxy-visual-publication-controller.test.mjs → apps/web/src/features/foxy/model/foxy-visual-publication-controller.test.mjs
- apps/web/src/lib/foxy-visual-controller.test.mjs → apps/web/src/features/foxy/model/foxy-visual-controller.test.mjs
- apps/web/src/lib/foxy-resource-controller.test.mjs → apps/web/src/features/foxy/model/foxy-resource-controller.test.mjs
- apps/web/src/lib/foxy-publication-management-controller.test.mjs → apps/web/src/features/foxy/model/foxy-publication-management-controller.test.mjs
- apps/web/src/lib/foxy-publication-history-controller.test.mjs → apps/web/src/features/foxy/model/foxy-publication-history-controller.test.mjs
- apps/web/src/lib/foxy-publication-confirmation-controller.test.mjs → apps/web/src/features/foxy/model/foxy-publication-confirmation-controller.test.mjs
- apps/web/src/lib/foxy-proxy.test.mjs → apps/web/src/application/server/foxy-proxy.test.mjs
- apps/web/src/lib/foxy-preparation-controller.test.mjs → apps/web/src/features/foxy/model/foxy-preparation-controller.test.mjs
- apps/web/src/lib/foxy-navigation-bridge.test.mjs → apps/web/src/application/foxy-navigation-bridge.test.mjs
- apps/web/src/lib/foxy-discovery-controller.test.mjs → apps/web/src/features/foxy/model/foxy-discovery-controller.test.mjs
- apps/web/src/lib/foxy-context-controller.test.mjs → apps/web/src/features/foxy/model/foxy-context-controller.test.mjs
- apps/web/src/lib/foxy-client.test.mjs → apps/web/src/features/foxy/api/foxy-client.test.mjs
- apps/web/src/lib/foxy-chat-controller.test.mjs → apps/web/src/features/foxy/model/foxy-chat-controller.test.mjs
- apps/web/src/components/foxy-publication-management-panel.test.mjs → apps/web/src/features/foxy/ui/foxy-publication-management-panel.test.mjs
- apps/web/src/components/foxy-navigation.test.mjs → apps/web/src/application/navigation/foxy-navigation.test.mjs
- apps/web/src/components/foxy-document-integration.test.mjs → apps/web/src/screens/foxy-document-integration.test.mjs
- apps/web/src/components/foxy-context-view.test.mjs → apps/web/src/features/foxy/ui/foxy-context-view.test.mjs
- apps/web/src/components/foxy-collections.test.mjs → apps/web/src/features/foxy/ui/foxy-collections.test.mjs
- apps/web/src/components/foxy-workspace.test.mjs → apps/web/src/features/foxy/ui/foxy-workspace.test.mjs
- apps/web/src/components/foxy-workspace-start.test.mjs → apps/web/src/features/foxy/ui/foxy-workspace-start.test.mjs
- apps/web/src/components/foxy-visual-workspace.test.mjs → apps/web/src/features/foxy/ui/foxy-visual-workspace.test.mjs
- apps/web/src/components/foxy-visual-publication-panel.test.mjs → apps/web/src/features/foxy/ui/foxy-visual-publication-panel.test.mjs
- apps/web/src/components/foxy-visual-navigation.test.mjs → apps/web/src/screens/foxy-visual-navigation.test.mjs
- apps/web/src/components/foxy-session-transition.test.mjs → apps/web/src/screens/foxy-session-transition.test.mjs
- apps/web/src/components/foxy-resource-workspace.test.mjs → apps/web/src/screens/foxy-resource-workspace.test.mjs

Reversión del retiro: reconstruir sólo los archivos enumerados en removed y deshacer sus imports/testMoves mediante frontend-retirement-map.json, conservando cambios concurrentes backend/core/guard y las features ya migradas. No restaurar globalmente el árbol ni proveedores/datos. TASK022 queda para validación y estado del coordinador.

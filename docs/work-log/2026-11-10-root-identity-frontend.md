# Identidad y composición global del frontend

- Agente: `/root`, orquestador; runtime de sesión no registrado, sin escrituras Engram.
- Fecha: 2026-11-10. Rama: `codex/architecture-foundation`.
- Base: `9821584`, árbol limpio tras cuatro commits del piloto Agenda (`e6d8349`, `febe948`, `1089678`, `9821584`).
- Autorización: pedido vigente de cerrar commits Agenda y avanzar identidad/composición global con pruebas/verificaciones. Sin push, PR, merge, despliegue, cambios de producto/backend/SQL/proveedor.
- Fuentes: [diseño](../engineering/architecture-migration.md), [tablero](../../odd/tasks/architecture-migration.md), [identidad](../engineering/identity/README.md).

## Alcance y responsabilidades

Identidad conserva formularios/perfil/configuración, cliente, errores y validación en feature con entrada pública. La pantalla coordina sesión/efectos/navegación desde screens. Navbar global, shell y proxy/SSR/captura de prueba quedan en application; no se inventa un provider nuevo. Pages Router, URLs, orden de captura de tokens, CSRF, cancelación, enfriamiento, navegación, roles, avatar, marcado/CSS y foco se conservan.

Exploración atribuida `/root/identity_map` (chuli_explorer): mapa de consumidores y ciclo AccountScreen↔AccountFlowForms. Sin pruebas ni escrituras. Implementador separado: feature/screen/puentes propios y ajustes mecánicos de pruebas de identidad. Coordinador: composición global, shared genérico, guard/CI/consumidores/documentación/tablero. Sin escritores sobre los mismos archivos; revisión independiente después del candidato. No aislamiento real entre agentes en el workspace.

## Evidencia y pendientes

Inicio. Base focal antes de editar, RED de entrada nueva, GREEN con contratos existentes sin cambiar aserciones. Pruebas y QA sintéticos, sin credenciales ni datos retenidos.

- Base focal antes de editar: 37 PASS/0 FAIL/0 SKIP, `identity-baseline.log`. Incluye cliente/proxy/UI/perfil/continuaciones; la prueba colocada de documento Foxy se selecciona por su ruta real en la verificación final.
- TASK-014 RED: shell ausente y puente sin implementación inyectada, 2 FAIL esperados (`composition-red.log`); GREEN: 2 PASS. Verifica envoltorio, callback de foco/RAF con preventScroll y limpieza de listener, además de puentes globales sin duplicación.
- Composición global movida sin cambios funcionales: Navbar, proxy identidad, SSR no-store/no-referrer y script estático de captura. `_app` conserva CSS y captura Foxy antes de render, delega wrapper/foco al shell. Primarios genéricos y cn trasladados a shared con puentes.

## Implementación y verificación reconciliada

- Worker `/root/identity_feature` (chuli_worker), [registro propio](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/work-log/2026-11-10-identity-feature.md): RED0/2 por entrada ausente; fallo intermedio de extensión Node conservado; GREEN29/0. Equivalencia literal8/8 implementaciones/CSS y8/8 páginas sólo imports. Tipo AccountView ya no proviene de screen; AccountSubmit neutral en model, sin ciclo. No realizó build/DB/browser.
- Integración del coordinador: entrada pública pura `features/identity/api.ts` para cliente HTTP/Node (el `index.ts` UI carga TSX/CSS). RED en p5-web-client por intentar cargar el barrel UI desde Node; GREEN35 PASS de feature/global/cliente/guard. El puente legacy de API del worker se redirigió a la fachada pura; conserva nombres, clase y función idénticos. Los consumidores de pantalla usan index; adaptadores HTTP usan api.ts.
- `_app` tuvo un resto del return de cleanup al extraer automáticamente el efecto. Lint detectó parsing error; se eliminó ese resto del adaptador (el cleanup está preservado y probado en shell). Lint final110 excepciones. No se cambió aceptación para esconderlo.
- Proxy/SSR/script estático/Navbar y controles genéricos se trasladaron mecánicamente; API/backend/SQL sin cambios. Padre remapeó consumers y mocks fuera del alcance del worker; los source checks siguen activos. Helpers históricos pueden usar puentes. El helper platform-polish ahora copia el shell a su fixture y conserva data-qa-fixture, también soporta baseline anterior; scaffolding e import/marcador comprobados PASS.
- Primera fast:328 PASS/1 FAIL por mock Navbar aún en ruta vieja en `foxy-navigation.test.mjs`; el mock no capturaba props. Se remapeó fichero/mocks a composición actual, 12/12 aserciones idénticas según revisor; focal guard/nav23 PASS.
- **Fast final:1790 PASS/0 FAIL/0 SKIP,324/324 archivos** cotejados con ruta fast. `fast-final.log`, `fast-reconciled.json`. Preparación incluyó build API/Prisma y compilaciones estrictas de fixtures; ningún código backend modificado. Inventario518 entradas,53 exclusiones,23 rutas; pruebas nuevas incluidas en CI pure y fast.
- `npm run web:build` PASS; `tsc -p apps/web/tsconfig.json --noEmit` PASS y `tsc -p apps/classrooms-ui/tsconfig.json --noEmit` PASS. Dos aristas del ciclo cuenta eliminadas; de112 a110 excepciones. Controles finales docs/TTP/diff al cerrar.

## Revisión independiente atribuida

`/root/identity_review` (quality_reviewer), sin cambios versionados:72 PASS/0 FAIL/0 SKIP focales, equivalencia de cuerpos/JSX/CSS, cliente/proxy/token/SSR/NavBar y controles; `_app` conserva orden CSS/captura y shell conserva efecto. AST de12 pruebas:301 asserts anteriores conservadas (más adiciones de guard). Recibos review/candidate-manifest.json, assertion-comparison.json y focal-tests.log identifican ese candidato.

Hallazgo P2: guard API rechazaba node:fs pero permitía fs/fs-promises y React/Next. Corregido con builtinModules y bloqueo React/Next; negativos permanentes ampliados. Revalidación independiente23 PASS, siete imports prohibidos rechazados; guard-nav-recheck.json/log. Sin hallazgos pendientes. Revisión no acredita build/DB/browser; se reconcilian por el coordinador.

## Navegador real y límites

Ego Lite espacio propio3; fixture aislada en `ui-preview`, componentes/estilos/documento reales con API exclusivamente sintética en memoria, sin upstream/email/proveedor/credenciales. Escritorio1536×706; frame same-origin390×844 medido, sin overflow horizontal. Capturas login-error-verified, mobile y profile inspeccionadas. No emulación de hardware físico.

Observados: registro exige rol antes de request y devuelve respuesta genérica; contraseñas se limpian. Login rechazado enfoca alert y limpia password; visibilidad de contraseña funciona en desktop/móvil. Recuperación limpia fragmento antes de interacción, sin confirmar automáticamente (contador0); mismatch rechaza, confirmación correcta muestra éxito y limpia campos. Perfil guarda nombre/avatar lector y lo conserva al recargar la memoria de fixture; Navbar docente ofrece Foxy, estudiante ofrece Estudio y oculta Foxy. Configuración rechaza mismatch antes de request (contador0), acepta confirmación correcta y limpia campos. Logout lleva a sign-in; login exitoso lleva a Inicio sintético con foco H1 mediante ruta cliente.

Límites conservados: selector inicial de error coincidió con announcer vacío de Next; se repitió esperando notice dentro de main y se verificó error real. Primer perfil no tenía sesión porque fixture dependía de Referer, ausente por no-referrer vigente; se corrigió sólo setup sintético explícito, sin alterar privacidad productiva. H1 no quedó enfocado en navegación de documento completo a Settings/logout; el efecto sólo opera en rutas cliente y sí se observó al login. No se atribuye foco universal, persistencia DB, revocación real, entrega de correo o seguridad del proveedor a esta fixture. Contratos automatizados cubren CSRF, rotación, sanitización, cancelación y pruebas one-shot. Recibo browser-receipt.json y scripts ego-01..10 ignorados. Espacio finalizado una vez; servidor propio detenido, sin tocar Docker/app local ajenos.

## Entrega y continuidad

Agenda cerrado con e6d8349/febe948/1089678/9821584; autorización Git se aplicó a ese piloto. Identidad/global implementado y verificado localmente sobre9821584, sin commits nuevos de este corte, push/PR/merge/deploy. TASK013/014/015 DONE; TASK005 sigue IN_PROGRESS por resto frontend. Siguiente corte Foxy/Estudio se debe desglosar desde consumidores actuales; no iniciar backend restante por este cierre.

No se repitió integración DB ni todos los grupos owned-services/browser/wrappers: este corte no cambia backend/modelo, la evidencia aplicable es fast completo, contratos web/servidor y QA sintético. No se accedió a secretos, recursos retenidos o Gemini. Registros versionados bastan para retomar; Engram no se escribió por runtime sin identidad registrada.

Cierre observado: docs:check92 archivos/903 enlaces/0 issues, TTP15 tareas válidas, lint AST110 PASS, inventario518/53/23 PASS, diff-check exit0; ningún diff en apps/api, src/core o prisma respecto de9821584. Artefactos de preview/helper son propios e ignorados.

El pedido vigente autoriza terminar las cinco tareas pendientes y sus commits locales. Se cierra este corte como unidad coherente de identidad/composición (traslados mecánicos, pruebas y guard juntos); supera 400 líneas por movimientos, sin comprimir código. Publicación y despliegue siguen fuera del alcance.

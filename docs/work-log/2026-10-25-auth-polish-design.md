# Auth polish — diseño listo para RED

- Agent / role: architect.
- Session or task ID: `/root/auth_polish_design`.
- Date: 2026-10-25.
- Branch / worktree: `main`, checkout canónico `ProtipoFoxMind`.
- Starting commit: `dfe2b849fa50e876bb37df3cce1f79464a7ba58b`.
- Phase / task: pulido visual de sign-in/register; [roadmap](../implementation-roadmap.md), [política funcional](../foxmind-v1-functional-spec.md#confirmed-authentication-security-policy).
- Status: completed (diseño PRE_RED; implementación y aceptación aún pendientes).

ESTADO_DISENO: LISTO_PARA_TDD_RED

## Alcance y evidencia

Implementar los dos mockups aprobados, sin nueva elección estética: login `exec-934a4da3-2565-4bf7-a1b9-afec7a8162eb.png` y registro `exec-fbc547de-c6db-4211-9b5a-612609ef1752.png`, en la carpeta generated_images de la sesión `01a1706d-c32f-7613-bd26-6aeec3c93e6d`. Inspeccioné ambos y el asset existente `apps/web/public/foxmind-3d/scenes/auth.webp`: contienen la misma escena Foxy/libro. Mantener el ZorroH original, sin sustituirlo por el zorro generado del mockup.

No cambia dominio, endpoint, payload, sesión, validación, roles, DB, recuperación ni verificación. Auditoría DoR: datos/idempotencia conserva FormData y límites; estados conserva loading/busy/cooldown/session-open; fallos conserva notice/foco/retry; concurrencia conserva locks/doble envío; permisos conserva verificación y destinos permitidos; GRASP añade presentación local sin extraer nuevos puertos. No hay ambigüedad de negocio pendiente.

## CONTRATOS_Y_PLAN_POR_SLICE

Un slice de presentación; conservar firmas actuales salvo extensiones opcionales compatibles:

- `AccountScreen({ view }: { view: AccountView })`: aplicar `entry-auth-polish` y modificador de vista exclusivamente a `sign-in`/`register`; no editar handlers, efectos, `action`, `submit`, `nextAccountHref` ni estados.
- `AccountNavbar`: añadir `minimal?: boolean`; en esas dos vistas renderizar header de marca original con el mismo destino calculado y `accountActions`, sin shell privado. Resto de vistas conserva AppNavbar. Evita el padding/sidebar global disparado por `data-private=true` con sesión abierta.
- `AccountStory({ register?, security?, polished? }: { register?: boolean; security?: boolean; polished?: boolean })`: la variante polished superpone copy HTML sobre `scenes/auth`, `priority` y sizes adecuados; conservar arte decorativo y comportamiento previo sin la prop.
- `AccountField`: añadir solo `appearance?: 'polished'` a sus props actuales. En esa variante, placeholders de email/nombre/apellido y ojo SVG decorativo; conservar `type`, name/id, autocomplete, required, aria-describedby, `data-password-field`, aria-label/controls/pressed y botón `type=button`.
- `AccountFlowForms`: activar appearance solo en Login/Register; conservar campos `email,password` y `firstName,lastName,email,password`, payloads y submits existentes. Omitir AccountSteps únicamente en register; sumar flecha decorativa al CTA y sobre decorativo al helper. No role, SSO, checkbox ni campos nuevos.
- `account-view.ts`: cambiar solo copy de sign-in/register; resto intacto. Footer propio dentro del panel de estas vistas; footer previo para las otras.

## Geometría y copy verificables

- Desktop 1536×1024: ivory `#fcfaf7`; header de marca en x≈64/y≈24, ancho≈220; main x≈36/y≈112, ancho≈1464, gap20, columnas≈812/632 (53%/41% del viewport), altura mínima≈878 y radios22. Sin pestaña de carpeta, glass ni sombra marcada.
- Escena ocupa panel izquierdo completo, object-fit cover con posición inferior centrada; mantener cara/libro visibles y espacio superior para texto HTML. Título navy `#080b30`, 64–72px, line-height1.03; subtítulo violeta `#585e99`, 28–30px. Coordinador confirmó Fredoka variable local para títulos redondeados (peso700, licencia libre verificada/incluida), fallback heading existente; body Segoe actual. `@font-face` local y uso solo bajo esta variante, sin CDN/runtime font network ni familia global nueva; Nunito Sans no es necesario.
- Panel blanco con borde ivory fino, padding48; eyebrow naranja16px mayúscula; h1 navy64–72px; descripción28–30px. Labels20–22px, body20px; campos/CTA desktop mínimos56px (login≈68/74px, registro≈58/64px); radio12–16. CTA naranja `#ff702b`, texto navy, flecha al lado, links subrayados. No fijar altura que recorte avisos.
- Login: historia “Tu próximo descubrimiento empieza acá.” / “Un espacio para aprender y enseñar.”; eyebrow “QUÉ BUENO VERTE”; h1 “¡Hola de nuevo!”; descripción “Entrá para seguir con tus aulas.”; “Olvidé mi contraseña”; CTA “Iniciar sesión”; “¿Todavía no tenés cuenta? Crear cuenta”.
- Registro: historia “Un lugar para todas tus ideas.” / “Aprendé, enseñá y descubrí con FoxMind.”; mismo eyebrow; h1 “Creá tu cuenta”; descripción “Tu próximo paso empieza acá.”; Nombre/Apellido en dos columnas desktop; helper “Entre 16 y 128 caracteres. Podés usar espacios.”; CTA “Crear cuenta”; “Después te enviaremos un correo para verificar tu cuenta.”; “¿Ya tenés cuenta? Iniciar sesión”. Footer ambos: “FoxMind · Un espacio para aprender y enseñar.” Las contraseñas no vienen precargadas; los puntos del mock representan contenido de muestra.
- ≤900px: formulario primero y escena decorativa oculta; header mínimo, gutters16–24, panel padding20–24, heading32–42px, body≥16px. A320px nombres en una columna, controles/CTA≥56px, ojo≥44×44, textos/avisos envuelven; scroll vertical natural sin overflow horizontal. No crear una variante estilística móvil.
- Estados: loading y session-failed/retry visibles; busy conserva texto actual/fieldset disabled; error sigue role=alert y recibe foco; éxito conserva role=status; cooldown muestra segundos y bloqueo vigente; session-open conserva Continuar y logout; enlace next permanece en registro/login y destino `/inicio`/verificación sin cambios. Password se vacía tras cada request como antes.

## ESTRATEGIA_EQUIPO_Y_SUPUESTOS

- Worker es único dueño de `apps/web/src/components/{account-screen.tsx,account-navbar.tsx,account-flow-forms.tsx,account-field.tsx,account-view.ts}`, `apps/shared-ui/AccountStory.tsx`, nuevo `apps/shared-ui/auth-polish.css`, `apps/web/public/fonts/{fredoka-variable.woff2,OFL-Fredoka.txt}` y `apps/web/pages/_app.tsx` (solo import final del CSS). Selectores bajo `.entry-auth-polish`; no tocar tokens/CSS globales ni assets existentes.
- Tester es único dueño de nuevo `tests/auth-polish.test.mjs` y su propio registro; writer no edita tests. Architect solo este documento. Coordinador posee roadmap, registro raíz y commits. Todos preservan cambios ajenos; ejecución RED→GREEN secuencial sobre main autorizado, sin worktree adicional ni escritura simultánea en los mismos archivos.
- Mantener componentes/hojas nuevos <200 líneas, funciones nuevas <40, unidades de commit≤400 líneas; no refactor amplio del AccountScreen heredado para satisfacer un límite. Supuestos reversibles: breakpoint900, tamaños clamp y body existente; la captura manda el ajuste final. Main viva52171 es production preview sin HMR; el coordinador resuelve preview actualizado preservando el actual, no el worker.

## CRITERIOS_DE_TEST_DOT

1. RED con mocks de puertos en memoria: render sign-in/register tiene copy aprobado, campos exactos y cero mutaciones al abrir; ojo cambia tipo y aria-pressed conservando nombre accesible; submit/next y bloqueo busy/cooldown siguen iguales. Verificar vistas no objetivo sin appearance/minimal y sesión abierta sin shell privado.
2. GREEN: `node --test tests/auth-polish.test.mjs tests/p3-web-client.test.mjs tests/p3-web-proxy.test.mjs tests/entry-glass-client.test.mjs tests/foxmind-3d-flows-account.test.mjs`; skips opt-in se registran, nunca cuentan como PASS. `npm run web:build` con límite existente180s; tipos/lint aplicables sin ampliar límites.
3. UI ego(lite), Space dedicado sobre main viva52171: capturas reales ambas rutas1536×1024 y390×844, reflow320px; comparar proporciones/copy/arte/inputs/footer con ambos mocks; teclado, orden/foco visible, ojo accesible, enlaces y ausencia de overflow. Comprobar loading/error/cooldown/session-open con fixtures de prueba controlados y sin tocar datos retenidos. La captura visual y esos estados son pruebas distintas.
4. Integración Docker `_test`: no añade caso DB ni migración por ser presentación pura; contratos/backend siguen cubiertos por pruebas existentes. No iniciar servicios, leer secretos ni ejecutar registro real para obtener screenshots; cualquier fixture/runtime adicional lo coordina el agente raíz.

## Verificación observada y handoff

Lecturas de código/spec/skills, dos mockups y auth.webp completadas; Git observado main/dfe2b84 sin cambios al comenzar. Engram current_project/context/search consultados en lectura; resultados históricos no sustituyen este contrato, sin writes por identidad de runtime no confirmada. Una lectura inicial de `_app.tsx` bajo src/pages falló; localizado y leído en `apps/web/pages/_app.tsx`. Estructura documental verificada:57 líneas≤70 y ambos links locales existen. No builds/tests/runtime: no hubo implementación; checks funcionales pertenecen al siguiente paso. Sin commit propio.

Primer pendiente: tester crea tests focalizados y observa RED; después worker implementa solo el ownership anterior, y tester valida UI/estados antes del reviewer. Este diseño no declara aceptación visual ni modifica fases compartidas. El coordinador registra entrega/commit cuando existan.

## Diagnóstico del cortacircuitos — baseline legacy confirmado

- Solicitud `/root/auth_polish_design`, continuación2026-10-25; triage con systemic-issue-triage, solo lectura de producción/tests y este apéndice. Inspeccionados registro worker, parche retenido, loader legacy y AccountArtwork. Root class: infraestructura/expectativas legacy desactualizadas; no evidencia de regresión productiva auth.
- Estado observado: HEAD aún `dfe2b849fa50e876bb37df3cce1f79464a7ba58b`; patch worker revertido. `git diff --exit-code HEAD -- tests/entry-glass-client.test.mjs apps/web/src/components/account-screen.tsx apps/web/src/components/account-artwork.tsx apps/web/src/components/account-field.tsx apps/shared-ui/AppNavbar.tsx apps/classrooms-ui/Home.tsx` sin diferencias; `next-env.d.ts` concurrente preservado.
- Única ejecución diagnóstica: `node --test --test-reporter=dot tests/entry-glass-client.test.mjs`, exit1 en1.62s:1PASS/3FAIL sobre baseline. Fallan navbar público por esperar aria-expanded=false, password por MODULE_NOT_FOUND '../../../shared-ui' desde AccountScreen y Home por Missing Estudio section.
- Causa del loader en líneas19–22: busca `[base, base.tsx, base.ts]`; al existir el directorio shared-ui, elige ese directorio, no intenta index.ts y cae a nativeRequire. Carga todo AccountScreen para probar el AccountField reexportado. Baseline falla antes; el cambio explícito a /index del candidato avanza hasta idéntico import de AccountArtwork, archivo no modificado. Eso no demuestra import roto en Next/TypeScript.
- Decisión: legacy completo **N/A como prueba diferencial del parche**, conservando1PASS/3FAIL histórico, nunca PASS. No tocar AccountArtwork ni adaptar producción para satisfacer el helper. No relajar/modificar el test legacy para desbloquear este cambio; su mantenimiento queda fuera de este slice.
- Recuperación exacta por coordinador: comprobar/aplicar `production.patch` en `C:/Users/alejo/AppData/Local/Temp/foxmind-auth-polish-worker-20261025/` mediante `git apply --check` y después `git apply`; restaurar desde esa misma carpeta `auth-polish.css`, `fredoka-variable.woff2` y `OFL-Fredoka.txt` a los destinos del ownership. Reconciliar cambios concurrentes antes de aplicar; no sobrescribir archivos ajenos.
- No hay tercer intento del worker contra legacy. Continúan gates actuales: RED/GREEN focalizado independiente, regresiones aplicables, tipos/build y ego visual/estados. PASS de tipos/focused previo consta en registro worker; no lo volví a ejecutar ni lo convertí en aceptación final. Sin servicios, secretos, producción/tests editados ni commit en este diagnóstico.

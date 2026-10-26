# Auth responsive — contrato de diseño listo

- Agent / role: architect; task ID `/root/auth_responsive_design`; runtime session ID unavailable.
- Date: 2026-10-26; branch/worktree: `main`, canonical checkout; starting commit observed: `32c4750`; initial tree clean.
- Phase/scope: ajuste visual local de `/sign-in` y `/register`; [roadmap](../implementation-roadmap.md), [protocolo](README.md), [QA anterior](evidence/2026-10-25-auth-polish/design-qa.md). Status: completed (diseño solamente).
- ESTADO_DISENO: LISTO_PARA_TDD_RED. RED N/A: CSS reversible sin cambio de comportamiento; no implementación ni aceptación visual nueva en este registro.
- Skills aplicadas: sdd-ambiguity-gate, clean-architecture, team-docs-strategy, cognitive-doc-design; Engram leído como protocolo, sin escrituras ni sesión inventada.
- Inspección: auth-polish.css190líneas, AccountStory.tsx, account-screen.tsx, account-flow-forms.tsx, _app.tsx, auth.webp y evidencia1536×1024/390/320 anterior.
- Causa: panel mínimo878px, header112px, padding64px, inputs68/58px, CTA74/64px y h1nowrap ignoran alto útil; pulgadas físicas no son breakpoint.
- DoR6dimensiones: datos/idempotencia, estados, fallos, concurrencia y permisos conservan contratos; GRASP requiere sólo una hoja CSS cohesionada, sin dominio/puertos nuevos.

## ESTRATEGIA_EQUIPO_Y_SUPUESTOS

- Un solo worker posee `apps/shared-ui/auth-polish.css`, nuevo `apps/shared-ui/auth-responsive.css` y únicamente su import final en `apps/web/pages/_app.tsx`; cada archivo<200líneas y unidad≤400líneas, sin comprimir estilos.
- Worker no toca JSX, campos, handlers, API, datos, textos, assets, navbar compartido, Home ni Agenda; conserva cambios de otros agentes. Tester/reviewer y root mantienen registros propios; sólo root actualiza roadmap.
- Supuestos reversibles: split desde901px; formulario prioritario hasta900px; escenas, paleta, Fredoka, ZorroH y proporción visual aprobada se conservan; no hace falta nueva elección humana ni stack.

## CONTRATOS_Y_PLAN_POR_SLICE

- S1: reemplazar medidas rígidas existentes por variables/clamp fluidos; hoja final contiene únicamente reglas de ancho/alto. Importar después de auth-polish en `_app.tsx`; un @import al principio de la base perdería prioridad frente a sus reglas posteriores.
- S2: `auth-main` usa columnas minmax(0,…) y min-height derivada de viewport/header, nunca height fija; story min-height0, hijos de grid/fieldset min-width0; surface se expande con contenido y documento desplaza verticalmente.
- S3: notebook compacto: header≈80–88px/logo180px, surface24–32px, h1≈36–48px, inputs48–52px con texto≥16px, CTA52–56px; eye48×48cabe dentro del input. Targets interactivos≥44px y sin solaparse.
- S4: liberar h1 de nowrap con wrap seguro; preservar títulos/copy/etiquetas y permitir textos largos/zoom. Nunca transform/zoom global, ocultar controles, overflow:hidden de página/formulario ni scroll interno obligatorio.
- S5: mantener imagen full-bleed y redondeados, h2 en espacio negativo superior; escalar copy/padding por alto para evitar orejas/cara. Sólo si fuese necesario puede ocultarse el párrafo decorativo en alturas cortas; no la escena ancha ni el h2.
- S6: a1536×1024y mayores recuperar presencia mediante clamp de tipografía, ancho máximo1600px y espacios fluidos; no reducir todo escritorio a tamaños compactos. Mobile conserva orden y grid de nombres colapsa cuando no cabe.

## CRITERIOS_DE_TEST_DOT

| Viewports CSS px, ambas rutas | Aserciones requeridas |
| --- | --- |
| 1280×720;1366×768;1440×900;1536×864 | Logo/copy/escena equilibrados; campos y CTA primario visibles preferentemente al entrar; extras/footer pueden continuar debajo. |
| 1366×640 | Compacción por altura; escena ancha permanece; ningún campo/CTA recortado, scroll vertical natural permitido. |
| 1536×1024;1920×1080;2560×1440 | Comparar con referencia aprobada: presencia y separación de paneles, sin pequeño formulario perdido ni texto sobre Foxy. |
| 320×844;390×844;768×1024;900×900;901×900 | Cero overflow horizontal; transición coherente900/901, títulos envueltos, campos/eye legibles y accesibles por teclado. |
| 200%zoom/texto ampliado y título largo temporal | Reflow/scroll sin pérdida de contenido, cortes ni superposición; distinguir zoom nativo real de emulación equivalente. |
- QA independiente en ego(lite), Space dedicado, rutas anónimas52171: capturas reales+DOM de ancho/rectángulos; inspeccionar composición, scroll, focus/orden, eye local y enlaces sin enviar formularios ni crear cuentas.
- Probar estado largo sólo con fixture/transitoria DOM sin POST y declararlo simulado; fuente garantiza notices/loading/cooldown no recortados. No afirmar autenticación/errores backend probados.
- Checks: PostCSS/estructura CSS, types/build aislado sin tocar assets del Next vivo y regresión auth existente proporcionada; integración Docker N/A al no cambiar datos/contratos. No tests que sólo reflejen CSS.
- Verificación de este diseño: lecturas y git rev-parse/status observados; rg con wildcard en ruta Windows falló y se corrigió mediante -g; no pruebas funcionales, browser ni commit ejecutados por architect.
- Handoff: worker implementa S1–S6; test_runner demuestra tabla y reviewer audita diff. Root reconcilia resultados y entrega local; ninguna publicación/despliegue autorizado por este contrato.

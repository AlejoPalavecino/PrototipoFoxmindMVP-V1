# Agenda — evidencia visual y de interacción

Candidato local codex/agenda-polish desde a3afdc7. Fixture Vite de componentes reales Agenda/AppNavbar y estilos de producto, con API en memoria, cuenta/datos sintéticos y sin sesión/backend reales. Navegador ego-browser, espacio 2. No es E2E autenticado.

**Seguimiento vigente:** [captura escritorio](responsive-followup/agenda-1440.png), [móvil320](responsive-followup/agenda-320.png) y [mediciones](responsive-followup/responsive.json). Cabecera sobre la imagen en todos los tamaños, tipografía Segoe UI, CTA como Mis aulas y miniilustración156x104. [Teclado y movimiento reducido](responsive-followup/interactions.json). Las capturas siguientes corresponden al checkpoint anterior, preservado como historia.

- [Escritorio](agenda-1440.png), [tablet](agenda-768.png), [móvil390](agenda-390.png), [móvil320](agenda-320.png).
- [Formulario escritorio](form-1440.png), [formulario320](form-320.png), [Observaciones como último campo](form-observations.png), [error](error-1440.png).
- [Mediciones responsive](responsive.json): cuatro anchos, sin overflow horizontal; banner completo sin recorte, CTA dentro y separado de Foxy, paneles separados16px, ilustración lateral contain, título superior oculto. Formulario: description último control, sin details/resumen, footer visible.
- [Interacciones sintéticas](interactions.json): título vacío enfoca campo sin escribir; flechas de teclado cambian color con check y foco visible; multiday/zona UTC/color/observaciones preservados al guardar y editar. Valor de fecha final alcanzado mediante teclado nativo: 2028-12-03; no implica requisito de duración ni cambio en reglas.

Limitaciones y correcciones: `fill` del navegador en input date cambió DOM sin actualizar el estado React; el recorrido final usó teclas nativas y comprobó el payload y la edición posterior. Dos intentos fallaron por fecha esperada de automatización, no se contaron como PASS. Una comparación inicial estricta de cocientes marcó390 como falso por redondeo del tamaño natural del srcset según densidad; la medición final usa tolerancia geométrica de1px, con decode de la imagen y captura observada. Capturas tempranas antes de finalizar la animación fueron reemplazadas por estados asentados.

Guiones reproducibles locales en `.test-artifacts/agenda-polish/browser-*.mjs`; no son parte de producto. Preview aislada: http://127.0.0.1:53241/.test-artifacts/agenda-polish/. Sin datos reales, proveedores, push ni despliegue.

## Prueba de integración local
Merge3423d1b verificado antes de avanzar main:86pruebas de Agenda/Inicio/Mis aulasPASS; tipos, lint/fronteras129 y build aisladoPASS. [Preservación](main-preservation.json):66blobs del main previo7d85328 sin cambios; roadmap reconciliado por separado manteniendo Inicio y Mis aulas. [Navegador del candidato combinado](main-integration-metrics.json): Agenda1440/320, banner completo, CTA separado de Foxy, miniilustración156x104 y formulario con Observaciones último campo. Es fixture sintética, sin E2E autenticado; capturas locales del nuevo recorrido observadas y conservadas en .test-artifacts/agenda-polish/integration. Los resultados previos mantienen su alcance histórico.

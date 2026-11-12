# Brújula: referencia para pulir Agenda

**Recomendación:** extender la composición actual, no rediseñar el producto. Esta captura parcial usa valores existentes; no es un sistema nuevo ni sustituye el CSS productivo. Lámina: `design/system.html`.

## Fuentes y precedencia

| Fuente leída | Qué aporta |
|---|---|
| `apps/shared-ui/design-tokens.css` | Base compartida, contorno oscuro y error |
| `apps/shared-ui/foxmind-3d-tokens.css` | Espaciado, radios, sombra, duración y fallback tipográfico |
| `apps/web/styles/globals.css` | Alias Tailwind, escala tipográfica y foco visible |
| `apps/shared-ui/brujula.css` | Overrides privados Brújula, Lexend local y tarjetas |
| `apps/shared-ui/brujula-controls.css` | Tokens canónicos Brújula y controles |
| `apps/web/src/features/agenda/ui/agenda-surface.module.css` | Seis pares de color de eventos y composición existente |
| `apps/web/src/features/agenda/ui/agenda-ux.module.css` | Selección, seis filas mensuales y formulario equilibrado |
| `apps/web/src/features/agenda/ui/AgendaToolbar.tsx` | Mes/Semana/Día, Hoy y navegación de período |
| `apps/web/src/features/agenda/ui/EventDetails.tsx` | Solo para vos, detalle y editar/eliminar |
| `apps/web/src/features/agenda/ui/EventForm.tsx` | Formulario privado, cancelar/crear/guardar y alcance de serie |
| `apps/web/src/features/agenda/model/event-colors.ts` | Nombres de colores; el color no equivale al tipo |

Base → tema 3D → Brújula privado → estilos específicos de Agenda. Hay valores históricos cálidos y overrides posteriores: esta tabla no afirma que cada valor base sea el estilo computado actual. Las láminas reutilizan la paleta Brújula y el contorno oscuro base para controles reconocibles; esto es una recomendación, no una medición de producción.

## Colores reutilizados

| Token / selector existente | Valor | Uso en láminas | Fuente |
|---|---|---|---|
| `--brujula-ink` | `#252646` | Texto principal | `apps/shared-ui/brujula-controls.css` |
| `--brujula-muted` | `#60667d` | Texto secundario | `apps/shared-ui/brujula-controls.css` |
| `--brujula-line` | `#dbe1f0` | Separadores decorativos | `apps/shared-ui/brujula-controls.css` |
| `--brujula-primary` | `#b8490c` | Acción naranja con texto blanco | `apps/shared-ui/brujula-controls.css` |
| `--brujula-surface` | `#fff` | Superficie y texto sobre acción | `apps/shared-ui/brujula-controls.css` |
| `--brujula-canvas` | `#f4f7fe` | Fondo | `apps/shared-ui/brujula-controls.css` |
| `--fm-focus` (tema 3D) | `#4453b8` | Foco, distinto de selección | `apps/shared-ui/foxmind-3d-tokens.css` |
| `--fm-control-line` (base) | `#303631` | Borde de controles | `apps/shared-ui/design-tokens.css` |
| `--fm-error` (base) | `#8c281c` | Acción destructiva secundaria | `apps/shared-ui/design-tokens.css` |
| `.agenda-day[aria-pressed='true']` | `#fff1e7` | Fondo seleccionado; no es token nombrado | `apps/web/src/features/agenda/ui/agenda-ux.module.css` |

Pares de Agenda: nombres CSS ya existentes, sin nuevos tokens. Fuente de las seis filas: `apps/web/src/features/agenda/ui/agenda-surface.module.css`.

| Selector | Fondo | Acento | Etiqueta |
|---|---|---|---|
| `.agenda-color-blue` | `#dbeafe` | `#1d4ed8` | Azul |
| `.agenda-color-green` | `#dcfce7` | `#166534` | Verde |
| `.agenda-color-yellow` | `#fef3c7` | `#854d0e` | Dorado |
| `.agenda-color-orange` | `#ffedd5` | `#9a3412` | Naranja |
| `.agenda-color-pink` | `#fce7f3` | `#9d174d` | Rosa |
| `.agenda-color-purple` | `#f3e8ff` | `#6b21a8` | Violeta |

Se capturan **9 colores nombrados + 1 valor de selección + 12 valores de eventos = 22 valores de color**. La paleta productiva admite además automático/grafito; no se inventa aquí su resolución ni se propone retirarla.

## Tipografía, espacio y forma

| Grupo | Valores existentes capturados | Fuente |
|---|---|---|
| Familia: 1 stack usado | `--fm-font-body: 'Segoe UI', Arial, sans-serif` | `apps/shared-ui/foxmind-3d-tokens.css` |
| Familia productiva, sólo documentada | `'Brújula'` = Lexend local, `apps/web/public/brujula/lexend.woff`; no se carga en estas láminas | `apps/shared-ui/brujula.css` |
| Escala: 5 referencias | Cuerpo 16 px; h1 28–40 px; h2 22 px; etiqueta 15 px; ayuda 13 px | `apps/web/src/features/agenda/ui/agenda-surface.module.css` (cuerpo); `apps/web/styles/globals.css` (resto) |
| Espaciado: 7 tokens | `--fm-space-1/2/3/4/6/8/12`: 4/8/12/16/24/32/48 px | `apps/shared-ui/foxmind-3d-tokens.css` |
| Radios: 4 tokens + 1 valor local | `--brujula-control-radius:11px`, `--brujula-card-radius:18px`; `--fm-radius-field:12px`, `--fm-radius-dialog:24px`; `.agenda-selected:16px` | `apps/shared-ui/brujula-controls.css`; `apps/shared-ui/foxmind-3d-tokens.css`; `apps/web/src/features/agenda/ui/agenda-ux.module.css` |
| Sombra: 1 token | `--fm-shadow:0 4px 18px #080b3008` | `apps/shared-ui/foxmind-3d-tokens.css` |
| Movimiento: 1 token | `--fm-motion:180ms`; 0 ms con movimiento reducido | `apps/shared-ui/foxmind-3d-tokens.css` |

No se crean tokens para geometría de maqueta. Los tamaños de columna son decisiones de composición, no nuevas constantes del producto. Stack de sistema intencional: la diferencia métrica con Lexend exige comprobar la app real.

## Reglas de componentes y brief

- Acción principal naranja cálido, texto blanco; foco azul separado de selección naranja. Fuente: `apps/shared-ui/brujula-controls.css` y `apps/shared-ui/foxmind-3d-tokens.css`.
- Calendario recomendado: mantener seis filas con 86 px en escritorio / 64 px hasta 600 px; indicadores móviles de 8 px y nombre accesible con conteo completo. Fuente: `apps/web/src/features/agenda/ui/agenda-ux.module.css` y `apps/web/src/features/agenda/ui/agenda-surface.module.css`. No modificar el arreglo mensual existente.
- Toolbar estable y compacta, título de período legible, controles de 44 px, Mes/Semana/Día y Hoy. Fuente: `apps/web/src/features/agenda/ui/AgendaToolbar.tsx` y `apps/web/src/features/agenda/ui/agenda-ux.module.css`.
- Un evento = un grupo legible, título completo en detalle, horario y tipo textual; color elegido independiente del tipo. Fuente: `apps/web/src/features/agenda/ui/agenda-ux.module.css` y `apps/web/src/features/agenda/model/event-colors.ts`.
- Formulario: dos columnas equilibradas, una hasta 600 px, acciones del mismo peso geométrico; detalle con editar primario/eliminar secundario. Sin nuevos campos, filtros ni operaciones. Fuente: `apps/web/src/features/agenda/ui/EventForm.tsx`, `apps/web/src/features/agenda/ui/EventDetails.tsx` y `apps/web/src/features/agenda/ui/agenda-ux.module.css`.
- Estados a conservar en implementación: carga con espacio estable; vacío con agregar; error conserva datos y permite recuperar; guardar no anuncia éxito anticipado; series explicitan alcance. Fuente: `apps/web/src/features/agenda/ui/EventForm.tsx` y `docs/engineering/agenda/README.md`.

## Elegir dirección

1. **Calma y foco (recomendada):** mes + panel diario lateral; extensión de bajo riesgo del patrón real. En móvil el panel se representa debajo, sin simular un diálogo ni alterar su contrato productivo.
2. **Ritmo de color:** semana en filas por día; lectura cronológica con más espacio para títulos, menor visión mensual.
3. **Planificador compacto:** índice mensual pequeño seguido por una lista diaria ancha; mejor para pantallas estrechas, menor peso visual del calendario.

Las tres usan los mismos tres eventos personales ficticios del 12 de noviembre de 2026. Son composiciones estáticas, no prueban persistencia, animaciones reales ni igualdad autenticada entre roles. El detalle y el formulario son muestras desplegables, no una nueva forma de navegación autorizada.

## Autocontrol y entrega

Comparar todos los colores/familias de cada HTML contra esta captura y las fuentes; calcular contraste de texto y controles; revisar estructura, foco, reflujo y reduced-motion. La validación sin navegador no demuestra ausencia de clipping, funcionamiento de overlays, lectura asistiva ni conformidad AA completa. Padre: abrir canvas con `/gentle:design open agenda-polish`, revisar opción 01 y trasladar sólo lo aprobado a producción con pruebas reales de ambos roles.

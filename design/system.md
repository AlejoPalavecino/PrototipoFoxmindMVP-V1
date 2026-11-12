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
| Familia de la revisión 01 y sistema | `'Brújula', sans-serif` = Lexend local incrustada como `data:font/woff;base64`; peso declarado 400, normal, `font-display: swap` | `apps/shared-ui/brujula.css`, bytes de `apps/web/public/brujula/lexend.woff` |
| Fallback histórico, no recomendado para revisión | `'Segoe UI', Arial, sans-serif`; sólo las alternativas anteriores 02/03 lo conservan | `apps/shared-ui/foxmind-3d-tokens.css` |
| Escala: 5 referencias | Cuerpo 16 px; h1 28–40 px; h2 22 px; etiqueta 15 px; ayuda 13 px | `apps/web/src/features/agenda/ui/agenda-surface.module.css` (cuerpo); `apps/web/styles/globals.css` (resto) |
| Espaciado: 7 tokens | `--fm-space-1/2/3/4/6/8/12`: 4/8/12/16/24/32/48 px | `apps/shared-ui/foxmind-3d-tokens.css` |
| Radios: 4 tokens + 1 valor local | `--brujula-control-radius:11px`, `--brujula-card-radius:18px`; `--fm-radius-field:12px`, `--fm-radius-dialog:24px`; `.agenda-selected:16px` | `apps/shared-ui/brujula-controls.css`; `apps/shared-ui/foxmind-3d-tokens.css`; `apps/web/src/features/agenda/ui/agenda-ux.module.css` |
| Sombra: 1 token + 1 valor local | `--fm-shadow:0 4px 18px #080b3008`; relieve `0 4px 14px -8px #414a7326` | `apps/shared-ui/foxmind-3d-tokens.css`; `apps/shared-ui/brujula.css` (módulos de Inicio) |
| Movimiento: 1 token | `--fm-motion:180ms`; 0 ms con movimiento reducido | `apps/shared-ui/foxmind-3d-tokens.css` |

No se crean tokens para geometría de maqueta. Los tamaños de columna son decisiones de composición, no nuevas constantes del producto. La revisión 01 y la lámina de sistema usan los bytes reales de Lexend; Segoe/Arial no son su fuente primaria. Los pesos superiores a 400 son síntesis del navegador, como en la declaración productiva; no se inventan archivos de fuente adicionales.

Efectos de revisión 01: dos sombras existentes combinadas, degradado suave de `#fff1e7` a `#fff`, línea naranja de `#b8490c` a `#fff1e7`, velo de diálogo `#25264680` (tinta existente al 50%). Son composiciones/derivaciones de maqueta, no tokens productivos nuevos; texto siempre sobre superficies sólidas o ese degradado claro. Radios de panel/diálogo 24 y tarjeta 18, control 11 y campo 12; pequeños puntos y uniones son geometría ilustrativa. Fuente incrustada y SHA-256 documentados en el registro de refinamiento.

## Reglas de componentes y brief

- Acción principal naranja cálido, texto blanco; foco azul separado de selección naranja. Fuente: `apps/shared-ui/brujula-controls.css` y `apps/shared-ui/foxmind-3d-tokens.css`.
- Calendario recomendado: mantener seis filas con 86 px en escritorio / 64 px hasta 600 px; indicadores móviles de 8 px y nombre accesible con conteo completo. Fuente: `apps/web/src/features/agenda/ui/agenda-ux.module.css` y `apps/web/src/features/agenda/ui/agenda-surface.module.css`. No modificar el arreglo mensual existente.
- Toolbar estable y compacta, título de período legible, controles de 44 px, Mes/Semana/Día y Hoy. Fuente: `apps/web/src/features/agenda/ui/AgendaToolbar.tsx` y `apps/web/src/features/agenda/ui/agenda-ux.module.css`.
- Un evento = un grupo legible, título completo en detalle, horario y tipo textual; color elegido independiente del tipo. Fuente: `apps/web/src/features/agenda/ui/agenda-ux.module.css` y `apps/web/src/features/agenda/model/event-colors.ts`.
- Formulario: dos columnas equilibradas, una hasta 600 px, acciones del mismo peso geométrico; detalle con editar primario/eliminar secundario. Sin nuevos campos, filtros ni operaciones. Fuente: `apps/web/src/features/agenda/ui/EventForm.tsx`, `apps/web/src/features/agenda/ui/EventDetails.tsx` y `apps/web/src/features/agenda/ui/agenda-ux.module.css`.
- Estados a conservar en implementación: carga con espacio estable; vacío con agregar; error conserva datos y permite recuperar; guardar no anuncia éxito anticipado; series explicitan alcance. Fuente: `apps/web/src/features/agenda/ui/EventForm.tsx` y `docs/engineering/agenda/README.md`.

## Elegir dirección

1. **Calma y foco (revisión pendiente, no aprobada):** mes + resumen diario de fecha prominente y filas cronológicas sin tarjetas anidadas. En móvil el contenido se apila; detalle y recorte de formulario de solo lectura se abren como hoja inferior de muestra. No cambian contratos productivos.
2. **Ritmo de color:** semana en filas por día; lectura cronológica con más espacio para títulos, menor visión mensual.
3. **Planificador compacto:** índice mensual pequeño seguido por una lista diaria ancha; mejor para pantallas estrechas, menor peso visual del calendario.

Las tres usan los mismos tres eventos personales ficticios del 12 de noviembre de 2026. 02/03 son alternativas anteriores preservadas, no representan la revisión ni su tipografía corregida. En 01 se retiraron por completo los desplegables rechazados. Los eventos abren un detalle contextual; Crear abre sólo un recorte de campos de lectura, sin simular guardado. Escape, cierre y retorno de foco se modelan con diálogos nativos y JS inline. No prueban persistencia, igualdad autenticada entre roles, aceptación visual ni seguridad. Transiciones de 180 ms para apertura/hover/press, sin bucles y anuladas por reduced-motion. Esta dirección debe ser mostrada por el coordinador y esperar aprobación explícita antes de implementar.

## Extensión escolar 04 (S10, sólo propuesta)

`design/agenda-polish/04-school-orange.html` copia 01 y preserva su JS y fuente incrustada byte por byte. Es una alternativa para comparar, no reemplazo de 01 ni aplicación autorizada. Misma composición neutral por rol; no hay nuevos datos, campos u operaciones. Humanist Companion, diales variación5/movimiento3/densidad5: cuaderno contemporáneo, no juguete ni hero promocional.

Valores adicionales existentes, no tokens nuevos de producto:

| Fuente | Valor | Uso local en 04 |
|---|---|---|
| `apps/shared-ui/foxmind-3d-tokens.css`, `--fm-orange` | `#ff782d` | Naranja luminoso, sólo ilustración/acento decorativo, nunca texto blanco sobre él |
| `apps/shared-ui/brujula.css`, `--fm-orange-soft` | `#ffeadb` | Melocotón del resumen diario y papel ilustrado |
| `apps/shared-ui/brujula.css`, `.fm-home-greeting` | `#ffedcf` | Extremo cálido del encabezado |
| `apps/shared-ui/foxmind-3d-tokens.css`, `--fm-yellow` / `--fm-control-border` | `#ffe99b` / `#7c86a6` | Automático resuelto por tipo Actividad, ya usado en 01 |
| `apps/shared-ui/brujula-parity.css`, `.agenda-color-graphite` | `#edf0f5` / `#64748b` | Muestra Grafito del catálogo existente, ya usada en 01 |

Esta extensión completa los dos pares antes sólo mencionados en la captura parcial. Los seis pares de colores nombrados no cambian. Primario sigue siendo `#b8490c`: contraste para texto blanco; el naranja vivo no lo sustituye en controles. Foco conserva `#4453b8`, distinto de selección.

Derivaciones ilustrativas permitidas: `#ff782d20` (naranja al 12.55%) para halo estático, `#b8490c30` (primario al 18.82%) para margen de cuaderno, `fill-opacity:.16` / `stroke-opacity:.5` en SVG. Degradados del encabezado blanco→`#ffedcf`, resumen `#ffeadb`→blanco y fondo `#fff1e7`→`#f4f7fe`; la línea superior del resumen combina los naranjas sin texto encima. Todos se componen de valores existentes; geometría de la ilustración y sombra de doble borde blanco/línea son decisiones de maqueta, no constantes productivas. Texto sobre claros, interiores de controles planos.

Decoración: ilustración inline de cuaderno/lápiz en carril propio del header y margen perforado fuera del contenido; wrappers `aria-hidden` y `pointer-events:none`, sin foco ni eventos. No decoración nueva dentro de celdas, no partículas ni bucles. Sólo se conserva movimiento breve de interacción y diálogo de 01, anulado por reduced-motion. No se fabrica estado de carga/error: esta maqueta no guarda ni llama servicios.

Claridad: Agenda como título, “Ver por” junto a Mes/Semana/Día, fecha activa destacada, explicación breve de elegir fecha/abrir evento, creación para el día elegido; las acciones de detalle declaran que son muestras. Nota pequeña “Maqueta sin guardado”; flechas/Hoy deshabilitados con limitación visible. Fuentes/estado del prototipo no sustituyen revisión visual ni prueba autenticada.

## Autocontrol y entrega

Comparar todos los colores/familias de cada HTML contra esta captura y las fuentes; calcular contraste de texto y controles; revisar estructura, foco, reflujo y reduced-motion. La validación sin navegador no demuestra ausencia de clipping, funcionamiento de overlays, lectura asistiva ni conformidad AA completa. Padre: abrir canvas con `/gentle:design open agenda-polish`, revisar opción 01 y trasladar sólo lo aprobado a producción con pruebas reales de ambos roles.

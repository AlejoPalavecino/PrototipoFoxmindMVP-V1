# Agenda · pantalla conservada, sólo widget diario (05)

- Rol: escritor delegado de diseño, sesión no expuesta. Fecha2026-11-12, HEAD `0112a64c7f88822b1d86c4e98565cc64c435f76d`, rama de Agenda heredada.
- Autoridad: TASK-005/S11 y gate S6. Specs y LogL19 leídos completos. Human autorizó primero una maqueta combinada, no implementación. Superficies exclusivas: nuevo05, manifest y este registro.
- Skills exactas leídas: gentle-design, gentle-ui-design, design-driven, taste-skill; referencias UI composición/adaptación aplicadas. No navegador, screenshot nuevo, servicios, builds, memoria, revisión o mutaciones Git. Espacios5/6 humanos intactos.
- Design Read heredado: shell/paleta/Lexend reales, sólo jerarquía diaria de01. Calibración local variación2/movimiento1/densidad5: sin nueva decoración ni movimiento. Fecha prominente, conteo breve, filas con horario alineado/acento ligero, crear para el día elegido.
- Registro abierto antes de escribir. Alternativa04 no elegida, no se copia su shell.

## Evidencia de base y geometría

Imágenes leídas con read: `docs/design/current/agenda-semana-docente-1440.png` y `agenda-mes-docente-1440.png`. Ambas muestran el widget en x1106,y190,ancho299,alto380 dentro de captura1440×1000. La siguiente tarjeta “Después de este día” comienza en y586: separación16px, no se cubrirá. Coordenadas de borde del widget: x1106..1405,y190..570 (intervalos semiabiertos). Se incrustará la captura semanal completa, sin recomponer sidebar/hero/calendario/tarjeta siguiente. La mensual se leyó para contrastar ubicación, no es evidencia de una nueva captura.

Procedencia humana del handoff: capturas históricas sintéticas12Nov, baseline398cc0b; no son captura reciente del build actual. Eventos existentes: Preparar clase de fotografía16:00–16:30 Verde; Revisar práctica de luz18:00–18:30 Violeta. Se conservarán títulos/horas/tipo Actividad personal.

Baselines obtenidos antes de editar mediante `git status --short && git rev-parse HEAD && node <<'NODE'` (fs/crypto + git diff, exit0):

- 01 `cc94eff7d625400e170b08f3a149795944689275a12f4f54319324b01de1d839`
- 02 `2b6e559f8e8221d88b584feaa4c9be9e66ea9a7fd6947f567cb944b251ac313c`
- 03 `cb77e600938e5c4679cd31a1d53cf0e77006fc113cdcf74340275ef295e11b7c`
- 04 `90ac264b0b19b3fc81ee90c406a4671a22baa364f73b74f9efce556675fdbc9f`
- system.md `20d65ba50c7e2f242574e4d389b3c42f14e1ca39434bd18566ca3a4c2d5d439d`
- system.html `a59f21b4b09e1a505369614672acbbf0859b8acc799f1e02b82923e143fd4cba`
- `git diff -- apps/ src/ tests/` hash `ca677504fc4f99c6359ec89cdb575612600d1da4e1ec0f48e7b7896a9a91004d`

Árbol sucio preexistente preservado: CSS mensual, prototipos01/04+manifest/sistema, docs, tarea, registros anteriores y prueba mensual. Ningún archivo ajeno se normaliza.

## Plan de presentación

Una composición semanal completa con máscara SVG/foreignObject en coordenadas nativas, manteniendo viewBox1440×1000 y aspect ratio al escalar. Debajo, comparación de recorte original y detalle HTML de widget a tamaño legible; no se simula app móvil. Sin JS ni toggle: comparación pasiva, no RED significativo. Agregar se muestra deshabilitado y el texto exterior explica que ninguna acción persiste. Sin modales, motor o botones falsamente funcionales.

## Resultado y verificación

Entregado05 con una sola captura semanal incrustada y superposición HTML restringida al widget. El recorte Antes reutiliza los mismos bytes, sin nuevo asset. Comparación visible debajo con widget HTML legible y adaptable; no se hace pasar por app móvil. Sin toggle, scripts, modales ni motor: no existen interacciones nuevas que exijan RED/GREEN. Agregar tiene disabled y etiqueta de muestra no operativa.

Comandos ejecutados (scripts inline completos en recibos de herramientas, sin auxiliares):

- `node <<'NODE'` de incrustación con fs/crypto: exit0, stderr vacío. Captura semanal1440×1000,244415bytes, SHA256 `66eb1462a867f4d28796d84278530a3f95b9a3a89669101999bf2b5417aabeff`; mensual1440×1000,234477bytes, SHA256 `03e1173a57ff060ec5ccc1830de368e5551b83f1f6e39323aca6cbcf009cc24f`. Sólo la semanal se incrusta. Lexend9204bytes SHA256 `d1a6bcc8be16439d978c4bd741a38093196cbeae9f6c71e1254076f4b9755628`.
- `node <<'NODE'` estructural con assert/crypto/vm/fs/child_process: exit0, stderr vacío. PASS hashes01–04/sistema y diff productivo/pruebas idénticos a la base; imagen y fuente incrustadas byte-idénticas al origen; PNGdimensiones1440×1000. Sin scripts (parse no aplicable), storage, red, disclosures, handlers o falsas operaciones de calendario. Dos fixtures exactos reproducidos en overlay/detalle, tiempos cronológicos, tipo Actividad personal, dos botones de muestra deshabilitados. Manifest válido, featurepath existente y05 agregado como quinta entrada.
- PASS geometría: SVGviewBox1440×1000, preserveAspectRatioxMidYMidmeet, stageaspect-ratio1440/1000; foreignObjectx1106y190w299h380overflowhidden. Derecha1405, fondo570, separación16 hasta tarjeta siguiente y586. No rectángulo/sombra externa al widget; máscara y contenido se escalan juntos. Recorte Antes background-size1440px1000px, posición-1106px-190px. Fuera de esa caja se conserva la captura original literalmente, no HTML reinterpretado.
- PASS12 valores de color vivos contrastados con `design/system.md`; fontfamilyBrújula/sans-serif, sin sustitución tipográfica. Foco visible y reduced-motion, acción de44px mínimo en detalle, reglas de ancho estrecho. La captura escalada no promete objetivos táctiles ni UI responsive: el detalle independiente sí conserva CSS adaptable. No medición renderizada de targets.
- Contraste calculado de texto en blanco/canvas: tinta14.54/13.56:1; secundario5.68/5.30:1; naranja5.25/4.90:1. Foco azul/blanco6.61:1; acentos verde/blanco7.13:1 y violeta/blanco8.72:1. Halo pastel sólo decorativo; tipo textual no depende del color. No se reevalúa ni altera el contraste rasterizado de la captura histórica.
- `git diff --check`: exit0, sin errores de whitespace; advertencias LF→CRLF en archivos ya sucios y manifest. No se tocaron archivos ajenos para quitarlas.

No hubo checks fallidos ni correcciones post-check. Ninguna captura nueva, navegador, espacio, instalación, test/build de app, servicio, publicación o memoria. No scratch/cache creado.

## Límites y presentación

S11 cubierto como propuesta de widget sobre pantalla preservada; S6 sigue impidiendo aplicación sin autorización. No se reimplementan las vistas o colores interactivos S8–S9 aquí:01 y sus pruebas históricas permanecen intactos;05 es comparación pasiva del alcance reducido. Igualdad autenticada por rol no se prueba ni se atribuye a la captura docente.

Sin prueba renderizada de05: parent debe comprobar encaje del texto, borde redondeado/máscara y escala de foreignObject en el canvas antes de aceptación. La caja exacta impide cubrir «Después de este día», pero el fit tipográfico y posibles seams requieren inspección real; no se declara aceptación visual. El propio documento distingue captura histórica de build actual.

Cómo comparar: padre abre `agenda-polish`/05, observa la propuesta semanal en contexto y baja a “Comparar sólo el widget”: recorte Antes frente a detalle propuesto. No hay botones operativos, guardado ni selector ficticio; no requiere control de espacios5/6. El intercambio es más jerarquía/lectura frente a las tarjetas de color existentes, sin cambiar navegación/calendario/encabezado. Primer paso pendiente: spotcheck del padre, presentar y esperar decisión humana antes de cualquier edición de la app.

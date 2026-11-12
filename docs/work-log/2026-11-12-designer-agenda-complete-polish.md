# Agenda: sincronización visual y alternativas acotadas

## Encargo y estado inicial

- Autor: escritor delegado de diseño; identificador de sesión no expuesto.
- Fecha: 2026-11-12. Rama: `codex/agenda-complete-polish`.
- Worktree: raíz de FoxMind. Commit inicial: `c702360a3502fdb47592416ee3c4c212d3f7277e`.
- Contrato: `odd/tasks/agenda-ux.md`, TASK-005, S3–S4. Sólo sistema de referencia y tres láminas; sin implementación productiva.
- Superficies: `design/system.md`, `design/system.html`, tres HTML y manifiesto de `design/agenda-polish/`, este registro.
- Preexistentes preservados: CSS mensual, guías de diseño/Agenda, tarea ODD, registros root/worker mensuales y prueba mensual no versionada. Ninguno es propiedad de este escritor.

## Método y límites

Se leyeron AGENTS, base funcional, arquitectura, política documental, guía Agenda, guía de diseño y las tres skills inyectadas, incluidas composición y adaptación. El padre informa que el listado de diseños no encontró sistema existente; la búsqueda acotada de `design/` confirmó que el directorio aún no existe (find devolvió error de ruta, no un problema de permisos).

Primero se captura el sistema desde fuentes CSS reales, sin confundir las capas base/3D con los overrides Brújula. Después se proponen tres organizaciones con idénticos eventos sintéticos y acciones personales. No se usan datos retenidos, archivos de fuentes, imágenes ni URLs externas. La fuente productiva Lexend se documenta, pero la maqueta usa sólo fallback de sistema ya declarado en código.

No hay RED significativo: son documentos y láminas pasivas, sin cambio de comportamiento ejecutable. Se verificarán estructura, manifiesto, fuentes/colores y contraste calculado mediante Node incorporado. No se autorizaron navegador, capturas, servicios, build, proveedores, instalaciones, revisión nativa ni Git mutante. El escritor no dispone de `gentle_design`: el padre abre canvas y actualiza el Log ODD.

## Resultado y comprobaciones

Sistema escrito antes de las tres alternativas. Recomendación: `01-calm-focus.html`, extensión de mes + panel diario sin tocar la corrección mensual. `02-color-rhythm.html` organiza la semana por filas; `03-compact-planner.html` prioriza índice mensual y lista diaria, con viewport intencional 390 px. No hay selección humana de dirección todavía.

### Comprobaciones observadas

1. `node --input-type=module -e "import fs from 'node:fs'; const d=JSON.parse(fs.readFileSync('design/agenda-polish/design.json','utf8')); if(d.feature!=='odd/tasks/agenda-ux.md'||d.artboards.length!==3) process.exit(1); for(const a of d.artboards){ const s=fs.readFileSync('design/agenda-polish/'+a.file,'utf8'); if(!s.includes('<html')||!s.includes('prefers-reduced-motion')||/https?:\\/\\//.test(s)) process.exit(1); } console.log('Agenda manifest and self-contained artboards PASS');"` — exit 0; stdout `Agenda manifest and self-contained artboards PASS`; stderr vacío.
2. `git diff --check` — exit 0; stdout vacío; advertencia stderr sobre conversión futura LF→CRLF en `odd/tasks/agenda-ux.md`, archivo preexistente no editado por este escritor.
3. Autocontrol Node incorporado (`node --input-type=module` con heredoc en foreground, sin archivos temporales): exit 0, stderr vacío. Comprueba doctype/idioma/viewport, balance de etiquetas, IDs únicos, fragmentos válidos, variables definidas, ausencia de dependencias externas, procedencia literal de colores y stack tipográfico. Compila cada script con `vm.Script` y ejecuta generación contra DOM mínimo sintético: 42 fechas, una sola selección, 12 de noviembre con 3 eventos en ambas composiciones mensuales. No equivale a un parser HTML completo ni navegador.
4. Contraste calculado en el mismo autocontrol: tinta/fondos mínimo 11.92:1; secundario/fondos mínimo 5.14:1; blanco/naranja 5.25:1; foco y contorno sobre blanco superan 3:1. PASS de pares elegidos, no certificación AA de la aplicación. Paleta y fuentes: PASS contra las siete fuentes CSS. La lámina de sistema contiene 23 literales de color (22 de paleta + color de sombra); cada alternativa contiene 16.
5. `find` acotado confirmó `apps/web/public/brujula/lexend.woff`; no se leyó ni cargó el archivo de fuente.

### Autorrevisión por requisito

| Requisito | Resultado y límite |
|---|---|
| S3: coherencia de ambos roles | Un mismo contenido y lenguaje Agenda privado, sin controles exclusivos de un rol. Paridad autenticada no verificada; corresponde a TASK-007. |
| S4: color, información, movimiento | Naranja Brújula, tinta legible, tres pares de evento reales, fecha marcada por texto/borde; tres organizaciones distintas. Hover breve 180 ms, sin animación de filas, con override reduced-motion. |
| Sistema antes del diseño | Captura parcial con procedencia por entrada y board autocontenido; ninguna fuente productiva modificada. |
| Mismo contenido/acciones | Tres eventos ficticios de Actividad, horarios/notas iguales; Crear/Agregar/Editar/Eliminar/Cancelar. Categorías contrastadas con `apps/web/src/features/agenda/model/calendar.ts`; no se inventan Estudio/Otro como tipos. |
| Dirección de bajo riesgo | Opción 01 mantiene seis filas 86/64 px e indicadores móviles; no altera banner, shell ni comportamiento del panel real. |
| Formulario/detalle | Muestras desplegables nativas con etiquetas, columnas equilibradas y acciones equivalentes en ancho. Recorte visual explícito, no formulario funcional ni eliminación real. |
| Responsive/foco/contraste | Grillas minmax(0,1fr), wrapping, reflujo 920/1000/600 px; foco azul separado de naranja, enlaces/summary accesibles por teclado. Sin observación visual: clipping, zoom, controles y navegación asistiva quedan por probar. |
| No expansión funcional | Sin filtros, indicadores académicos inventados, nuevos permisos, persistencia, dependencias ni servicios. Navegación/calendario estáticos, advertidos en cada lámina. |
| Entrega al padre | Feature exacta en manifiesto; no edita tarea/Log. Sin herramienta `gentle_design`, no abre canvas ni usa launcher alternativo. Padre abre `/gentle:design open agenda-polish`. |

### Tamaño de la entrega

Conteo de líneas físicas no vacías finales excluidas únicamente al final del archivo (Node `trimEnd().split('\\n').length`):

| Archivo | Líneas | Bytes UTF-8 |
|---|---:|---:|
| `design/system.md` | 84 | 8192 |
| `design/system.html` | 81 | 5709 |
| `design/agenda-polish/01-calm-focus.html` | 130 | 10525 |
| `design/agenda-polish/02-color-rhythm.html` | 101 | 9223 |
| `design/agenda-polish/03-compact-planner.html` | 115 | 9552 |
| `design/agenda-polish/design.json` | 28 | 1333 |

Artefactos: **539 líneas**. Registro: **61 líneas**; total delegado: **600 líneas**. Autocontrol final de whitespace de los siete archivos (incluidos no versionados): PASS, exit 0, stderr vacío. Supera las ~400 orientativas por tres documentos HTML autocontenidos con estilos/foco/reflujo propios; no se minificó ni se dividió para aparentar un corte menor. Conteo de tokens de diseño: 23 nombrados capturados (9 colores, 7 espacios, 4 radios, 1 familia, 1 sombra, 1 duración), más valores locales explícitos (selección, pares de evento, radio 16 y escala tipográfica); no son 23 colores. No se dispone de tokenizador del modelo: unidades separadas por espacios no se presentan como tokens LLM.

Estado: artefactos y autocontrol estructural completos, sin cambios productivos, integración, publicación ni despliegue. S3/S4 cubiertos en propuesta; aceptación visual, evidencia de roles y implementación siguen pendientes del padre. S1/S2/S5 no cubiertos por esta delegación. Primer paso pendiente: revisión de canvas de la opción 01 por el padre, decisión de dirección y continuación TASK-006/007. Sin scratch ni cachés creados.

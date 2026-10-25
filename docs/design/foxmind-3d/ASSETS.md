# Recursos listos para integrar

**16 ilustraciones originales, 48 WebP responsive, 8 variantes SVG de marca y 42 iconos SVG.** Se entregan además un sprite de iconos, 16 masters WebP sin pérdida, los prompts de generación y 10 referencias del usuario convertidas a WebP. [Catálogo visual](review/index.html) · [manifest raster](asset-manifest.json) · [manifest vector](vector-manifest.json).

## Qué usar en cada lugar

| Recurso | Uso y tamaños de ancho |
|---|---|
| `hero/welcome-learn` | Inicio estudiante, mixto o neutro; 480 / 960 / 1600 px. Texto HTML a la izquierda, Foxy a la derecha. |
| `hero/welcome-teach` | Inicio con participación docente; 480 / 960 / 1600 px. No codifica un permiso. |
| `scenes/auth` | Acceso, registro, verificación; 320 / 640 / 960 px. |
| `scenes/profile` | Perfil; 320 / 640 / 960 px. El nombre y avatar de iniciales son HTML. |
| `scenes/security` | Contraseña y recuperación; 320 / 640 / 960 px. |
| `scenes/agenda` | Agenda; 320 / 640 / 960 px. Calendario decorativo sin fechas. |
| `states/empty`, `success`, `unavailable` | Vacío, confirmación, error/búsqueda con texto apropiado; 160 / 320 / 640 px, transparencia real. Reutilizables en todos los flujos. |
| `covers/literature`, `math`, `biology` | Familias principales; 320 / 640 / 1200 px, composición 3:2. |
| `covers/society`, `science`, `creative`, `general` | Sociales, ciencias/tecnología, arte y cualquier otra materia; mismos tamaños. No restringen materias posibles. |
| `brand/logo-horizontal.svg` | Shell y acceso; texto convertido a paths, sin dependencias tipográficas ni raster embebido. |
| `brand/mark.svg`, `favicon.svg` | Isotipo y favicon. |
| `brand/logo-horizontal-inverse.svg`, `logo-mono.svg`, `mark-mono.svg`, `wordmark.svg`, `logo-stacked.svg` | Variantes para fondo oscuro, una tinta, marca tipográfica y composición vertical. |
| `icons/*.svg`, `icons/sprite.svg` | Controles de navegación, archivo, edición, calendario, estado y seguridad. 24×24, stroke 1.8, `currentColor`. |

Los SVG de marca son una reconstrucción vectorial nueva y simplificada a partir de la identidad visual. La mascota 3D es una interpretación coherente de las referencias elegidas. El PNG original de Foxy en la app queda intacto. El wordmark usa contornos generados desde Trebuchet MS Bold instalada en el equipo; no distribuye un archivo de fuente. Los iconos son trazados originales del paquete.

## Archivos de producción y masters

`assets/` contiene lo que se integrará. `masters/` conserva WebP lossless de cada generación, para nuevas medidas; no se sirve a clientes. `references/` conserva capturas de referencia, no fondos de UI. `sources/generation-manifest.json` registra prompts y procedencia; los PNG nativos permanecen en el directorio de imágenes generadas, y la regeneración de tamaños funciona desde masters sin requerir esos PNG.

Los nombres sin sufijo son la variante más grande. El manifest registra medidas reales, bytes y SHA-256 de cada variante; no inferir altura a partir del nombre. WebP q80 en escenas/portadas, q84 y alpha100 en recortes; metadata eliminada. Las 48 variantes suman **1.199.184 bytes**; máximo **68.732 bytes**. Es el total del catálogo responsive, no el peso por página. Los masters y referencias se excluyen de ese presupuesto.

## Integración responsive

Ejemplo de futura integración para una card (rutas propuestas después de copiar `assets/`):

```html
<img
  src="/foxmind-3d/covers/literature-640.webp"
  srcset="/foxmind-3d/covers/literature-320.webp 320w,
          /foxmind-3d/covers/literature-640.webp 640w,
          /foxmind-3d/covers/literature.webp 1200w"
  sizes="(max-width: 767px) calc(100vw - 32px),
         (max-width: 1199px) 40vw, 360px"
  width="1200" height="800" alt="" loading="lazy" decoding="async"
/>
```

Usar dimensiones exactas del manifest si difieren. `object-fit:cover` para portada; posición central. Heroes: posición derecha, área izquierda 0–54 % libre para texto; móvil coloca texto separado para no recortar Foxy ni perder contraste. Solo el hero inicial/LCP lleva prioridad cuando una medición lo justifique. No precargar escenas de perfil, Agenda y configuración desde Inicio.

Decoración con `alt=""`; si el recurso es el único nombre de marca, `alt="FoxMind"`. Botones de icono reciben nombre accesible y el SVG `aria-hidden="true"`. Para cambiar color con `currentColor`, usar SVG inline o `<use>` con el sprite servido desde el mismo origen; un `<img>` externo no hereda el color del padre. Icono 20–24 px dentro de objetivo de 44 px. No expresar éxito/error solo con un SVG.

## Portadas y compatibilidad

Claves actuales: `explore → covers/general`, `create → covers/creative`, `discover → covers/science`; el manifest es la fuente de este adaptador. Las otras portadas existen como recursos, pero habilitarlas como elección persistida requiere D3-COV del [plan](implementation-plan.md). No cambiar silenciosamente claves guardadas ni escoger portada por coincidencia del nombre de materia. Una clave desconocida usa `general`, conservando el dato original.

Una imagen fallida mantiene superficie color crema, dimensiones, título y acción. Las miniaturas de actividad heredan portada de aula; no generan una imagen por actividad ni simulan thumbnails de archivos privados. La misma ilustración se reutiliza en wizard, card, cabecera, notificación y estado relacionado.

## Reproducibilidad

Desde la raíz del repo, usando Node y `sharp` ya disponible:

```powershell
node docs/design/foxmind-3d/tools/export-assets.mjs
node docs/design/foxmind-3d/tools/build-icons.mjs
node docs/design/foxmind-3d/tools/build-coverage.mjs
node docs/design/foxmind-3d/tools/validate-handoff.mjs
```

`build-brand.ps1` reconstruye los ocho SVG en Windows con System.Drawing y Trebuchet MS instalada; los SVG exportados son portables y no necesitan ejecutar ese script. `prepare-handoff.mjs` conserva referencias y genera pruebas de contacto; solo su primera ejecución necesita los adjuntos originales. Ninguna herramienta cambia archivos del producto.

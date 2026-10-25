# Sistema visual FoxMind 3D

**Dirección elegida para implementar después.** Foxy conserva naranja, hocico y pecho crema, puntas de orejas y patas marrones. Las escenas aportan calidez; los datos, etiquetas y botones siguen siendo HTML accesible. Las referencias son inspiración aprobada y no contratos funcionales. Base de producto contrastada: `e7f5d6f67520516fe56fe9794ab8d1ac97633bdd`.

## Jerarquía y color

| Uso | Token | Criterio |
|---|---|---|
| Fondo / superficie | `#FCFAF7` / `#FFFFFF` | Fondo cálido, panel blanco, borde fino; sin glass que reduzca legibilidad. |
| Texto principal / secundario | `#202522` / `#5B6260` | El secundario conserva contraste; no sustituir por gris claro de las imágenes generadas. |
| Acción principal | `#FF782D` con texto `#202522` | Una acción dominante por bloque; hover `#F2691C`. No texto blanco normal sobre naranja. |
| Enlace / foco | `#9A3E00` / `#4453B8` | Enlaces subrayados en texto; foco de 3 px con separación de 3 px. |
| Borde de control | `#7A817E` | El borde decorativo `#D9DDDA` no basta para identificar un campo solo. |
| Familias de contenido | lavanda, menta, amarillo, coral | Complementan icono y nombre. No definen éxito/error ni el rol. |
| Error / confirmación | `#B3261E` / `#156442` | Icono, título y explicación; nunca solo color. |

Fuente canónica: [tokens JSON](theme/tokens.json), [variables CSS](theme/tokens.css). La futura integración convierte estos valores a la infraestructura actual; no se importa el CSS en la app en esta etapa. Los ratios observados se guardan en [comprobaciones](checks/validation.json).

## Tipografía, medidas y marca

Títulos en Trebuchet MS Bold con fallback Segoe UI; cuerpo en Segoe UI/Arial. Son familias de sistema, sin descarga ni copia de archivos de fuentes. El wordmark se entrega como trazados SVG y no depende de ellas. Esta elección evita atar la implementación a una licencia o servicio externo. El tamaño nunca sirve de sustituto de una jerarquía HTML.

| Elemento | Escritorio | Móvil |
|---|---|---|
| Saludo / título principal | 32–36 px, interlineado 1.15–1.2 | 28 px; título largo puede ir a dos líneas |
| Sección / tarjeta | 24 / 20 px, peso 700 | 22 / 18 px |
| Texto y campo | 16 px, interlineado 1.5 | 16 px; sin zoom automático al enfocar |
| Ayuda / metadatos | 14 px, interlineado 1.45 | 14 px; 12 solo para etiquetas no esenciales |

Espaciado 4/8/12/16/24/32/48 px. Campo y botón con radio 12; tarjeta 20; diálogo 24; etiqueta 8. Alto de control 44–48 px, objetivos táctiles al menos 44 px cuando son acciones principales. Sombra `0 4px 18px #20252208`, borde 1 px; no apilar tarjetas dentro de tarjetas sin relación real.

El SVG es una reconstrucción vectorial simplificada de Foxy, no un trazado idéntico del PNG histórico. La mascota 3D interpreta las referencias seleccionadas; el archivo histórico no cambia. Marca horizontal mínimo 160 px, símbolo mínimo 24 px (32 preferido), margen libre equivalente a 1/4 de la altura del símbolo. Usar variante inversa en fondo oscuro y mono para una sola tinta. No deformar, poner sombras nuevas ni cambiar el naranja.

## Composición común

- Desde 1024 px: lateral 232 px, padding de contenido 24–32 px y ancho de contenido máximo 1440 px. El contenido puede crecer verticalmente; no forzar toda la plataforma a una pantalla.
- Bajo 1024 px: encabezado compacto y drawer. En 768 px las tarjetas admiten dos columnas; en 320–390 px, una. El orden de DOM coincide con el orden de lectura y foco.
- Inicio: saludo corto arriba; pendientes primero, miniagenda al costado en desktop y después de pendientes en móvil; accesos rápidos al final. Foxy ocupa el extremo derecho del banner, sin tapar el saludo. En móvil texto e imagen se separan y la imagen puede reducirse a 96 px.
- Mis aulas: grilla de cards 3/2/1 según espacio disponible, portada 3:2, nombre y división, rol de esa aula y Entrar al aula. Alturas alineadas sin cortar títulos con información decisiva. Borradores e invitaciones se distinguen de aulas activas. La «unidad actual» de la referencia no se infiere del DTO actual ni del progreso del alumno; no se incorpora a esta card sin una proyección explícita posterior.
- Aula: cabecera compacta (no repetir hero alto al navegar); pestañas locales en una fila desplazable. Plan es la entrada ordinaria para ambos roles; una notificación/actividad dirigida conserva su destino. En Plan, estructura de 260–300 px y contenido flexible; móvil usa selector de tema en sheet y un único contenido.
- Formularios: ancho máximo 640 px, labels persistentes encima, ayuda junto al campo. Auth y perfil pueden llevar escena lateral; en móvil siempre después de lo útil.
- Actividad/evaluación/corrección: priorizar lectura de 760 px, editor y estado guardado. Foxy no ocupa espacio de respuesta. Evaluación mantiene plazo, zona horaria, acción de entrega y restricciones visibles; ninguna animación constante ni cronómetro nuevo. La duración sugerida por IA es estimativa, no un temporizador.
- Agenda: mes + detalle de día en escritorio; lista de día y navegación de fecha accesibles en móvil. El calendario real es HTML; la escena 3D nunca comunica fechas.

## Componentes y estados de interacción

| Componente | Especificación común |
|---|---|
| Botón | Texto con verbo y objeto; primario naranja/oscuro, secundario blanco/borde, peligro rojo/alto contraste. Busy conserva ancho, anuncia acción y bloquea duplicación. Disabled explica por qué cuando importa. |
| Campo | Label, valor, ayuda, error asociado; required en texto/contexto. Placeholder solo ejemplo. Password admite pegado y botón mostrar con nombre accesible. Error conserva datos no sensibles. |
| Card | Título enlazado o botón final claro; no hacer toda la tarjeta clicable si contiene otras acciones. Imagen decorativa con `alt=""`; rol y estado explícitos. |
| Diálogo / sheet | Título, propósito, cancelar, CTA; foco inicial apropiado, focus trap, Escape cuando seguro y retorno. Confirmación irreversible nombra el recurso; no doble diálogo. |
| Pestañas | Una selección, navegación de teclado acorde al patrón elegido; no anunciar `tab` si son enlaces de navegación. Móvil con scroll local, nunca horizontal de página. |
| Notificación / toast | Error persistente en contexto; éxito breve solo tras servidor confirmado. `aria-live` moderado. No usar toast como única prueba de entrega/publicación. |
| Archivo | Nombre, formato, tamaño, estado de seguridad, acción autorizada. Progreso solo si medible. Thumbnail del aula no simula una vista previa del PDF. |
| Lista / tabla | Cabeceras, fila y acción con contexto; móvil tarjetas con mismos datos importantes. Filtros visibles y estado Sin resultados distinto de Sin datos. |
| Guardado | Sin guardar → Guardando → Guardado; error y resultado incierto diferentes. No abandonar ni confirmar envío con cola pendiente. |
| Vacío | Una frase y siguiente acción pertinente; Foxy opcional de 120–160 px. No inventar estadísticas ni convertir error de carga en cero. |
| Carga parcial | Skeleton de dimensiones estables y mensaje; cada widget falla por separado. No spinner eterno ni falso porcentaje de IA. |
| Permiso / archivo | Mensaje seguro, navegación disponible; datos revocados desaparecen. Archivada lleva aviso persistente de solo lectura y acciones permitidas reales. |

## Motion, accesibilidad y rendimiento

Transiciones de color/opacidad de 120–180 ms, sin rebotes en campos ni movimientos del layout. `prefers-reduced-motion` elimina movimiento. No autoavance de carousels, sonidos, confetti o mascota que interrumpa. La marca es divertida por la ilustración, no por presión sobre quien aprende.

Verificar contraste, teclado completo, lector de pantalla, zoom al 200 %, 320/390/768/1024/1440 px, textos largos y fallos de imagen. La validación futura de producto debe observar sus datos y permisos reales; los controles del atlas solo prueban una maqueta.

Servir únicamente [assets optimizados](ASSETS.md), reservar dimensiones y `srcset`. Hero de la vista inicial puede cargar con prioridad; arte inferior usa lazy loading. No descargar las 16 escenas en cada pantalla ni incluir masters en el bundle. La interfaz debe seguir operable con imágenes bloqueadas.

## Decisiones cerradas para evitar divergencias

1. Rol por aula. Ningún selector de rol global en registro; perfil no cambia permisos.
2. Inicio mantiene zonas y cambia contenido por participación autorizada, no reorganización aleatoria.
3. Buscar aulas en Mis aulas. El buscador global de las referencias no tiene contrato actual: se omite del shell hasta una feature separada; no renderizar un campo muerto.
4. Perfil y Configuración son pantallas separadas propuestas; `/settings` requiere route/guard/retorno explícitos.
5. Plan por defecto para ambos roles, tabs horizontales móviles y sheet curricular solo dentro de Plan.
6. Archivar conserva historia, nunca borra ni publica correcciones privadas. Cumplimiento, desempeño y avance docente separados.
7. El catálogo gráfico tiene siete portadas. Las tres claves actuales se adaptan según el manifest; ampliar selección persistida exige la tarea explícita del plan, no deducir portadas de texto libre.
8. Las referencias contienen datos ilustrativos. No agregar buscador global, cambio de email, foto de perfil, uploads de portada, roles globales, calendarios externos ni rankings a partir de ellas.

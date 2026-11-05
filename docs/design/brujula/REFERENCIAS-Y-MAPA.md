# Referencias visuales y mapeo a la implementación

## Autoridad de fuentes

`FoxMind-Brujula.html` es la referencia **visual/UX exacta** de la variante elegida. Los PNG WebP SVG de `assets` reproducen esa referencia. El HTML incluye elementos y datos simulados que **no** deben persistirse como producción. La especificación funcional vigente aportada por el usuario determina el alcance; el repositorio determina los contratos y permisos reales.

## Arquitectura visual que debe conservarse

| Área | Elementos que reproducir | Datos funcionales reales |
|---|---|---|
| Navegación | Sidebar izquierda; logo Foxy, búsqueda, notificaciones, cuenta y menú móvil | Sesión, rol, navegación, contador de avisos |
| Dashboard docente | Banner con Foxy y paisaje cálido; «Por atender» y consultas; acciones rápidas | Intentos entregados sin revisión publicada, consultas y agenda privada |
| Dashboard alumno | Banner con Foxy y paisaje verde agua; próxima tarea y progreso; accesos | Actividades y borradores propios, vencimientos, devoluciones publicadas |
| Mis aulas | Tarjetas con portadas por materia, lista y filtros | Aulas activas/archivadas autorizadas, membresías, invitaciones |
| Plan | Unidades → temas → materiales y actividades | Plan, avance de temas, asociación de recursos |
| Actividades | Modal manual/IA, edición, rúbrica, revisión y asignación | Actividades/consignas, borradores, rúbricas, entregas e intentos |
| Corrección | Puntaje por criterio, sugerencia IA y decisión de publicar | Entrega individual, revisión privada/publicada |
| Muro y Biblioteca | Publicaciones grupales y recursos de aula | Permisos por aula y conservación de material |
| Foxy AI docente | Chat amplio, contexto aula/general, herramientas y vista previa | Historial, selección segura de fuentes, generación/edición/publicación |
| Agenda | Mes/semana/día, picker y previsualización de color | Eventos privados reales, recurrencias, excepciones |
| Notificaciones | Contador en sidebar, lista con lectura y apertura | Novedades privadas, estado leído, deep links autorizados |

## Recursos extraídos del HTML

| Archivo | Uso sugerido |
|---|---|
| `foxy-logotipo-redondo.webp` | Logo compacto o avatar de marca (verificar si conviene usar el PNG oficial) |
| `foxy-bienvenida.webp` | Foxy en banner de bienvenida |
| `banner-docente.webp` | Fondo horizontal cálido del inicio docente |
| `banner-alumno.webp` | Fondo horizontal verde agua del inicio alumno |
| `portada-biologia.webp` | Tarjeta de aula de Biología |
| `portada-matematica.webp` | Tarjeta de aula de Matemática |
| `portada-literatura.webp` | Tarjeta de aula de Literatura |
| `portada-geografia.webp` | Tarjeta de aula de Geografía |
| `ilustracion-portada-svg.svg` | Ilustración vectorial adicional de portada |

La variante `assets/foxy-oficial/` es la fuente de identidad y tiene prioridad frente a una generación nueva que cambie rasgos, forma o expresión. Las portadas corresponden a **ejemplos de materias**, no a un catálogo fijo de asignaturas; para materias no ilustradas usar portada genérica de Brújula o el sistema actual, sin asignar Biología a todo.

## Decisiones de producto imprescindibles

- Exactamente **dos roles** en la versión vigente: docente y estudiante. No inventar rol directivo ni administración compartida.
- Cada aula del docente es distinta; archivado no elimina contenido.
- Plan impartido, cumplimiento de entregas y rendimiento son **tres dimensiones separadas**.
- Actividad y recurso de Biblioteca son entidades distintas. `Publicar material` no equivale a `Asignar actividad`.
- Rúbrica visible para la actividad según reglas de publicación; notas privadas hasta la confirmación docente.
- Foxy AI docente puede trabajar en contexto general o de un aula autorizada; no acceder a chats privados de alumnos.
- Los resultados de la demo son de muestra; no son métricas reales ni endpoints existentes.

## Referencia CSS/JS

Los CSS extraídos tienen los recursos enlazados en rutas relativas a `assets/extraidos-maqueta/`; el HTML original conserva **sus imágenes incorporadas** y es la referencia fidedigna. Los módulos JS separados son solo para ubicar lógica y componentes visuales del prototipo; su enrutado, sesiones y persistencia simulados **no** son reutilizables como fuente de autorización.

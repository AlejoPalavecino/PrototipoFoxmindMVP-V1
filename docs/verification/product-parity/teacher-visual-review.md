# Revisión visual docente antes de la recompilación final

Ego Lite, espacio 1, pestaña p2. Aplicación local en el puerto 49841 con datos sintéticos y sesión docente existente. El aula principal del recorrido fue «Fotografía y luz». Las capturas corresponden a la compilación servida durante la revisión.

## Cobertura

| Superficie | 1440 × 900 | 390 × 844 |
| --- | --- | --- |
| Inicio | [Inicio](teacher-home-1440.png) | [Inicio](teacher-home-390.png) |
| Mis aulas | [Colección](teacher-collection-1440.png) | [Colección](teacher-collection-390.png) |
| Agenda | [Agenda](teacher-agenda-1440.png) | [Agenda](teacher-agenda-390.png) |
| Foxy AI | [Foxy](teacher-foxy-1440.png) | [Foxy](teacher-foxy-390.png), [Herramientas](teacher-foxy-tools-390.png) |
| Notificaciones | [Bandeja](teacher-notifications-1440.png), [panel](teacher-inbox-1440.png) | [Bandeja](teacher-notifications-390.png), [panel](teacher-inbox-390.png) |
| Mi perfil | [Perfil](teacher-profile-1440.png) | [Perfil](teacher-profile-390.png) |
| Plan | [Plan](teacher-room-plan-1440.png) | [Plan](teacher-plan-390.png) |
| Muro | [Muro](teacher-wall-1440.png) | [Muro](teacher-wall-390.png) |
| Biblioteca | [Biblioteca](teacher-library-1440.png) | [Biblioteca](teacher-library-390.png) |
| Actividades | [Actividades](teacher-activities-1440.png) | [Actividades](teacher-activities-390.png) |
| Progreso | [Progreso](teacher-progress-1440.png) | [Progreso](teacher-progress-390.png) |
| Alumnos | [Alumnos](teacher-members-1440.png) | [Alumnos](teacher-members-390.png) |
| Historial | [Historial](teacher-history-1440.png) | [Historial](teacher-history-390.png) |
| Configuración | [Configuración](teacher-room-settings-1440.png) | [Configuración](teacher-room-settings-390.png) |

## Verificaciones y límites

- Los controles DOM a 320, 390, 768, 1024 y 1440 px dieron el mismo ancho de documento y viewport útil en las 15 superficies medidas. Los puntos centrales de los controles visibles observados quedaron alcanzables. Las pestañas del aula tienen desplazamiento horizontal interno en móvil. Después de seleccionar Configuración y pasar por los cinco anchos, su pestaña quedó completa, con 0 px de recorte a ambos lados.
- La muestra de texto visible sobre fondos sólidos dio valores de 6,89:1 para Entregas, 7,31:1 para Activas, 6,69:1 para Mes, 7,57:1 para Todos los tipos y 6,49:1 para Todas en Muro a 390 px. El barrido en los dos tamaños aplicó 4,5:1 para texto normal y 3:1 para texto grande. Fondos con imágenes y degradados, estados transitorios y contenido fuera de la vista quedaron fuera del cálculo.
- En la compilación observada, las pestañas del aula tenían estado semántico activo, pero Plan, Muro y Configuración usaban el mismo color de texto que sus pares inactivos. El ajuste visual de estado activo ya estaba en el código fuente. A 390 px el encabezado del aula duraba 231 px de alto y el bloque de texto medía 222 de los 343 px disponibles, con título en dos líneas. El ajuste de ancho también estaba listo en fuente. Ambos cambios requieren comprobar la recompilación final.
- El logotipo de texto estuvo visible en Agenda, Foxy y aula tras estabilizar el documento a 320 y 390 px. A 390 midió 88 × 37 px con opacidad 1. La captura estable de Foxy reemplazó un cuadro transitorio tomado justo después del cambio de viewport.
- La sesión se conservó. Se usaron navegación, pestañas y paneles de lectura. Biblioteca, Actividades e Historial estaban vacíos para esta aula. Las comprobaciones con contenido y operaciones persistentes corresponden a la matriz funcional.

[Mediciones DOM y pares de color](teacher-visual-metrics.json)

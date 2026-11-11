# Plan de estudio

El plan presenta unidades y temas, con materiales/actividades asociados al tema seleccionado. El estudiante consulta; el docente marca como dado y puede deshacer el avance.

El plan publicado proviene de la estructura revisada al crear el aula. La extracción IA propone unidades/temas, no publica ni reemplaza cambios sin confirmación. Cargar un documento no inicia por sí solo el análisis. El modo manual permite editar y revisar antes de confirmar.

Los estados PENDING, NEXT y TAUGHT pertenecen al modelo; el frontend actual prioriza Pendiente/Dado y el siguiente tema en Inicio. No inventar controles de reestructuración del plan publicado por la existencia de contratos anteriores. Zona horaria, contenido/historia y permisos del aula se conservan.

El avance de temas dados/total es una medida distinta del cumplimiento y del rendimiento. La consulta no crea obligaciones ni calificaciones.

La UI presenta unidades desplegables con su avance y temas completos, filtros Todos/Por dar/Dados y detalle del tema seleccionado. El docente puede marcar desde la fila o desde el detalle; se confirma el estado del servidor, se anuncia éxito y Deshacer restaura el estado anterior (incluido NEXT). El estudiante comparte estructura visual y sólo consulta. Un filtro vacío no conserva un detalle que contradiga sus resultados. Animaciones breves respetan reduced-motion.

Fuentes: [PlanWorkspace](../../../apps/web/src/features/curriculum/ui/PlanWorkspace.tsx), [Plan](../../../apps/web/src/application/academic-plan.tsx), [modelo](../data-model.md). [Evidencia actual](../../verification/flows.md).

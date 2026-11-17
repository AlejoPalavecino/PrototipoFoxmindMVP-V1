# Plan de estudio

El plan presenta unidades y temas, con materiales/actividades asociados al tema seleccionado. El estudiante consulta; el docente marca como dado y puede deshacer el avance.

El plan publicado proviene de la estructura revisada al crear el aula. La extracción IA propone unidades/temas, no publica ni reemplaza cambios sin confirmación. Cargar un documento no inicia por sí solo el análisis. El modo manual permite editar y revisar antes de confirmar.

Los estados PENDING, NEXT y TAUGHT pertenecen al modelo; el frontend actual prioriza Pendiente/Dado y el siguiente tema en Inicio. No inventar controles de reestructuración del plan publicado por la existencia de contratos anteriores. Zona horaria, contenido/historia y permisos del aula se conservan.

El avance de temas dados/total es una medida distinta del cumplimiento y del rendimiento. La consulta no crea obligaciones ni calificaciones.

La UI presenta el mapa de unidades y temas junto al detalle seleccionado; en celular el mapa se abre con «Elegir tema». El docente marca el tema desde el detalle. Al confirmar en el servidor, se muestra el éxito y «Deshacer» puede restaurar el estado anterior (incluido NEXT). El estudiante comparte la estructura visual en modo consulta. El lector de un recurso se abre sobre el Plan; al cerrarlo se conserva el tema seleccionado. Las animaciones respetan la preferencia de movimiento reducido.

Fuentes: [PlanWorkspace](../../../apps/web/src/features/curriculum/plan/PlanWorkspace.tsx), [Plan](../../../apps/web/src/application/workflows/classroom-workspace/ClassroomPlan.tsx), [modelo](../data-model.md). [Evidencia actual](../../verification/flows.md).

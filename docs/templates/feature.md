# Plantilla de definición de funcionalidad

Plantilla reutilizable, no tarea activa. Integrar estas secciones en la fuente del dominio cuando alcance. Seguimiento R2 en un único registro TTP de odd/tasks; evidencia detallada en work-log.

## Problema y resultado

Necesidad de la persona y resultado esperado. Actores, rol/sección, alcance incluido y excluido.

## Estado y aprobación

Propuesta / aprobada / en ejecución / verificada, fecha y referencia a la decisión. Distinguir diseño, implementación y publicación/despliegue. Pendientes explícitos.

## Reglas y permisos

Quién puede crear, consultar, modificar y eliminar. Propiedad/membresía requeridas, validaciones, excepciones e historia que debe conservarse.

## Recorrido UX/UI

Entrada → acciones → confirmación → resultado. Carga, vacío, error/reintento, conflicto, permisos, cambios sin guardar y feedback. Enlaces a dirección visual, componentes y comprobaciones responsive/accesibilidad.

## Contratos, datos y operación

Entradas/salidas/errores, efectos, atomicidad e idempotencia. Entidades/relaciones/migración/conservación afectadas. Dependencias, flags y nombres de configuración, sin valores privados. Enlazar contratos/guías en vez de copiarlos.

## Criterios de aceptación

| Condición | Acción | Resultado observable | Evidencia esperada |
|---|---|---|---|
| Contexto y permisos iniciales | Operación de la persona | Comportamiento y estado persistido/visible | Prueba o comprobación apropiada |

Incluir bordes y errores relevantes; seleccionar pruebas proporcionales, sin repetir mecánicamente la implementación.

## Referencias y entrega

Tarea TTP si corresponde, decisiones, guía/datos/diseño afectados, verificación y limitaciones. Estado local/integrado/publicado/desplegado con evidencia separada. Primer paso pendiente para retomar.

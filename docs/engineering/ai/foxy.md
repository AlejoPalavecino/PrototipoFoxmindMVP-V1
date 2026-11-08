# Foxy: espacio privado y recursos revisados

Foxy exige docente verificado en el servidor. El estudiante recibe una denegación al abrir la ruta; sólo ve materiales que el docente haya publicado y su membresía autorice.

## Conversaciones y recursos

Elegir contexto general o aula propia, revisar fuentes y conversar. Herramientas de apuntes, esquema, actividad, planificación y rúbrica orientan el pedido. El contexto no significa enviar toda el aula al proveedor. La conversación y los recursos guardados son privados; se pueden recuperar por su listado.

Abrir recurso permite editar título/contenido. Preparar en Actividades crea un TP privado; todavía necesita revisión y asignación. No documentar ese traspaso como publicación automática o como creación arbitraria de cualquier tipo.

## Publicar material

Seleccionar aula, unidad/tema y título → preparar PDF o recurso visual → revisar disponibilidad/vista previa → Revisar publicación → confirmar que se revisó → Publicar en Biblioteca. Preparación y confirmación tienen revisiones e identidades distintas. Una vista previa privada no se vuelve accesible para estudiantes antes de publicar.

Texto, imágenes y esquemas usan colas, límites y configuración propios. La UI informa cola/proceso, disponibilidad, fallos y cupo insuficiente. Un reintento no debe duplicar turnos o publicaciones; respuesta tardía no sustituye cambios actuales.

Gestión/descartes respetan custodia e historia; no autorizan eliminar archivos compartidos del aula. Configuración, claves, consumo y presupuesto se mantienen en backend.

Fuentes: [unidad transaccional](../../../apps/api/src/foxy-ai/unit-of-work.ts), [publicación](../../../apps/api/src/foxy-ai/publication-service.ts), [UI](../../../apps/web/src/components/foxy-workspace.tsx), [modelo](../data-model.md).

[Prueba actual](../../verification/flows.md): chat/recurso de texto→PDF publicado, imagen sintética→Biblioteca y visible al estudiante; esquema sintético listo en otra cuenta docente; error de cuota en la primera. Sin proveedor real, sin afirmar publicación del esquema o traspaso a actividad ensayados.

# Frontend y composición visual

Next Pages Router compone pantallas de cuenta y los módulos de aulas, Agenda y Foxy. Los proxies /api/v1 limitan destino/método/payload y mantienen comunicación same-origin con Nest. El backend conserva autorización y publicación.

Brújula es la interfaz actual: Lexend, sidebar escritorio y menú compacto por debajo de 1024 px. Los recursos de producción viven en apps/web/public; los componentes/estilos compartidos en apps/shared-ui. Nombres de clases fm3d/p5 y recursos de familias anteriores aún usados no son documentación obsoleta ni autorización de borrarlos.

El [diseño UX/UI](../../design/README.md) es la referencia vigente, con [capturas de la aplicación](../../design/current/README.md). No se usa un HTML de demostración antiguo como fuente funcional o visual que prevalezca sobre esta base.

Al cambiar una pantalla, revisar roles, carga/vacío/error, confirmación, foco/teclado, mobile/tablet/desktop, contraste y movimiento reducido. La evidencia tiene alcance concreto: una captura no demuestra transacción o persistencia.

Fuentes: [páginas](../../../apps/web/pages/), [controles](../../../apps/shared-ui/brujula-controls.css), [navegación](../../../apps/classrooms-ui/ClassroomNavigation.tsx). [Política documental](../../documentation-policy.md).

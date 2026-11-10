# Frontend y composición visual

Next Pages Router compone pantallas de cuenta y los módulos de aulas, Agenda y Foxy. Los proxies /api/v1 limitan destino/método/payload y mantienen comunicación same-origin con Nest. El backend conserva autorización y publicación.

Durante la [migración aprobada](../architecture-migration.md), los destinos y continuaciones globales viven en `apps/web/src/application/navigation/destinations.ts`. No usar `src/app`: Next lo interpreta como App Router y el build rechaza su combinación con `pages` en la raíz actual. `classroom-client.ts` conserva reexports de compatibilidad hasta retirar sus consumidores anteriores.

Notice/Dialog pertenecen a `apps/shared-ui/feedback.tsx`, reutilizado por Agenda, Foxy, Estudio y las pantallas web. `classrooms-ui/components.tsx` mantiene un puente para Aulas y sus elementos específicos de portada. El marcado, manejo de foco y estilos existentes se conservan; shared no debe importar una feature. Las features nuevas exponen `index.ts` y no se importan sus archivos internos desde otras superficies.

El piloto Agenda concentra UI, estado y API pura en `apps/web/src/features/agenda/{ui,model,api}`, con exports explícitos en `index.ts`. `screens/agenda-screen.tsx` compone cuenta y navegación; `application/agenda-client.ts` adapta el caller autenticado y `application/server/agenda-proxy.ts` conserva el transporte Node fuera del navegador. Las ubicaciones anteriores son reexports temporales de una sola implementación. El catálogo de zonas compartido está en `apps/shared-ui/time-zones.ts`.

Brújula es la interfaz actual: Lexend, sidebar escritorio y menú compacto por debajo de 1024 px. Los recursos de producción viven en apps/web/public; los componentes/estilos compartidos en apps/shared-ui. Nombres de clases fm3d/p5 y recursos de familias anteriores aún usados no son documentación obsoleta ni autorización de borrarlos.

El [diseño UX/UI](../../design/README.md) es la referencia vigente, con [capturas de la aplicación](../../design/current/README.md). No se usa un HTML de demostración antiguo como fuente funcional o visual que prevalezca sobre esta base.

Al cambiar una pantalla, revisar roles, carga/vacío/error, confirmación, foco/teclado, mobile/tablet/desktop, contraste y movimiento reducido. La evidencia tiene alcance concreto: una captura no demuestra transacción o persistencia.

Fuentes: [páginas](../../../apps/web/pages/), [controles](../../../apps/shared-ui/brujula-controls.css), [navegación](../../../apps/classrooms-ui/ClassroomNavigation.tsx). [Política documental](../../documentation-policy.md).

Identidad está agrupada en `features/identity/{api,model,ui}`: `index.ts` expone componentes y contratos; `api.ts` es la entrada pura para adaptadores cliente que no deben cargar UI. `screens/identity-screen.tsx` coordina sesión, efectos y navegación de los flujos existentes. `application/navigation/account-navbar.tsx` compone cuenta, búsqueda, aulas y notificaciones; su ubicación no convierte esas capacidades en reglas de identidad.

`application/application-shell.tsx` conserva tema/foco/cleanup, sin providers nuevos. `_app` mantiene CSS y captura inicial de documento Foxy; `_document` conserva orden del script estático de prueba mediante `application/server/token-capture.ts`. Proxy y SSR privado pertenecen a `application/server/identity-proxy.ts` y `account-page.ts`. Button/Input/Label y `class-names.ts` son genéricos en shared. Puentes legacy conservan consumidores aún no migrados. [Evidencia](../../work-log/2026-11-10-root-identity-frontend.md).

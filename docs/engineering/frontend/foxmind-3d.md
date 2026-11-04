# FoxMind 3D — implementación local

La migración incorpora los recursos aprobados y el **Foxy original ZorroH** en la aplicación existente. Inicio, Mis aulas, aula/Plan, Agenda, Perfil y Configuración comparten el nuevo shell, superficies claras y controles accesibles. Los formularios de acceso, creación de aulas, biblioteca, Muro, autoría/IA, entrega y corrección conservan sus operaciones reales y reciben la misma presentación. No hay cambios de esquema ni migración de datos.

[Evidencia visual real](../../work-log/evidence/2026-10-25-foxmind-3d/README.md) · [82 recorridos y nivel de evidencia](../../foxmind-3d-verification.md) · [contrato de implementación](../../../odd/tasks/foxmind-3d-migration.md) · [registro coordinador](../../work-log/2026-10-25-root-visual-migration.md).

## Navegación privada común

Todas las pantallas privadas que usan `AppNavbar` comparten la navegación de Inicio por defecto: notificaciones en la barra lateral (o dentro del menú móvil), Configuración y un desplegable bajo el nombre con perfil/cierre de sesión. No se agregan campanas, ubicación ni avatar en una barra superior por pantalla. Las pantallas futuras reutilizan el mismo componente y los destinos compartidos; no necesitan activar un estilo de Inicio. El asistente de creación conserva su navegación restringida.

El diálogo de notificaciones conserva filtros, paginación y destinos autorizados. Su presentación usa `apps/shared-ui/notifications.css`, separada de los controles de cuenta. Los estilos de navegación deben limitarse a sus controles directos para no cambiar el contraste de los botones del diálogo anidado. El banner de bienvenida mantiene el arte original sin filtros ni máscara; el contraste se obtiene aumentando la opacidad únicamente de la tarjeta del texto.

## Cómo funciona Inicio

El servidor deriva `study`, `teach` o `none` de las relaciones activas por aula; cada cuenta tiene además un rol global exclusivo elegido al registrarse. Las aulas archivadas, invitaciones y borradores se muestran como contextos separados.

- `GET /api/v1/home?timeZone=<IANA>` reúne participación y siete módulos autorizados: pendientes, revisión, devoluciones, miniagenda, consultas, material reciente y aulas.
- `GET /api/v1/home/modules/<module>?timeZone=<IANA>&cursor=<opaque>` reintenta o amplía un módulo sin rehacer listas de todas las aulas en el navegador.
- Se distinguen carga, error, vacío y no aplicable. Un fallo de identidad limpia datos; los errores parciales no se presentan como estar al día. El cliente cancela respuestas de otra cuenta y refresca al recuperar foco si transcurrieron60segundos, sin polling continuo.
- Las colas iniciales muestran hasta cinco filas y la miniagenda tres eventos; páginas con cursor firmado ligado a cuenta, módulo y zona. Las acciones abren los recursos existentes y vuelven a validar permiso en sus endpoints.
- Correcciones sin nota siguen pendientes; cero es una nota válida. Un resultado privado nunca aparece como devolución publicada. Se conserva la primera entrega confirmada para puntualidad y el máximo de plazo general/individual.
- La miniagenda combina eventos privados y plazos, preserva días completos y resuelve instantes/fechas de zona antes de ordenar. Hasta201padres candidatos permiten detectar el exceso de200 antes de expandir series; ese caso falla solo en el módulo de Agenda.

No se añadió un buscador global ficticio. La búsqueda real está en Mis aulas, junto a los filtros Todas/Donde estudio/Donde enseño y sus conteos. La entrada ordinaria al aula es Plan; actividad, resultado, material o hilo dirigidos conservan su destino.

## Recursos y puntos de entrada

| Superficie | Fuente |
|---|---|
| Contratos/portadas | `src/core/domain/home*.ts`, `classroom-cover.ts`, `activity-reception.ts` |
| Agregado autorizado | `apps/api/src/home/` |
| Shell/tokens/arte | `apps/shared-ui/foxmind-3d*.css`, `AppNavbar.tsx`, `Foxmind*.tsx` |
| Aula e Inicio | `apps/classrooms-ui/`, sin duplicar hooks académicos |
| Cuenta y Agenda | `apps/web/src/components/account-*.tsx`, `apps/agenda-ui/` |
| Recursos servidos | `apps/web/public/foxmind-3d/`:100assets,51WebP; no masters ni referencias privadas |

Las portadas nuevas son literature/math/biology/society/science/creative/general. Las tres claves antiguas explore/create/discover siguen siendo válidas y se adaptan al presentar; no se reescriben registros. La selección persistida no se infiere del texto de materia. Los SVG de marca conservan el original embebido y el nombre en trazados: no se los presenta como vectores puros.

La entrada visual dura160ms, con opacidad y desplazamiento máximo4px, sin animar dimensiones. Se desactiva con movimiento reducido. Esta hoja L1 se comprobó por sintaxis/AST y build después del juicio principal; no se atribuye falsamente al árbol auditado ni a capturas anteriores.

## Comprobaciones y continuidad

API y Next compilan dentro de los presupuestos existentes30s/180s. El cierre observado tiene122pruebas API históricas aprobadas y180comprobaciones nuevas/afectadas:176PASS,0FAIL y4omisos condicionales históricos. Las regresiones adicionales de los cinco hallazgos del juicio pasan en PostgreSQL descartable. No se necesitan servicios retenidos, configuración privada ni Google para estas pruebas.

La revisión dual terminó aprobada sobre el árbol9ad34da620d1336700a88dccf5fabeb78f3689d9 tras dos rondas acotadas; [ledger completo](../../work-log/2026-10-25-root-visual-judgment.md). La entrega compone ese árbol con la hoja decorativa L1 identificada, documentación y evidencia. La aceptación local no certifica métricas LCP/INP, zoom nativo200%, Safari o dispositivos físicos; los límites y fallos originales siguen explícitos en la evidencia. Los PDF son exportaciones de páginas reales con media screen, no screenshots de `Page.captureScreenshot`.

Los estilos anteriores permanecen conservados. Un rollback de presentación debe mantener los lectores/validadores de las diez portadas y los contratos/datos; retirar entregas, notas, aulas o tablas no es un rollback visual. La cadena local de commits y sus límites se registra al cerrar la entrega. Publicación remota y despliegue requieren su propia autorización.

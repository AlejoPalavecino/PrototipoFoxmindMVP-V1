# ARQ-07 — contratos y estado de generación de actividades

- Agent / role: /root, coordinación e implementación.
- Session or task ID: no disponible.
- Date: 2026-11-02.
- Branch / worktree: main, C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind.
- Starting commit: add38ec16a6f03e4e4332288b198036161e4cf58.
- Phase and detailed task/spec links: [ARQ-07](../../odd/tasks/architecture-consolidation.md#arq-07--consolidar-contratos-y-frontend), [diseño](../../odd/tasks/architecture-consolidation-arq03-design.md).
- Status: completed.

## Request and scope

«Bien avanza entonces con ARQ-07». Corte sobre generación de actividades, afectada por ARQ-06, y la vida del cliente de aulas que consume sus contratos. Persistencia, idempotencia y autorización a cargo del servidor. Destinos existentes en URL y borradores de interacción en el componente. Se preserva el trabajo previo en el checkout.

## Work performed

Reconciliados Git, diseño y contrato. Detectada duplicación del esquema de regeneración y falta de cancelación de respuestas de mutación al cerrar o cambiar de contexto.

- Contrato de generación. `src/core/domain/activity-generation-request.ts` define los comandos de inicio, regeneración y aplicación consumidos por API y BFF. El BFF reenvía el JSON original. La API conserva el hash del input crudo para regeneración y el normalizado para inicio. Los DTO compartidos distinguen fecha de dominio de su representación JSON y definen catálogo y resultado aplicado. La autorización, validación de propuesta contra el trabajo y los estados persistidos se resuelven en API.
- Estado del cliente. El aula y la actividad enlazables se resuelven desde los destinos URL existentes y se revalidan con el servidor. El asistente guarda formulario, selección de propuesta y operación activa en el componente. La lista de trabajos y el borrador aplicado pertenecen al servidor. Cancelar una petición invalida su resultado local, con idempotencia de servidor para operaciones ya recibidas.
- Sesión y concurrencia. El hook descarta acciones y polling anteriores, propaga abort a cliente y evita abrir el borrador si cambió el contexto. La pantalla invalida comprobaciones de sesión anteriores al cerrar sesión o recibir una denegación. El cliente evita despachar tras CSRF tardío y evita redirigir por errores de una petición cancelada. Se conservaron rutas, roles, navegación y estructura visual.
- Navegación. La revisión reprodujo que quitar el destino podía dejar el aula visible en el mismo montaje. El límite ahora usa usuario y URL de destino. Volver a Mis Aulas desde un enlace actualiza la URL y la autorización del mismo enlace se vuelve a consultar para otra identidad. Se cancelan las comprobaciones abandonadas, también durante CSRF. El catálogo inicial de generación tiene control separado para no sobrescribir un refresco explícito más reciente.

## Verification

- RED de aplicación tardía: 1 PASS y 1 FAIL, con reapertura del borrador después del cierre. RED de CSRF tardío: 1 FAIL con mutación que aún se despachaba. Ambas regresiones pasaron después del cambio.
- Selección inicial de contratos, proxy, polling, UI, clientes aula/P3/Agenda y contratos compartidos: 41 PASS, 0 FAIL. Incluye sesión tardía y formato exacto de regeneración para replay.
- Compilación API exit 0. El primer chequeo web detectó que la apertura de un borrador ya aplicado aún usaba la firma anterior. Se conectó a la misma operación cancelable. La compilación y las comprobaciones finales de navegador están en curso.
- Host real, ciclo de vida e idempotencia con PostgreSQL de fixture y proveedor sintético: `tests/activity-ai-host.test.mjs`, `tests/activity-ai-lifecycle.test.mjs`, `tests/activity-unknown-start.test.mjs` con preload del build. 25 PASS, 0 FAIL, 0 SKIP. Incluye 401/403, Origin/CSRF, 202/200 e intento incierto que requiere confirmación de posible cargo.
- El recorrido largo `tests/p7-authoring-integration.test.mjs` se frenó en el alta, esperando el mensaje de verificación, antes del escenario de navegación. El runner informó cero fallas de limpieza. La comprobación focal usa un usuario y una sesión sembrados en la base desechable y deja intacto el caso largo.
- Selección final pura: 43 PASS, 0 FAIL, 0 SKIP. `npm run lint:boundaries` exit 0 con 146 entradas activas. `npm run web:build` pasó tipos y build de producción. Se restituyó la variante preexistente de `next-env.d.ts` con imports de `.next/dev/types` desde la copia de recuperación del repositorio.
- [Revisión independiente](2026-11-02-arq07_review-independent.md): 34/34 pruebas puras y verificación de cambio de key. Coinciden los 11 hashes informados.
- Primer intento del escenario focal de navegador: abrió el enlace, reabrió la vista previa al recargar y comprobó 320 px y `aria-current`. El paso siguiente agotó la espera de URL porque la prueba intentaba activar el botón exterior mientras el diálogo modal estaba abierto. Se ajustó el recorrido para cerrar con Escape antes de probar el botón con teclado. Cero fallas de limpieza.
- Navegador final: `node --test --test-concurrency=1 --test-name-pattern 'ARQ-07' tests/p7-authoring-integration.test.mjs`, 1 PASS, 0 FAIL, 0 SKIP. Next de producción, host real, sesión persistida sintética y servicios propios. Enlace directo, recarga, Escape, volver por teclado, Atrás y Adelante comprobaron tanto la URL como presencia o ausencia de vista previa. Ancho de 320 px sin desborde, Actividades con `aria-current=page` y cero errores de página. El runner informó cero fallas de limpieza de procesos y recursos.
- `git diff --check`: exit 0 con avisos LF/CRLF. HEAD coincide con el inicial. Cero contenedores de fixtures con las etiquetas P4, Mailpit de prueba o IA. Validador focal: 4 documentos y 280 enlaces sin problemas. `npm run docs:check`: 138 archivos y 1711 enlaces sin problemas.

## Commits and outcomes

ARQ-07 completada localmente. Plan y roadmap actualizados. Se usaron migraciones vigentes en bases de prueba propias. Sin cambios de esquema, datos retenidos, commits ni publicación.

## Handoff

ARQ-08 queda pendiente de asignación. El siguiente corte parte del comportamiento vigente de workers y del contrato de idempotencia validado en ARQ-07.

# Salida voluntaria de aulas archivadas — implementación

- Agent / role: /root, coordinación.
- Session or task ID: no disponible.
- Date: 2026-11-02.
- Branch / worktree: main, ProtipoFoxMind.
- Starting commit: add38ec16a6f03e4e4332288b198036161e4cf58; 149 entradas previas.
- Phase and detailed task/spec links: [Alcance y aceptación](../../odd/tasks/archived-classroom-voluntary-leave.md).
- Status: completed.

## Request and scope

Implementar la salida voluntaria aprobada, verificar el recorrido y registrar el cierre. Usar solo recursos de prueba propios.

## Work performed

Reconciliados el contrato y el estado inicial del repositorio. La baja propia conserva la transacción de escritura y el bloqueo del aula, con una excepción de archivo limitada a esa operación. La interfaz reutiliza el diálogo e incluye confirmación, espera, recuperación del error y aviso al volver a Mis aulas. Se verificó el guard de desmontaje y se atendieron los hallazgos de la [revisión independiente](2026-11-02-archived_leave_review-independent.md).

## Verification

- RED con PostgreSQL propio: dos solicitudes de salida de la estudiante en aula archivada daban cero éxitos (se esperaba uno). Las pruebas dependientes de la transición fallaron en cascada.
- `node scripts/build-api.mjs`: Prisma y TypeScript exit 0. `node --import ./scripts/register-api-test-build.mjs --test --test-concurrency=1 tests/p5-enrollment.test.mjs tests/p7-practical.test.mjs tests/p8-publication.test.mjs`: 41 PASS. Repetición final de P5: 15 PASS, incluye rollback al fallar el registro del evento y un solo cierre/evento bajo concurrencia.
- `npm run lint:boundaries`: 146 excepciones congeladas, exit 0. Pruebas focales `node --test tests/foxmind-3d-flows.test.mjs tests/folder-platform.test.mjs`: 19 PASS. Inventario y rutas 443/53/23.
- Chromium: la primera pasada detectó un anuncio duplicado. Se corrigió. La política de Agenda para enlaces directos a archivadas queda fuera de alcance; el recorrido final entra desde Mis aulas.
- `npm run web:build` final exit 0. `node --test tests/p8-publication-tp-integration.test.mjs` final exit 0, 3 PASS. Chromium a 375 px con Nest, Next, PostgreSQL, almacenamiento, escáner y correo propios. Verificó protección CSRF, cancelación y foco, confirmación por teclado, espera y reintento tras 503 simulado, aviso y salida, acceso denegado por API a aula, historial, resultado, notificación y adjunto privado, y conservación del historial docente. Tras reactivar se rechazó el código previo y una invitación nueva aceptada restauró el resultado publicado y el archivo original sin duplicar entregas. La simulación de 503 verifica una respuesta fallida previa a confirmar. El caso de respuesta perdida después de confirmar se revisó en fuente.
- Cierre del fixture final: cero errores, sin contenedores, volúmenes ni redes con su etiqueta de propiedad. Restaurado `apps/web/next-env.d.ts` al contenido previo al build. No se repitió la suite completa.
- SHA-256 focal `c0c264671e39ec33c4df4d1667d4b9e140344e26d9717ca9040e29b3fe034c94`. Manifiesto JSON de pares ruta/huella en orden: operación de membresía, ClassroomView, ClassroomDialogs, Classrooms, classrooms-screen, P5 matrícula, P8 publicación y foxmind-3d-flows.

## Commits and outcomes

Entrega local verificada. Sin commits, publicación ni despliegue.

## Handoff

PD-05 y PD-17 generales conservan su alcance pendiente. La siguiente entrega de producto requiere asignación propia.

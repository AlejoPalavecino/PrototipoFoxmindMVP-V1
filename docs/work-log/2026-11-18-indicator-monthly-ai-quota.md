# Indicador de cuota mensual de IA

- Agentes `/root/indicator` y `/root/indicator_finish`. ID de sesión no expuesto.
- 2026-11-18. Checkout principal de `main` en `d02f375c`, con autores concurrentes sobre otras superficies.
- Alcance autorizado por el coordinador: consulta del saldo de la cuenta autenticada, actualización conectada y detalle accesible para ambos roles. Tablero `odd/tasks/monthly-ai-quota.md`.
- Estado: verificado con transporte y componentes reales. El navegador usó una fuente de saldos sintética. La integración usó Nest, sesiones sintéticas persistidas, Prisma y un PostgreSQL efímero.

## Cambios

- Incorporé el saldo de la sesión verificada en `GET /api/v1/ai-quota` y su variante SSE. Ambos se sirven por el proxy web del mismo origen. La cuenta se deriva de la cookie autenticada y el servidor valida la sesión en cada muestra. El cliente descarta el saldo y deja de pedirlo si el identificador recibido cambia de cuenta.
- El transporte compara período de Buenos Aires y versión del ledger. El cambio de mes se publica aunque se conserve la última versión. Cada 900 ms por pestaña, PostgreSQL vuelve a comprobar sesión y movimiento o vencimiento. Las muestras sin cambios no adquieren el bloqueo del ledger ni recalculan subtotales. La consulta de respaldo usa JSON cada cinco segundos mientras el canal está caído.
- El indicador se monta en `AccountNavbar` para Agenda, archivos, notificaciones, perfil, configuración, Foxy y Mi Estudio. `ClassroomsApp` cubre Inicio, Mis aulas y sus vistas de aula. Se muestran porcentaje, detalle USD, renovación, desglose y conexión. En chat compacto, la cabecera reserva 44 px y ajusta la altura disponible del chat.

## Verificación

- `node --experimental-transform-types --test tests/monthly-ai-quota-transport.test.mjs tests/monthly-ai-quota-client.test.mjs` pasó 4 pruebas. La regresión de renovación con la misma versión falló antes de la corrección y pasó después. Se cubrieron ausencia de sesión, correo sin verificar, intento de seleccionar otra cuenta, otro origen, dos streams simultáneos, reconexión, revocación, respaldo sin EventSource y cambio de cuenta.
- `node node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json` y `git diff --check` pasaron.
- Ego Lite, espacio 29, con el componente real, navbar, estilos, ruta Next y proxy SSE sobre un servicio sintético local. Las dos pestañas docentes recibieron la reserva en 858 ms. Ante la caída simulada ambas marcaron el estado, obtuvieron un importe nuevo por JSON y volvieron al canal SSE. Cambiar a estudiante en una pestaña forzó a la anterior a quitar el saldo sin mostrar datos de la cuenta nueva.
- Docente y estudiante a 1536 px y 320 px. Comprobé los importes USD 5 y USD 3, los estados legibles, los controles de al menos 44 px, cierre y retorno del foco por puntero y Escape, y el header y el área del chat móvil sin desbordar. Las capturas y scripts quedaron en `.test-artifacts/monthly-ai-quota-browser/`.
- Next mostró una advertencia de listeners con `pipeline`. Después de cambiar a `IncomingMessage.pipe` con cancelación al cerrar y tratamiento de errores, `node .test-artifacts/monthly-ai-quota-browser/proxy-regression.mjs` comprobó dos conexiones SSE y reconexión contra Next sin volver a emitir esa advertencia.
- `node --test tests/monthly-ai-quota-database.test.mjs` pasó el caso integrado en 8,6 s. El GET comprobó rechazo sin sesión y al intentar seleccionar otra cuenta, privacidad y saldo docente inicial. Dos SSE docentes reflejaron la reserva real de USD 0,25 y su liquidación en USD 0,16. Un tercer SSE y el GET de estudiante conservaron su saldo y publicaron sólo la reserva propia. Revocar la sesión docente cerró sus dos streams y conservó el acceso de estudiante.

## Desglose por tipo de herramienta

- Las nuevas reservas de texto de Foxy se clasifican por propósito persistido. Mi Estudio usa la acción ya validada por el motor, separada del prompt, y conserva el grupo propio para repaso de devoluciones. Las reservas anteriores mantienen sus grupos históricos.
- El detalle cuenta operaciones con cargo y con reserva pendiente por herramienta. El recuento proviene del ledger y puede incluir operaciones que no terminaron en un recurso guardado. Las reservas pendientes también incluyen casos en revisión.
- Pasaron 23 pruebas focalizadas del adaptador y esquema de Mi Estudio, cliente y transporte. La integración de Foxy pasó 15 pruebas con PostgreSQL efímero, incluidas las reservas por chat, resumen y rúbrica y los rechazos por alcance diario. Pasaron `npm.cmd run api:build` y TypeScript web.
- `node --test tests/monthly-ai-quota-database.test.mjs` volvió a pasar con los recuentos, en 7,1 s. El SSE cambia de una operación con reserva a una con cargo al liquidar y conserva el aislamiento entre cuentas.
- Ego Lite volvió a mostrar el detalle a 320 px con resúmenes e imágenes de Foxy y esquemas e imágenes de Mi Estudio. Verifiqué importes y recuentos legibles, con el texto de cada recuento en una línea y sin desbordes horizontales. Capturas `usage-teacher.png` y `usage-student.png` en el directorio de prueba.

## Límites

La prueba visual ejercitó la cabecera y una representación de la estructura de chat con sus estilos reales. La cobertura de las otras pantallas viene de la composición de código. No se midió capacidad bajo carga concurrente ni latencia de infraestructura de producción. Los recursos de prueba locales se cerraron.

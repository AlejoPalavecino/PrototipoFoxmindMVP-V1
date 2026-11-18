# Cuota mensual de IA

Coordinación raíz, 18 de noviembre de 2026, checkout principal en main. Estado inicial de `git status -sb` limpio. El usuario autorizó el plan y la implementación local.

El [tablero](../../odd/tasks/monthly-ai-quota.md) define la aceptación. Coordinación integra manejo de errores, conciliación, documentación y revisión del candidato. Las pruebas usan recursos sintéticos.

## Implementación

Se conservaron los límites diarios existentes y se incorporó una cuota mensual por rol, con alta completa y renovación al inicio del mes de Buenos Aires. Cada reserva fija período y tarifas. La expiración de 24 horas libera el saldo de la cuenta y registra el posible costo de plataforma. Un cargo superior a la reserva también distingue la parte de FoxMind. La reserva y sus movimientos se escriben en la misma transacción. El importe individual se calcula desde las reservas por operación y se comprueba reconstruyéndolo desde los movimientos.

La cabecera usa SSE con una sonda PostgreSQL cada 900 ms mientras hay conexión y consulta JSON como respaldo. Se revalida la sesión y el destinatario. Mi Estudio incorpora imágenes privadas servidas por carpeta y creación, con inspección y escaneo. El [registro del indicador](2026-11-18-indicator-monthly-ai-quota.md), el [ensayo de imágenes](2026-11-18-student-study-images.md) y el [registro contable](2026-11-18-ledger-presupuesto-ia.md) detallan sus verificaciones.

## Fallos encontrados y corregidos

- El error mensual original terminaba en un mensaje genérico. Se agregó propagación del motivo y se conservó la posibilidad de reintentar.
- La revisión independiente reprodujo un interbloqueo PostgreSQL 40P01 al completar un visual y un turno de texto Foxy para el mismo dueño. El texto ahora adquiere primero el mismo bloqueo de admisión que los visuales. La prueba concurrente verifica que ambas transacciones terminan; la prueba histórica de recuperación detiene la ejecución antes de ese bloqueo.
- Se preservan contadores conocidos aunque falle una validación de contenido o venza el permiso para publicar. Un worker puede liquidar el recibo sin aplicar una respuesta tardía al contenido privado.
- Los ensayos de integración detectaron fixtures que devolvían el resultado antiguo de admisión y consumían código compilado anterior al cambio. Se actualizaron los dobles pertinentes y se repitió el build. El wrapper de build con límite de 30 segundos venció en una corrida concurrente; la compilación posterior con un plazo ampliado pasó.
- La revisión independiente aplicó las 68 migraciones en PostgreSQL 16.10 descartable y comprobó reservas concurrentes, datos de usuarios separados, importes de plataforma, rechazo visual sin despacho y auditoría interna con discrepancia inducida. Probó duplicación de recibo, conflicto de referencia con rollback y conciliación después de expiración.

## Operación y límite del ensayo

La comparación por proveedor/modelo es de sólo lectura. Un comprobante externo individual puede aplicarse explícitamente y queda asociado al trabajo. Se verificaron los contratos con datos sintéticos. Las mediciones de navegador y las de base de datos se hicieron en sus entornos de prueba respectivos. La activación en una instalación con datos retenidos y la comparación con una factura real son operaciones posteriores.

## Cierre local

- `npm run api:build` y `npm run web:build` pasaron en el candidato integrado. Se ejecutaron los grupos de `scripts/run-ci-suite.mjs`: pure 955 pruebas, transport 92 y study 109; cero fallidas y cero omitidas dentro de esos grupos. Study requirió acceso al Docker local para las bases descartables. Los grupos tienen cobertura que se superpone.
- Pasaron los límites de arquitectura y frontend, el control de documentación (211 archivos y 1145 enlaces), el inventario de pruebas (698 entradas, 23 rutas) y `git diff --check`. El inventario comprueba clasificación; se ejecutaron los grupos y casos identificados en este registro y en el tablero.
- El tablero comprobó cuatro tareas con evidencia y huellas del candidato. Trabajo en el checkout local de main, sin commit, publicación ni despliegue. El primer paso operativo para usarlo en una instalación existente es el corte y migración descritos en la [guía de IA](../engineering/ai/README.md).

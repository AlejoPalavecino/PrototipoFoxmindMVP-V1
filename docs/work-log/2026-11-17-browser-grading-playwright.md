# Verificación P8 en navegador

- Agente `browser_grading`, corrección de pruebas y verificación. Rama `feature/latencia-ia`, base `8299fcbc`, checkout principal con trabajo concurrente.
- Alcance autorizado por el coordinador: corregir los fallos de las pruebas Playwright P8 y conservar sus comprobaciones de contrato, persistencia y permisos.
- En la matriz previa, cinco archivos P8 fallaron al esperar `Entrega confirmada.` pese a registrar el envío HTTP exitoso. La interfaz vigente presenta esa confirmación mediante la región `Comprobante de entrega`, como ya comprueban las otras pruebas P8 de calificación y publicación.
- Se actualizaron los pasos visibles del comprobante, la lista de entregas, las secciones Rúbrica y nota y Devolución, el descarte de cambios y la bandeja de notificaciones. La apertura de la devolución conserva la observación del intento autorizado y, ante un 429 en el resultado, recupera sólo la lectura desde el control visible.
- La primera ejecución aislada confirmó la recarga privada del TP y detectó dos selectores adicionales del recorrido, incluido el control de salida de un aula archivada, además de fallos intermitentes al abrir notificaciones después de un ingreso redundante al aula. Los reintentos confirmaron la publicación de TP, las rectificaciones de tres tipos y el caso de evaluación con nota cero.
- La defensa de límites devolvió 429 en las dos lecturas posteriores a un guardado ya confirmado. El intento de salir y volver al aula agotó nuevamente la admisión. La recuperación ajustada usa las lecturas que ya dispara `Actualizar aula` y comprueba la corrección exacta mediante `Recargar corrección`.
- La recarga durante una edición exige el diálogo y la confirmación de descarte, también si el primer GET devuelve 429. Otra corrida observó un 429 de Actividades después de publicar y un error de transporte en el primer GET de persistencia tras reiniciar datos. Los casos registran recuperaciones acotadas de lectura y conservan las exigencias sobre estado final, permisos y auditoría.
- `node --test tests/p8-ui-contract-helpers.test.mjs tests/p8-integration-controls.test.mjs` pasó las 27 comprobaciones. Los logs Playwright quedan en `.test-artifacts/qa-latencia-completa/p8-browser*`. Las pruebas usan Chromium y recursos PostgreSQL, S3, escáner y correo descartables. Algunas aperturas de fixtures del reintento encontraron `P4 Docker network unavailable`; una prueba posterior pudo crear y retirar su propia red.

## Resultado

Los cinco archivos afectados pasan 17 pruebas sin omisiones. Se ejecutó cada archivo con Node Test Runner, `--import ./scripts/register-api-test-build.mjs`, `--test-reporter=tap`, `--test-concurrency=1` y el entorno limpio del runner de suite completa.

| Archivo | Pruebas aprobadas | Log bajo `.test-artifacts/qa-latencia-completa/` |
|---|---:|---|
| `p8-corrections-integration.test.mjs` | 5 | `p8-browser-verified/p8-corrections.log` |
| `p8-corrections-e-final-integration.test.mjs` | 4 | `p8-browser-verified/p8-corrections-e-final.log` |
| `p8-corrections-remaining-integration.test.mjs` | 4 | `p8-browser-final-reads/p8-corrections-remaining-audit.log` |
| `p8-grading-reload-integration.test.mjs` | 1 | `p8-browser-final-pass/p8-grading-reload.log` |
| `p8-publication-tp-integration.test.mjs` | 3 | `p8-browser-final-reads/p8-publication-tp.log` |

La corrida definitiva de rectificación Q/E observó `Retry-After` de 41 segundos tras guardar y de 1 segundo tras publicar. Verificó la corrección de cero, el historial, la notificación, la persistencia y la revocación. La corrida definitiva de TP obtuvo las lecturas de persistencia al primer intento tras reiniciar. `npm run docs:check` y `git diff --check` completaron la verificación focalizada.

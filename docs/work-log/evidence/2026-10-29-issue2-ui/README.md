# Issue 2: comprobación visual sintética

- Agente: `/root/red`, verificación visual; sesión real no disponible. Fecha: 2026-10-29.
- Entorno: componentes reales en un fixture React/Vite con datos y puertos en memoria, sin backend, proveedores ni credenciales reales. `ego-browser skill` y Space 7 (`qa-issue2-grading-ai-20261029`), página p1.
- Revisión: nota y devolución editadas; con nota manual modificada apareció confirmación de reemplazo y aviso de que sigue privada. El recibo mostró POST de aplicación y posterior lectura, sin publicación. Descarte pidió confirmación y solo envió POST de descarte.
- Configuración: con IA disponible se activó el interruptor y el fixture recibió PATCH `aiGradingEnabled: true`. Con IA global no disponible se observó aviso y acción de desactivar. Rúbrica: edición produjo POST de actividad con el texto modificado.
- Estados: pendientes, en preparación, no disponible y desactualizada visibles sin botones de aplicar. Pantallas de revisión medidas a 1440, 390 y 320 px sin overflow horizontal; configuración y rúbrica medidas a 390 px sin overflow.
- Evidencia: `review-desktop.png`, `review-mobile.png`, `review-320.png`, `review-confirm-desktop.png`, `settings-mobile.png`, `settings-off-mobile.png`, `rubric-mobile.png`. La captura de confirmación usa el fixture previo a la última envoltura visual; el comportamiento fue observado en el componente real.
- Limitaciones: fixture aislado, no prueba autenticación, persistencia backend, publicación real, todos los estados de error ni dispositivos físicos. La primera acción tras cambiar viewport falló por referencia obsoleta y se recuperó con un snapshot nuevo. No se afirma aceptación visual completa de la aplicación.
- Limpieza: Space 7 finalizado con `keep: []`; servidor Vite sintético propio 53240 detenido tras verificar PID y línea de comando.

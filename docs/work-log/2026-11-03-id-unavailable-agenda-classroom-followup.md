# Agenda y destinos de aula — seguimiento de auditoría

- Agent / role: root, implementación
- Session or task ID: unavailable
- Date: 2026-11-03
- Branch: main
- Starting commit: 6f5fa6d
- Status: completed

Alcance: carga parcial de Agenda, agrupación del calendario mensual y navegación durable desde Inicio, notificaciones y códigos.


## Work performed
- Calendario y Próximas entregas consultan, muestran error y reintentan en forma independiente. Una denegación al abrir un plazo vuelve a validar ambas proyecciones.
- La vista mensual memoriza eventos agrupados por fecha visible y reutiliza un formateador de zona por agrupación. Conserva orden, límites exclusivos y fechas locales.
- Inicio mantiene el destino de aula y recurso en una URL validada. El panel de notificaciones conserva el ID y vuelve a resolver el recurso autorizado al recargar. Confirmar un código navega al aula mediante el historial.

## Verification
- RED: node --test --test-name-pattern 'Agenda isolates' tests/agenda-ui.test.mjs mostró falta de reintento por sección en ambas variantes. Se fijó UTC en la fixture para evitar que el montaje cambiara el rango de la prueba.
- GREEN: node --experimental-transform-types --disable-warning=ExperimentalWarning --test tests/agenda-ui.test.mjs tests/agenda-time.test.mjs tests/p5-web-client.test.mjs tests/agenda-client.test.mjs tests/agenda-event-form-result.test.mjs tests/agenda-reference-selection.test.mjs: 31/31.
- Medición local de clasificación en Node, tres muestras por variante: 50 plazos 103,74 a 0,36 ms; 200 plazos 354,26 a 0,51 ms. Las clasificaciones se comprobaron iguales. No incluye render ni interacción en navegador.
- Chromium con build de producción y API simulada: Inicio, notificación de Muro e inscripción por código conservaron URL, destino al recargar y retorno con Atrás. La inscripción se confirmó una sola vez. Los primeros intentos de la fixture de notificaciones/Muro fallaron por campos requeridos ausentes y por codificación de texto de la fixture; la última corrida pasó.
- npm run web:build, npm run lint:boundaries, npm run docs:check y git diff --check pasaron. Verificación focal, sin servidor académico real.

## Commits and outcomes
Cambio local sobre 6f5fa6d.

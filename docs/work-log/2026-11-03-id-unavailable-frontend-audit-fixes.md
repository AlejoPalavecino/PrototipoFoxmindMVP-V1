# Frontend — navegación, carga parcial, teclado y estilos

- Agent / role: root, implementación
- Session or task ID: unavailable
- Date: 2026-11-03
- Branch: main
- Starting commit: d28daea
- Status: completed

Alcance: resolver cuatro hallazgos confirmados de la auditoría frontend, con las rutas y el diseño existentes.


## Work performed
- Mis aulas abre tarjetas con el destino ya admitido /mis-aulas?aula=ID. La vista de aula comprueba el permiso usando el detalle autorizado, incluso para aulas archivadas. Los enlaces con actividad siguen usando la validación de Agenda.
- Aulas, borradores e invitaciones se publican por separado en el estado de la colección. Cada sección fallida tiene reintento propio; una respuesta vieja no sobreescribe un reintento más reciente.
- Agenda mensual usa un solo tab stop; flechas mueven el foco, Home/End recorren la semana y los botones nativos activan la selección.
- Los estilos de Agenda, Cuenta y Aulas/Inicio se mueven a módulos que conservan especificidad con :where. _app conserva bases compartidas. Se ajustaron las entradas de fixtures que montan componentes internos directamente.

## Verification
- npm run web:build pasó con TypeScript y Turbopack. El intento inicial con imports globales por componente fue rechazado por Pages Router; se reemplazó por módulos CSS.
- Node, con --experimental-transform-types, ejecutó agenda-client, folder-platform, foxmind-3d-flows-agenda, foxmind-3d-flows-collection, p5-web-client y platform-glass: 39/39. npm run lint:boundaries pasó con 129 excepciones y npm run docs:check pasó con 1726 enlaces.
- Chromium sobre Next de producción y API simulada verificó 503 parcial con reintento exclusivo, aula archivada con URL/recarga/Atrás, foco único y flechas/Enter/Tab en Agenda, 320 px sin desborde horizontal y CSS diferente para las tres familias. Una corrida previa se detuvo al encontrar el aviso de reintento faltante; se agregó el aviso. Otra prueba falló por responder un array donde la fixture debía devolver el objeto de actividades; la corrida final corrigió la fixture.
- git diff --check pasó. La comprobación visual fue focal en Chromium, con datos sintéticos y sin una matriz completa de navegadores, servidor real ni métricas de transferencia.

## Commits and outcomes
Cambio local sobre d28daea.

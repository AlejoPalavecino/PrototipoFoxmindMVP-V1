# Taller Cálido en Inicio
- Agent / role: root
- Session or task ID: unavailable
- Date: 2026-11-04
- Branch: main
- Starting commit: a3afdc7
- Status: completed
- Phase: [Tareas de Inicio](../../odd/tasks/home-by-role.md)

## Request and scope
Implementar el mockup Taller Cálido aprobado con saludo liquid glass para docentes y alumnos y verificar escritorio/celular. La publicación en Sites fue cancelada expresamente. Referencia local aprobada: foxmind-taller-calido-glass.html en el directorio de visualizaciones de este chat.

## Work performed
Inspección del Inicio, navegación, notificaciones, módulos y pruebas existentes. Árbol limpio al comenzar.

## Work performed
- Home y HomeFoxyNote usan la composición aprobada, con sugerencias que abren el destino autorizado exacto y fallback a Mis aulas. HomeModule presenta la semana actual calculada en la zona de la respuesta y conserva la ventana de eventos de 90 días.
- Se incorporó el panorama generado aprobado mediante tres WebP de 960, 1600 y 2172 px en apps/web/public/foxmind-3d/hero/welcome-warm-*.webp. El original se conserva en el directorio de imágenes generadas de Codex. Escena educativa 3D con objetos a ambos extremos, Foxy a la derecha y área legible para el saludo a la izquierda.
- Estilos de Inicio separados en home-warm.css, home-warm-widgets.css y home-warm-navigation.css. Vidrio con fallback, patrón común y colores suaves por acceso, ilustración de cuaderno en Foxy, aulas en filas compactas y tareas/devoluciones por rol.
- AppNavbar/ NavbarParts admiten la navegación específica de Inicio. Notificaciones se abren desde el menú móvil conservando su diálogo y foco. Escape actúa solo sobre el modal superior. El drawer se cierra al pasar a escritorio.
- Se actualizaron las expectativas históricas de grupos visuales, el helper de navegación de navegador y P9. La vista normal retira recursos y actualizar, y conserva reintentos globales y por módulo. El refresco de foco usa la política existente de 60 segundos.

## Verification
- RED observado antes de producción: tres fallos de nueva composición/nav en las pruebas focales. GREEN final con node --test tests/home-*.test.mjs tests/p9-home-client.test.mjs tests/entry-glass-client.test.mjs tests/folder-platform.test.mjs tests/foxmind-3d-regressions.test.mjs: 54 PASS, 0 FAIL, 0 SKIP. Incluye seis casos persistidos de regresión SQL. Log .test-artifacts/home-warm-focused-final.log.
- node --test tests/foxmind-3d-contracts.test.mjs: 8 PASS, 0 FAIL, 0 SKIP.
- npm run api:build, npm run web:build, tipos web y npm run lint:boundaries: exit 0. Límite AST con129excepciones históricas. git diff --check: exit 0.
- Navegador Edge/Chromium con fixture sintético de componentes: ambos roles a 320,390,768,1440 px. Panorama decodificado, vidrio activo, fuente Fredoka cargada, nombre largo a320, foco y cuatro accesos. Sin overflow; marco de texto y silueta de Foxy separados y dentro del banner. Capturas .test-artifacts/warm-app-{teacher,student}-{width}.png.
- La primera QA visual detectó desborde en768 por padding heredado de cabecera. Se corrigió y repitió. La primera captura con nombre largo se tomó durante la transición de router del fixture; se corrigió la espera al nombre final y pasó.
- Se reprodujo RED de Escape anidado con Notifications real y API sintética vacía, luego GREEN. .test-artifacts/home-warm-nested-qa.mjs comprueba cierre de un modal por Escape y restauración del foco de ambos niveles.
- P9 real con API, PostgreSQL, almacenamiento, escáner y correo capturado descartables. Comando node --test --test-isolation=none --test-concurrency=1 tests/p9-home-integration.test.mjs. Corrida final .test-artifacts/home-warm-p9-complete.log: exit0,13PASS,0FAIL,0SKIP en102110ms. El caso responsive cubre docente y alumno a320,375,1280 con datos reales y Escape en Notificaciones. Limpieza de procesos y recursos: cero errores.
- Historial P9 conservado: home-warm-p9.log terminó7PASS/2FAIL(incluido padre)/4SKIP por429 en recuperación de notificaciones. home-warm-p9-retry.log terminó8PASS/2FAIL/3SKIP por selector de dos nav al redimensionar. home-warm-p9-final.log terminó9PASS/2FAIL/2SKIP porque la sesión recibió429 antes de las listas. Se precisaron los selectores y reintentos acotados. La final respetó Retry-After=34s real. El refresco de foco usa reloj simulado solo en el navegador; los servicios y sus respuestas siguen siendo reales.
- Documentación: npm run docs:check,138archivos/1730enlaces,0problemas antes de los registros de cierre.

## Independent review
El agente /root/warm_home_review trabajó en solo lectura y devolvió evidencia atribuida. El coordinador incorporó las correcciones, escribió los registros y concilió P9. [Registro independiente de cierre](2026-11-04-home-warm-independent-review.md), veredicto VERIFIED y cero hallazgos abiertos.

## Commits and outcomes
Cambios locales sobre main a3afdc7. Implementación y verificación completadas. El repositorio conserva el diff para revisión.

## Handoff
Inicio Taller Cálido listo para revisión del usuario. Se completó el alcance local solicitado, sin publicación ni despliegue.

Memoria auxiliar Engram: el hook rechazó mem_save porque la sesión del host no está registrada. La continuidad queda en los registros y tareas del repositorio.

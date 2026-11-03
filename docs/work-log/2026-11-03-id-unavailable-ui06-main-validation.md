# Validación integral del rediseño en main

- Agent / role: root, coordinación y validación
- Session or task ID: unavailable
- Date: 2026-11-03
- Branch / worktree: main
- Starting commit: ecfe55c8ef191d5a53c4b6083a30d49e2176b42b
- Phase: [UI-06](../../odd/tasks/foxmind-escritorio-expresivo.md)
- Status: completed

## Request and scope
Recuperar la compilación API y la red Docker y verificar los recorridos del rediseño con recursos sintéticos propios.

## Verification
El primer fast agotó el prerrequisito de API. TypeScript API directo completó en 18,74 s y el segundo fast compiló la API dentro del presupuesto existente. La suite llegó a 655 PASS y un fallo reproducible en Activities por useId en el dispatcher de pruebas. Build web de producción aprobado. Creación y retiro de una red de prueba propia aprobados. PostgreSQL, almacenamiento y scanner listos en la integración. Agenda con base y sesión persistida: 14 PASS.

## Correcciones verificadas
- Activities: se quitó el identificador auxiliar de los filtros, conservando el estado accesible aria-pressed. RED de activity-curricular-context: 1 FAIL; GREEN: 2 PASS.
- Dos pruebas de Agenda llamaban al componente mensual como función, incompatible con el useMemo incorporado en 6414d2c. Se usa el harness de React existente y se conservan las aserciones. GREEN: 5 + 7 PASS.
- Build web de producción y lint de fronteras sobre los cambios locales: exit 0.

## Navegador y servicios aislados
- Las pruebas históricas P6 móvil y P9 Inicio/práctico alcanzaron el runtime Docker y luego fallaron en el registro por fixtures que no eligen el rol hoy obligatorio. P9 Inicio además describe cuentas de rol mixto, una regla histórica. Los archivos históricos se conservaron.
- Recorrido de verificación actual: alta docente y estudiante por correo capturado, CTA de Inicio por rol, creación con PDF validado, ingreso, notificación a Muro, reflujo 320/390/1280 y enlace al aula con permisos de alumno. PASS con cleanup de procesos y servicios 0. Evidencia local: .test-artifacts/ui06-main/current-journey.log y mobile-wall.png.
- P9 práctico en copia local adaptada exclusivamente para elegir roles y probar Revisar pendientes: 1 PASS. Entrega privada, comprobante, corrección 8,50, publicación, resultado y reinicio. Cleanup 0.
- Agenda con PostgreSQL, HTTP, sesión, CSRF y privacidad: 14 PASS. Foxy sintético con S3, ClamAV y publicación de imagen: 2 PASS. Capturas y flujos UI anteriores complementan esta evidencia.

## Cierre
- Regresión rápida completa: 264 archivos de la ruta fast, 1456 PASS, 0 FAIL y 0 SKIP, por lotes secuenciales con el ejecutor oficial y los artefactos API ya compilados. Se repitieron los lotes afectados después de corregirlos. Logs: fast-prebuilt.log, fast-suffix.log y fast-rest.log en .test-artifacts/ui06-main.
- El wrapper de una sola invocación volvió a agotar el presupuesto de compilación API de 30 s. Se mantuvo el límite y la compilación sí aprobó en un intento fresco y en diagnóstico separado. El cierre no depende de declarar aprobado el wrapper.
- Correcciones versionadas en 84df1e6 (Actividades) y 04c8add (pruebas de Agenda). Antes de los commits, la selección de los tres archivos de pruebas pasó 14 casos. Los wrappers históricos de navegador requieren actualizar sus fixtures de identidad en un trabajo separado.

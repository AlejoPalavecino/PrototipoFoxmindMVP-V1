# Migración local y verificación de análisis de estudiantes

- Agent / role: /root, coordinador
- Session or task ID: /root
- Date: 2026-10-28
- Branch / worktree: main / foxmind-student-publication
- Starting commit: 408ef1a6b8cae400125af958bda9d4353ada1394
- Phase and detailed task/spec links: [análisis individual](../student-ai.md), [publicación](2026-10-28-root-student-ai-publication.md)
- Status: completed

## Request and scope
El usuario autorizó aplicar las migraciones necesarias y verificar el análisis en la aplicación local. Preservar datos existentes, preparar respaldo verificable y no desplegar ni publicar cambios remotos.

## Work performed
Identificados los cuatro servicios persistentes main-gemini y el checkout main publicado. No se observaron listeners de API/web. Explorer /root/explorer inspeccionó la rama de trabajo anterior y servicios de solo lectura; su checkout estaba atrasado y se corrigió la referencia al main publicado. Su `docker compose ps` no pudo cargar variables, sin exposición de secretos ni efectos.

## Verification
Destino local identificado: contenedor `foxmind-main-gemini-5c260638c1fd0f339f28e2644d11bfeb-db`, base `classroom_main_dev`; consulta de metadatos muestra 15 migraciones finalizadas, hasta agenda recurrence, sin las dos student AI. Respaldo custom generado y validado mediante `pg_restore --list`: `.test-artifacts/main-gemini-20261024/before-student-ai-20261028-195653.dump` (ignorado, privado). No se exportaron datos a la conversación.

El lock previo pertenecía a un PID inexistente y se preservó renombrado. Helper operacional nuevo verificó admisión, destino, HEAD main, historial anterior y respaldo; `prisma migrate deploy` PASS y `migrate diff` PASS; 17 migraciones completadas, historial anterior y recuentos de todas las tablas preexistentes sin cambios. El wrapper apunta los builds al main publicado. La IA automática autorizada previamente puede procesar todas las matrículas actuales elegibles al iniciar, sin enviar identificadores ni texto libre y dentro de cuotas existentes.

API readiness 200 y web sign-in 200; preview main `408ef1a` en `http://127.0.0.1:52171`. /root/ui verificó apertura de ficha docente demo; mostró FAILED por cuota. Metadatos de DB: `AI_BUDGET_EXCEEDED`, dispatch_count 0, cuenta docente con 5 solicitudes y límite diario configurado 5; no se despachó la generación. La interfaz permite abrir con teclado y también con click cuando se ubica fuera de barras fijas; se observó solapamiento con header/navegación a determinadas posiciones de scroll, no bloqueo permanente. Se solicitó elección al usuario antes de aumentar temporalmente el límite.

Incidente: auxiliar DPAPI de /root/ui mostró credenciales demo en salida interna durante inspección. No registrarlas aquí; recomendar rotación al usuario. No se modificaron contraseñas.

## User-authorized one-off verification

El usuario autorizó aumentar temporalmente el límite docente de 5 a 6 exclusivamente para esta prueba y restaurarlo. Se usó un proceso aislado con configuración en memoria de 6, limitado a la matrícula demo de Matemáticas; el proceso principal y archivo de configuración permanecieron en 5. El helper ajustó únicamente la elegibilidad temporal del trabajo demo previamente fallido por cuota, sin dispatch anterior ni reserva, y procesó una única generación. Resultado Gemini `READY`, `dispatch_count=1`; proceso temporal terminó y la configuración persistente comprobada permanece en 5. El contador de uso consumido conserva la sexta solicitud efectivamente realizada.

Verificador /root/ui comprobó en Space 31 ficha docente demo con resumen, fortalezas, apoyos, recomendaciones, límites y referencia A1 con título; tras recarga completa y reapertura, informe y referencia persistieron. Lectura posterior confirmó `READY` y un solo dispatch, sin regeneración por abrir/recargar. Los detalles están en el registro UI atribuido.

## Commits and outcomes
No product changes or publication. The application was started from main `408ef1a`; the two migrations were applied to the admitted local database after a validated backup.

## Handoff
Migración y verificación solicitadas completas. El límite permanente sigue en 5; otras solicitudes de la cuenta deben respetarlo. Recomendar rotación de la credencial demo expuesta. El solapamiento con barras fijas a ciertas posiciones de scroll queda pendiente de corrección. Aplicación disponible en http://127.0.0.1:52171; no hubo despliegue ni publicación remota.

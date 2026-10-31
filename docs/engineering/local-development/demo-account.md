# Cuenta local permanente de demostración

Cuenta creada el 26 de octubre de 2026 en la base persistente del entorno local de FoxMind. No pertenece a un entorno desechable de tests.

## Acceso

- Aplicación: http://127.0.0.1:52171/sign-in
- Cuenta principal: `foxmind-demo-20261026-1e3eb6c5@example.test` (FoxMind Demo).
- Cuenta auxiliar: `docente-demo-20261026-1e3eb6c5@example.test` (Docente Demo).
- Las contraseñas están cifradas con Windows DPAPI CurrentUser en `.test-artifacts/permanent-demo/credentials.dpapi`. No copiarlas a Git, documentación, capturas o logs.

Desde PowerShell, en la raíz del proyecto, este comando abre un visor local con ambas credenciales:

```powershell
powershell.exe -NoProfile -File .test-artifacts/permanent-demo/credentials.ps1
```

El visor muestra los datos en una ventana; no crea archivos de texto ni copia al portapapeles. Requiere el mismo usuario de Windows que creó las credenciales. Conservar esa carpeta privada junto con los volúmenes locales; no tratarla como basura de pruebas. El script de aprovisionamiento no es el comando habitual para iniciar sesión ni para arrancar la aplicación.

## Escenarios disponibles

| Aula | Principal | Auxiliar | Actividad inicial |
| --- | --- | --- | --- |
| Matemáticas - Demo | Docente | Alumno | Cuestionario sobre fracciones; auxiliar entregó, pendiente de corrección |
| Literatura - Demo | Docente | Alumno | Trabajo práctico de cuento; sin entregas |
| Biología - Demo | Alumno | Docente | Evaluación sobre la célula; principal todavía no comenzó |

Cada aula tiene un plan PDF, una unidad con dos temas, un material PDF y una actividad publicada. La principal tiene dos eventos privados de agenda, uno con horario y otro de día completo.

Inicio principal verificado: participación mixta, dos aulas enseñando/una estudiando, una actividad pendiente, una entrega para revisar, tres materiales y tres aulas. Estos datos son mutables: al realizar los flujos, los pendientes cambiarán. Los plazos/eventos se fijaron al crear los escenarios; no se desplazan automáticamente con el calendario.

## Reutilización y conservación

Usar las mismas cuentas en las próximas pruebas manuales. Los roles se calculan por aula, no mediante un rol global. No recrear actores, restablecer contraseñas, borrar volúmenes ni repetir el provisionador para obtener una sesión nueva. No ejecutar los wrappers de fixtures desechables sobre esta base.

El arranque retenido de desarrollo conserva base, archivos y correo. Su procedimiento está en el [registro de arranque](../../work-log/2026-10-25-root-main-local-start.md); la [coordinación actual](../../work-log/2026-10-26-root-permanent-demo.md) registra la recuperación y la creación. La sesión de navegador puede caducar sin borrar la cuenta: volver a iniciar sesión.

La provisión y las lecturas posteriores de sesiones nuevas finalizaron correctamente. Una repetición adicional recibió HTTP429 en login, sin crear entidades nuevas; no se retuvo el Retry-After exacto. Respetar el aviso de espera del producto y no modificar los límites. Aceptación gráfica y persistencia tras un nuevo reinicio del host no se ejecutaron en esta tarea.

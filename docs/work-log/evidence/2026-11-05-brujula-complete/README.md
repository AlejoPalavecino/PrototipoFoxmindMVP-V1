# Brújula integral — evidencia visual

Capturas del producto real con cuentas sintéticas y servicios descartables, obtenidas durante los E2E de la ampliación completa. No contienen cuentas demo del HTML ni datos de alumnos reales.

La matriz `brujula-responsive-browser` produjo64capturas a390/768/1280/1440px y aprobó ausencia de desborde, navegación de ambos roles, secciones de aula y rechazo de accesos entre compañeros. Se conserva una selección representativa; las demás quedan en el directorio temporal informado por el runner.

`brujula-browser` produjo32capturas adicionales del acceso, registro, recuperación, Inicio, notificaciones y rúbrica, con los mismos cuatro anchos. El recorrido comprueba la legibilidad de criterios largos, la acción «Ver listado» dentro del encabezado y su diálogo, Escape/foco de navegación anidada, privacidad/publicación y color/preview de un evento persistido.

- Acceso: [escritorio](auth-sign-in-1440.png) y [móvil](auth-sign-in-390.png)
- Registro: [escritorio](auth-register-1440.png) y [móvil](auth-register-390.png)
- Inicio: [docente poblado final](teacher-final-1280.png) y [alumno móvil](student-390.png)
- Evaluación por criterios: [escritorio](grading-1280.png) y [móvil](grading-390.png)
- Centro de notificaciones: [docente](notifications-teacher-1440.png) y [alumno móvil](notifications-student-390.png)

- [Mis aulas docente](teacher-mis-aulas-1440.png)
- [Agenda docente](teacher-agenda-1440.png) y [alumno móvil](student-agenda-390.png)
- [Plan alumno móvil](student-classroom-plan-390.png)
- [Actividades docente](teacher-classroom-activities-1440.png)
- [Foxy AI](teacher-foxy-ai-1440.png), disponibilidad local sin proveedor real
- [Perfil alumno móvil](student-profile-390.png) y [configuración docente](teacher-settings-1440.png)

Referencia aprobada y reglas para futuras pantallas: [base Brújula](../../../design/brujula/README.md). Resultado funcional, pruebas y límites: [registro coordinador](../../2026-11-05-id-unavailable-brujula-complete-base.md). Las capturas permiten revisión visual; no certifican identidad píxel a píxel ni despliegue.

La muestra docente fue reemplazada por la captura final de `p9-home-integration`: Consultas1 real, avance1/2 y próximo tema exacto, antes de archivar el aula. Ese recorrido produjo10capturas adicionales y verificó el estado vacío sin superposición a320/375/1280px. Se conservan18muestras en esta carpeta; la geometría vacía queda atribuida al registro y a los artefactos temporales del runner. Después sólo se aclaró su texto a «No hay aulas disponibles en esta vista», sin cambios de geometría.

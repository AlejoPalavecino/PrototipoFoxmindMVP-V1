# FoxMind Brújula · Criterios de aceptación para el MVP real

Registrar evidencia con dos cuentas **de prueba** de roles diferentes y datos descartables, y efectuar las pruebas con datos persistidos reales, nunca con el estado de la demo como si fuera el backend.

## Experiencia y navegación

- [ ] La barra superior anterior **ya no existe**; logo, búsqueda, secciones, contador de notificaciones, perfil y configuración están en el menú lateral. En móvil hay menú accesible.
- [ ] El diseño coincide con el HTML en escritorio y móvil; no hay cortes ni controles superpuestos (390/768/1280/1440 px).
- [ ] Desplegables con opción seleccionada reconocible y navegación por teclado; menús/modal recuperan el foco apropiadamente.
- [ ] Los banners de docente y alumno muestran el Foxy de la identidad y no un reemplazo genérico.
- [ ] Cada dato de dashboard tiene origen real, filtro por rol y contexto, y enlace al detalle correcto.
- [ ] Diferenciar vacíos, errores de red, falta de autorización, carga y datos disponibles.

## Docente

- [ ] La sesión docente solo muestra aulas administradas por ese docente.
- [ ] Desde `Por atender` se puede abrir una **entrega/intento específico** pendiente y se ve estudiante, actividad y aula correctos.
- [ ] Crear actividad abre elección manual/IA. La manual completa campos; la IA propone consignas y rúbrica editables. No publica sin revisión y confirmación.
- [ ] La rúbrica valida criterios/puntajes y se asocia a la actividad correcta.
- [ ] Las fechas y la recepción tardía se aplican y reflejan en la vista alumno.
- [ ] La revisión docente puede permanecer privada. Una nota no aparece al alumno hasta `Publicar devolución`.
- [ ] Foxy AI permite chat persistente, contexto general/aula autorizado, vista previa y confirmación de publicación de un material en Biblioteca; no publica sin aceptar.
- [ ] `Publicar aviso` lo muestra en Muro del aula indicada y no crea una actividad.
- [ ] La agenda permite crear y editar eventos privados con color y muestra previa; recurrencia conserva excepciones.

## Alumno

- [ ] La sesión alumna/alumno no abre recursos ni notas de compañeros, incluso cambiando IDs de URL o consultas.
- [ ] Se puede aceptar invitación/unir mediante código válido conforme al contrato del proyecto; aula nueva aparece en Mis aulas.
- [ ] Desde Inicio se puede abrir la próxima actividad; un borrador guardado se recupera tras refrescar.
- [ ] Confirmar entrega persiste el intento correcto y lo vuelve visible al docente. No debe duplicarse ante doble clic o retry cuando aplique idempotencia.
- [ ] La actividad muestra su rúbrica y materiales publicados correspondientes.
- [ ] Un resultado corregido en borrador no aparece; cuando el docente lo publica, se ve en Mi progreso y en detalle de esa actividad.
- [ ] La prórroga individual se aplica a ese alumno y no modifica los plazos de toda la clase.
- [ ] Las notificaciones privadas enlazan a los contenidos correctos y se pueden marcar como leídas.

## Seguridad, operación y calidad

- [ ] Test de permisos entre docentes distintos y entre alumnos distintos.
- [ ] No hay secretos en frontend, logs públicos ni llamadas de IA con contexto privado no autorizado.
- [ ] Las modificaciones de API tienen contratos, validación, errores y tests de integración.
- [ ] Migraciones (si existieron) preservan registros y no dependen de reiniciar la base de producción.
- [ ] Build/typecheck/lint/tests/E2E ejecutados y sus resultados documentados.
- [ ] No hay botones visuales que afirmen éxito de una operación que no fue confirmada por servidor.
- [ ] La generación de IA requiere disponibilidad real o informa claramente que no está disponible; no inventa respuestas de producción.
- [ ] Se documentan brechas pendientes y se distingue completado de simulado.

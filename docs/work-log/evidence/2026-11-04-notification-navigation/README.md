# Banner, notificaciones y navegación común

QA de componentes reales mediante Vite en 127.0.0.1:53255 y ego-browser Space 5, con API/datos exclusivamente sintéticos. No se inició sesión ni se modificaron cuentas/notificaciones del entorno de demo. Los PNG no prueban integración con backend.

- [Banner escritorio](final-home-1440.png) y [móvil](final-home-320.png): escena original sin copia borrosa, filtros o máscara, tarjeta translúcida con mayor opacidad. Se conserva la composición original completa dentro del banner; en móvil la ventana del arte conserva Foxy.
- [Notificaciones escritorio](final-mis-aulas-1440.png) y [móvil](final-mis-aulas-390.png): jerarquía, aula/actividad, fecha, estado, filtros y acciones diferenciadas. Capturas tomadas con opacity=1 para evitar la transición de entrada.
- [Responsive e interacción](responsive.json): ocho vistas de Inicio por rol a 320/390/768/1440, controles sin desborde, imagen decodificada, sin blur/mask y panel dentro del banner; cuatro diálogos con marcado de lectura, actualización de conteo, Escape anidado y foco devuelto. Corresponde a la comprobación previa a la corrección final de especificidad de colores en otras superficies.
- [Navegación y estados](navigation-states.json): 16 combinaciones de superficie/ancho más vacío/error/carga/lista extensa. Sin avatar/ubicación superior ni barra de enlaces móvil duplicada. Los botones del diálogo miden al menos 44 px. Perfil/Mis aulas/Agenda se usan como contextos sintéticos para los componentes compartidos, no como flujos completos de esas páginas.
- [Colores finales](final-colors.json): texto rgb(255,253,248) sobre rgb(166,66,27), sin overflow, en Inicio/Mis aulas/Agenda/Perfil a 390/1440; corrección de reglas heredadas que alcanzaban los botones del modal.
- [Estado final](final-status.json): una consulta fallida no muestra «Estás al día».

Limitaciones y fallos de preparación quedan en el [registro coordinador](../../2026-11-04-id-unavailable-notification-navigation-polish.md). No nueva ejecución integral de backend, proveedor, matriz de navegadores ni aceptación de producción. Space cerrado con finish keep=[]; la app del usuario se conserva activa por separado.

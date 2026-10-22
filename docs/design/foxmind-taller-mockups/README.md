# FoxMind — Taller de aprendizaje

Seis mockups estáticos para revisión visual previa a la implementación. Creación: 21 octubre 2026 (fecha local del usuario). Datos ficticios; docente y estudiante son roles por aula, no roles globales.

| Pantalla | Escritorio | Móvil |
|---|---|---|
| Inicio | [Ver](inicio-desktop.png) | [Ver](inicio-mobile.png) |
| Aula — Actividades del alumno | [Ver](aula-desktop.png) | [Ver](aula-mobile.png) |
| Registro | [Ver](registro-desktop.png) | [Ver](registro-mobile.png) |

## Dirección
Naranja, marfil, lavanda y menta; tipografía redondeada; ilustraciones cálidas y zorro propio; lectura sobre superficies opacas y navegación superior compartida. Aula más tranquila que Inicio. Registro conserva Nombre, Apellido, Correo electrónico y Contraseña de 16–128 caracteres. Sin Google, rol global, rankings, rachas ni IA.

## Revisión visual observada
- Se inspeccionaron los seis resultados mostrados por ImageGen.
- Inicio distingue Enseño y Estudio; el aula es Actividades del alumno, sin herramientas docentes.
- Las vistas móviles reorganizan contenido verticalmente; en aula las pestañas se muestran como navegación horizontal parcial.
- Registro muestra los cuatro campos y la ayuda de longitud correcta, en dos columnas de nombre/apellido en escritorio y apilados en móvil.
- No se observan marcos de teléfono, barras de navegador ni grandes recortes de texto funcional en los resultados.

## Límites y ajustes antes de implementar
Son imágenes generadas, NO pantallas funcionales ni especificaciones exactas de CSS. Los tamaños pedidos son orientativos; manifest.json registra los PNG reales. Las vistas móviles son composiciones largas, no prueba de reflow a 390 px. No se ha medido accesibilidad, contraste, zoom, foco, lector de pantalla o comportamiento.

El generador aclara algunos naranjas y textos auxiliares respecto de los tokens propuestos. Al pasar a código, normalizar CTA/estados y contraste, mantener un único CTA dominante (los accesos de aula de Inicio escritorio deberían ser secundarios), verificar que el encabezado móvil no retrase demasiado la tarea, y fijar tamaños tipográficos con pruebas reales. No copiar literalmente todos los píxeles como si fueran accesibles.

## Fuentes y recuperación
- [Prompts completos](PROMPTS.md), herramienta integrada ImageGen; sin fallback API/CLI.
- [Manifiesto y hashes](manifest.json).
- Referencia de marca inicial: ../../references/Panel educativo FoxMind de aprendizaje.png, inspeccionada y adjuntada como referencia, no como objetivo exacto.
- Inicio escritorio fue la referencia visual para las demás vistas de escritorio; cada pantalla móvil se generó desde su correspondiente escritorio.
- [Registro de trabajo](../../work-log/2026-10-21-id-unavailable-playful-mockups.md).

Siguiente paso: feedback sobre esta familia de pantallas. No implementar, integrar ni publicar sin una solicitud posterior. Resolver primero el checkout que sirve la aplicación real.

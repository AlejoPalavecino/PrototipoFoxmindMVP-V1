# Revisión de referencias — 22 octubre 2026

## Alcance de la revisión

Inspección visual por el agente de cada salida de ImageGen mostrada en la conversación. Revisión de etiquetas, acción principal, shell, tabs y distinción de roles. No hubo validación humana del set completo ni prueba funcional. PNG estático no prueba accesibilidad, responsive, contraste compuesto o funcionamiento.

## Cobertura inspeccionada

| Pantallas | Resultado observado |
|---|---|
| 01–03 Acceso | Login, registro y verificación diferenciados; sin selector global de rol ni Google. Contraseña 16–128 en creación. |
| 04 Mis Aulas | Estudio/Enseño/Pendientes y crear/unirse dentro de Mis Aulas. |
| 05–09 Creación | Cuatro pasos y éxito. Corregidos checks prematuros y selectores incorrectos en Datos generales. Archivo listo explícito antes de continuar. |
| 10–17 Docente | Ocho pestañas presentes con tab activo correspondiente; gestión de contenidos, alumnos, progreso, muro y archivo del aula. |
| 18–23 Estudiante | Seis pestañas; sin Configuración/Historial, borradores docentes o acciones de administración. Compañeros sin correos. |
| 24 Perfil | Datos personales separados de seguridad, correo no editable, sin rol global. |

## Correcciones de generación

- 05: pasos futuros con numerales, no checks; Materia y División como texto libre.
- 10: Inicio inactivo y Mis Aulas activo en navbar.
- 18 y 22: corregida unidad inventada en Encuadre y composición. En 22 queda un separador tipográfico residual tras Unidad 1; no representa otro campo.
- 23: nombre/initiales ajustados a Mateo Silva/MS.

## Límites y decisiones pendientes

- Referencias de estilo y jerarquía, no especificación pixel-perfect. El zorro es una reinterpretación generada: implementar usando el asset original, no reemplazar la identidad de marca con el raster generado.
- Hay pequeñas variaciones entre iconos, alturas, sombras y posiciones. Normalizar con tokens y componentes antes de implementar. Algunas superficies presentan degradados muy suaves pese a la preferencia por rellenos planos.
- Los botones Subir/Bajar del paso 3 ilustran el control de orden; el primero/último deben deshabilitar la dirección imposible y anunciar el cambio en la implementación.
- Mis actividades/Progreso ilustran subconjuntos y momentos diferentes, no un dataset sincronizado. No derivar totales de las filas visibles en otras imágenes.
- El Muro muestra acciones representativas; menús y permisos de respuestas deben resolverse con la especificación funcional, no omitiendo acciones porque no estén dibujadas.
- El perfil no debe convertirse en destino por defecto tras login. Estas imágenes no cambian las rutas existentes.
- No hay diseños móviles nuevos en este paquete. La galería responsive solo reduce el tamaño de la imagen de escritorio.
- No están todos los estados secundarios, formularios de actividad, resolución/calificación, diálogos de confirmación ni errores. El alcance transversal previo sigue intacto.

## Comprobaciones de archivos

24 PNG finales copiados al repositorio, originales preservados. El manifiesto registra dimensiones reales y SHA-256. Comprobación de referencias locales de HTML y Markdown; sin dependencias remotas. No se ejecutaron tests de producto: no se cambió código de aplicación, servicios ni datos.

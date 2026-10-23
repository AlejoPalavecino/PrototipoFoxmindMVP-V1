# FoxMind — Referencias de plataforma

24 mockups de escritorio, generados con ImageGen integrado. No son implementación ni un prototipo funcional.

Abrir [la galería](index.html). Cada imagen abre en tamaño completo. La galería se adapta al ancho del navegador, pero eso NO representa diseños móviles de las pantallas.

## Referencia

[Base exacta adjunta](references/base-seleccionada.png). Se conservan carpetas, contornos oscuros, sombras crema, naranja de acción y acentos menta/coral/amarillo. No se sustituye por glassmorphism ni por otra versión previa de Inicio.

## Pantallas

- [Iniciar sesión](screens/01-login.png)
- [Crear cuenta](screens/02-registro.png)
- [Verificar correo](screens/03-verificacion.png)
- [Mis Aulas](screens/04-mis-aulas.png)
- [Crear aula · Datos generales](screens/05-crear-datos.png)
- [Crear aula · Plan de estudio](screens/06-crear-plan.png)
- [Crear aula · Unidades y temas](screens/07-crear-unidades.png)
- [Crear aula · Revisión](screens/08-crear-revision.png)
- [Aula creada · Siguiente paso](screens/09-aula-creada.png)
- [Docente · Actividades](screens/10-docente-actividades.png)
- [Docente · Alumnos](screens/11-docente-alumnos.png)
- [Docente · Historial](screens/12-docente-historial.png)
- [Docente · Plan](screens/13-docente-plan.png)
- [Docente · Biblioteca](screens/14-docente-biblioteca.png)
- [Docente · Progreso](screens/15-docente-progreso.png)
- [Docente · Muro](screens/16-docente-muro.png)
- [Docente · Configuración](screens/17-docente-configuracion.png)
- [Estudiante · Actividades](screens/18-estudiante-actividades.png)
- [Estudiante · Compañeros](screens/19-estudiante-companeros.png)
- [Estudiante · Plan](screens/20-estudiante-plan.png)
- [Estudiante · Biblioteca](screens/21-estudiante-biblioteca.png)
- [Estudiante · Mi progreso](screens/22-estudiante-mi-progreso.png)
- [Estudiante · Muro](screens/23-estudiante-muro.png)
- [Mi perfil](screens/24-mi-perfil.png)

## Lectura de roles y flujos

- Crear/unirse se ubica en Mis Aulas, no en Inicio.
- El perfil es una sección de cuenta, no el destino propuesto tras autenticarse. El destino general sigue siendo Inicio, conservando un destino previo válido cuando corresponda.
- Docente: Alumnos, Historial, Plan, Biblioteca, Actividades, Progreso, Muro y Configuración.
- Estudiante: Compañeros, Plan, Biblioteca, Actividades, Mi progreso y Muro. Sin gestión del aula ni acceso a borradores privados del docente.
- Creación: Datos generales → Plan de estudio → Unidades y temas → Revisión → Aula creada. Invitaciones después de crear, con aceptación explícita.
- El estado de verificación representa una sesión no verificada y un envío confirmado, no una respuesta genérica de registro.
- Archivo seleccionado no equivale a listo: se representa validación de seguridad. DOCX solo descarga.
- Plan dado, entregas y calificaciones son conceptos separados. Una nota pendiente no es cero.

## Datos ilustrativos

Lucía Ríos es docente y Marina López estudiante de Introducción a la fotografía. Marina crea Taller de dibujo en el recorrido de creación. Los nombres, correos example.test, códigos, fechas y métricas son ficticios. Las listas de actividades ilustran subconjuntos/estados distintos; no son un dataset completo sincronizado entre capturas ni prueba del backend.

## Archivos de trabajo

- [specs.json](specs.json): prompts base de cada pantalla.
- [generation-notes.json](generation-notes.json): referencias secundarias y correcciones aplicadas.
- [manifest.json](manifest.json): rutas originales, dimensiones y SHA-256 de los archivos finales.
- [QA.md](QA.md): inspección visual, límites y trabajo posterior.

## Pendiente fuera de este set

Variantes móviles, estados de error/vacío/carga, validaciones y confirmaciones, recuperación de contraseña, unirse por código, detalle/creación/resolución/calificación de actividades y prueba funcional de permisos. Se deben resolver en el trabajo posterior, sin inferir comportamiento de estas imágenes. Este set no reduce el alcance del plan transversal existente.

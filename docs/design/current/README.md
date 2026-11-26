# Galería vigente de FoxMind

Capturas del 18 de noviembre de 2026 en Ego Lite sobre la aplicación compilada de `main` en `2ed07b67`. Se usaron cuentas sintéticas, el aula «Fotografía y luz» y una carpeta de estudiante con una copia de su plan. Escritorio mide 1440×1000 y móvil, 390×844. [Catálogo de rutas, tamaños y hashes](catalog.json) · [Registro de captura](../../work-log/2026-11-18-galeria-docs.md) · [Guía de UX/UI](../README.md)

**Piloto Expedición (24 de noviembre de 2026).** Iniciar sesión, Crear cuenta, Inicio de ambos roles y los menús móviles se volvieron a capturar con la app del worktree del piloto. Se usó `next dev` contra una API sintética local, sin base de datos ni proveedores, y Chromium de Playwright. Esas entradas del catálogo llevan su propio candidato y entorno. Las imágenes anteriores de esas rutas se conservan en el commit `32c93a9c`. El resto de las capturas privadas es anterior al piloto y muestra la barra lateral Brújula. [Registro del piloto](../../work-log/2026-11-24-expedition-access.md)

**Mis aulas Expedición (24 de noviembre de 2026).** La lista, Crear aula, el interior con el Plan, Ajustes con la corrección asistida, el apunte escrito de la Biblioteca, el ingreso por código e Inicio de ambos roles se volvieron a capturar en la rama `claude/classrooms-expedition`. Se usó `next dev` contra una API sintética local que responde aulas, borradores, invitaciones, el detalle del aula, integrantes, actividades, biblioteca, muro y progreso, sin base de datos ni proveedores. El catálogo registra la fecha, el candidato, el entorno y el sha256 de cada captura.

## Cuenta y acceso

[Iniciar sesión en escritorio](vigente-acceso-publico-1440.png) · [Crear cuenta, parada del rol](vigente-registro-publico-1440.png) · [Crear cuenta, parada de datos en móvil](vigente-registro-datos-publico-390.png)

| Vista | Docente | Estudiante |
|---|---|---|
| Mi perfil | [Escritorio](vigente-perfil-docente-1440.png) · [Móvil](vigente-perfil-docente-390.png) | [Escritorio](vigente-perfil-estudiante-1440.png) · [Móvil](vigente-perfil-estudiante-390.png) |

## Inicio, búsqueda y notificaciones

| Vista | Docente | Estudiante |
|---|---|---|
| Inicio | [Escritorio](vigente-inicio-docente-1440.png) · [Móvil](vigente-inicio-docente-390.png) | [Escritorio](vigente-inicio-estudiante-1440.png) · [Móvil](vigente-inicio-estudiante-390.png) |
| Menú abierto | [Móvil](vigente-menu-docente-390.png) | [Móvil](vigente-menu-estudiante-390.png) |
| Búsqueda global | [Escritorio](vigente-busqueda-docente-1440.png) · [Móvil](vigente-busqueda-docente-390.png) | — |
| Notificaciones | [Escritorio](vigente-notificaciones-docente-1440.png) · [Móvil](vigente-notificaciones-docente-390.png) | [Escritorio](vigente-notificaciones-estudiante-1440.png) · [Móvil](vigente-notificaciones-estudiante-390.png) |

## Mis aulas

| Vista | Docente | Estudiante |
|---|---|---|
| Catálogo | [Escritorio](vigente-aulas-docente-1440.png) · [Móvil](vigente-aulas-docente-390.png) | [Escritorio](vigente-aulas-estudiante-1440.png) · [Móvil](vigente-aulas-estudiante-390.png) |
| Plan | [Escritorio](vigente-plan-aula-docente-1440.png) · [Móvil](vigente-plan-aula-docente-390.png) | [Escritorio](vigente-plan-aula-estudiante-1440.png) · [Móvil](vigente-plan-aula-estudiante-390.png) |
| Ajustes con corrección asistida | [Escritorio](vigente-ajustes-aula-docente-1440.png) | — |
| Biblioteca: escribir un apunte | [Escritorio](vigente-apunte-biblioteca-docente-1440.png) | — |

### Creación e ingreso

[Crear aula en escritorio](vigente-crear-aula-docente-1440.png) · [Crear aula en móvil](vigente-crear-aula-docente-390.png) · [Unirse por código](vigente-ingresar-aula-estudiante-390.png) · [Crear carpeta de estudio](vigente-crear-carpeta-estudiante-390.png)

## Foxy y Carpetas de estudio

| Vista | Escritorio | Móvil |
|---|---|---|
| Foxy AI docente | [Chat](vigente-foxy-docente-1440.png) | [Chat](vigente-foxy-docente-390.png) |
| Mi estudio | [Colección](vigente-mi-estudio-estudiante-1440.png) | [Colección](vigente-mi-estudio-estudiante-390.png) |
| Carpeta | [Chat](vigente-chat-estudio-estudiante-1440.png) | [Chat](vigente-chat-estudio-estudiante-390.png) |

## Agenda

| Vista | Docente | Estudiante |
|---|---|---|
| Mes | [Escritorio](vigente-agenda-docente-1440.png) · [Móvil](vigente-agenda-docente-390.png) | [Escritorio](vigente-agenda-estudiante-1440.png) · [Móvil](vigente-agenda-estudiante-390.png) |
| Semana | [Escritorio](vigente-agenda-semana-docente-1440.png) | — |

## Cuota mensual de IA

| Vista | Docente | Estudiante |
|---|---|---|
| Detalle | [Escritorio](vigente-cuota-ia-docente-1440.png) · [Móvil](vigente-cuota-ia-docente-390.png) | [Escritorio](vigente-cuota-ia-estudiante-1440.png) · [Móvil](vigente-cuota-ia-estudiante-390.png) |

El detalle muestra USD 5 para docente y USD 3 para estudiante, con consumo y reservas en cero en ambas cuentas de prueba. Escape cerró el diálogo y devolvió el foco al botón en los cuatro recorridos. [Reglas y conciliación](../../engineering/ai/README.md)

## Evidencia de entregas anteriores

Los recibos de pruebas conservan sus propios candidatos, alcances y resultados. Las capturas de la galería anterior conservan sus rutas y hashes en Git. [Evidencia de flujos](../../verification/README.md) · [Catálogo anterior fijado a su revisión](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/design/current/catalog.json)

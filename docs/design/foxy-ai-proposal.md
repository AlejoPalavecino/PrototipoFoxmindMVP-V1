# Diseño aprobado de Foxy y Estudio

El diseño de ambos roles se aprobó el 12 de noviembre de 2026. Este registro conserva las decisiones de la aprobación. La [guía de experiencia](README.md#foxy-y-carpetas-de-estudio) describe el resultado implementado y la [galería](current/README.md#foxy-y-carpetas-de-estudio) muestra la aplicación.

- Chat legible con historial plegable, vista ampliable, avatar de la cuenta, herramientas con ejemplos y acceso directo a creaciones. La navegación conserva la identidad Brújula.
- El docente elige General o aula, con búsqueda y confirmación. El historial se busca y filtra por contexto y permite renombrar. El recurso textual separa lectura, edición y Compartir. Compartir mantiene la revisión de Biblioteca o el traspaso a un borrador privado.
- El estudiante conserva el contexto fijo de la carpeta. Puede elegir temas, consultar fuentes y usar herramientas de práctica. Materiales y Plan incluye búsqueda, procedencia, detalle y acceso al chat desde un tema.
- Carga, demora y error aparecen en la conversación y distinguen la operación en curso. Elegir herramienta o contexto es una acción independiente del envío. Ampliar y volver conserva el texto. Escape devuelve el foco.

## Adjuntos privados

Cada conversación admite PDF y DOCX, hasta seis archivos y 20 MB totales. La carga valida estructura, escaneo y compatibilidad con el lector. El PDF se prepara como documento para el proveedor y el DOCX se extrae como texto local. El original permanece bajo custodia privada.

El estudiante puede elegir guardar el adjunto también en la carpeta. Esa copia comparte bytes aprobados y conserva autorización propia. Quitar un adjunto impide el uso posterior en el chat y conserva la conversación. El servidor revalida rol, dueño, carpeta y conversación. Materiales y planes de carpeta mantienen sus propios límites.

[Guía Foxy](../engineering/ai/foxy.md) · [Guía Estudio](../engineering/study/README.md) · [Registro de la aprobación](../work-log/2026-11-12-root-foxy-preview.md) · [Publicación](../work-log/2026-11-12-root-foxy-study-publication.md)

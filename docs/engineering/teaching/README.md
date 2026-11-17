# Plan, Biblioteca y Muro

Estas capacidades comparten el aula y sus permisos, pero mantienen reglas distintas.

- [Plan](plan.md): consultar unidades/temas y marcar avance docente.
- [Biblioteca](library.md): publicar, revisar, organizar y leer recursos.
- [Muro](wall.md): avisos, consultas y respuestas.

Crear o publicar en una sección no completa actividades ni modifica calificaciones. El estado de archivo y la membresía se revalidan en el servidor.

El backend conserva el monolito modular y organiza estas responsabilidades por capacidad:

- `curriculum/plan` mantiene consulta y avance de temas; `curriculum/generation` coordina la extracción durable del plan.
- `materials/library` gobierna consulta, organización, enlaces y revisión de recursos; `materials/publication` publica el archivo autorizado. La revisión de texto permanece en el mismo caso de uso de Biblioteca porque comparte sus permisos, bloqueo, replay y enlaces; no abre otra transacción.
- `activities/authoring` gobierna la edición docente y `activities/generation` prepara y aplica propuestas IA. Los adaptadores de contenido y temas se conectan a Autoría desde composición mediante sus puertos; las capacidades no importan implementaciones privadas hermanas.

Las APIs públicas de módulo reexportan contratos nombrados por capacidad. Los repositorios de Biblioteca reciben comandos tipados con alcance de aula y devuelven registros concretos. `ClassroomFileOperations` sólo autoriza el archivo; el avance de revisión se recibe como `RevisionPort` de Aulas. Las operaciones de publicación y revisión conservan la transacción autorizada del llamador.


`communication/wall` conserva las reglas de avisos, consultas, respuestas y moderacion. Sus avisos se insertan antes de avanzar la revision y dentro de la transaccion academica existente. La consulta, apertura y lectura de la bandeja pertenecen a `home/notifications`; Muro no conserva delegadores de compatibilidad para esos casos. La composicion conecta ambos servicios con los mismos contratos de acceso a Aulas. Ver [Inicio y bandeja](../home/README.md).

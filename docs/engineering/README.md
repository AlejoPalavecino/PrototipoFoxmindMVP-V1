# Ingeniería de FoxMind

Empezá por [arquitectura](architecture.md) y [modelo de datos](data-model.md). Para trabajar, usá el [entorno local](local-development/README.md) y las [verificaciones](testing/README.md).

Backend por capacidades y frontend por casos de uso están integrados en `main`. `npm run lint:boundaries` comprueba los límites de dependencia. [Arquitectura](architecture.md) · [Evidencia de integración](../verification/refactor-integration.json).

| Dominio | Responsabilidad |
|---|---|
| [Estudio privado](study/README.md) | Carpetas estudiantiles, fuentes privadas, prácticas, adaptación y repasos en Agenda |
| [Identidad](identity/README.md) | Registro, sesión, correo, perfil y contraseñas |
| [Archivos](files/README.md) | Carga, validación, escaneo, custodia y acceso privado |
| [Aulas](classrooms/README.md) | Borradores, publicación, propiedad, ingreso y pertenencia |
| [Enseñanza](teaching/README.md) | Plan, Biblioteca y Muro |
| [Actividades](activities/README.md) | Autoría, generación, asignación y participación |
| [Calificación](grading/README.md) | Corrección privada, publicación, precisión y progreso |
| [Inicio](home/README.md) | Lecturas por rol, pendientes, avisos y búsqueda |
| [Agenda](agenda/README.md) | Eventos privados, calendario y contexto académico |
| [Interfaz](frontend/README.md) | Composición de pantallas y sistema Brújula |
| [IA](ai/README.md) | Seis familias textuales con perfiles por trabajo, visuales y cuota mensual compartida |

La documentación se actualiza con el cambio según la [política](../documentation-policy.md). Las guías explican responsabilidades actuales; el código y las pruebas enlazados permiten verificar los detalles.

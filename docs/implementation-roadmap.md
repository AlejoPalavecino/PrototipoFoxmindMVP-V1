# Estado de FoxMind

Corte documental del **18 de noviembre de 2026** sobre el código de `main`, revisión `2ed07b67`. La plataforma reúne enseñanza en aulas y estudio privado en carpetas. Las decisiones funcionales se consultan en la [especificación](foxmind-v1-functional-spec.md) y la [matriz de roles](product/features-by-role.md).

| Área integrada | Resultado disponible | Dónde comprobar su alcance |
|---|---|---|
| Aulas y enseñanza | El docente crea y retoma borradores, invita, organiza unidades y temas, publica materiales y conversa con el grupo. El estudiante revisa el destino y confirma su ingreso. | [Aulas](engineering/classrooms/README.md) · [Enseñanza](engineering/teaching/README.md) |
| Actividades y progreso | Autoría manual o asistida, entrega confirmada, corrección privada y publicación de la devolución. Cumplimiento, rendimiento y avance del plan tienen reglas propias. | [Actividades](engineering/activities/README.md) · [Calificación](engineering/grading/README.md) |
| Foxy y Mi Estudio | Chat con contexto y adjuntos autorizados, creación de recursos y herramientas privadas. El docente puede preparar una publicación para Biblioteca. El estudiante puede practicar, revisar la devolución y agendar un repaso. | [Foxy docente](engineering/ai/foxy.md) · [Estudio privado](engineering/study/README.md) |
| Arnés pedagógico | Tutoría sobre intentos, prácticas con reintento, actividades, apuntes, rúbricas, recursos visuales y seguimiento según destinatario. Se verificaron recorridos locales, incluidas muestras con Gemini real. | [Aceptación por herramienta](../odd/tasks/pedagogical-harness.md) · [Recorridos y límites](work-log/2026-11-17-root-cierre-arnes.md) |
| Cuenta y organización | Cuenta con rol exclusivo, perfil y avatar, búsqueda con permisos, avisos y agenda personal con recurrencia y recordatorios. | [Identidad](engineering/identity/README.md) · [Inicio y avisos](engineering/home/README.md) · [Agenda](engineering/agenda/README.md) |
| IA y consumo | Perfiles de ejecución persistidos por trabajo, Gemini como configuración inicial y adaptador opcional de Claude. Cuota mensual compartida entre herramientas de USD 5 por docente y USD 3 por estudiante, con reservas y desglose en la cabecera. | [Operación de IA](engineering/ai/README.md) · [Verificación de cuota](../odd/tasks/monthly-ai-quota.md) |
| Métricas de uso | Una consulta SQL agrega las dos últimas semanas completas de operaciones. Permite revisar solicitudes finalizadas, edición de recursos y adopción de repasos. | [Consulta semanal](../scripts/metricas-uso-pedagogico.sql) · [Lectura de las métricas](work-log/2026-11-18-root-metricas-de-uso.md) |
| Arquitectura e interfaz | Backend modular de trece dominios, frontend por funciones y recorridos, contratos compartidos y sistema visual Brújula. | [Arquitectura](engineering/architecture.md) · [Diseño](design/README.md) · [Galería](design/current/README.md) |

## Qué falta validar o decidir

- **Resultado pedagógico.** El piloto con participantes todavía debe medir transferencia, retención y tiempo docente. Las métricas semanales describen uso. [Guion del piloto](verification/piloto-con-participantes.md)
- **Accesibilidad de exportaciones.** Hay comprobaciones técnicas de estructura y orden de lectura de PDF. Queda por evaluar la experiencia de usuarios de lectores de pantalla. [Registro de lectura y precisión](work-log/2026-11-17-root-precision-y-lectura.md)
- **Operación en producción.** Siguen pendientes el hosting, el presupuesto global y el cupo productivo de almacenamiento. La aceptación de cuotas se comprobó con datos controlados y queda pendiente la conciliación con una factura real. [Registro de la cuota mensual](work-log/2026-11-18-root-monthly-ai-quota.md)

Los resultados de compilación, navegador y proveedores corresponden a los candidatos y entornos indicados en cada recibo. El repositorio documenta integraciones en `main` y verificaciones locales. El estado de una instalación productiva requiere evidencia de despliegue. [Índice de verificación](verification/README.md)

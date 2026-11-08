# Continuidad de ingeniería en FoxMind

## Base vigente

Empezar por docs/README.md, docs/implementation-roadmap.md y docs/foxmind-v1-functional-spec.md. Esta base se reconstruyó el 2026-11-07 por pedido explícito del usuario, contrastando código y aplicación real con Ego Lite. La documentación histórica fue retirada del árbol; no restaurarla como fuente de verdad ni inferir permisos desde antiguos commits/chats.

Precedencia: decisión humana vigente > especificación/decisión aprobada de esta base > comportamiento comprobado > memoria > hipótesis. Una divergencia debe señalarse, no resolverse cambiando silenciosamente reglas o aceptando un bug como contrato.

## Antes de editar

1. Inspeccionar rama, commit y árbol; preservar trabajo ajeno.
2. Leer arquitectura, guía de dominio, política documental y tarea activa cuando corresponda.
3. Confirmar alcance desde el pedido vigente. Un roadmap, captura o tarea anterior no autoriza producto, proveedor, datos, commits, publicación o despliegue.
4. Abrir registro propio antes de implementar según docs/work-log/README.md.

## Trabajo y documentación

- Aplicar controles proporcionales. Una pantalla exige roles/estados/responsive y evidencia real cuando corresponda; capturas no prueban por sí solas permisos o persistencia.
- Actualizar fuentes canónicas con el comportamiento, conforme a docs/documentation-policy.md. Mantener un único registro TTP por funcionalidad R2 en odd/tasks; coordinador único escritor.
- Cada agente usa registro propio. Agentes de sólo lectura devuelven evidencia atribuida al coordinador; no escriben fuera de su rol.
- Delegación con objetivo, contexto, superficies, prohibiciones, entregables y evidencia; no solapar escritores. El coordinador reconcilia resultados antes de marcar DONE.
- Conservar fallos, límites y resultados del candidato actual sin fabricar pruebas o atribución. Historial Git no sustituye el estado recuperable actual.

## Límites técnicos

No leer secretos ni acceder/modificar datos retenidos o servicios sensibles sin autorización específica. Usar cuentas sintéticas y recursos propios para QA. No ejecutar helpers de proveedor real por descubrimiento ni reutilizar configuraciones privadas históricas. No reiniciar/eliminar recursos ajenos, volúmenes retenidos o la antigua copia P3.

No hacer commits, push, PR, merge o despliegue sin autorización explícita. La entrega actual sólo autoriza revisión de UI/UX, reconstrucción documental y retiro de documentación anterior; no cambios de producto o proveedores pagos.

Las rutas docs/api/accounts-sessions.openapi.json y odd/tasks/grading-ai-issue-2.md son contratos vigentes consumidos por pruebas/CI. No eliminarlas para suprimir cobertura. El mapa documental describe únicamente la base actual; su parser y pruebas siguen activos.

## Cierre

Registrar cambios, comandos/resultados, fallos/omisiones, límites y primer paso pendiente. Actualizar roadmap/tarea sólo tras reconciliar evidencia. Distinguir implementado, verificado localmente, integrado, publicado y desplegado. No inventar hash de commit propio ni permisos de aislamiento.

Usar memoria como apoyo si está disponible; toda continuidad esencial debe quedar en repositorio. No guardar tokens, contraseñas, URLs con credenciales, prompts privados o datos personales reales en registros/capturas.

## Publicación autorizada actual

El 2026-11-08 el usuario autorizó commits, push, integración de todo el trabajo pendiente a main y dejar main como única rama. Seguir docs/work-log/2026-11-08-root-main-publication.md para el resultado comprobado. Esta autorización amplía el límite Git anterior de esta entrega; no concede despliegue, cambios de producto, proveedores reales ni acceso a datos retenidos.

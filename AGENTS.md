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

El 2026-11-10 autorizó integrar la migración por dominios y sus correcciones verificadas a main, hacer push y conservar main como única rama. El registro vigente de esta publicación es docs/work-log/2026-11-10-root-architecture-publication.md; distingue verificación local, integración y publicación comprobada. No concede despliegue ni nuevos cambios funcionales.

El 2026-11-16 el usuario autorizó commits, integración en main y push de la arquitectura IA con SDK oficiales y perfiles persistentes por trabajo. El registro es docs/work-log/2026-11-16-root-ai-runtime-publication.md. Se preservan main y los otros worktrees con sus cambios ajenos. Esta publicación no concede despliegue, migración sobre datos retenidos ni activación real de Claude.

El 2026-11-24 el usuario autorizó commit y push a main de los pendientes de estabilidad (dirección del cliente detrás de un proxy de borde local, diagnóstico del 503 de Inicio, corrección de p5-integration, presupuesto del build de la API y disparo de CI en push a main). El registro es docs/work-log/2026-11-23-root-stability-followups.md. No concede despliegue.

El 2026-11-25 el usuario autorizó integrar en main y hacer push del pulido de Foxy AI y Mi Estudio (opciones de quiz mezcladas, velocidad y calidad de Gemini, rediseño «Mesa de trabajo»). El registro es docs/work-log/2026-11-24-root-foxy-study-polish.md. No concede despliegue ni activación de las visuales de Foxy.

## Pruebas locales con Gemini (preferencia vigente del usuario)

El 2026-11-08 el usuario pidió conservar y reutilizar la API key que cargó en `.env` de raíz para nuevas funcionalidades y cuando solicite levantar la app para probar. Usar `npm run local:up` (o `local:restart`): lee ese archivo, prepara sólo el entorno propio registrado en `.test-artifacts/local-app/owner.json` y ejecuta API/web con Gemini real. No reemplazar la clave ni cambiar a mocks sin avisar; si falta, detener la configuración del proveedor y solicitar restaurarla, sin buscar secretos históricos. No escribir la clave en memoria, documentación, código o Git. Las pruebas automatizadas aisladas conservan sus proveedores sintéticos por defecto y no deben gastar API por esta preferencia.

La configuración local completa, credenciales y cuentas de prueba quedan sólo en `.env` y `.test-artifacts/local-app/`, ignorados. `local:stop` detiene API/web y los contenedores Docker propios, validando su propietario y conservando contenedores, volúmenes, datos y configuración. No operar sobre los antiguos recursos P3/P4 ni volúmenes ajenos. Ver [arranque local](docs/engineering/local-development/README.md).

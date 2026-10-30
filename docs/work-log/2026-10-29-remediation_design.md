# Diseño de correcciones — listo para TDD

- Agent / role: `/root/remediation_design`, architect, solo lectura.
- Session or task ID: `/root/remediation_design`.
- Persisted by: coordinador `/root`.
- Date: 2026-10-29.
- Branch / worktree: `codex/audit-remediation`.
- Starting commit: `9fddbd815fc01b1822b6093231d6d40dbee979a0`.
- Phase and detailed task/spec links: [contratos y tareas](../../odd/tasks/audit-remediation.md), [auditoría](../audits/2026-10-29-astra-project-audit.md).
- Status: completed (diseño; no implementación).

## Request and scope

Diseño ejecutable de seis frentes autorizados, sin nuevas funcionalidades de negocio ni cambio de stack. El arquitecto declaró `LISTO_PARA_TDD_RED`, sin decisiones de negocio pendientes.

## Work performed

Leyó auditoría, roadmap, protocolo, especificaciones P6/P8/IA, barriles, código y pruebas afectados. Inspección AST de métodos/dependencias. Definió paginación/hilo/cursores precisos, composición completa y dependencias nominadas, lectores TP/cuestionario, intención de transacción con fallback exclusivo, agrupación de progreso, scheduler serial, diagnóstico saneado, recursos UI y gates CI/fronteras. Contratos comunicados incrementalmente; coordinador los persistió en el documento de tareas.

## Verification

Sin tests funcionales propios: rol de diseño read-only. PASS de otros agentes no se le atribuyen. `mem_session_summary` fue rechazado por hook por falta de registro de sesión hija; no hay persistencia Engram confirmada. Recomendó conservar límites y usar fixtures efímeras, DOM real, pruebas de carreras y revisión sobre candidato estable.

## Commits and outcomes

No escribió producto/archivos ni ejecutó commits. Root persistió este registro atribuido. La implementación requiere demostrar los criterios de salida y preservar token Nest `InvitationService`, fachada pública, permisos y semántica académica.

## Handoff

A Muro/contratos, B composición/escala/telemetría, C UI aislada, D CI. Test runner único dueño de tests. Coordinador secuencia barriles/workflow/composición y no declara cierre de todo el frente por un subconjunto.

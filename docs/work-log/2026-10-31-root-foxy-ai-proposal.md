# Foxy AI — propuesta de producto

- Agent / role: /root, coordinador
- Session or task ID: /root; identificador de sesión no disponible
- Date: 2026-10-31
- Branch / worktree: main, checkout actual
- Starting commit: 536d87e
- Phase and detailed task/spec links: propuesta nueva [Foxy AI](../../odd/tasks/foxy-ai-proposal.md); [roadmap](../implementation-roadmap.md)
- Status: completed

## Request and scope
Proponer una sección exclusiva para docentes con chat, contexto general o de sus aulas, recursos, repasos, resúmenes, ideas y planificaciones. Solo diseño de producto; sin implementación, publicación remota, proveedor ni datos reales.

## Work performed
Lectura del roadmap, protocolo, especificación y guías de IA y enseñanza. Propuesta documentada, con límites y decisiones sin aprobar. El checkout ya contenía modificaciones ajenas en apps/web/next-env.d.ts y un archivo no rastreado; preservados.

## Verification
Se comprobaron seis destinos locales de enlaces: todos existen. `git diff --check --no-index -- /dev/null odd/tasks/foxy-ai-proposal.md` no informó errores de espacio; salida 1 esperable por diferencias y aviso de conversión LF/CRLF. Pruebas funcionales no corresponden a una propuesta documental.

## Commits and outcomes
El commit documental se registra al cierre mediante Git; no se presupone su hash.

## Handoff
Revisar la propuesta y acordar D1–D3, retención y formato antes del contrato técnico o implementación.

## Informe atribuido de exploración
- Agente: /root/explorer, solo lectura; persistido por /root. Identificador de sesión no disponible.
- Inspeccionó roadmap, protocolo, guías y tareas de IA, adaptadores de aula y estado Git; no modificó archivos ni inspeccionó Docker. Engram no arrojó observaciones sobre Foxy AI. Una primera consulta de proyecto falló y se repitió con el nombre detectado; la búsqueda documental extensa se truncó y no se ejecutó sg.
- Hallazgo: las cuatro funciones de IA existentes tienen límites propios; el nuevo alcance requiere propuesta y decisiones. Primer paso pendiente: acordar D1–D3 y condiciones de tratamiento de datos.

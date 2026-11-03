# ARQ-07 — revisión independiente

- Agent / role: /root/arq07_review, quality_reviewer, solo lectura.
- Session or task ID: tarea nativa /root/arq07_review.
- Persisted by: /root, a partir del informe del revisor.
- Date: 2026-11-02.
- Branch / worktree: main, C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind.
- Starting commit: add38ec16a6f03e4e4332288b198036161e4cf58.
- Phase and detailed task/spec links: [ARQ-07](../../odd/tasks/architecture-consolidation.md#arq-07--consolidar-contratos-y-frontend), [registro coordinador](2026-11-02-id-unavailable-arq07-contracts.md).
- Status: completed.

## Request and scope

Revisar contratos, hash de replay, vida de sesión, navegación y carreras del cliente. Revisión estática y pruebas puras.

## Work performed

El revisor reprodujo que retirar el destino dejaba el aula anterior montada y que una carga inicial podía pisar el catálogo recién actualizado. El coordinador corrigió ambos casos y el revisor verificó el candidato resultante. Confirmó que el cuerpo crudo de regeneración conserva la compatibilidad del hash y que la reautorización de Agenda queda ligada al sujeto y destino.

## Verification

- Selección pura final 34 PASS, 0 FAIL. Incluyó contratos, polling, UI de generación y clientes web de aulas, P3 y Agenda.
- Fixture en memoria confirmó cambio de key de ClassroomsApp al retirar el enlace dentro de la misma pantalla. La prueba de navegador corresponde al coordinador.
- SHA-256 de los componentes revisados:
  - `src/core/domain/activity-generation-request.ts` `17741fcfdbd4cc002d76bceaa7cba80ef595b45e22fafd6521891f9aa4919154`
  - `apps/api/src/classrooms/activity-ai/service.ts` `4b9b90da4dfe52202e00f5b166b183450816b27471e23d9de97ef5fe67986cdc`
  - `apps/web/src/lib/activity-generation-proxy.ts` `ae5b42c179cbcaad5c9c4e67c3091d1a6faf138e31b5bda5256164fb6f137991`
  - `apps/classrooms-ui/activity-generation-api.ts` `0b413139b297d7d3ed33310eb63eaa705012e1604470c6e6851df45a60cef13c`
  - `apps/classrooms-ui/use-activity-generation.ts` `d1b73dd15dac0109cd62bc8cf88b0dba39c8a09b6822fea5c8d8eac008db8178`
  - `apps/web/src/components/classrooms-screen.tsx` `4d100939d8ca1e79a5e2e8d7fed08a36e3febe1de4059ce64370ecdc69035cec`
  - `apps/classrooms-ui/useAgendaTarget.ts` `a31ea1743a43d00c7709a31c93fcd72da19fb5bdd43a15c4c1ae19e393818b76`
  - `apps/web/src/lib/agenda-client.ts` `93a9d58d4be4d2e99533c22973828e745e5ecc910a721a231b432ea7d4997307`
  - `apps/classrooms-ui/Classrooms.tsx` `afd404cd575cae1f91aa35efe7c074ef8175ecd7a07cf47d5f262b03d0c508d8`
  - `apps/web/src/lib/classroom-client.ts` `ca02b9ec6f966c3db306a8ebb21a784e67cc88ad7e75c77525020d2c2ef312af`
  - `apps/web/src/lib/account-client.ts` `704ca45bd9a9be25f67bc9486ecf229666d7be16b433b6699b31c0f7462f89fb`

## Commits and outcomes

VERIFIED para el candidato revisado. Sin bloqueantes. El revisor no realizó escrituras, builds, navegador, servicios ni migraciones.

## Handoff

Integrar evidencia de producción web, navegador y host de fixtures antes de cerrar la etapa.

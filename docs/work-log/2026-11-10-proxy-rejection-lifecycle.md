# Cierre de rechazo de cuerpos en proxies web

- Agente: `/root/proxy_rejection_lifecycle`, implementador. Identidad de sesión del runtime no expuesta.
- Fecha: 2026-11-10. Rama: `codex/architecture-foundation`. Worktree compartido: raíz del proyecto. HEAD inicial: `fb6035ba3c68cc211f2b9f229197263d60e65dea`.
- Autoridad: encargo de root dentro de autorización humana explícita del 2026-11-10 para corregir cierre prematuro HTTP 413. Sin Git mutante, proveedores, DB, navegador ni servicios retenidos.
- Superficie: `classroom-proxy.ts`, `foxy-proxy.ts`, nuevo `rejected-request-body.ts` bajo `apps/web/src/application/server/`; artefactos propios en `.test-artifacts/architecture-finish/proxy-rejection-fix/` y este registro.
- Contrato: conservar límites JSON, validación y upstream; descarte sin buffering, presupuesto adicional de límite JSON + 1, plazo absoluto de metadata de 10 s desde entrada al proxy. Esperar descarte antes de respuesta; exceso, vencimiento o cancelación abortan transporte. No garantiza 413 para cuerpos arbitrarios.
- Estado: inspección terminada; esperando RED protegido del revisor antes de editar producción. La protección de aceptación es por ownership, sin aislamiento efectivo de filesystem declarado.
- Hallazgo: ambos lectores usan hoy 10 s desde lectura y se reutilizan para upstream. Se propone pasar deadline sólo a lectura de request y conservar timeout upstream.
- Evidencia inicial: diagnóstico independiente `technical-review/transport-flake.md`; inspección de rama/HEAD y fuentes. Árbol compartido con cambios ajenos extensos, preservados.
- Fallos y omisiones: todavía no se ejecutó aceptación propia. Sin commits.
- Próximo paso: recibir contrato y RED de `technical_backend_review`, implementar y ejecutar focales protegidos.

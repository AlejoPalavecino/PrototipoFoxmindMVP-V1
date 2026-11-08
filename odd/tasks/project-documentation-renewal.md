# Base documental actual de FoxMind

- **Spec:** [especificación vigente](../../docs/foxmind-v1-functional-spec.md), [política](../../docs/documentation-policy.md).
- **Design:** [UX/UI implementada](../../docs/design/README.md), [capturas](../../docs/design/current/README.md).
- **Approval:** usuario aprobó estructura documental y pidió documentar diseño actual. Luego autorizó lanzar app, recorrer ambos roles con Ego Lite y eliminar toda documentación vieja. No es un rediseño ni una autorización de publicar.
- **Owner:** /root, coordinador y único escritor de este registro.
- **Record:** [registro de ejecución](../../docs/work-log/2026-11-07-root-current-baseline.md).

## DOC-01 — Relevar implementación y preparar ejecución
- **State:** DONE
- **Depends on:** none
- **Owner:** /root
- **Acceptance:** fuentes actuales, servicios aislados sin datos retenidos, compilaciones frescas y ambos roles sintéticos.
- **Evidence:** revisión de fuentes; API/Next compilados; 46 migraciones en base vacía; dos roles creados y acceso observado. Detalle en registro.
- **Blocker:** none

## DOC-02 — Recorrer UX/UI y registrar cobertura
- **State:** DONE
- **Depends on:** DOC-01
- **Owner:** /root
- **Acceptance:** navegación real por rol/sección, mutaciones representativas, desktop/tablet/mobile, capturas y límites explícitos por flujo.
- **Evidence:** [46 entradas de cobertura](../../docs/verification/flows.md), [165 capturas y metadatos](../../docs/design/current/catalog.json), recibos complementarios. Ego TaskSpace 2 cerrada. No se declara PASS de ramas no ensayadas.
- **Blocker:** none

## DOC-03 — Sustituir documentación vieja por base única
- **State:** DONE
- **Depends on:** DOC-01, DOC-02
- **Owner:** /root
- **Acceptance:** arquitectura/tecnologías/modelo/roles/UX actual y mantenimiento enlazados; contenido anterior eliminado; contratos ejecutables y licencias conservados; sin referencias rotas.
- **Evidence:** [recibo de retiro](../../docs/verification/documentation-retirement.json): 2294 documentos/artefactos históricos y 30 auxiliares de navegador obsoletos. Revisión de consumidores detectó y añadió browser-05 dependiente. Primera comprobación documental: 7 referencias pendientes, corregidas antes del cierre.
- **Blocker:** none

## DOC-04 — Comprobar y cerrar entrega local
- **State:** DONE
- **Depends on:** DOC-03
- **Owner:** /root
- **Acceptance:** enlaces/contratos/CI/hashes/modelos comprobados; helper de entorno arranca y limpia; revisión independiente y registro exactos.
- **Evidence:** [comprobaciones](../../docs/verification/baseline-checks.json). Helper reutilizable arrancó, respondió HTTP200 y terminó exit0 con cleanup failures0. Docs 48/632/0, 35 tests focales PASS, hashes/modelos/contratos comprobados y revisión independiente sin hallazgos abiertos.
- **Blocker:** none

## Próxima acción

Entrega local cerrada: DOC-01–04 DONE con evidencia observada. Próxima funcionalidad: usar la base canónica, actualizar guía/contratos/roles/datos/UX afectados y abrir un único registro TTP si corresponde R2. No hay trabajo de producto autorizado por este cierre. Sin commits/push/despliegue.

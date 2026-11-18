# Base documental actual de FoxMind

- **Spec:** [especificación vigente](../../docs/foxmind-v1-functional-spec.md), [política](../../docs/documentation-policy.md).
- **Design:** [UX/UI implementada](../../docs/design/README.md), [capturas](../../docs/design/current/README.md).
- **Approval:** approved
- **Evidence mode:** candidate-v1

El usuario autorizó actualizar la documentación, retirar material viejo, capturar la app y desarrollar el README. Eligió el sistema visual Brújula para los diagramas. Los registros DOC-01 a DOC-04 corresponden al cierre del 7 de noviembre.

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
- **Evidence:** [46 entradas de cobertura](../../docs/verification/flows.md), [165 capturas y metadatos del corte anterior](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/design/current/catalog.json), recibos complementarios. Ego TaskSpace 2 cerrada. No se declara PASS de ramas no ensayadas.
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

## Publicación posterior autorizada

El usuario autorizó commits/push/integración y rama única el 2026-11-08. DOC-01–04 se publicaron en main mediante 620331241f0ba5a0524389078d9eef33529cc342; [recibo](../../docs/work-log/2026-11-08-root-main-publication.md). Sustituye el límite Git del cierre local anterior, conservado como evidencia de aquel momento. Sin despliegue.

## Actualización documental del 18 de noviembre

### TASK-001 — Encontrar el producto, sus funciones y sus fuentes vigentes
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** README, guías, índice y estado explican la distribución actual. Las referencias vigentes y los recibos históricos se distinguen, y los contratos y enlaces siguen resolviendo.
- **Scope:** ["README.md","docs/README.md","docs/implementation-roadmap.md","docs/documentation-map.json","docs/engineering/architecture.md","docs/product/features-by-role.md","docs/verification/README.md"]
- **Evidence:** {"command": "npm run docs:check; pruebas de enlaces, identidad, CI, migraciones y cuota", "result": "Control combinado sin enlaces rotos; 45 pruebas focalizadas pasaron. Inventario inicial de 1.354 archivos. Los contratos OpenAPI y de calificación conservaron sus bytes.", "candidate": "sha256:7ca111df096d70af110f3b97f20058ad95e741be05879604ed5ebdb07c609744"}
- **Blocker:** none

### TASK-002 — Reconocer la interfaz y seguir los recorridos visuales del sistema
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** Galería nueva con ambos roles, escritorio y móvil, guía de estilo fundada en CSS y diagramas autónomos de arquitectura, de una actividad y del estudio privado con evidencia de lectura.
- **Scope:** ["docs/design/README.md", "docs/design/current/README.md", "docs/design/current/catalog.json", "docs/diagramas/arquitectura.html", "docs/diagramas/actividad.html", "docs/diagramas/estudio.html", "docs/diagramas/actividad.png", "docs/diagramas/arquitectura.png", "docs/diagramas/estudio.png", "docs/design/current/vigente-acceso-publico-1440.png", "docs/design/current/vigente-agenda-docente-1440.png", "docs/design/current/vigente-agenda-docente-390.png", "docs/design/current/vigente-agenda-estudiante-1440.png", "docs/design/current/vigente-agenda-estudiante-390.png", "docs/design/current/vigente-aulas-docente-1440.png", "docs/design/current/vigente-aulas-docente-390.png", "docs/design/current/vigente-aulas-estudiante-1440.png", "docs/design/current/vigente-aulas-estudiante-390.png", "docs/design/current/vigente-busqueda-docente-1440.png", "docs/design/current/vigente-busqueda-docente-390.png", "docs/design/current/vigente-chat-estudio-estudiante-1440.png", "docs/design/current/vigente-chat-estudio-estudiante-390.png", "docs/design/current/vigente-crear-aula-docente-390.png", "docs/design/current/vigente-crear-carpeta-estudiante-390.png", "docs/design/current/vigente-cuota-ia-docente-1440.png", "docs/design/current/vigente-cuota-ia-docente-390.png", "docs/design/current/vigente-cuota-ia-estudiante-1440.png", "docs/design/current/vigente-cuota-ia-estudiante-390.png", "docs/design/current/vigente-foxy-docente-1440.png", "docs/design/current/vigente-foxy-docente-390.png", "docs/design/current/vigente-ingresar-aula-estudiante-390.png", "docs/design/current/vigente-inicio-docente-1440.png", "docs/design/current/vigente-inicio-docente-390.png", "docs/design/current/vigente-inicio-estudiante-1440.png", "docs/design/current/vigente-inicio-estudiante-390.png", "docs/design/current/vigente-menu-docente-390.png", "docs/design/current/vigente-menu-estudiante-390.png", "docs/design/current/vigente-mi-estudio-estudiante-1440.png", "docs/design/current/vigente-mi-estudio-estudiante-390.png", "docs/design/current/vigente-notificaciones-docente-1440.png", "docs/design/current/vigente-notificaciones-docente-390.png", "docs/design/current/vigente-notificaciones-estudiante-1440.png", "docs/design/current/vigente-notificaciones-estudiante-390.png", "docs/design/current/vigente-perfil-docente-1440.png", "docs/design/current/vigente-perfil-docente-390.png", "docs/design/current/vigente-perfil-estudiante-1440.png", "docs/design/current/vigente-perfil-estudiante-390.png", "docs/design/current/vigente-plan-aula-docente-1440.png", "docs/design/current/vigente-plan-aula-docente-390.png", "docs/design/current/vigente-plan-aula-estudiante-1440.png", "docs/design/current/vigente-plan-aula-estudiante-390.png"]
- **Evidence:** {"command": "Validación del catálogo contra SHA-256 y dimensiones; Chromium offline; recorrido Ego Lite", "result": "42 capturas en ambos roles y dos anchos, 3 diagramas comprobados con navegación móvil. El control de la skill señala únicamente la fuente embebida; comprobada sin red.", "candidate": "sha256:5d51c08771f509841f6e26cd3f6c91abcfae2195d93fc0f8a8fb85aa1c793737"}
- **Blocker:** none

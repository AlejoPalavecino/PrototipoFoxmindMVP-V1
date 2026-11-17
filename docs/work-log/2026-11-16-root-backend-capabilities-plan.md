# Planificación de la reorganización del backend por capacidades

- Agente: `/root`, orquestador; identificador de sesión no expuesto.
- Fecha: 2026-11-16.
- Base: `main`, commit `dd6f4bc92b959cce0e2c68343291614270c4a17e`, checkout principal.
- Pedido: diseñar un plan para aplicar los hallazgos de la auditoría backend con organización por dominio y capacidad funcional.
- Autorización: elaborar la propuesta documental. La solicitud no autoriza implementar la refactorización, crear commits ni publicar.

## Alcance y preparación

La propuesta toma la auditoría realizada en esta conversación y contrasta la estructura con arquitectura, migración anterior, contratos públicos, reglas AST, loader de pruebas e inventarios actuales. Conserva los 13 dominios, stack, comportamiento, contratos HTTP y persistencia. La distribución exacta y las decisiones internas se presentan para revisión, sin declararlas arquitectura implementada.

Se preservan las eliminaciones locales de `design/` y los tres documentos ajenos sin seguimiento observados al iniciar. No se usan secretos, servicios, proveedores ni datos retenidos. No se delega: la auditoría anterior ya aportó el mapa necesario.

## Evidencia de preparación

- `git status --short`, rama, HEAD y worktrees: base confirmada; cambios ajenos identificados.
- Lectura de `scripts/migration-boundaries.mjs`: sus reglas actuales asumen capas directamente debajo del módulo.
- Lectura de build, loader, suites y descubrimiento: hay rutas explícitas que deben migrar con cada capacidad; los tests compilados requieren build fresco.
- `npm.cmd run docs:check` antes de editar: exit 0; 167 archivos, 1085 enlaces, 0 problemas.

## Entrega documental

[Propuesta y plan](../engineering/backend-capabilities-plan.md), con estructura, mapa de los 13 dominios, secuencia, dependencias, aceptación, pruebas y recuperación. Se enlaza desde Ingeniería y se incorpora junto a este registro al mapa documental.

## Comprobaciones y cierre

- `npm.cmd run docs:check` con la propuesta y el registro incorporados: exit 0; 169 archivos, 1089 enlaces, 0 problemas. El resultado precede a esta anotación de cierre, que no agrega enlaces.
- `git diff --check`: exit 0; los cambios propios seguidos corresponden sólo al mapa documental y al enlace desde Ingeniería. Los dos documentos propios nuevos se revisan también como archivos sin seguimiento.
- Relectura de alcance, etapas P01–P12, dependencias, trazabilidad y aceptación: propuesta coherente con los hallazgos, sin afirmar implementación ni validación funcional futura.
- HEAD se conserva en `dd6f4bc92b959cce0e2c68343291614270c4a17e`; trabajo ajeno preservado. No se ejecutan tests de producto, build ni servicios porque el cambio es documental.

Estado: plan entregable para revisión, implementación pendiente. No se crea tablero TTP antes de aprobar el plan y autorizar ejecución. Primer paso posterior: resolver las decisiones propuestas y trasladar las unidades aprobadas a un único tablero.

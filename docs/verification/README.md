# Evidencia de FoxMind

## Candidato integrado y pruebas recientes

| Qué se comprobó | Evidencia |
| --- | --- |
| Cuotas mensuales, concurrencia, saldo e imágenes privadas en Mi Estudio | [Verificación con proveedores sintéticos](../work-log/2026-11-18-root-monthly-ai-quota.md) y [tablero de aceptación](../../odd/tasks/monthly-ai-quota.md) |
| Integración de frontend y backend, recorridos de Aulas y recuperaciones posteriores | [Integración de arquitectura](refactor-integration.json), [consolidación de main](main-consolidation.json) y [correcciones de Aulas](../work-log/2026-11-17-root-classroom-audit-fixes.md) |
| Foxy y Mi Estudio, latencia, interacción y recuperación | [Mediciones con Gemini y suite integrada](../work-log/2026-11-17-root-cierre-main.md) y [auditoría funcional](../work-log/2026-11-17-root-foxy-study-audit-fixes.md) |
| Exportaciones, recursos didácticos y práctica | [Verificación del arnés](../work-log/2026-11-17-root-cierre-arnes.md), [precisión gráfica y lectura de PDF](../work-log/2026-11-17-root-precision-y-lectura.md) y [comparación con Gemini](pedagogical-pilots.md) |
| Seguridad, acoplamiento y cohesión de frontend, backend y base de datos | [Auditoría estática del 26 de noviembre](../work-log/2026-11-26-root-full-stack-audit.md), sobre `c5298e77`, sin pruebas ejecutadas. Remediación de B1, B2, S10, S11, D13 y F10 en [arreglos acotados](../work-log/2026-11-26-root-audit-bounded-fixes.md) y de S2–S5 en [cupos compartidos](../work-log/2026-11-26-root-audit-shared-limits.md); S1 en [rol de base](../work-log/2026-11-26-root-audit-database-role.md) |
| Piloto educativo con personas | [Guion preparado para coordinación](piloto-con-participantes.md), pendiente de ejecución |

La [galería de la aplicación](../design/current/README.md) identifica su candidato, roles y anchos. Una captura muestra la presentación y los estados visibles. Los ensayos de API, base de datos y recorrido autenticado acreditan los resultados que ejercitaron.

## Recibos históricos

- [Paridad del 15 y 16 de noviembre](product-parity/README.md). Incluye la evidencia de revisión contra UI Lab y los cortes que condujeron a la integración.
- [Matriz de recorridos](flows.md) e [inventario de la base del 7 de noviembre](flows.json). Conservan su candidato original, fecha, entorno y límites por flujo.
- [Auditoría del 12 de noviembre](../work-log/2026-11-12-root-documentation-audit.md), sobre `398cc0b` con ambos roles y proveedores sintéticos. [Galería histórica](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/design/current/README.md) · [Catálogo original y hashes](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/design/current/catalog.json).
- [Migración de arquitectura](architecture-migration.json), [cohesión del frontend](frontend-cohesion.json) y [mapa de capacidades del backend](backend-capabilities-map.json). Recibos de cortes previos a la integración.
- [Gemini real en Foxy](foxy-gemini-real.json) y [ensayo del entorno local persistente](local-gemini-runtime.json), ambos del 8 de noviembre.
- [Retiro documental del 7 de noviembre](documentation-retirement.json) y [retiro del 12 de noviembre](documentation-audit-retirement.json).

Las rutas registradas en recibos JSON se interpretan en el candidato del ensayo. Las galerías y los registros retirados se pueden consultar en el árbol del commit `2ed07b67`. [Evidencia original](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/tree/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification) · [Registros originales](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/tree/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/work-log).

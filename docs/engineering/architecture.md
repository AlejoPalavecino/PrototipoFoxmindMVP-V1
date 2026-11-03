# Mapa de arquitectura

El navegador usa Next.js y sus proxies `/api/v1`; el host Nest compone transportes y servicios, con dominio y puertos compartidos. La configuración determina qué módulos de archivos y aulas se integran. Las guías y contratos enlazados contienen las reglas.

```text
Navegador -> Next /api/v1 -> Nest (composición y transportes)
                                    |
                          servicios -> dominio / puertos
                                    |
 PostgreSQL, almacenamiento privado, escáner, correo y proveedor IA
```

- [Identidad](identity/README.md) y [archivos](files/README.md): sesión, autorización y contenido privado.
- [Aulas](classrooms/README.md), [enseñanza](teaching/README.md), [actividades](activities/README.md), [corrección](grading/README.md), [agenda](agenda/README.md) e [inicio](home/README.md): capacidades por dominio.
- [IA](ai/README.md): extracción de planes, generación de actividades, análisis y asistencia de corrección; cada función conserva sus límites y privacidad.
- [Operación local](local-development/operation.md) y [pruebas](testing/README.md): configuración, recursos propios y limpieza. Los procesos de trabajo y su ciclo de vida se describen en las guías correspondientes.

La cuenta verificada que inicia sesión ordinariamente llega a `/inicio`; destinos explícitos permitidos e invitaciones conservan su flujo y la verificación sigue siendo obligatoria.

## Dónde empezar un cambio

1. Ubicá la regla en la [especificación funcional](../foxmind-v1-functional-spec.md). Para reglas relevadas durante la consolidación, consultá la [matriz de diferencias](../../odd/tasks/architecture-consolidation-arq01-matrix.md) y verificá si hay una decisión de producto pendiente.
2. Entrá por la guía del dominio correspondiente. Seguí el contrato desde el proxy hasta el transporte, la capacidad dueña y su persistencia. El [diseño aprobado](../../odd/tasks/architecture-consolidation-arq03-design.md) identifica límites, contratos de extracción y excepciones. Classrooms comparte capacidades acotadas, el puente de adjuntos coordina custodia y autorización, y la admisión común de IA coordina colas cuyos servicios conservan sus reglas.
3. Elegí pruebas de contrato, permisos y persistencia según el cambio. Usá el [inventario y las instrucciones de ejecución](testing/README.md) para localizar el grupo y preparar recursos sintéticos propios. Antes de incorporar una dependencia entre módulos, comprobá `npm run lint:boundaries`.

Fuentes: [inicio del host](../../apps/api/src/main.ts), [composición](../../apps/api/src/application.ts), [barril del dominio](../../src/core/domain/index.ts) y [scripts](../../package.json). El [estado actual](../implementation-roadmap.md#estado-actual) registra estado y evidencia.

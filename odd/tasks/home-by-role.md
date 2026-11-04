# Inicio por rol

Diseño y ejecución aprobados el 2026-11-03. [Registro de ejecución](../../docs/work-log/2026-11-03-id-unavailable-home-by-role.md).

| Resultado | Estado | Responsable | Dependencia | Criterio de aceptación |
|---|---|---|---|---|
| Inicio por rol | DONE | root | Aprobación | Banner Foxy 3D con nombre y fecha, cuatro destinos reales, prioridad por rol, miniagenda y estados independientes. |
| Contexto de aula y Foxy | DONE | root | Datos de Inicio | Avance docente con temas dados sobre total, consultas sin respuesta docente, sugerencias por señales vigentes y fallback sin IA externa. |
| Verificación | DONE | root | Ambos resultados | Pruebas de reglas, tipos, límites y navegador cuando esté disponible. |

Se conservan navegación autorizada y módulos de devoluciones y materiales. Las aulas archivadas conservan acceso de solo lectura. El progreso se agrega al resumen docente existente sin migraciones.

Reglas, contrato, presentación y recorrido integrado verificados. P9 con PostgreSQL aislado cerró con 13 PASS, 0 FAIL y 0 SKIP. [Evidencia de cierre](../../docs/work-log/2026-11-03-id-unavailable-home-postgres.md).

## Taller Cálido aprobado el 2026-11-04
El usuario autorizó implementar el mockup foxmind-taller-calido-glass.html para ambos roles, sin despliegue. El diseño reemplaza la composición anterior. [Registro](../../docs/work-log/2026-11-04-id-unavailable-home-warm-glass.md).

| Resultado | Estado | Responsable | Dependencia | Criterio y evidencia requerida |
|---|---|---|---|---|
| Composición Taller Cálido | DONE | root | Diseño aprobado | Banner panorámico con saludo legible a la izquierda, vidrio con fallback, Foxy completo en celular, cuatro accesos con patrón común y colores suaves. |
| Widgets y navegación | DONE | root | Composición | Foxy junto a accesos, tareas/consultas por rol, agenda y aulas compactas. Perfil y notificaciones en navegación. Se retiran recursos y actualizar del Inicio normal. Reintentos ante error disponibles. |
| Verificación visual y funcional | DONE | root | Ambas tareas | Tipos, pruebas focales y recorrido de ambos roles en escritorio/celular, menú, notificaciones, navegación y errores. |

Se reutilizan permisos, reglas y endpoints. El banner generado se incorpora como recurso local. El resto de las pantallas conserva su navegación habitual.

Evidencia de cierre: 54 pruebas focales, 8 de contratos, P9 integrado 13/13, ocho vistas sintéticas a 320/390/768/1440 px y nombre largo a 320 px. Los tres hallazgos de revisión independiente se corrigieron y verificaron. Build API/web, límites estáticos y enlaces aprobados. Detalle y fallos conservados en el registro del 2026-11-04.

Entrega local en main autorizada posteriormente: [registro de integración](../../docs/work-log/2026-11-04-id-unavailable-home-warm-main.md). Incluye recursos, pruebas y registros; sin push ni despliegue y sin modificar los worktrees de Mis aulas y Agenda.

## Pulido aprobado el 2026-11-04

| Resultado | Estado | Responsable | Dependencia | Criterio y evidencia |
|---|---|---|---|---|
| Densidad y legibilidad | DONE | root | Pedido con capturas | Banner más bajo y vidrio más opaco, dos familias computadas. Agenda sin zonas técnicas ni superposiciones; fecha legible con 8/16 px de separación. Revisión con contadores y aulas en tarjetas con anillo fiel. Matriz responsive aprobada. |
| Cuenta e íconos | DONE | root | Alcance aprobado | SVG locales Phosphor con licencia. Nombre y desplegable con perfil y salida verificados en teclado y ambos roles; Escape conserva el drawer. |
| Verificación | DONE | root | Ambas tareas | 65 pruebas focales/contratos, build y fronteras aprobados. Matriz 320/390/768/1440, nombre largo y acciones aprobados. P9 real13/13, limpieza0fallos y revisión independiente sin hallazgos abiertos. |

[Registro de ajustes](../../docs/work-log/2026-11-04-id-unavailable-home-refinement.md). No modifica otros worktrees ni autoriza publicación.

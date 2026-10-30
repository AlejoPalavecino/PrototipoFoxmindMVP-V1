# Revisión de correcciones — candidato inicial rechazado

Target inicial: `5c7db5181a594c3fe373bb911beec0a3276e2e40ccfdf6e6b28cb88e99353ea9`, base `9fddbd8`. Dos jueces ciegos leyeron el mismo candidato inmutable y no conocieron el resultado del otro. Verificador independiente reconcilió 1176 archivos no-doc y 2693 paths totales, sin drift. Sin cambios de producto de los revisores.

## Ledger congelado inicial

| ID | Origen / severidad | Evidencia y disposición |
|---|---|---|
| JD-CI1 | A HIGH + B HIGH; confirmado por ambos | Nuevo job integration-owned activa fixture con inventario fijo14 frente19. Runtime aborta antes del producto. Corregir la raíz de fixtures y aserciones obsoletas; conservar migrate/drift/applied-history y casos funcionales. |
| TDD-COMP1 | A HIGH; no reportado por B; verifier FAIL independiente | Getters de fachada lanzan al consultar métodos en prototype; rompe P7/P8 y compatibilidad existente. Bloqueante de GREEN por test existente, no se presenta como confirmación inicial de ambos jueces. |
| TDD-LOCK1 | B HIGH; no reportado por A | Activity AI GET registra lectura/classroom SHARE, pero revalidate/curriculum pide UPDATE de la misma aula; dos GET READY pueden deadlock. Requiere regresión determinista antes del fix y mantener exclusividad de escrituras/tx externas. |
| TDD-NOTIF1 | A WARNING + B WARNING; información concordante | loadMore de Todas puede llegar tras cambiar a Sin leer y pisar items/cursor. Corrección funcional cubierta por el pedido actual de aislamiento UI; no se etiqueta como hallazgo severo confirmado. |
| DOC-HIGHWATER | A WARNING, informativo | Cursor de respuestas no tiene highwater. El contrato arquitectónico incremental prometió highwater del feed, no snapshot de respuestas. Precisar documentación y conservar limitación; no ocultar evidencia ni añadir una promesa de snapshot. |
| TDD-CLOCK1 | Verifier FAIL, fixture preexistente | p8-corrections compara clock_timestamp PostgreSQL contra Date.now Windows; 12/12 muestras DB adelantadas39–40ms. No es una regresión funcional demostrada. Corregir medición entre relojes conservando prueba de timestamp real y límites de operación. |

No hay contradicción explícita entre jueces; ausencia de un hallazgo en el otro resultado no equivale a aprobación. Conteo JD inicial: 1 severo confirmado, 2 severos sospechosos, 2 filas informativas. Los bloqueantes de TDD y regresiones de funcionalidad se reparan bajo la autorización vigente de resolver los seis frentes; no se inventa consenso de revisión para ellos.

## Corrección y revisión acotadas

Primera ronda de correcciones, dentro del alcance ya autorizado por el usuario. El actor de CI limita su parche al severo confirmado JD-CI1. Los implementadores de GREEN resuelven bloqueantes demostrados por pruebas y la carrera UI reportada; test_runner conserva propiedad exclusiva de tests. No nuevos features, migraciones, estados de negocio o permisos.

Revisión posterior de ambos jueces solo sobre este ledger y delta inmutable de corrección. Presupuesto máximo: dos rondas de fix y dos re-juicios; no se reinicia. Estado actual: corrección1 implementada y re-juicio1 sin hallazgos en ambos jueces; cierre global pendiente de verificación final.

Resultados de corrección1 comunicados y pendientes de aceptación integral: métodos de prototipo8 PASS; lock Activity AI READY RED real `deadlock detected` y después GREEN DB1 PASS; notificaciones RED y GREEN React DOM con A→B, A→B→A, error tardío y refresh concurrente; reloj de correcciones SQL11 PASS. JD-CI1 conserva deploy/diff/history, inventario dinámico no vacío y SQL presente; integración completa en curso. Los seis tests de inventario y el test de reloj los modificó exclusivamente test_runner. Se preservan todos los resultados iniciales rechazados.

DOC-HIGHWATER: texto de tareas precisado a highwater del feed. Respuestas siguen siendo páginas acotadas de datos actuales, sin snapshot/highwater. Es una limitación informativa conservada; no se declara implementado el snapshot opcional.

Re-juicio1, atribuido por coordinador: `/root/jd_judge_a` y `/root/jd_judge_b` comprobaron los SHA de24 paths (16 código/tests, ocho docs), inspeccionaron únicamente ledger/delta y devolvieron findings vacíos. Confirmaron mecanismos de inventario, prototipo/bindings, intención de datos separada de autenticación, generaciones de UI y reloj SQL; no ejecutaron las suites ni certificaron integración completa. Veredicto de revisión del delta1 aprobado, distinto de DoD global.

Suplemento final acotado, sin cambios funcionales: se añaden al manifiesto CI tres regresiones ya existentes (deadlock Activity AI, concurrencia aulas y Muro HTTP/DB), y el test de deadlock agrega una aserción de que GET mantiene authenticate(false). No se retiran aserciones. Ambos cambios reciben re-juicio2 final sobre delta suplementario y ledger; no se reinicia presupuesto. P4 integración round1 ya observada9/0/0 en81s, deploy/diff/history/reinicio y cleanup0; verificador independiente repetirá sobre fuente final.

## Registros atribuidos de jueces read-only

- `/root/jd_judge_a`, reviewer, 2026-10-29: inspeccionó contratos/arquitectura, sesiones TP/QE, locks, publicación, Muro/notificaciones, frontend y CI/dependencias. Reportó JD-CI1, TDD-COMP1, TDD-NOTIF1 y DOC-HIGHWATER. Sin escrituras, tests, builds, DB, red ni commits. Coordinador persiste este registro atribuido.
- `/root/jd_judge_b`, reviewer, 2026-10-29: verificó SHA de2693 archivos y examinó mismo alcance; reportó TDD-LOCK1, JD-CI1 y TDD-NOTIF1. Reprodujo carrera de estado en memoria. Sin escrituras, builds, DB, navegador, red ni commits. Coordinador persiste este registro atribuido.
- Ambos aplicaron judgment-day, clean-architecture y criterios caveman-review; formato nativo JD prevaleció. Hallazgos de fuente y verificación comunicada se distinguieron en sus pruebas.

## Evidencia de verificación independiente

[Registro sol/xhigh](../work-log/2026-10-29-remediation_verify.md): builds/types/fronteras/audit0 PASS, pure70/0/0 y transport35/0/2; integration-owned8/1/0 por fixture; participación10/1/0 por prototype; selección académica49/2/7 por reloj y padre fallido; IA44/0/0; DB independiente11/0/0; mail/DI16/0/0; backendHTTP8/0/0. Las selecciones parciales no se suman como suite integral ni sustituyen los FAIL.

# TASK-010 · Backend Agenda por responsabilidades

- Agente: `/root/agenda_backend`, rol implementador delegado; sesión no expuesta.
- Fecha: 2026-11-10. Rama: `codex/architecture-foundation`. Base: `ca68a31c7fcfde29f9566e920108abef48aeeaa1`.
- Autorización: piloto aprobado en `docs/engineering/architecture-migration.md`; TASK-010 delegado por coordinador.
- Superficie propia: `apps/api/src/modules/agenda/**`, wrappers `apps/api/src/agenda/**` salvo host/integration, prueba nueva `tests/agenda-module.test.mjs` y este registro. Sin tablero, bootstrap, contratos Aulas, CI ni publicaciones.
- Resultado buscado: trasladar implementación única; unidad transaccional recibe fábrica académica obligatoria con el mismo tx/actor. Preservar SQL, locks, reautenticación, errores y contratos.
- Unidad revisable: traslado mecánico más inyección explícita y prueba focalizada. El volumen de movimientos puede superar 400 líneas; no se divide dejando consumidores sin implementación.
- Estado inicial: trabajo concurrente del coordinador en dominio/documentación; se conserva.
- RED observado: `node --test tests/agenda-module.test.mjs`, salida 1, 4 tests / 0 PASS / 4 FAIL. Causa esperada: ENOENT de módulos modernos inexistentes (`infrastructure/unit-of-work.ts` y `public.ts`).
- Implementación: servicio/paginación/puertos en application; repositorio/fila/unidad transaccional en infrastructure; HTTP/entradas/rutas en presentation. `public.ts` expone servicio y contratos, sin persistencia/HTTP. Wrappers históricos conservan todos los exports nombrados; el index histórico ya componía wrappers sin host y no requirió edición. Reglas importadas desde el dominio Agenda agrupado.
- Cambio de autoría: fábrica `AcademicAgendaFactory(tx, actor)` obligatoria como tercer argumento de la unidad moderna; se retira import de Aulas. No hay fallback ni nueva transacción. El wrapper histórico requiere `bootstrap/agenda-composition.ts`, propiedad del coordinador.
- GREEN observado: `node --test tests/agenda-module.test.mjs`, salida 0, 4 tests / 4 PASS / 0 FAIL (653 ms en segunda ejecución). Comprueba misma consulta transaccional y actor, locks, reautenticación, cuenta verificada, errores seguros y superficie pública sin import Aulas.
- Regresión pura: `node --test --test-name-pattern='daily recurrence|monthly recurrence|new recurrences retain' tests/agenda-recurrence.test.mjs`, salida 0, 3 tests / 3 PASS / 0 FAIL. No se ejecutó el caso PostgreSQL filtrado.
- Equivalencia mecánica: script Python comparó servicio, paginación, repositorio, fila y los tres HTTP con `git show HEAD:<ruta anterior>`, normalizando exclusivamente imports de destino. Resultado: 7/7 PASS; SQL y cuerpos restantes idénticos. `git diff --check -- apps/api/src/agenda`: sin errores.
- Límites: no build global, suites DB/HTTP de integración ni guard global, por coordinación de escritores. Los tests protegidos no se editaron. Al comprobar el wrapper, bootstrap aún no existía; la compatibilidad de 2 argumentos y suites que cargan index quedan pendientes de composición y verificación del coordinador. Sin acceso a secretos/proveedores/Docker/datos retenidos ni commits.
- Entrega: implementación y prueba focalizada verificadas localmente; integración pendiente. Primer paso del coordinador: crear wrapper bootstrap que inyecte `createAcademicAgenda` público de Aulas y ejecutar build/suites del piloto/guard actualizado. Sólo el coordinador actualiza TASK-010.
- Reversión: restaurar exclusivamente wrappers propios y eliminar módulos/prueba/registro de esta unidad, coordinando reversión de bootstrap con el padre.

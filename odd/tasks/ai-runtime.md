# Feature: ejecución IA con SDK oficiales

- **Spec:** docs/engineering/ai/runtime-proposal.md
- **Design:** docs/engineering/ai/runtime-proposal.md
- **Approval:** approved
- Decisión: 2026-11-16, usuario aprobó diseño e implementación y confirmó «Bien vamos con los oficiales». Gemini inicial, Claude preparado para activación futura; sin publicación ni datos retenidos.
- Ampliación aprobada en esta sesión: «Bien vamos con eso» autoriza la identidad persistente y drenar pendientes antiguos antes de cambiar perfiles; migración probada sólo en bases descartables.

## Tasks

### TASK-001 — Contrato neutral, perfiles y ejecución controlada
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** Rechazar proveedor/capacidad incompatibles antes de transmisión; contar y generar con autorización, plazo total y consumo conservador; sin reintentos ni datos sensibles en métricas.
- **Evidence:** RED por módulo ausente; GREEN tests/ai-text-execution.test.mjs 11/11, incluye autorización, payload, plazos, reserva en vuelo, salida rechazada y métricas sin contenido privado.
- **Blocker:** none

### TASK-002 — Adaptadores oficiales Gemini y Claude
- **State:** DONE
- **Depends on:** none
- **Owner:** official_transports
- **Acceptance:** Ambos serializan PDF/JSON, cuentan tokens y normalizan finalización/consumo con SDK real y transporte sintético. No requieren llamadas externas al importarse ni activan Claude por defecto.
- **Evidence:** RED módulos ausentes; 10/10 pruebas de SDK/serializador sintético verificadas por root, incluye protección de credenciales. Registros de worker y revisión independiente reconciliados.
- **Blocker:** none

### TASK-003 — Integración con Gemini y separación de Estudio
- **State:** DONE
- **Depends on:** TASK-001, TASK-002
- **Owner:** root y study_execution, superficies disjuntas
- **Acceptance:** Configuración inicial conserva modelo/credenciales, clientes técnicos comunes, Estudio separa presupuesto de transporte. Leases/permisos y puertos existentes conservados; ningún trabajo se redirige a Claude.
- **Evidence:** Build API/TS y suites de adapters 54/54; Study PostgreSQL descartable 4/4; advisory real de reserva tras vencimiento 1/1, sin generación, reserva/consumo cero. Gemini único proveedor efectivo.
- **Blocker:** none

### TASK-004 — Regresiones y revisión de seguridad independiente
- **State:** DONE
- **Depends on:** TASK-003
- **Owner:** root y quality_reviewer
- **Acceptance:** Build, límites de arquitectura, suites afectadas e inventario; revisión independiente con fallos corregidos. Distinguir pruebas sintéticas de DB/proveedor real y medir conteos evitados de forma reproducible.
- **Evidence:** Revisión independiente corrigió/reverificó P1 reserva tardía y P1 fuente académica revocada. pure 347/347, transport 87/87, Study 77/77, finales propias 41/41; dependencias focales 8/8. Build fresco programático con presupuesto 180 s: Prisma+TypeScript exitosos en unos 76 s. Límite general 30 s y local 90 s agotados en ejecuciones anteriores, registrados sin ocultarlos. Inventario y límites de arquitectura válidos.
- **Blocker:** none

### TASK-005 — Documentación y entrega local recuperable
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** root
- **Acceptance:** Guías/registro/tablero coinciden con código, docs:check y taskboard válidos. Main y worktrees ajenos preservados; sin commit/push/deploy.
- **Evidence:** Guías IA/arquitectura/Estudio/Foxy/pruebas reconciliadas. docs:check 149 archivos y 876 enlaces sin incidencias, taskboard válido, inventario/rutas válidos y main conserva estado inicial. Sin commits ni publicación.
- **Blocker:** none

### TASK-006 — Identidad persistente y política de pendientes antiguos
- **State:** DONE
- **Depends on:** TASK-005
- **Owner:** root
- **Acceptance:** Snapshot inmutable sin claves/contenido en seis familias y política persistente que impide inferir identidad de legacy y bloquea su reintroducción; tarifas de reserva/liquidación independientes de configuración nueva.
- **Evidence:** RED snapshot4/4 ausente→GREEN5/5; PostgreSQL upgrade/policy/tarifas/fence/concurrencia e inventario 14/14 tras corregir CASE SQL; snapshots unitarios en regresión focal. Migración aditiva conserva filas NULL/historia; baseline no se inicializa con legacy pendiente. Reserva110/liquidación15 con tarifas guardadas pese a configuración live distinta. Sin datos retenidos.
- **Blocker:** none

### TASK-007 — Selección neutral por trabajo en todos los dominios
- **State:** DONE
- **Depends on:** TASK-006
- **Owner:** root, gemini_factories, study_execution, official_transports; superficies disjuntas
- **Acceptance:** Extracción, actividades, análisis, corrección, Foxy y Estudio usan proveedor/modelo/límites/versiones del trabajo, mismo proveedor para conteo/generación y ambos SDK oficiales con fixtures, sin fallback ni credenciales persistidas.
- **Evidence:** Dominios y composición implementados. Puente+SDK37/37, incluye tickets concurrentes; integración SQL Study4/4 con ambos SDK, modelo/tarifas fijados y sin fallback; grading PDF/revocación5/5; build integrado180s exit0.
- **Blocker:** none

### TASK-008 — Verificación de migración, contratos y revisión independiente
- **State:** DONE
- **Depends on:** TASK-007
- **Owner:** root y ai_runtime_review
- **Acceptance:** Upgrade y caminos negativos SQL/concurrencia, build, límites, suites de dominios y revisión independientes válidos. Registrar fallos y distinguir transporte sintético de proveedor real.
- **Evidence:** Build Prisma/TS180s exit0; lint boundaries0 excepciones; pure408/408 y Study77/77. SQL policy/inventario14/14, Study ambosSDK4/4, puente/SDK37/37. Dominios92 aprobadas y1 fallo de preparación SQL; repetición PDF aislada6/6 sin cambiar aceptación. Revisión independiente VERIFIED en rutas críticas, sin bloqueantes. Límites/RED registrados en work-log.
- **Blocker:** none

### TASK-009 — Actualización canónica y entrega local completa
- **State:** DONE
- **Depends on:** TASK-008
- **Owner:** root
- **Acceptance:** Especificación, modelo/operación/guías y tablero coinciden con selección implementada. Inventario, docs y TTP válidos, main y worktrees previos preservados; sin publicación ni migración retenida.
- **Evidence:** Especificación/guías/roadmap y work-log reconciliados; docs:check149 archivos896 enlaces0 incidencias, taskboard9 tareas válidas, inventario564 entradas53 exclusiones23 rutas. Diff check correcto; main conserva estado inicial. Sin commits, integración, publicación ni migración retenida.
- **Blocker:** none

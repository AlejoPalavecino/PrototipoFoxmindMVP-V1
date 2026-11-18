# Feature: Auditoría visual de Mis aulas en ambos roles

- **Spec:** docs/foxmind-v1-functional-spec.md
- **Design:** docs/design/README.md
- **Approval:** approved
- Autorización: pedido del usuario del 2026-11-12; auditar y corregir paridad, alineación y recortes conservando diseño vigente y permisos por rol.

## Tasks

### TASK-001 — Entorno aislado y mapa de superficies
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** Copia independiente del checkout con cambios concurrentes; identificar superficies comunes y específicas de cada rol y habilitar QA sintético.
- **Evidence:** Worktree codex/classrooms-visual-audit desde 1f61923407fa839df0abb97e673c0274cf12bb1b; npm ci, API build y web build verdes. Helper integrado propio con PostgreSQL/S3/ClamAV/Mailpit, dos cuentas sintéticas; Ego espacio 8. Fixture UI complementaria de componentes reales identificada y corregida para usar el mismo contenedor classroom-main y contrato de Muro que la aplicación.
- **Blocker:** none

### TASK-002 — Paridad visual y geometría corregidas
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** root
- **Acceptance:** Auditar catálogo, Plan, Muro, Biblioteca, Actividades, Progreso, Alumnos/Compañeros, Historial y Configuración según rol. Corregir defectos reproducibles de elementos compartidos, alineación, superposición y recortes sin cambiar reglas funcionales.
- **Evidence:** Corregidos Plan, lupa de Biblioteca, tabla de Progreso y cuadrícula móvil de portadas. Matriz UI 56 vistas y catálogo 16 combinaciones; build final integrado 21 casos con aserciones de checks centrados, filtros iguales, búsqueda sin superposición, paridad de tarjetas y ausencia de overflow. Capturas en [la galería del candidato](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/tree/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/design/current).
- **Blocker:** none

### TASK-003 — Verificación y entrega recuperable
- **State:** DONE
- **Depends on:** TASK-002
- **Owner:** root
- **Acceptance:** Recorrer interacciones y capturas a 1440, 768, 390 y 320 px; comprobar teclado y contenido largo en superficies afectadas; checks focales verdes y límites documentados. Cambios aislados sin commits ni publicación.
- **Evidence:** API/web build, lint/boundaries sin excepciones, 23 pruebas focales + 4 contratos de fixture verdes. Navegación Ego de ambos roles, marcar/deshacer y publicación/lectura compartida de material sobre recursos propios. docs:check PASS (120 archivos/1035 enlaces, cero incidencias); taskboard PASS (3 tareas). Servicios propios cerrados, cleanup sin fallos y puertos 53216/56837 sin listeners.
- **Blocker:** none

### TASK-004 — Integrar con Agenda e Inicio y preservar Foxy en curso
- **State:** DONE
- **Depends on:** TASK-003
- **Owner:** root
- **Acceptance:** Integrar el candidato en main por autorización del 2026-11-12, conservar cambios concurrentes y verificar regresión conjunta.
- **Evidence:** Rebase sobre 99834b0; conflictos sólo documentales resueltos conservando ambos contenidos. Build web y lint verdes. 347 archivos fast reconciliados: 1961 PASS, 0 fallos/skips; E2E 20 PASS. Integrado por fast-forward en main 8f80098. Ocho archivos concurrentes preservados byte a byte y todas las entradas Foxy del manifiesto conservadas; stash temporal retirado.
- **Blocker:** none

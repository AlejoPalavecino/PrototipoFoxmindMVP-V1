# Base y evidencia — 2026-10-22

## Dos checkouts distintos
| Contexto | Ruta absoluta | Ref observada | Lectura |
|---|---|---|---|
| Workspace de este chat | C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind | feat/p33-token-flows @ 43954848555cc9f304fa669ad2e7bd5caa00ebec | Web de cuentas P3; no es la base para rediseñar toda V1 |
| Base completa candidata | C:/Users/alejo/.codex/worktrees/p4-p3-integration/ProtipoFoxMind | main @ 0bcb7d48dac76d49aa8e89b3ac76b32b03515425 | Código de aulas/P4–P9 y glass integrado; revalidar antes de ejecutar |

Observados con git status, branch, rev-parse y worktree list. Main tenía cambios ajenos en docs/audits/2026-10-22-reorganization-map y docs/work-log/2026-10-22-root-docs-reorganization-map.md: **no fueron tocados**. En el workspace existen .atl/, .engram/ y propuestas/logs previos sin seguimiento: preservar.

El roadmap de main registra V1/P9 e integración glass; se inspeccionaron archivos de código que corroboran presencia de esas superficies. No se repitieron sus verificaciones, no se validó el remoto ni se identificó el proceso que sirve el navegador. No afirmar que esta es ya la copia ejecutándose en localhost: F0 debe correlacionarla.

## Hallazgos de fuente en main
Rutas de esta tabla relativas a la base completa indicada arriba; líneas orientativas del commit observado.

| Evidencia | Hallazgo | Consecuencia |
|---|---|---|
| apps/web/src/components/account-screen.tsx:151 | Login verificado usa classroomNext ?? '/profile' | Cambiar fallback a /inicio, no destruir continuidad validada |
| Mismo archivo:202 y 227 | Continuar cuenta y postverificación también apuntan a perfil por defecto | Unificar resolución de destino, no un parche de una sola línea |
| apps/web/src/components/account-navbar.tsx:21 | Logo verificado apunta a /profile | Logo debe volver a Inicio |
| apps/classrooms-ui/Classrooms.tsx | Logo apunta a /mis-aulas; aula/wizard se controlan en estado local | Normalizar logo y preservar ruta/estado al navegar |
| apps/web/pages/index.tsx | / renderiza sign-in | Añadir resolución de sesión sin destello de formulario para usuarios ya autenticados |
| apps/web/src/lib/classroom-client.ts | Allowlist: /inicio, /mis-aulas, invitación UUID; no next arbitrario | Preservar seguridad al añadir continuidad de aula/notificación |
| apps/classrooms-ui/Home.tsx:34–35,64–69 | Crear/unirse visibles; selector de presentación oculta Estudio o Enseño | Retirarlos de Inicio; mostrar ambos bloques como en v3, sin alterar roles |
| apps/classrooms-ui/ClassroomView.tsx:42 | Entrada por defecto en members | Propuesta del plan: Actividades por defecto; personas siguen accesibles |
| apps/classrooms-ui/Classrooms.tsx y ClassroomView.tsx | Aula y pestaña viven en estado local | Planificar historial, recarga y enlaces directos con validación |
| apps/web/pages/_app.tsx | Importa design-tokens, globals, classrooms styles, platform-glass y entry-glass | Migración de sistema, no agregar otra capa de overrides permanente |
| apps/shared-ui/AppNavbar.tsx | Componente compartido, menú, foco, indicador y reduced motion | Reutilizar estructura y comportamiento; cambiar presentación con regresión |
| apps/web/src/components/account-screen.tsx:26–45 | Mostrar/ocultar contraseña ya existe | Preservarlo y mejorarlo; no presentarlo como función faltante |
| account-client.ts / account-screen.tsx | Registro genérico, sin auto-login; comprobación de sesión y CSRF | Mejorar el recorrido sin saltar verificación ni enumerar cuentas |
| apps/classrooms-ui/api.ts | DTO de aula no trae próximo tema; actividad-resumen no trae todos los pendientes personales | No dibujar unidad actual o entrega pendiente inventadas; verificar contrato del resumen |

## Mapa de fuentes principales
- Shell: apps/shared-ui/AppNavbar.tsx, design-tokens.css, entry-glass.css, platform-glass.css, EntryIcon.tsx, dialog-focus.ts.
- Cuenta: apps/web/src/components/account-screen.tsx, account-navbar.tsx; lib/account-client.ts, classroom-client.ts, page-server.ts, token-capture.ts; pages/_document.tsx.
- Aulas: apps/classrooms-ui/Classrooms.tsx, Home.tsx, ClassroomView.tsx, Wizard.tsx, components.tsx, styles.css, api.ts.
- Académico: Activities.tsx, ActivityAuthoring.tsx, AttemptSession.tsx, PracticalAttempt.tsx, QuestionnaireAttempt.tsx, questionnaire-draft.ts, AttemptHistory.tsx, AssignmentSubmissions.tsx.
- Corrección: GradingEditor.tsx, PublishedGradeCorrection.tsx, PublishedResult.tsx, Progress.tsx.
- Comunidad/contenido: Plan.tsx, Library.tsx, Wall.tsx, Notifications.tsx.
- Archivos: apps/web/src/components/private-file-panel.tsx, pages/files.tsx; clientes/proxies de archivos.
- Regresiones: tests/p3-web-*, p5-web-*, p6-mobile-navigation*, p7-*, p8-*, p9-*, entry-glass-*, platform-glass.test.mjs.

## Límites de esta inspección
Inspección de fuente y documentos, no auditoría interactiva completa. Los hallazgos de navegación están confirmados en código; otras mejoras son decisiones propuestas del plan. No se abrieron secretos, configuraciones privadas, cuentas ni datos personales. No se ejecutaron servicios, pruebas, migraciones, pushes o merges.

La especificación funcional entre el workspace y main difiere en la redacción histórica de autorización, no en las reglas del producto (diff inspeccionado). El antiguo handoff glass advertía sobre la discrepancia de checkout; esa advertencia se verificó ahora con Git y fuente. Su estilo y la conservación del redirect a perfil **no rigen este nuevo encargo**.

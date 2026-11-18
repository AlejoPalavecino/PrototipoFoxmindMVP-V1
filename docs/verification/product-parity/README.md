# Evidencia de paridad con UI Lab

Revisiones del 15 y 16 de noviembre de 2026 sobre compilaciones locales de `codex/foxmind-product-parity`. La referencia fue UI Lab iteración 17, con SHA-256 `81642edc107f01b3d602d11399bacfd3189e13841842e289739c3f3540764ff0`. La [integración de UX/UI](../../work-log/2026-11-16-root-ux-ui-publication.md) registra las comprobaciones del candidato combinado. [Plan aprobado](../../../design/foxmind-ui-lab/IMPLEMENTATION-PLAN.md).

## Últimas revisiones de cada recorrido

| Área | Recibo |
| --- | --- |
| Inicio y navbar, ambos roles | [Último repaso de escritorio y móvil](home-final/README.md) y [tarjeta única estudiantil](home-single/README.md) |
| Mis aulas, creación e ingreso | [Catálogo, invitación, código y análisis del programa](classrooms-collection/README.md) |
| Interior de aulas | [Primera comparación](../../work-log/2026-11-16-root-classroom-interior-exact.md) y [segunda revisión](../../work-log/2026-11-16-root-classroom-interior-reaudit.md) |
| Agenda y notificaciones | [Agenda](../../work-log/2026-11-16-root-agenda-exact.md) y [avisos](../../work-log/2026-11-16-root-notifications-exact.md) |
| Foxy y Mi Estudio | [Lectura, versiones y publicaciones](foxy-study-exact/README.md) y [auditoría del 17 de noviembre](../../work-log/2026-11-17-root-foxy-study-audit-fixes.md) |

## Primer barrido y refinamiento

El primer barrido usó API, PostgreSQL, almacenamiento y scanner aislados con cuentas y proveedores sintéticos. Cubrió creación de aula, invitación, Plan y Biblioteca, autoría, entrega y devolución, agenda, avisos, carpetas de estudio, perfil y navegación privada. Los [resultados del coordinador](../../work-log/2026-11-15-root-product-parity.md), la [reconciliación de pruebas](../../work-log/2026-11-15-parity-test-reconciliation.md) y el [manifiesto del último ajuste de foco](candidate-manifest.json) identifican las pruebas y compilaciones. [Informe docente](teacher-visual-review.md) · [Informe estudiante](student-visual-review.md).

El refinamiento `QuoiLeFkpez_y5nNmscUm` comprobó 28 vistas y 140 combinaciones de ancho con Ego Lite. La revisión visual encontró compresión de tarjetas estudiantiles que la geometría no detectaba y comprobó la corrección. Con el entorno local persistente se ensayaron autoría, generación real con Gemini, resolución, publicación de devolución, carpeta desde un aula y edición persistente de Agenda. El [registro del refinamiento](../../work-log/2026-11-15-root-visual-fidelity.md) describe ambos entornos y los intentos intermedios. [Mediciones y manifiesto](refinement/candidate-manifest.json).

| Muestra del refinamiento | Escritorio | Móvil |
| --- | --- | --- |
| Actividades estudiante | [1440](refinement/cut-student-activities-1440.png) | [390](refinement/cut-student-activities-390.png) |
| Plan docente | [1440](refinement/cut-teacher-plan-1440.png) | [390](refinement/cut-teacher-plan-390.png) |
| Agenda docente | [1440](refinement/cut-teacher-agenda-1440.png) | [390](refinement/cut-teacher-agenda-390.png) |
| Perfil docente | [1440](refinement/cut-teacher-profile-1440.png) | [390](refinement/cut-teacher-profile-390.png) |
| Devolución publicada | [1440](refinement/cut-student-feedback-1440.png) | [390](refinement/cut-student-feedback-390.png) |

Las comprobaciones de accesibilidad se limitaron a los recorridos de teclado y foco, el movimiento reducido y las muestras de contraste registradas. La secuencia original de capturas, las variantes intermedias y los detalles de cada compilación quedan en Git. [Informe original](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity/README.md) · [Artefactos por candidato](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/tree/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity) · [Tablero de aceptación](../../../odd/tasks/foxmind-product-parity.md).

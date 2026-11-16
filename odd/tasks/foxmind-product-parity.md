# Feature: Paridad productiva con FoxMind UI Lab

- **Spec:** design/foxmind-ui-lab/IMPLEMENTATION-PLAN.md
- **Design:** design/foxmind-ui-lab/01-foxmind.html
- **Approval:** approved

## Decisiones y referencia

Maqueta iteración 17 congelada; SHA256 `81642edc107f01b3d602d11399bacfd3189e13841842e289739c3f3540764ff0`. Archivos PDF/Word/PowerPoint hasta 20 MB por archivo y cuota total actual del chat. Recordatorio de evento con anticipación elegida por usuario. Las tareas de backend y preparación pueden adelantarse mientras se integra el shell; la aceptación visual depende de TASK-002. Registro: `docs/work-log/2026-11-15-root-product-parity.md`.

## Tasks

Nueva iteración autorizada 2026-11-15: fidelidad exacta de frontend frente a la maqueta de referencia. TASK-001–010 conservan su evidencia funcional previa; no acreditan por sí solas igualdad visual. Refinamiento y comparación actual: `docs/work-log/2026-11-15-root-visual-fidelity.md`. Implementación con Astra sólo esta sesión.

### TASK-001 — Referencia y baseline
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** Referencia congelada, entorno separado, mapa y pruebas base reconciliadas.
- **Evidence:** SHA256 de referencia confirmado; npm ci PASS; npm run test:ci PASS (API build + pure + transport, salida final 87/0/0 de transport). Git base ef6828b.
- **Blocker:** none

### TASK-002 — Sistema visual y navegación compartida
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** root
- **Acceptance:** Tokens/assets locales; shell expandido, rail, móvil y foco; sesión intacta.
- **Evidence:** Nunito/assets locales; Ego a 320/390/768/1024/1440 sin desborde. Rail 76 px con aulas ocultas; drawer móvil con Escape y foco al disparador. Masthead móvil 173 px, texto completo y pestaña activa naranja comprobados sobre build de producción.
- **Blocker:** none

### TASK-003 — Inicio y Mis aulas
- **State:** DONE
- **Depends on:** TASK-002
- **Owner:** root
- **Acceptance:** Widgets, invitaciones y wizard reales con paridad de ambos roles.
- **Evidence:** Inicio 14/14; creación manual y con IA sintética, cuatro pasos, PDF, edición de unidad y texto prellenado, revisión y confirmación reales. Invitación enviada, aceptada con retorno a Activas y persistida al recargar; rechazo SQL 2/2 e interfaz 7 casos. Feedback de extracción RED→GREEN 5/5.
- **Blocker:** none

### TASK-004 — Interior de aula y biblioteca
- **State:** DONE
- **Depends on:** TASK-003
- **Owner:** root
- **Acceptance:** Plan, temas dados, recursos relacionados, carga/vínculos y vistas ordenadas.
- **Evidence:** Tema dado persistido al recargar; PDF de biblioteca asociado a unidad visible desde tema; portada guardada y recargada tras resolver conflicto. Biblioteca SQL/HTTP independiente 13/13, incluidas descripción FILE legada, revisión TEXT, custodia y rollback. Barrido de pestañas de ambos roles sin overflow.
- **Blocker:** none

### TASK-005 — Autoría interunidad y archivos
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** activity_backend
- **Acceptance:** Idea privada requerida, selección multitema, integridad y formatos aprobados.
- **Evidence:** Revisión independiente: 60 migraciones aplicadas dos veces en DB descartable, sin drift; 38 invariantes; conversión real DOC/PPT/PPTX aislada. Matriz de política 15/15 y proxy 6/6; API build PASS. Registros activity_backend_impl y revisión independiente atribuidos al log root.
- **Blocker:** none

### TASK-006 — Autoría, participación y corrección visual
- **State:** DONE
- **Depends on:** TASK-002, TASK-005
- **Owner:** activity_frontend
- **Acceptance:** Propuesta editable, actividad enfocada, entrega y devolución completas.
- **Evidence:** Ego E03–E05: propuesta/rúbrica, cuestionario/evaluación/TP, archivo inválido y válido íntegro, nota privada cero y devolución publicada. Release itNER5mJohCBmeNzCurv-: 40 focales PASS, E2E integral 1/1 y autoría P7 6/6. Panel de clave docente y vista estudiantil sin claves comprobados; sin details/summary.
- **Blocker:** none

### TASK-007 — Agenda y notificaciones
- **State:** DONE
- **Depends on:** TASK-002
- **Owner:** agenda_notifications
- **Acceptance:** Editor/color/anticipación, vistas, filtros globales, lectura reversible, destinos autorizados.
- **Evidence:** Contratos 33 + DB 9 + cursor 15; Ego ambos roles con edición/color/anticipación, lectura reversible y destinos exactos. Barrido visual cinco anchos sin overflow. Upcoming RED→GREEN 4/4: diálogo explícito, navegación y error rojo con reintento.
- **Blocker:** none

### TASK-008 — Foxy y Mi estudio
- **State:** DONE
- **Depends on:** TASK-002, TASK-005
- **Owner:** foxy_study
- **Acceptance:** Chat amplio, contexto real, biblioteca, cancelación, publicación y plan a Agenda.
- **Evidence:** Study 77, Foxy UI 50, publicación DB 9, cancelación DB 3, copia/revocación 2; E07/E08 en Ego con publicación sin duplicado y repaso a Agenda. Últimos paneles 43/43 y tipos PASS; release: editar/cerrar/reabrir conserva borrador, guardar y compartir a 390 sin overflow, Escape vuelve al recurso. Revalidación focal estudiante dentro de TASK-010.
- **Blocker:** none

### TASK-009 — Perfil y coherencia documental
- **State:** DONE
- **Depends on:** TASK-002
- **Owner:** root
- **Acceptance:** Perfil real, avatares, estados y documentación vigente consistentes.
- **Evidence:** Perfil preview/cancelación/guardado/recarga observado en Ego; 12/12 pruebas focales. Documentación canónica actualizada con referencia separada de evidencia histórica, docs:check 157 archivos/957 enlaces/0 problemas. Escaneo UTF8 de cambios sin mojibake.
- **Blocker:** none

### TASK-010 — Verificación integral y entrega
- **State:** DONE
- **Depends on:** TASK-003, TASK-004, TASK-006, TASK-007, TASK-008, TASK-009
- **Owner:** root + quality_reviewer
- **Acceptance:** E01–E11, visual ambos roles/tamaños, builds, límites, datos y permisos sin bloqueantes.
- **Evidence:** Build final WalicEcb0TsMY-ZKneE2f PASS; tipos, boundaries y diff-check PASS. Fast: 372 archivos/2077 casos reconciliados, 0 fallos/0 omitidos. E2E integral 1/1 y P7 6/6; luego sólo cambió foco Study con 14/14 focales y verificación independiente en navegador a 390/1440. Barrido de ambos roles en cinco anchos, privacidad, migraciones y compatibilidad comprobadas. Informe y manifiesto en docs/verification/product-parity; límites de proveedor real, WCAG completa y reversión retenida explícitos.
- **Blocker:** none

### TASK-011 — Comparación visual de referencia y candidato
- **State:** DONE
- **Depends on:** TASK-010
- **Owner:** root
- **Acceptance:** Diferencias de ambos roles relevadas en Ego Lite, separando datos y controles demo de diseño productivo; escritorio y móvil.
- **Evidence:** Maqueta iteración17 hash conservado; comparación Ego de ambos roles y revisión visual independiente Astra. Corte final QuoiLeFkpez_y5nNmscUm:28 vistas, 140 comprobaciones a 320/390/768/1000/1440; capturas/mediciones en docs/verification/product-parity/refinement. Diferencias de datos y barra demo separadas del diseño.
- **Blocker:** none

### TASK-012 — Base visual, navegación, Inicio y aulas
- **State:** DONE
- **Depends on:** TASK-010
- **Owner:** astra_frontend_parity + root
- **Acceptance:** Geometría, tipografía, componentes, transiciones y navegación coinciden con referencia, conservando datos reales y accesibilidad.
- **Evidence:** Shell232/rail76/móvil, Inicio, catálogo y wizard ajustados y recapturados en ambos roles. Abrir tema restaurado tras RED sin cambiar aceptación. Sidebar sin accesos a aulas plegado; menú móvil Escape devuelve foco. Revisión independiente sin bloqueantes; manifiesto refinement.
- **Blocker:** none

### TASK-013 — Aulas, actividades y devolución
- **State:** DONE
- **Depends on:** TASK-010
- **Owner:** astra_classroom_fidelity + root
- **Acceptance:** Comparación de pestañas de aula, autoría, participación y corrección; jerarquía, estados y controles equivalentes en ambos roles.
- **Evidence:** Pestañas de ambos roles verificadas; compresión interna de cards estudiante detectada visualmente y corregida con áreas de grid explícitas, confirmada por root y revisión independiente. Ego: autoría manual publicada, propuesta Gemini real privada editada, cuestionario/TP con PDF y comprobante, corrección 8 privada/publicada y devolución estudiantil. Biblioteca→tema y tema dado persistidos. Último TP390 permite subir sin desplazamiento manual adicional; autoría638 permite interacción con scroll normal. Ver registro visual-fidelity y galería refinement.
- **Blocker:** none

### TASK-014 — Agenda, conversación y cuenta
- **State:** DONE
- **Depends on:** TASK-010
- **Owner:** astra_ai_fidelity + astra_agenda_account_fidelity + root
- **Acceptance:** Agenda, Foxy, Mi estudio, notificaciones y perfil coinciden visualmente, con flujos reales y controles accesibles.
- **Evidence:** Agenda fecha20nov/colorverde/aviso de 30 minutos conservados al reabrir; lectura de aviso reversible. Carpeta4pasos desde aula, edición de tema, creación real y chat; Historial cierra con Escape y foco al disparador. Perfil centrado en superficie de 1040 px, chat/composer completos, ambos roles en cinco anchos. Referencias en docs/verification/product-parity/refinement.
- **Blocker:** none

### TASK-015 — Revisión del candidato refinado
- **State:** DONE
- **Depends on:** TASK-011, TASK-012, TASK-013, TASK-014
- **Owner:** root
- **Acceptance:** Ambos roles a 390/1440 y extremos responsive; animación/reduced motion, contraste, teclado y regresiones focales; build y tipos sin fallos bloqueantes.
- **Evidence:** Build API/web QuoiLeFkpez_y5nNmscUm READY con Gemini local.107 pruebas focales PASS y 21 recontroles de últimas superficies PASS; tipos, límites de arquitectura, diff-check y documentación PASS.28 vistas/140 comprobaciones sin overflow, imágenes rotas ni controles fuera; revisión visual independiente cerró cards. Muestra de 24 textos opacos contraste mínimo 5.35; reduced-motion sin animaciones activas y Escape/foco comprobados. No equivale a WCAG completa ni a igualdad de todos los estados no recorridos. Entrega local sin commit/merge/push; manifiesto de 308 archivos productivos del candidato combinado.
- **Blocker:** none

### TASK-016 — Inicio y navbar idénticos a la referencia aprobada
- **State:** DONE
- **Depends on:** TASK-015
- **Owner:** root + astra_frontend_parity
- **Acceptance:** Ambos roles respetan ancho, tamaños, distribución y componentes de la maqueta; se eliminan de Inicio los módulos y acciones ausentes en ella. Comparación al mismo viewport amplio y móvil, incluyendo contenido debajo del primer pliegue; navegación conservada y pruebas focales verdes. La orden vigente reemplaza la antigua aceptación de Abrir tema en Inicio.
- **Evidence:** Build UGTf8RMd24BbwOkYdJufH READY, 41 pruebas focales finales PASS y fronteras de arquitectura PASS. Inicio de 1200 px, módulos extra retirados, filas compactas y navbar expandido/plegado/móvil comparados con Ego Lite en ambos roles a 1920/1440/390. Recaptura final sin overflow ni imágenes rotas; transiciones y reduced motion comprobados. Miniagenda diaria, consulta con autor/título real y destinos de actividad/revisión verificados. 54 artefactos en docs/verification/product-parity/home-exact y registro docs/work-log/2026-11-15-root-home-exact-parity.md. No implica igualdad de datos ni nueva auditoría de interiores.
- **Blocker:** none

Corrección del 16 de noviembre verificada: tarjeta única vertical en escritorio, igual a una de las dos tarjetas de referencia (309.65 × 346.85 px a 1440). Adaptación móvil conservada. Build RXJGPgRyO0PeKZcHbgOZx READY; Ego Lite con una y dos actividades, 4/4 pruebas focales PASS informadas por Astra y diff-check PASS del coordinador. Seguimiento en docs/work-log/2026-11-16-root-home-single-card.md y evidencia vigente en docs/verification/product-parity/home-single. Reemplaza la aceptación anterior de tarjeta única horizontal.

Repaso posterior verificado: navbar móvil sticky de Inicio, ambos roles a 390/768 con menú, Escape, foco y scroll conservados. Build eU402ssoRgFJBGYgK9vxr READY, 9/9 pruebas de navegación PASS informadas por Astra; coordinador comparó ambos roles a 1920/1440/390 y 38 muestras de contraste (mínimo 5.35:1). Evidencia vigente en docs/verification/product-parity/home-final y registro docs/work-log/2026-11-16-root-home-final-review.md.

### TASK-017 — Mis aulas, creación e ingreso fieles a la maqueta
- **State:** DONE
- **Depends on:** TASK-016
- **Owner:** root + Astra
- **Acceptance:** Catálogo de ambos roles, invitaciones, cuatro pasos de creación e ingreso por código coinciden con UI Lab en diseño y flujo; datos y permisos reales conservados, estados de carga/error/éxito claros, escritorio y móvil sin superposiciones ni acciones recortadas. Interior de aulas excluido por pedido vigente.
- **Evidence:** Build final SumPNj_fdM4dd4fknQlbZ READY. Catálogo ambos roles a320/390/768/1440/1920 sin overflow ni imágenes rotas; asistente1050×790/352.4×820, footer accesible incluso320. Creación manual con PDF, guardado/reanudación, invitación cancelar/aceptar y código inválido/preview/confirmación comprobados con persistencia real.46/46 pruebas focales del coordinador; proxy9/9, backend11/11 y SQL15/15; Astra16/16 de retornos/aislamiento y regresión del borrador más reciente7/7. Grupos solapados, no suma única. Tipos/límites arquitectura PASS; contraste muestreado mínimo4.99:1, Escape/foco y reduced motion verificados. Gemini devolvió cuota: error/recuperación comprobados, generación exitosa sólo con cobertura sintética. Galería docs/verification/product-parity/classrooms-collection/README.md y registro docs/work-log/2026-11-16-root-classroom-collection-parity.md. No interiores, integración ni publicación.
- **Blocker:** none

Ampliación R1 del 2026-11-16: pantallas de carga de programa y análisis de Foxy completadas en build `9kd2-Q_4wbH56iBv8jtQX`. PDF real aprobado, 15 pruebas focales finales, tipos, fronteras y 14 vistas Ego con contraste de carga/error mínimo5.35:1; sin overflow ni pie recortado. IA satisfactoria controlada sólo en pestaña de QA y retirada al terminar; intento real `AI_BUDGET_EXCEEDED`. Registro: `docs/work-log/2026-11-16-root-classroom-loading-parity.md`; evidencia: `docs/verification/product-parity/classrooms-collection/loading-verification.json`. No amplía el alcance a interiores ni a trabajo concurrente.

### TASK-018 — Interior y navegación del aula
- **State:** DONE
- **Depends on:** TASK-017
- **Owner:** root
- **Acceptance:** Cabecera, navegación, información y carga coinciden con la maqueta para cada rol, sin elementos ajenos, recortes, desbordes ni superposiciones.
- **Evidence:** Cabecera, ocho tabs docentes y seis estudiantiles comparadas a 320/390/768/1440. Carga, destinos por rol y movimiento reducido comprobados. Registro docs/work-log/2026-11-16-root-classroom-interior-exact.md.
- **Blocker:** none

### TASK-019 — Plan y Biblioteca con datos vinculados
- **State:** DONE
- **Depends on:** TASK-017
- **Owner:** classroom_plan_library
- **Acceptance:** Unidades, temas, recursos y actividades vinculadas reproducen la vista y acciones de la referencia, con estados reales y permisos vigentes. Carga, vacío y error son distinguibles.
- **Evidence:** Lectores, selector de tema, carga sobre el Plan y PDF sin publicar en Ego. Contexto y publicación separada cubiertos por pruebas focales. Formatos simulados ajenos a la política real quedan documentados como diferencia.
- **Blocker:** none

### TASK-020 — Muro, personas, Historial y Ajustes por rol
- **State:** DONE
- **Depends on:** TASK-017
- **Owner:** classroom_people_wall
- **Acceptance:** Acciones, datos y composición según rol y maqueta. Mutaciones persistentes, sin exposición de datos ajenos ni modificación de reglas de acceso.
- **Evidence:** Pares de vistas, modales y teclado, «Vos» y salida cancelada, invitación sin enviar y pie de Ajustes durante scroll. 15 casos de membresía en SQL descartable; pruebas focales de Muro/Ajustes verdes.
- **Blocker:** none

### TASK-021 — Actividades y Progreso por rol
- **State:** DONE
- **Depends on:** TASK-017
- **Owner:** classroom_activity_tabs + classroom_progress
- **Acceptance:** Listas, estados y navegación de actividades, autoría, resolución, devolución y progreso según maqueta, sobre datos reales y reglas de publicación vigentes.
- **Evidence:** Autoría sin crear, corrección, confirmación de primera reentrega, recorrido docente y devolución efectiva en Ego. SQL de Progreso 11/11 y Entregas 2/2; revisión independiente revalidó ambos hallazgos.
- **Blocker:** none

### TASK-022 — Verificación comparada del interior completo
- **State:** DONE
- **Depends on:** TASK-018, TASK-019, TASK-020, TASK-021
- **Owner:** root
- **Acceptance:** Evidencia por pestaña, rol y tamaño; carga, animación, contraste, foco y acciones clave comprobados. Tests de regresión y permisos, build local y lista de entrega con límites observados.
- **Evidence:** Build local `t5pFKl-x2iaUtLN4Ue4F6`, 56 vistas comparadas y 24 comprobaciones Ego. Checks focales y build verdes; registro docs/work-log/2026-11-16-root-classroom-interior-exact.md. Sin publicación.
- **Blocker:** none

### TASK-023 — Segunda auditoría visual y de estados del interior
- **State:** DONE
- **Depends on:** TASK-022
- **Owner:** root
- **Acceptance:** Comparar ambos roles con UI Lab; reproducir y corregir divergencias visuales, de alineación, contraste, scroll, foco y estados. Recorrer pestañas, diálogos y tamaños límite; documentar diferencias reales y evidencia final.
- **Evidence:** 38 pares de cabecera, 42 vistas de pestañas, 9 diálogos y 6 estados de Progreso en Ego Lite; 8 comprobaciones de cuestionario. Checks focales verdes; candidato final `94WguZwVmhnJQ3AoCDlAf` listo en local. Registro docs/work-log/2026-11-16-root-classroom-interior-reaudit.md.
- **Blocker:** none




### TASK-024 — Agenda comparada en ambos roles
- **State:** DONE
- **Depends on:** TASK-007, TASK-014
- **Owner:** root, agenda_detail_exact, agenda_editor_exact
- **Acceptance:** Mes/Semana/Día según UI Lab; detalle, creación/edición y confirmaciones dentro de Agenda; responsive, foco, carga, error, éxito y verificación de privacidad y contratos vigentes.
- **Evidence:** 58 pares UI Lab–app en Ego Lite; ambas cuentas completas en crear, consultar, editar, descartar, eliminar y privacidad. 155 pruebas focales, tipos y build local Em6wLgnxiA88ZkSD60bVQ. Límites y pasos en docs/work-log/2026-11-16-root-agenda-exact.md.
- **Blocker:** none

### TASK-025 — Notificaciones comparadas en ambos roles
- **State:** DONE
- **Depends on:** TASK-007, TASK-024
- **Owner:** root, notification_projected_dialogs
- **Acceptance:** Centro y flujos coinciden con UI Lab; lectura reversible, filtros, estados, foco y geometría en ambos roles. Destinos autorizados y revisión real encima de bandeja para invitación y evento de Agenda.
- **Evidence:** 22 pares UI Lab–app en Ego Lite; flujos de ambos roles, lectura, carga/error/reintento, invitación y evento sobre bandeja, geometría de 3 diálogos a 320×480. 42 pruebas focales y build 5Y2oNee9Kg6G7hxDSMf5o READY. Registro docs/work-log/2026-11-16-root-notifications-exact.md.
- **Blocker:** none

### TASK-026 — Integrar y publicar el refactor UX/UI
- **State:** VERIFYING
- **Depends on:** TASK-023, TASK-024, TASK-025
- **Owner:** root
- **Acceptance:** Consolidar paridad completa, preservar la arquitectura de IA de main, validar candidato combinado y llevar una PR a main sin tocar datos retenidos.
- **Evidence:** Commits fuente `08a97acc`, `bd4e49f9`, `be4deb6a`. API/web, arquitectura, suites focales y actualización descartable 55 → 63 pasaron. [Registro de publicación](../../docs/work-log/2026-11-16-root-ux-ui-publication.md).
- **Blocker:** pendiente revisión de la suite completa y CI de la PR.

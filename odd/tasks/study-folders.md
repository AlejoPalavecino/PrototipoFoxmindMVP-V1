# Feature: Carpetas de estudio privadas

- **Spec:** docs/product/study-folders-proposal.md
- **Design:** docs/product/study-folders-proposal.md (Propuesta de experiencia)
- **Approval:** approved — usuario, 2026-11-08: «Si lo apruebo», después de solicitud explícita de aprobación de pantallas, solución/modelo e implementación.
- **Coordinator:** /root, único escritor de este registro. Sin autorización de commits/push/despliegue para esta funcionalidad.
- **Candidate:** checkout principal sobre main, commit base 1f46028; documento de propuesta y registro previos sin commit.

## Tasks

### TASK-001 — Crear y retomar carpetas privadas con plan
- **State:** DONE
- **Depends on:** none
- **Owner:** /root/study_backend y /root/study_ui, superficies separadas; integra /root
- **Acceptance:** CF01–CF03, CF15: dueño estudiante verificado; borrador/confirmación y datos persistentes; docente/ajenos denegados; colección y wizard responsive.
- **Evidence:** PostgreSQL/HTTP aislados PASS; builds API/web finales; DOCX aprobado y extracción Gemini real; creación sintética E2E; continuación login exacta comprobada. Recibo docs/verification/study-folders.json y registros backend/UI.
- **Blocker:** none

### TASK-002 — Materiales propios y biblioteca vinculada con revocación
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** /root/study_backend; /root integración de archivos; /root/study_ui vistas
- **Acceptance:** CF03–CF06: acceso actual, versiones disponibles, sincronización sin importación manual, exclusión de material e historia revocados, carreras de generación controladas.
- **Evidence:** DB alta/baja/revisión y revocación antes de countTokens/generación/aplicación PASS; uploads privados y DOCX real aprobado; edición propia/exclusión de plan y aula testadas; proxy ZIP/PPTX/XLSX PASS. Revisión independiente VERIFIED focal. Límites de legibilidad/contexto explícitos.
- **Blocker:** none

### TASK-003 — Foxy, creaciones, práctica y adaptación por carpeta
- **State:** DONE
- **Depends on:** TASK-001, TASK-002 para integración final
- **Owner:** /root/study_engine motor; /root/study_backend persistencia; /root/study_ui presentación
- **Acceptance:** CF07–CF10: generación acotada a fuentes, todas las herramientas, intentos persistentes, soluciones ocultas, corrección, devolución recuperable y adaptación sin mezclar carpetas.
- **Evidence:** Suite final65/0/0: motor15, UI22 y servicio18 incluidos. E2E app/servicios reales con proveedor sintético: cinco herramientas, SINGLE/MULTIPLE/desarrollo, recarga, soluciones ocultas, devolución y nuevo intento. Gemini real plan/chat y quiz3 directo de motor PASS. Dos quizzes iniciales de navegador sin temas fallaron; guardas previas a gasto verificadas. No se repitió E2E real tras agotar cupo diario: límite de evidencia conservado.
- **Blocker:** none

### TASK-004 — Plan de examen, sesiones en Agenda y avisos privados
- **State:** DONE
- **Depends on:** TASK-001, TASK-003
- **Owner:** /root integración transversal; motor y UI por sus propietarios
- **Acceptance:** CF11–CF14: cronograma revisable, eventos/avisos idempotentes y privados; cambios/cancelación/zonas y archivo/eliminación controlados.
- **Evidence:** PostgreSQL PASS: idempotencia, avisos privados, otro dueño denegado, edición independiente cancela aviso/impide sobrescritura, archivo conserva evento. Ego Lite app habitual: tres sesiones confirmadas y aviso personal persistente tras reinicio. Zona/DST/solapamiento testados; sin push externo.
- **Blocker:** none

### TASK-005 — Verificar candidato y reconciliar documentación
- **State:** DONE
- **Depends on:** TASK-001, TASK-002, TASK-003, TASK-004
- **Owner:** /root; quality_reviewer independiente de sólo lectura al estabilizar candidato
- **Acceptance:** CF01–CF16: pruebas permisos/integración y regresiones, builds/lint/documentación, migración aislada y QA real con cuentas sintéticas; informar fallos y límites.
- **Evidence:** Candidato serializado: test:study65/0/0, tipos/builds API/web PASS; boundaries123 excepciones PASS, guard13 PASS; admisión IA30 PASS, Agenda14 PASS y continuación segura4 PASS; inventario511/53/23 PASS. Revisor VERIFIED focal sin bloqueantes; diez capturas390/834/1440 sin overflow, catálogo188/376 hashes exactos. TaskSpace3 finalizada keep vacío; harness aislado exit0/cleanup0; app habitual READY. Documentación reconciliada con límites del recibo.
- **Blocker:** none

## Estado recuperable

La aprobación autoriza implementar la propuesta completa. Delegación por superficies disjuntas; cada agente mantiene registro propio, sin aislamiento fuerte afirmado. No se accede a P3/P4, datos retenidos ni secretos históricos. Proveedor local autorizado por configuración habitual; pruebas automatizadas sintéticas. Ninguna tarea DONE sin evidencia reconciliada.

Entrega implementada y verificada localmente con límites del recibo. No queda código pendiente del alcance aprobado. Primera comprobación opcional al renovarse el cupo: repetir quiz E2E Gemini con temas seleccionados. Sin commits, push, publicación ni despliegue.

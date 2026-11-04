# Feature: Mis aulas y espacio de trabajo del aula

- **Spec:** alcance y criterios en este documento; contrato vigente docs/foxmind-v1-functional-spec.md y fuentes apps/classrooms-ui/.
- **Design:** propuesta conversacional aprobada el 2026-11-04: evolución cálida de colección, cabecera compacta, dos grupos de pestañas y refinamiento de ocho secciones; conservar FoxMind 3D y navbar privado común.
- **Approval:** approved

Aprobación: «Bien arma un plan de implementación para todo eso e implementalo». Autoriza ejecución local; sin commits/push/deploy implícitos. No incluye las mejoras funcionales adicionales de persistir filtros al volver ni URLs nuevas por pestaña, que la propuesta separó expresamente.

## Alcance e invariantes

Mantener stack, APIs, modelos, permisos, destinos explícitos, carga independiente de recursos, confirmaciones y controles de revisión existentes. No nuevas métricas, contadores inventados, solicitudes a IA real ni cambios de datos retenidos. QA con APIs/datos sintéticos y servicios propios únicamente si resultan necesarios. La app de demo permanece activa.

- Mis aulas: banner aprobado más compacto; CTA por rol, Activas/Archivadas con conteos reales, Activas como selección inicial, búsqueda y filtros por ciclo/división. Criterios visibles removibles. Vistas tarjetas/lista, tarjetas con título/metadatos/estado y único Entrar; evitar rol repetido y «Docente: Vos». Invitaciones/borradores antes de la colección cuando existan, con acciones y confirmaciones actuales.
- Interior: cabecera compacta con portada pequeña y regreso claro. Mantener Plan como entrada habitual y precedencia de actividad/notificación. Grupo de trabajo Plan/Muro/Biblioteca/Actividades/Progreso; grupo docente Alumnos/Historial/Configuración. Alumno conserva seis secciones, Mi progreso/Compañeros. Un único rail móvil, seleccionado visible y foco accesible, sin ocultar funciones en un menú nuevo.
- Plan: navegación curricular clara, estados PENDING/NEXT/TAUGHT traducidos y cambios explícitos; no escribir por seleccionar. Biblioteca: listado legible, archivo/unidad/tema y acción de acceso predominante, administración secundaria. Muro: avisos/consultas/hilos legibles, sin inventar chat o tiempo real.
- Actividades: título/tipo/estado/plazo/currículo, primario por rol y acciones secundarias agrupadas; no alterar publicación, intentos, revisión o bloqueo por participación. Progreso: cumplimiento, rendimiento publicado y plan separados, sin convertir faltantes en cero. Alumnos/Compañeros: lectura y resumen por rol, datos autorizados. Historial de solo consulta. Configuración: datos/portada/opciones/lifecycle agrupados, guardar/conflictos visibles y archivo/reactivación separados.
- Todos: carga/vacío/error/ocupado/archivado claros; salida voluntaria de alumno archivado se conserva. Responsive 320/390/768/1440, sin overflow global, controles >=44 px, foco/contraste y reduced motion. No cambiar Inicio/Agenda ni el patrón global de cuenta/notificaciones.

## Tasks

### AULA-001 — Colección clara y tareas pendientes
- **State:** DONE
- **Depends on:** none
- **Owner:** collection worker; coordinación root
- **Acceptance:** Activas/Archivadas con búsqueda/filtros combinados y chips removibles; tarjetas/lista coherentes por rol; pendientes antes de la colección; CTA y callbacks existentes preservados.
- **Evidence:** 68 pruebas focales PASS; collection-final.json 8 combinaciones rol/ancho, filtros y vistas. Evidencia docs/work-log/evidence/2026-11-04-classroom-workspace/README.md
- **Blocker:** none

### AULA-002 — Cabecera y navegación interior comunes
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** Cabecera compacta y regreso; ocho pestañas docente/seis alumno agrupadas, sin cambiar claves ni destino inicial/explícito; rail móvil/foco sin overflow.
- **Evidence:** Pruebas shell PASS; interior-final.json 56 combinaciones, nav seleccionada visible; teclado/foco comprobados en interactions.json
- **Blocker:** none

### AULA-003 — Plan, Biblioteca y Muro orientados a lectura
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** Currículo/estados/contexto legibles, selección sin mutación; recursos con acciones claras y administración secundaria; hilos y respuestas con jerarquía. Mantener descarga, escaneo, permisos y confirmaciones.
- **Evidence:** Pruebas Plan/Biblioteca/Muro PASS; capturas finales y 13 interacciones sintéticas, selección sin escritura y permisos conservados
- **Blocker:** none

### AULA-004 — Actividades, progreso y gestión por rol
- **State:** DONE
- **Depends on:** none
- **Owner:** content worker; coordinación root
- **Acceptance:** CTA por rol y secundarios accesibles; tres métricas distintas con semántica intacta; listas/resúmenes/historial y ajustes/lifecycle claros. Sin cambios de contratos académicos o permisos.
- **Evidence:** 68 pruebas integradas PASS; QA 56 interiores y 20 estados, guardado fallido conserva input, archivado conserva restricciones y salida voluntaria
- **Blocker:** none

### AULA-005 — Verificación integrada y responsive
- **State:** DONE
- **Depends on:** AULA-001, AULA-002, AULA-003, AULA-004
- **Owner:** root
- **Acceptance:** Tipos/lint/inventario/documentación/build aislado aprobados; pruebas dirigidas sin fallos; QA real de componentes en ambos roles, ocho pestañas docente/seis alumno y cuatro anchos. Pruebas sin datos retenidos, recursos propios cerrados. Límites/fallos explícitos.
- **Evidence:** 68PASS, tsc/lint/build aislado exit0; inventario451/53/23; docs138 archivos1739links0issues; QA56+8+20 y13 interacciones. Space6 cerrado y Vite propio53257 detenido, app52171 HTTP200
- **Blocker:** none

### AULA-006 — Revisión independiente y entrega local
- **State:** DONE
- **Depends on:** AULA-005
- **Owner:** root; reviewer independiente
- **Acceptance:** Revisión independiente de candidato identificable, sin hallazgos bloqueantes; tareas DONE solo con prueba, roadmap/registro conciliados y app local disponible. Sin publicación no solicitada.
- **Evidence:** Revisión independiente VERIFIED31/31 hashes,39 tests propiosPASS, sin bloqueantes; registro atribuido y roadmap conciliados. App local52171 HTTP200. Sin commits/publicación
- **Blocker:** none

## Seguimiento

Entrega posterior autorizada por el usuario: «Realiza los comitts and push y mergea todo a main si es necesario». La restricción de no publicar anterior describe la etapa de implementación; esta instrucción autoriza integrar y publicar el mismo candidato verificado, sin despliegue. Seguimiento en [registro de publicación](../../docs/work-log/2026-11-04-id-unavailable-classroom-workspace-publication.md).

Solo root actualiza este registro. Workers escriben únicamente sus superficies y su registro propio; no hay escritores simultáneos del plan/roadmap. Implementación no equivale a DONE. Primer paso: RED de criterios de colección/nav y trabajo en superficies disjuntas; root conserva integración, QA y entrega.

Actualización de coordinación: AULA-003 puede desarrollarse contra el contrato de componentes existente sin esperar el cierre visual de AULA-002; la dependencia común de integración se comprueba en AULA-005. Se ajusta la dependencia de planificación, sin ampliar alcance. Validator TTP exige Approval exactamente approved; el texto de autorización se conserva aparte. No había una aprobación humana faltante.

# Renovación documental y comprobación del estado actual

- Agent/task: /root; no session ID expuesto por runtime.
- Fecha: 2026-11-07.
- Branch/worktree: main, checkout principal.
- Base: d41ff6d0b8c9321403b1d3000a06e06d84366cfe; cambios documentales previos del mismo chat reconciliados.
- Tarea: [registro TTP único](../../odd/tasks/project-documentation-renewal.md).
- Estado: completed, entrega documental local verificada.

## Alcance y autoridad

Usuario aprobó estructura y eligió documentar UI actual. Luego pidió lanzar la app, recorrer cada rol con Ego Lite, guardar capturas/checks y eliminar documentación vieja para usar esta base hacia adelante. Este pedido sustituye la conservación histórica anterior; no autoriza rediseño, funciones, datos retenidos, secretos, proveedores pagos, commits/push o despliegue.

## Resultado construido

Especificación funcional vigente, arquitectura/stack, 55 modelos de datos, capacidades por rol/sección, guías por dominio, UX/UI actual, política de actualización y plantilla por funcionalidad. README/AGENTS/roadmap apuntan a una única base. OpenAPI permanece en su ruta y sólo cambia metadata descriptiva; la tarea issue2 conserva su marcador de CI y se reescribe como contrato vigente.

[Retiro](../verification/documentation-retirement.json): 2294 documentos/artefactos históricos y 30 auxiliares de navegador de sesiones pasadas. Recibo con rutas/hashes, sin copia del contenido ni nueva carpeta de archivo. Git no se reescribe. Licencias, assets públicos runtime, migraciones y controles activos conservados. Comentarios obsoletos de raster-catalog y api-build-receipt actualizados, sin lógica modificada.

Helper nuevo scripts/documentation-preview.mjs para reproducir entorno de revisión propio. Directorio aleatorio ignorado; claves efímeras, proveedores sintéticos inyectados y limpieza por stopFile/Enter; no lee archivos privados. Sus credenciales de fixture no se guardan en docs.

## Recorrido real

API fresca (Prisma/TS) y Next producción frescos PASS dentro de 30s/180s. Runtime propio con PostgreSQL vacío y 46 migraciones, S3/ClamAV/Mailpit; IA de texto, extracción, actividades e imágenes/esquemas sintética. Análisis individual/corrección deliberadamente indisponibles. Docente Lucía y estudiante Marina de fixture; Pablo y Tomás registrados y verificados desde UI con correo local.

Ego TaskSpace 2, una página reutilizada; cerrada una sola vez mediante finish al finalizar. Escritorio de 1440 px, tablet de 768 px y móvil de 390 px, más una captura inicial de 1536 px. [165 PNG con metadatos/hashes](../design/current/catalog.json); geometría sin desborde horizontal. Esto no implica inspección visual individual de cada imagen ni WCAG completa. [46 flujos/ramas](../verification/flows.md) distinguen PASS, REFERENCIA, LIMITADO y NO_ENSAYADO.

Registro ambos roles, correo/verificación, recuperación, contraseña/perfil docente y nuevo ingreso; navegación ocho/seis secciones. Aula de cuatro pasos con PDF escaneado y extracción revisada; borrador manual con DOCX/texto. Código inválido/preview/ingreso; invitaciones; archivo/reactivación; salida activa/archivada; retiro, acceso denegado, readmisión por nueva invitación y nota 8,50 conservada. Plan dictado, avisos/respuestas/consultas, Biblioteca TEXT/revisión con archivo nuevo/eliminación. Foxy texto→PDF e imagen→Biblioteca; esquema Listo en segunda cuenta tras cuota agotada en primera. TP dos etapas con validación y rúbrica; entrega con archivo, recibo, corrección privada→publicación→resultado. Generación tres pasos de cuestionario/evaluación, borrador/asignación, respuestas/autoguardado/revisión/entrega; incompletas revisadas y retorno a edición. Agenda mes/semana/día, evento/editado a serie, confirmación y eliminación de toda serie; privacidad estudiante. Buscar, abrir notificación, móvil Escape/retorno foco.

## Límites e incidencias conservados

Refs caducadas por CDP, autoscroll/footer en formularios, waits que no correspondían a UI y ventana minimizada requirieron recuperación dentro del mismo espacio. Algunas acciones usaron click DOM sobre controles existentes, sin bypass de permisos o estado React. No repetir mutaciones ya confirmadas. Estos incidentes son de automatización; no se atribuyen automáticamente al producto.

Evento nativo de descarga agotó espera tras clic; fetch autenticado obtuvo 200 y bytes exactos. No se afirma recibo nativo. Captura diagram-state es cuota/error; diagram-ready es Listo de otra cuenta. Esquema sin publicación. Fecha de evento intentada no quedó como se esperaba: no se acredita cambio de fecha. Sin handoff Foxy→TP, análisis individual exitoso, nueva sugerencia de corrección IA ni proveedor real. Sin auditoría completa WCAG/contraste/lector, rendimiento, fallas de infraestructura, vencimientos/reintentos/concurrencia/DST o rectificación exhaustiva. UI estudiante sin nota privada observada en resumen, sin nueva prueba HTTP de ese permiso.

## Verificación y limpieza

[Comandos/resultados](../verification/baseline-checks.json). Primera comprobación de base nueva: 48/624/7 referencias pendientes; corregidas. Posterior: docs48/629/0; 35 pruebas focales PASS, sin omitidas; diff/check y syntax PASS. Comparación exacta de OpenAPI salvo metadata, modelos 55/55, hashes de 165 PNG+JSON, retiros 2324 ausentes y manifest completo.

Runtime del recorrido exit 0, cleanup failures 0, fixture de credenciales eliminado. Helper reutilizable ejecutado luego: ready ambos roles sintéticos, loopback HTTP200, stopFile propio, exit 0 y cleanup failures 0. Docker sin contenedores en ejecución; fixture efímero del helper ausente. No se limpiaron recursos ajenos. Suite funcional completa omitida: no cambió comportamiento de producto; controles focales y smoke del helper proporcionales. Advertencia de lockfile padre en build Next conservada, sin error.

## Revisión independiente atribuida

/root/documentation_consumers, perfil Sol/xhigh solicitado por política, sólo lectura. Inspección inicial de consumidores: OpenAPI usado por p31-contracts; marker issue2 requerido por CI/pruebas. AST de 1282 fuentes y búsqueda de 1384 archivos localizaron browser-05 importando browser-04 retirado: agregado al retiro. Sin otros consumidores activos de los auxiliares. Avisos MIT/PHOSPHOR/OFL conservados; imports del helper nuevo fuera del retiro. El revisor no escribió código/documentación ni ejecutó navegador/servicios. Coordinador persiste sus hallazgos aquí. Revisión final del candidato en curso. Detectó dos vacíos de prosa: scoring EXACT/PARTIAL y DST de series Agenda. Coordinador los explicitó según scoring.ts54–59, agenda-series.ts13–24 y agenda-time.ts16–21; también amplió rectificación según grade-corrections. Sin modificación de producto. También precisó la frontera de privacidad: la proyección publicada conserva campos de cálculo/rúbrica autorizados; lo excluido son propuestas IA y correcciones/auditoría privadas. Especificación y guía corregidas según grade-publication.ts110–114 y PublishedResult.tsx21–31. Conclusión final: sin hallazgos accionables abiertos. El revisor observó docs48/629/0, hashes/dimensiones y referencias de165capturas, estados37/2/3/4 consistentes,2324retiros ausentes,48Markdown en manifiesto, contrato OpenAPI íntegro salvo metadata,55/55modelos y46migraciones. Node syntax del helper aprobado por revisor. No repitió los35tests focales ni smoke: esos resultados son del coordinador. Atribución preservada, sin afirmar que el revisor escribió archivos.

## Entrega y próxima acción

Sin commits/push/deploy; base local. Revisión independiente cerrada y hallazgos resueltos; DOC-01–04 DONE y roadmap actualizado. Próximo trabajo: una nueva funcionalidad expresamente autorizada, con esta base como entrada y política documental como criterio de actualización. Engram sin identidad runtime registrada: no se efectuaron escrituras atribuidas; recuperación conservada en repositorio.

## Cierre final

Base local final: 37 recorridos/ramas PASS acotados, 2 referencias, 3 limitados y 4 no ensayados. No quedan decisiones documentales abiertas; los límites de proveedores reales/accesibilidad integral y demás ramas siguen declarados, sin inferir permiso de ensayarlos. Browser-state efímero propio retirado después de cerrar Ego; los fixtures privados ya habían sido eliminados por cleanup. Comprobación final de enlaces/diff realizada después de cerrar los registros, resultado 48 archivos / 632 enlaces / 0 problemas y diff limpio; reflejado en baseline-checks.

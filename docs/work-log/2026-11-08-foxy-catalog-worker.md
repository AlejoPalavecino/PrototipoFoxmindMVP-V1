# FOX-01 catálogo backend

- Agente: /root/foxy_catalog, worker backend; sesión no expuesta.
- Fecha: 2026-11-08. Rama main; commit inicial cee57f46a57a963bef5ee6b6137873bf0b67cb4f.
- Alcance: catálogo privado y filtros aprobados en odd/tasks/foxy-workspace-discovery.md; sólo foxy-ai y este registro. Sin commits, proveedor, migraciones ni datos retenidos.
- Control: harness-tdd-qa, RED antes de producción; fixtures PostgreSQL descartables y propias.
- Estado: implementación pendiente; primer paso pruebas RED.

## Implementación y contrato

- Nuevos `catalog-input.ts`, `creation-repository.ts`, `creation-service.ts`, `foxy-creation-catalog.test.mjs`; integración en conversación/rutas/runtime/index.
- GET `/api/v1/foxy-ai/conversations` conserva límite/cursor y agrega q literal (máximo 120 caracteres Unicode) y context ALL/GENERAL/UUID. Filtrado SQL antes de LIMIT.
- GET `/api/v1/foxy-ai/creations`: limit 1–50, after base64url JSON `{createdAt,id}`, q/context/type/status acordados; `{items,next}` con next objeto cursor, igual convención de conversaciones.
- Texto READY: STUDY_MATERIAL y REVIEW → NOTE; LESSON_PLAN → PLAN; ACTIVITY_IDEAS → ACTIVITY; RUBRIC → RUBRIC. CHAT/SUMMARY excluidos. ID estable del turno; título privado editado prevalece. No materializa recursos al listar.
- Visual READY con asset READY conservado: IMAGE/DIAGRAM, ID del job. Sin claves de almacenamiento, contenido privado ni URLs persistentes.
- Destinos desde publicaciones efectivas y recibos de handoff unidos a actividad/aula actuales del propietario. Preparaciones READY/PREPARING no son publicación. Actividades WITHDRAWN excluidas; materiales eliminados no cuentan como publicación. Contexto origen no implica asignación.
- Resumen estado: PUBLISHED > DRAFT > PREPARING > PRIVATE. Apertura siempre requiere servicios existentes que reautorizan identificadores.

## Evidencia

- RED: `node --test apps/api/src/foxy-ai/foxy-creation-catalog.test.mjs`: exit 1 por ERR_MODULE_NOT_FOUND creation-repository.ts; funcionalidad ausente, antes de implementación.
- GREEN SQL inicial con el mismo comando: 1/1. PostgreSQL efímero propio del helper, migrado y eliminado por etiqueta de propiedad; sin datos retenidos.
- `node scripts/build-api.mjs`: generación Prisma exit 0 y compilación API TypeScript exit 0. Ventana de build coordinada con /root.
- Runner autorizado completo: `node --import ./scripts/register-api-test-build.mjs --experimental-transform-types --experimental-test-module-mocks --disable-warning=ExperimentalWarning --test --test-concurrency=1`.
- Runner + creación/conversation-service/http: 19/19, exit 0 (catálogo entonces con 2 casos).
- Runner + catálogo final aislado: 3/3, exit 0.
- Runner + catálogo final/conversation-repository/runtime: 14/14, exit 0. Incluye CAS previo, inmutabilidad de contexto, ciclo runtime y filtros por aula.
- Catálogo prueba herramientas antiguas READY sin recurso, título editado, q literal con % y _, paginación, propietarios, contexto, borrado lógico, preparación, handoff DRAFT/PUBLISHED y WITHDRAWN, recibo de aula ajena excluido; HTTP admission/query/cursor/cache privado; runtime IMAGE con proveedor sintético, asset disponible, material real confirmado y ninguna generación adicional al listar; estudiante y docente sin verificar denegados.

## Fallos y límites preservados

- Invocación inicial de pruebas históricas sin loader/build flags: 17 errores de importación (SyntaxError en dependencia de identity con decoradores). No era fallo funcional; se repitió correctamente y pasó 19/19. La prueba nueva directa pasó 1/1 en esa invocación.
- Un script Python de ampliación de pruebas abortó por codificación Windows al leer caracteres UTF-8; corregido explícitamente a UTF-8 antes de volver a aplicar. No se cambiaron reglas para eludir pruebas.
- No se realizó QA de navegador, integración del proxy web ni CI completo desde este agente. Root integra inventario y revisión independiente.
- DIAGRAM comparte consulta con IMAGE; este test de catálogo ejecuta IMAGE sintética y no una generación DIAGRAM adicional. No hay proveedor real, migración nueva, dependencia, commit ni push.
- Estado: implementado y verificado localmente en alcance backend; integración/cierre FOX-01 queda al coordinador. Primer paso: registrar nuevo test en inventario CI e integrar proxy/consumidor UI, verificar catálogo desde navegador.
- Revisión final: git diff --check focal y npx eslint de los ocho archivos TypeScript propios: exit 0.

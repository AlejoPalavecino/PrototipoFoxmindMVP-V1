# Auditoría visual de Inicio por rol

- Responsable: Codex, orquestador; identificador de sesión no expuesto.
- Fecha: 2026-11-12. Rama: `codex/home-visual-audit`.
- Worktree: `C:/Users/alejo/.codex/worktrees/home-visual-audit/ProtipoFoxMind`.
- Base: `1f61923`. Sin commits propios.
- Pedido: auditar Inicio docente/estudiante, coherencia tomando docente como referencia, alineación, botones, recortes y superposiciones. Trabajo aislado de aulas, agenda y Foxy.
- Etapa: inspección y auditoría; cualquier rediseño sustancial se presenta antes de implementarlo.
- Evidencia prevista: componentes y CSS reales con cliente sintético, escritorio y móvil. No acredita API, persistencia ni proveedor real.
- Sin lectura de secretos, acceso a datos retenidos ni publicación.
- Clasificación final: R1, pulido acotado autorizado; se conserva estructura, información, permisos y destinos. No hubo rediseño sustancial ni tablero R2.

## Resultado

- La columna de títulos estudiantiles se comprimía en móvil entre icono, fecha y acción. Se reemplazó esa distribución por una grilla móvil con fecha debajo del título.
- Corregir y Leer devolución medían 25 px de alto; acciones secundarias de entregas, 24×30 px. Ahora tienen objetivo mínimo de 44×44 px.
- Mini agenda estudiantil adopta las mismas tarjetas y controles visibles que docente. Mantiene sólo eventos personales; fecha lateral sin repetición debajo del título.
- Accesos de aula con filas de igual altura y encabezado adaptable. Cambios limitados a `teacher-home.css` y `HomeMiniagenda.tsx`; no se modificaron pantallas de Agenda, aulas ni Foxy.
- Harness reproducible: `node scripts/home-audit-preview.mjs`, puerto propio 4328, `?role=student` o `?role=teacher`, `&scenario=empty|error`. Componentes/CSS reales con cliente sintético; no es aplicación integrada.

## Evidencia

- `node --test tests/teacher-home-polish.test.mjs tests/home-by-role.test.mjs tests/home-miniagenda-reference.test.mjs tests/home-refinement-copy.test.mjs tests/home-polish-presentation.test.mjs`: 28 PASS, 0 fallos/skips.
- Ego Lite: ambos roles a 1440, 768, 390 y 320 px, altura 1000; ocho capturas y mediciones en `.test-artifacts/home-audit/`. Espera de fuentes antes de medición final. Sin elementos de Inicio fuera del viewport horizontal; botones visibles medidos >=44 px de alto/ancho.
- Inspección visual directa de estudiante a 1440/390/320 y docente a 768/390/320. A 320 se conserva lectura con mayor cantidad de líneas; no se afirma auditoría exhaustiva de textos arbitrarios o todos los viewports.
- Interacción real: Retomar borrador emitió actividad con `mode=respond`; evento emitió su destino privado; Enter en Leer devolución emitió la actividad calificada. Recibos locales en `interactions.json`. No acredita carga de pantallas destino ni autorización backend.
- Vacío/error de ambos roles: snapshots completos y ausencia de desborde; presencia de reintentos. Reintentos funcionales cubiertos por suite focal, no por una recuperación de servicio real.
- `npx eslint apps/web/src/features/home/ui/HomeMiniagenda.tsx`: PASS.
- `npm run docs:check`: PASS (118 archivos, 1011 enlaces en primera ejecución).
- `git diff --check`: PASS; aviso normal de conversión LF/CRLF.
- Primer intento de búsqueda con glob de Windows falló; se repitió con `rg -g '*.css'`. No afectó cambios.

## Límites y entrega

Verificado localmente en el harness y pruebas focales. No se ejecutaron build completo, API/DB, proveedor, ensayo con sesión real, ni certificación WCAG. Dependencias mediante junction a node_modules existente; código y artefactos propios en el worktree. Sin commits, integración, push o despliegue. Próximo paso opcional: revisión del usuario y autorización de integración. La vista sintética queda disponible mientras siga el proceso local en 4328.

## Integración autorizada — 2026-11-12

El usuario aprobó el resultado y autorizó realizar los ajustes necesarios, verificar y mergear a main. Se prepara un commit único de Inicio con fixture y documentación; no incluye archivos pendientes de Foxy. Rollback: revertir esta unidad restaura estilos/mini agenda anteriores sin afectar Agenda ni aulas. Integración en curso; sin autorización de push o despliegue en este pedido.

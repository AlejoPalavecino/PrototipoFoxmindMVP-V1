# Feature: Creación de aula en cuatro pasos

- **Spec:** criterios de este documento y docs/foxmind-v1-functional-spec.md §5.
- **Design:** distribución aprobada en este chat el 2026-11-07; mantener Brújula, componentes y portadas actuales.
- **Approval:** approved. Usuario: «Si confirmo.» Autoriza implementación local del flujo propuesto. No commits/push/deploy ni proveedores reales/datos retenidos.

## Alcance y aceptación

1. Datos: nombre, materia, ciclo lectivo, división, documento PDF/DOCX aprobado y portada predefinida seleccionable. Documento requerido para este nuevo recorrido, sin retirar compatibilidad histórica del API con planes manuales sin archivo.
2. Elección explícita IA/manual; subir archivo no inicia IA. Continuar por IA inicia la extracción existente; manual no llama al proveedor.
3. Edición de unidades y temas manuales o propuesta IA revisada/aplicada explícitamente. Espera/error no pierde cambios y permite continuar manualmente. Respuestas tardías no reemplazan contenido docente.
4. Revisión completa con acciones para volver a editar cada sección; sólo Confirmar y crear aula publica. Volver no publica. Autosave/revisiones/conflictos existentes preservados. Guardar/publicar bloquea doble acción; error conserva contenido y permite la recuperación aplicable.
5. Aula confirmada aparece en Mis Aulas. Nombres/orden de unidades y temas revisados coinciden con detalle/Plan después de recargar; misma fuente canónica, sin reconstrucciones distintas.
6. Feedback accesible y animaciones durante carga/IA/creación; reduced-motion, teclado y sin overflow en 320/390/768/1440. Respetar estética actual; no rediseñar navbar ni colección/interior.

## Tasks

### CRE-01 — Contrato y pruebas de aceptación
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** pruebas RED reproducibles para cuatro pasos, elección IA, revisión sin publicar y contenido final.
- **Evidence:** ocho pruebas en tests/classroom-creation-four-steps.test.mjs; primeros cinco casos RED observados antes de implementar (0/5), GREEN final 8/8. Pruebas históricas actualizadas según alcance nuevo, preservando contrato manual del backend.
- **Blocker:** none

### CRE-02 — Flujo y feedback
- **State:** DONE
- **Depends on:** CRE-01
- **Owner:** root
- **Acceptance:** criterios 1–4 y 6 implementados sin cambiar contratos backend.
- **Evidence:** cuatro pasos, campos manuales, selección de portada, IA explícita, revisión y bloqueo de doble confirmación implementados; 45 pruebas focales/SQL/estados/colección/Plan aprobadas. Tipos web y lint/fronteras aprobados.
- **Blocker:** none

### CRE-03 — Verificación y entrega
- **State:** DONE
- **Depends on:** CRE-02
- **Owner:** root; revisor independiente de sólo lectura
- **Acceptance:** pruebas focales/tipos/lint/build, recorrido sintético responsive y prueba de paridad Plan; revisión independiente resuelta. Datos de prueba aislados, sin entorno retenido ni proveedor real.
- **Evidence:** 47 PASS/0 FAIL/0 SKIP en selección final de11archivos, SQL propio con paridad exacta tras dos consultas de detalle, tipos web, lint/fronteras123, build Next aislado y control inventario491/53/23. QA Ego de los cuatro pasos a320/390/768/1440, manual/IA aplicada→colección→Plan, errores/reintento/cola/reduced-motion;29capturas conservadas con historia y límites. [QA](../../docs/work-log/evidence/2026-11-07-classroom-creation/README.md), [revisión independiente](../../docs/work-log/2026-11-07-root-classroom-creation-independent-review.md), [coordinación](../../docs/work-log/2026-11-07-root-classroom-creation-discovery.md). Sin hallazgos abiertos. No E2E autenticado/proveedor real ni suite global.
- **Blocker:** none

## Riesgos y continuidad

Manual sin archivo sigue siendo contrato histórico válido en backend; este asistente exige documento según pedido vigente. IA real no autorizada para pruebas: verificar con puertos deterministas y declarar límite. No modificar registros ajenos ni inferir autorización de despliegue. Registro coordinador: docs/work-log/2026-11-07-root-classroom-creation-discovery.md.

## Cierre local

CRE-01–03 DONE el2026-11-07. Rama codex/classroom-creation-four-steps; base bd0ee53, sin commits/push/deploy. Registro de arranque local preexistente preservado. Servidor aislado propio detenido; bases efímeras y TaskSpace cerrados. No decisiones de producto pendientes para este alcance. Siguiente acción opcional del usuario: revisar el cambio local; publicación requiere pedido nuevo explícito.

## Integración y publicación posteriores autorizadas

Usuario pidió commits, push y merge de todo a main el2026-11-07. Implementación/pruebas/evidencia en9ca6f3bf981b3cb036ad0443e86c89211863afc4; registro operativo previo separado en4dbc23e. Integración fast-forward y push main completados; HEAD/origin/main/ref remota exacta coincidieron en9ca6f3b. Sin cambios nuevos de comportamiento:25pruebas focales adicionales de entrega, tipos/documentación/inventario/diff aprobados. [Registro de entrega](../../docs/work-log/2026-11-07-root-classroom-creation-publication.md). El límite local anterior queda como historia; no hay autorización de despliegue.

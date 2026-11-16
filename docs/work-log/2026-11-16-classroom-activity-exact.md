# Actividades: listado y lectura frente a UI Lab

Agente: `/root/classroom_activity_tabs`, implementación delegada por root. Fecha: 2026-11-16.
Worktree: `foxmind-product-parity/ProtipoFoxMind`; rama `codex/foxmind-product-parity`; HEAD inicial `ef6828b96084b0fcaf9a883e4afb95e0871cf1d6` con trabajo concurrente preservado.

## Alcance y referencia

Auditar y corregir Actividades docente/estudiante y recorridos existentes frente al UI Lab autorizado. Referencia de solo lectura: worktree `foxmind-ui-lab`, `learning-experience.js`, `participation.js`, `learning-grading.js`. Sin backend, contratos, proveedores reales, datos retenidos, reinicios, commits o publicación. Root opera Ego y el entorno común.

## Hallazgos y trabajo

- Listado estudiante agrega filtros ausentes de la referencia y usa otros textos de cabecera/estado/acción.
- Borrador docente abre ficha en lugar de continuar autoría; actividades con pendientes saltan a entregas en vez de abrir la consigna.
- Preguntas de consulta docente se ocultan en un diálogo en lugar de mostrarse en la ficha. Preservar claves sólo para docente.
- La proyección de historial carece de estado de corrección privada guardada; no se puede reproducir fielmente Por revisar/Revisadas/Publicadas con `gradePublished` solamente. Diferencia comunicada a root; requiere unidad contractual separada.

## Evidencia y estado

Inspección de fuentes, reglas y contratos completada. En implementación; pruebas y comparación Ego pendientes.
Falló una búsqueda inicial en `design/foxmind-ui-lab/src` inexistente; repetida en la raíz correcta.

Primer paso siguiente: pruebas de entrada por rol, cambios focales de listado/lectura y verificación de regresión. Sin afirmación de paridad visual hasta Ego del candidato por root.

## Candidato y alcance ampliado autorizado por root

Root autorizó ampliar `academic-AttemptHistory.tsx`, `src/core/contracts/participation.ts` y servicio/repositorio de historial de participation. Coordinado con classroom_progress: misma semántica pending/saved/published, superficies de persistencia distintas. No hay migración.

| Flujo / rol | Diferencia corregida | Evidencia / límite |
|---|---|---|
| Listado estudiante | Sin filtros extra; textos de referencia; todas las tarjetas abren consigna por consulta sin iniciar intento ni saltar al recibo. | Tres pruebas de entrada RED→GREEN. |
| Listado docente | Compartidas/Borradores; vacío de referencia; borrador con tarjeta privada y Seguir creando abre editor directo; pendientes no cambian destino de Ver actividad. | Pruebas de entrada sin escrituras. Retiradas sólo si existen registros, estado real conservado. |
| Lectura docente | Preguntas y claves inline, sólo docente, con puntos y reglas vigentes. | Prueba negativa estudiante conserva ausencia aun si recibe campos privados en fixture. |
| Entregas docente | Todas/Por revisar/Revisadas/Publicadas con estado real de guardado, última entrega por estudiante actual y En camino desde obligaciones actuales. | PostgreSQL real descartable y pruebas UI. No notas ni comentarios privados dentro del DTO de historial. |
| Intentos anteriores | Conservados desde corrección de una persona sólo cuando tiene múltiples intentos; no botón permanente de historial en Entregas. | Callback probado. URLs/notificaciones con attemptId siguen funcionando. |
| Footer lectura docente | Volver al aula + Ver entregas/Ver la consigna. Sin menú nuevo ni controles extra. | Root rechazó menú de opciones porque no existe en referencia; retirado. Backend de edición/habilitación/retiro preservado. |
| Resolver/entregar/devolver | Sin cambios a contratos de autosave, subida, recepción, revisión privada o publicación. | Pruebas E03–E05 y revisión de componentes. No se acredita nueva comparación Ego. |

CSS agregado sólo al módulo `academic-activity.module.css`, sin import global. `GradingEditor.tsx` recibe callback opcional de intentos previos; al salir conserva su confirmación de cambios sin guardar. Texto de ayuda de selección de unidades se alineó con el botón real.

## Verificación observada

- `node node_modules/typescript/bin/tsc --noEmit --project apps/web/tsconfig.json`: PASS repetido tras cambios de historial/callback.
- `node --test tests/classroom-activities-exact.test.mjs tests/classroom-activity-workflow.test.mjs tests/classroom-activity-redesign.test.mjs tests/product-parity-activity-ui.test.mjs tests/parity-authoring-entry.test.mjs tests/foxmind-3d-flows-targets.test.mjs tests/p8-grading-client.test.mjs`: 51/51 PASS.
- `node --experimental-transform-types --test tests/classroom-delivery-review-state.test.mjs tests/foxmind-3d-repository-history.test.mjs`: 2/2 PASS; PostgreSQL propio con tmpfs y etiqueta aleatoria; helper comprueba dueño para limpiar. Verifica nota cero privada, estado publicado, espera de estudiante con borrador sin entregar, prohibición de acceso docente desde alumno y ausencia de reviewState/nota privada en historial estudiante.
- Después del ajuste final de historial por persona: actividades exactas + product-parity-activity-ui + grading-client 16/16 PASS; después de alinear nombre accesible con texto visible, exactas 4/4 PASS.

### Fallos conservados y ajustes de pruebas

- RED inicial listado 0/3, por cabecera/CTA/destino anterior. RED entregas 3/4, por ausencia de filtros y agrupación; luego GREEN.
- Primera prueba DB no inició: Node strip-only no admite parameter properties; se usó `--experimental-transform-types`. Segundo intento falló por stub incompleto de archivos; corregido antes del RED efectivo por `reviewState` ausente. Luego GREEN.
- Suite amplia inicial 41/51: seis fallos de fixture/shell ClassroomView por reduce sobre dato ausente, corregidos por root. Cuatro de actividad estaban acoplados al diseño previo: modal de método, botón Por unidades, tres submits de generación, texto de recibo en padre. Se actualizaron sólo estas expectativas conservando ausencia de escrituras, validaciones, revisión reconocida y receipt confirmado.
- Root autorizó cambiar la expectativa docente de claves ocultas en diálogo a inline. Se conserva íntegra la comprobación negativa estudiantil. También se corrigió expectativa vieja Objetivo de aprendizaje al rótulo ya vigente Para qué lo hacemos.

## Freeze y handoff

Candidato congelado para QA de root. Sin reinicio, build propio, proveedor real, commits, integración, publicación o despliegue.
Pendiente: Ego 1440/390/320 con docente Compartidas/Borradores; estudiante estados pendiente/borrador/entregada/publicada; docente consigna de cuestionario con claves inline y entregas con todos los filtros; reentrega real→corrección→intentos de esa persona. Verificar footer no tapa controles y campos largos conservan ancho. Probar publicación privada→publicada y recarga con usuarios distintos en API común.
Los selectores de navegador legacy `Corregir intento N` corresponden ahora a historial de persona; la fila principal usa `Revisar entrega · Intento N` o `Ver devolución · Intento N`, con texto visible incluido en el nombre accesible. No se reescribió toda la suite de integración legacy.
Root mantiene documentación canónica y evidencia visual final: guías afectadas son participación (entrada/entregas por estado), grading (consulta de revisión guardada sólo docente) y diseño.

## Corrección tras revisión independiente y Ego

Root detectó regresión real: Habilitar otro intento sólo era accesible desde historial de múltiples intentos, dejando inaccesible la primera reentrega. Agregado callback contextual `onReopen` desde `GradingEditor` para la última entrega confirmada de miembro actual cuando servidor permite reabrir y no existe otro borrador/entrega posterior. Usa la misma regla que el historial y el diálogo de confirmación vigente; no escribe al abrir. Cambios privados pasan por la confirmación de salida existente; volver conserva la edición y descartar sale antes de habilitar. No se agregó botón permanente de historial.

RED observado: 3/7 fallaron por falta del callback/botón; GREEN: nuevas pruebas cubren entrega única, última de varias, intento anterior, borrador ya abierto, intento sin entregar, miembro anterior, permisos revocados y rol estudiante; además confirmación explícita con revisión y guardado privado protegido. Suite final exactas + product-parity-activity-ui + grading-client: 25/25 PASS; TypeScript web PASS.

Inspeccionadas capturas `after/app-student-activities-390.png` y `after/ref-student-activities-390.png`. A <=520px la acción ahora ocupa ambas columnas y ancho completo, con título de sección 22px/1.3 como referencia. Las fuentes actuales de UI Lab sí especifican Archivo para TP, Evaluar para evaluación y Explorar para cuestionario (`learning-experience.js:10`); se mantienen esas etiquetas. Captura app muestra TP y referencia cuestionario: no se cambió el tipo real para imitar fixtures distintos.

Freeze posterior: sólo cambiaron `academic-AttemptHistory.tsx`, `GradingEditor.tsx`, `academic-activity.module.css`, prueba exacta y este registro. Backend sigue congelado. Root recompila y comprueba Ego del nuevo candidato; aún no se acredita geometría postbuild desde este agente.

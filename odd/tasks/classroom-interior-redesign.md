# Feature: Interior de aulas — diseño aprobado FoxMind 3D

- **Spec:** alcance y aceptación de este documento; contrato vigente docs/foxmind-v1-functional-spec.md.
- **Design:** maqueta aprobada y ajustada en conversación del2026-11-04; fuentes/artefactos en el registro de descubrimiento. Mantener identidad FoxMind3D y banner final integrado.
- **Approval:** approved

Autorización vigente: «Bien me gusto, hace ahora la implementación de este rediseño del interior de aulas, el navbar no lo toques […] solo quiero modificar el interior de las aulas». Autoriza implementación local. Sin commits/push/deploy ni proveedores reales/datos retenidos.

## Alcance y criterios

- Ocho secciones docente/seis alumno con datos reales y dirección visual de la maqueta: banner por portada del aula, pestañas interiores, superficies crema/naranja, contraste y botones claros. Conservar AppNavbar, navbar global, Inicio, Agenda y colección Mis aulas sin modificaciones.
- Plan: seleccionar tema no escribe. Checkbox independiente marca TAUGHT/PENDING con guardado confirmado, error y busy; deshacer restaura el estado anterior con la revisión vigente. NEXT existente no se migra ni pierde por navegar. Avance docente separado de métricas académicas. Alumno/archivado solo consulta. Tema seleccionado se conserva entre secciones dentro de la misma aula.
- Creación contextual: desde un tema se puede iniciar una actividad o agregar material con unidad/tema preseleccionados, editables; unidad y temas visibles. Actividades admite varios temas de una unidad y conserva bloqueos por participación.
- Actividades: entrada manual/IA inequívoca; etapas de preparación, materiales, condiciones y revisión cuando sea compatible con el contrato actual. Propuesta IA revisada → borrador privado → publicación explícita. Mantener APIs, fuentes explícitas, cuotas, advertencias, recuperación, revisiones/conflictos, intentos y confirmaciones. Ningún dato/función simulada se traslada al producto. No contadores inventados ni bandeja que prometa datos no disponibles.
- Biblioteca/Muro/Progreso/Alumnos/Historial/Configuración: disposición, jerarquía y acciones de la propuesta con contenidos y capacidades existentes. Historial es de alumnos anteriores; indicadores separados; búsqueda local de personas/materiales donde haya datos disponibles. Mantener moderación, descargas/escaneo, invitaciones, permisos y lifecycle. Navegación contextual de seguimiento solo cuando destino/identificador exista.
- Móvil: selector de sección y tema accesibles; no ocultar estado de publicación, acciones ni información académica. Sin overflow a320/390/768/1440; teclado/foco, estados carga/vacío/error/busy/archivado y reduced motion.
- No cambios de stack, APIs/modelo académico, cuentas, navbar compartido, servicios externos ni datos retenidos. Pruebas con fixtures y puertos sintéticos.

## Tasks

### AUR-001 — Marco interior, banner y navegación
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** banner fiel por portada real, selector móvil y ocho/seis secciones, CSS estrictamente interior; navbar global idéntico.
- **Evidence:** [Verificación coordinada](../../docs/work-log/2026-11-04-id-unavailable-classroom-interior-implementation.md) y [QA sintética](../../docs/work-log/evidence/2026-11-04-classroom-interior-redesign/README.md).
- **Blocker:** none

### AUR-002 — Preparación contextual y avance del plan
- **State:** DONE
- **Depends on:** AUR-001
- **Owner:** root
- **Acceptance:** checks confirmados con error/deshacer, selección sin writes, contexto curricular y creación/material contextual, restricciones por rol/archivo.
- **Evidence:** [Verificación coordinada](../../docs/work-log/2026-11-04-id-unavailable-classroom-interior-implementation.md) y [QA sintética](../../docs/work-log/evidence/2026-11-04-classroom-interior-redesign/README.md).
- **Blocker:** none

### AUR-003 — Crear, revisar y publicar actividades/IA
- **State:** DONE
- **Depends on:** none
- **Owner:** activities worker (parcial); finalización y verificación root
- **Acceptance:** manual/IA, etapas claras, selección de unidad/temas visible y precarga contextual, revisión antes de borrador/publicación; todas las funciones reales preservadas.
- **Evidence:** [Verificación coordinada](../../docs/work-log/2026-11-04-id-unavailable-classroom-interior-implementation.md) y [QA sintética](../../docs/work-log/evidence/2026-11-04-classroom-interior-redesign/README.md).
- **Blocker:** none

### AUR-004 — Secciones de contenido y seguimiento
- **State:** DONE
- **Depends on:** AUR-001
- **Owner:** root
- **Acceptance:** Biblioteca/Muro/Progreso/personas/historial/ajustes coherentes y accionables con datos reales, sin quitar funciones ni modificar permisos.
- **Evidence:** [Verificación coordinada](../../docs/work-log/2026-11-04-id-unavailable-classroom-interior-implementation.md) y [QA sintética](../../docs/work-log/evidence/2026-11-04-classroom-interior-redesign/README.md).
- **Blocker:** none

### AUR-005 — Verificación integrada y entrega
- **State:** DONE
- **Depends on:** AUR-001, AUR-002, AUR-003, AUR-004
- **Owner:** root; revisión independiente
- **Acceptance:** tests focales, tipos/build aislado, lint y fronteras, QA synthetic responsive y recorridos con navbar real; revisión independiente sin bloqueantes, registros conciliados y límites explícitos.
- **Evidence:** [Verificación coordinada](../../docs/work-log/2026-11-04-id-unavailable-classroom-interior-implementation.md) y [QA sintética](../../docs/work-log/evidence/2026-11-04-classroom-interior-redesign/README.md).
- **Blocker:** none

Solo root actualiza este registro. Implementado no significa DONE. No cerrar con fallos/omisiones bloqueantes. Primer checkpoint: pruebas RED de selección/check/contexto y rutas de creación, antes de implementar.

## Cierre local — 2026-11-04

AUR-001–005 terminadas localmente. Root retomó actividades y contenido tras interrupción de los workers, corrigió cuatro hallazgos y verificó el candidato. Sin commits, integración a main, push ni despliegue. No ejecutar pruebas SQL/IA real como consecuencia automática de este cierre.

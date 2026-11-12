# Feature: Foxy AI y chat de estudio

- **Spec:** docs/design/foxy-ai-proposal.md
- **Design:** docs/design/study-chat-preview.html
- **Approval:** approved

## Tasks

### TASK-001 — Experiencia de chat para ambos roles
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** Historial plegable, chat amplio con avatar y estados reales, herramientas y creaciones separadas, contexto docente y temas estudiantiles accesibles.
- **Evidence:** `2b1488c` y `9804dcc`. Envío, respuesta, contexto, historial y Escape comprobados en la app aislada. Capturas y geometría registradas en docs/work-log/2026-11-12-root-foxy-workspace.md.
- **Blocker:** none

### TASK-002 — Materiales y plan de estudio
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** Filtrar materiales por procedencia, ver disponibilidad para Foxy, cargar archivos propios, navegar unidades y preparar una consulta por tema.
- **Evidence:** `9804dcc`. DOCX aprobado y material consultado por API después de la carga. Plan abre tema como borrador. Capturas móviles de ambas pestañas verificadas.
- **Blocker:** none

### TASK-003 — Adjuntos privados
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** Sólo archivos aprobados y legibles entran al contexto. El dueño puede usarlos en su conversación. Guardar además en carpeta requiere elección explícita del estudiante.
- **Evidence:** `be70338`, con prueba de custodia en PostgreSQL y revisión independiente. En ambos roles el proveedor sintético recibió el archivo aprobado; se rechazó otra sesión, otro chat y un PDF inválido. Se comprobó que un chat nuevo no hereda adjuntos y que quitar del chat conserva el material elegido.
- **Blocker:** none

### TASK-005 — Fidelidad visual con la maqueta
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** Comparar estructura, densidad, herramientas, diálogos y compositor de la app con las maquetas de ambos roles. Mantener controles legibles, alineados y sin superposición en escritorio y móvil.
- **Evidence:** Comparación lado a lado de chat docente, herramientas y materiales. Se corrigieron el contraste del selector, la jerarquía de herramientas y el espacio del chat a 320 px. Once capturas inspeccionadas en docs/design/current.
- **Blocker:** none

### TASK-004 — Comprobación integrada
- **State:** DONE
- **Depends on:** TASK-001, TASK-002, TASK-003, TASK-005
- **Owner:** root
- **Acceptance:** Ambos roles y estados principales verificados con datos sintéticos. Escritorio y móvil sin solapamiento o recorte de controles.
- **Evidence:** Builds, lint y suites focalizadas verdes. Recorrido final de 26 estados sin superposiciones de controles ni desborde horizontal, con compositor alineado y visible. Incluye un apunte de estudio y el diálogo de la tarjeta Imágenes y esquemas con retorno de foco.
- **Blocker:** none

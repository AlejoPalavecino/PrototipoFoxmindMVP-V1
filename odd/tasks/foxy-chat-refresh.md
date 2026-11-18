# Feature: Foxy AI y chat de estudio

- **Spec:** docs/design/foxy-ai-proposal.md
- **Design:** docs/design/foxy-ai-proposal.md
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
- **Evidence:** Comparación lado a lado de chat docente, herramientas y materiales. Se corrigieron el contraste del selector, la jerarquía de herramientas y el espacio del chat a 320 px. Once capturas inspeccionadas en [la galería del candidato](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/tree/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/design/current).
- **Blocker:** none

### TASK-004 — Comprobación integrada
- **State:** DONE
- **Depends on:** TASK-001, TASK-002, TASK-003, TASK-005
- **Owner:** root
- **Acceptance:** Ambos roles y estados principales verificados con datos sintéticos. Escritorio y móvil sin solapamiento o recorte de controles.
- **Evidence:** Builds, lint y suites focalizadas verdes. Recorrido final de 26 estados sin superposiciones de controles ni desborde horizontal, con compositor alineado y visible. Incluye un apunte de estudio y el diálogo de la tarjeta Imágenes y esquemas con retorno de foco.
- **Blocker:** none

### TASK-006 — Unificar el estado del primer envío docente
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** root
- **Acceptance:** Un primer envío en un chat nuevo muestra una sola vez el mensaje y retira la espera al llegar su turno, aunque el chat anterior tuviera historial. Un error incierto conserva el reintento.
- **Evidence:** La regresión falla con 2 mensajes en la base y pasa con 1 en el candidato. En Chromium se completó un chat, se creó otro y se verificó un único mensaje visible sin espera y un turno `READY` en la API.
- **Blocker:** none

### TASK-007 — Abrir y descargar recursos privados
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** root
- **Acceptance:** Lectura y descarga en hasta tres acciones desde el chat o Creaciones; Compartir separado y con revisión explícita. Materiales y Plan usan rutas privadas existentes, con apertura compatible. La maqueta de creación queda fuera del corte.
- **Evidence:** Chromium descargó Word e imagen docente, Word de apunte/esquema, TXT de tres prácticas, plan PDF y material DOCX estudiantil. La interfaz abrió en lectura y dejó Compartir cerrado; Ego verificó Escape y retorno de foco. [Registro del corte](../../docs/work-log/2026-11-12-root-foxy-resource-access.md).
- **Blocker:** none

### TASK-008 — Verificar descargas y estado de chat
- **State:** DONE
- **Depends on:** TASK-006, TASK-007
- **Owner:** root
- **Acceptance:** Pruebas de regresión y recorridos de ambos roles con datos sintéticos, sin afectar permisos ni publicar al abrir o descargar.
- **Evidence:** 347 pruebas web y 72 de la suite Estudio verdes; build, lint, docs y tablero correctos. Chromium y Ego verificaron clics, archivos, foco y denegación cruzada con datos sintéticos. [Evidencia y límites](../../docs/work-log/2026-11-12-root-foxy-resource-access.md).
- **Blocker:** none

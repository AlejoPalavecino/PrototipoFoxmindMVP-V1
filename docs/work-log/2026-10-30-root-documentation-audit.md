# Auditoría de documentación y propuesta de orden

- Agent / role: coordinador `/root`.
- Session or task ID: `/root`; sesión del host sin identidad registrada.
- Date: 2026-10-30, America/Buenos_Aires.
- Branch / worktree: `codex/documentation-audit`, worktree aislado reutilizado.
- Starting commit: `e0c16fd341f1b3ffea6bc82f1a6ca3dbcdcffce4`, igual a main/origin-main al inicio.
- Status: completed.

## Request and scope

El usuario pidió lanzar a Astra para auditar y revisar la documentación, identificar documentos que ya no sirven y proponer eliminación/reorganización para entender mejor el proyecto. Esta etapa produce diagnóstico y plan concreto de limpieza; no implementa todavía movimientos, eliminaciones o cambios de producto. Se preservan evidencia, autoría y estados históricos. Sin despliegue ni publicación remota nueva por este pedido de auditoría.

## Método y coordinación

Explorer de solo lectura prepara inventario y señales. Astra6 con esfuerzo alto realiza la auditoría documental sobre el checkpoint indicado, con criterios de lectura progresiva y una propuesta de archivos/rutas concretas. Solo podrá escribir su informe y registro separados. Root verifica los hallazgos y dependencias antes de consolidar; ningún actor reescribe el roadmap compartido por su cuenta.

Se revisan documentación versionada dentro y fuera de docs, índices, especificaciones, contratos, guías, propuestas, diseños y registros. Viejo no equivale a obsoleto. Cualquier candidato a mover/eliminar debe incluir referencias entrantes desde documentos, código, tests o CI y destino de su información vigente. Configuración privada, secretos, datos reales, dependencias/generados y artefactos de prueba quedan fuera.

## Verification and handoff

Ambos checkouts limpios al inicio; roadmap y protocolo leídos. Pendiente inventario, auditoría Astra, contraste de hallazgos y entrega. No hay cambios funcionales y no corresponde repetir la suite de producto; se ejecutarán controles documentales proporcionales. Engram solo lectura hasta registro del host; ninguna escritura de memoria.

## Inventario y contraste estructural observados

Explorer `/root/docs_audit_bootstrap`, solo lectura, inspeccionó main en e0c16fd y las entradas/documentos/harnesses; consultó Engram current_project/context/search sin escrituras. Señaló mezcla de índices activos con evidencia histórica, rutas absolutas de otros checkouts y duplicados posibles que requerían hash; no ejecutó tests ni revisó semánticamente todo el corpus. Root persistió su atribución y reconcilió los conteos antes de darlos por válidos.

Escáner estructural del coordinador sobre `git ls-files` de e0c16fd:2738rutas versionadas,1501bajo docs,28bajo odd y702Markdown/MDX. Markdown:58en raíz docs,2en api,3en audits,36en design,565en work-log,28en odd y10fuera de esas zonas. Carpetas completas incluyendo binarios: docs raíz59,api3,audits13,design314,references29,work-log1083. La mayoría de Markdown son registros históricos, no guías operativas.

Se examinaron2797enlaces/imágenes Markdown locales inline fuera de fences simples: ningún destino de archivo ausente bajo ese parser. Siete enlaces absolutos/dependientes del equipo, todos en docs/design/README.md, se detectaron pero no se sondearon fuera del repositorio. No se comprobaron anchors, URLs externas, sintaxis anidada/referencias ni semántica de las instrucciones; cero archivos ausentes no significa documentación vigente.

Hash de bytes identificó diez grupos duplicados exactos,6685993bytes potencialmente redundantes; ninguno es Markdown. Incluyen referencias PNG de dos familias, SVG con roles distintos y capturas históricas con nombres diferentes. Igualdad de bytes no autoriza borrar ni demuestra que dos evidencias tengan el mismo propósito. Artefacto de diagnóstico ignorado: `.test-artifacts/documentation-audit-structure.json`; Astra recibió conteos, límites y grupos para revisar referencias entrantes.

Contraste directo adicional por root: README principal sí tiene entrada general/local vigente; docs/design/README mezcla una actualización de integración con secciones que aún describen esas mismas familias fuera del worktree y FoxMind3D como plan previo. La tarea de IA conserva una negación de Gemini/recorrido/publicación que exige contrastar con los registros posteriores enlazados por roadmap. Son hallazgos a consolidar por Astra, no permisos para reescribir evidencia histórica.

## Entrega Astra y revisión independiente

Astra 6/high (`/root/astra_documentation_audit`) completó [el informe](../audits/2026-10-30-astra-documentation-audit.md) y [su registro](2026-10-30-astra-documentation-audit.md). Diez hallazgos priorizados, candidatos por ruta, consumidores y un plan por etapas que continúa las auditorías del 21 y 22 de octubre sin sobrescribirlas. Conclusión: primero reconciliar vigencia e índices; después separar guías de historia y migrar dominios pequeños. No se identificó un Markdown descartable sin pérdida de información ni se recomienda un borrado incondicional. Solo cuatro pares de referencias Carpetas quedan como consolidación potencial condicionada a función, procedencia y consumidores.

Hallazgos principales contrastados: especificación que aún excluye corrección IA, tarea de issue2 con estado anterior a evidencia/publicación, guías con login a/profile frente al destino actual/inicio, enlace de estado actual hacia un checkpoint histórico, arquitectura dispersa y rutas documentales consumidas por CI/tests. Root comprobó directamente el destino de login en account-screen.tsx:124, la lectura de OpenAPI en p31-contracts.test.mjs:6 y la condición de CIissue2:84. La etiqueta histórica existente en diseño se reconoce; no se presenta como si nunca se hubiera delimitado historia.

Revisión independiente atribuida a `/root/docs_audit_review`, solo lectura, misma base e0c16fd: LGTM_SIN_HALLAZGOS sobre el informe corregido. Recalculó censo2738/1501/702,40452líneas Markdown y20hashes/longitudes de diez grupos, todos coincidentes; confirmó565Markdown work-log,987líneas de especificación y485de roadmap. Señaló una fecha ambigua y procedencia de escenarios sin extensión en browser-observations.json. Astra corrigió la fecha y conservó las capturas/TXT tras verificar esos stems. El reviewer no escribió archivos ni ejecutó pruebas funcionales, instalaciones, red, fuentes privadas, commits o memoria.

La lectura semántica fue dirigida a familias, contratos y cierres relevantes; no se afirma revisión funcional de cada frase de los 702 Markdown ni inspección visual de 325 capturas. Los 2.797 enlaces provienen del parser del coordinador con límites indicados, no de una nueva aceptación del producto. Diez grupos de hashes no equivalen a diez archivos eliminables.

## Cierre y siguiente paso

Solo se agregan el informe y dos registros; no se editan índices, contratos, código, pruebas o evidencia preexistente. Ningún archivo fue movido ni eliminado. La auditoría no ejecuta el plan y no publica cambios nuevos en main. Se guarda como unidad local revisable; el hash real lo proporciona Git después del commit, sin inventarlo en este registro.

Verificación proporcional: fuentes y citas de hallazgos relevantes contrastadas, control de enlaces locales y blancos/secretos del índice antes de guardar. No corresponde repetir suites funcionales porque no cambió comportamiento ni consumidores documentales. Primer siguiente paso propuesto: etapa 1 del informe, corregir especificación, índices, guías y tarea de issue #2 manteniendo rutas, con un plan único y diff acotado. Una implementación posterior debe seguir el alcance que indique el usuario; aquí queda entregado el diagnóstico solicitado.

Comprobaciones observadas del índice: Gitleaks exit 0 sin secretos (~47 KB), `git diff --cached --check` exit 0 y ocho destinos locales existentes bajo el validador documental. No se verificaron URLs externas ni anclas. La unidad contiene solo tres documentos nuevos y menos de 400 líneas; se conserva en la rama local de auditoría, con main intacto.

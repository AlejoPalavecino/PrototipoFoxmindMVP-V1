# Paridad exacta: Muro, integrantes, historial y ajustes

- Agente: classroom_people_wall (subagente de root), 2026-11-16.
- Worktree: foxmind-product-parity/ProtipoFoxMind; rama codex/foxmind-product-parity; base ef6828b.
- Alcance autorizado: componentes Muro, Members, Roster y Settings, CSS propios y pruebas. Diseño aprobado: UI Lab del worktree foxmind-ui-lab, screens.js y teaching-room.css. Sin commits, publicación, proveedores ni datos retenidos.
- Se preservan cambios preexistentes. Coordinador opera navegador y shell compartido.
- Hallazgos: filtros/bordes verdes del muro; búsqueda/correos/regeneración de código; ciclo/IA/cuarta portada en Ajustes agregaban controles fuera de referencia. Datos persistidos y permisos se conservan. Identificación «Vos» requiere proyección explícita propia; no se infiere por nombre.
- Estado: implementado y verificado localmente por unidades/transporte/SQL. Congelado para revisión visual del coordinador; no equivale a paridad visual aprobada.

## Resultado por rol y sección

- Muro, ambos roles: elimina filtros ajenos a referencia y colores/bordes agregados. Conserva paginación, deep links, controles autorizados de moderación y marcas de contenido eliminado. Aviso/consulta abren «Una idea para tu grupo»/«Tu pregunta tiene lugar»; responder abre «Continuar la conversación», con «Publicar mensaje». Conserva límites reales de título/cuerpo, bloqueo de duplicados y cierre tras POST confirmado aunque falle refresco. Aula archivada no publica ni responde.
- Estudiantes docente: filas nombre/rol/Ver ficha; sin buscador ni correo visible. Compañeros estudiante: nombre/rol, «Vos» sólo por igualdad de identidad autenticada en servidor. No se compara por nombre. Historial conserva períodos y acceso a registros; vacío de referencia.
- Código: composición código + Copiar código. Generar código se conserva únicamente como recuperación si falta un código; las invitaciones conservan sus estados reales/rechazo y acciones autorizadas.
- Ajustes docente: nombre, materia, grupo y portadas Literatura/Biología/Matemática; una portada legado persistida permanece seleccionable. Año y opción IA siguen en el estado y payload vigente, sin controles ajenos a referencia. Conserva conflicto, guardado, estado archivado y confirmación para archivar/reactivar.
- CSS de integración: `apps/shared-ui/parity-classroom-people-wall-exact.css`; importación responsabilidad del coordinador. Módulo de Muro añade fila compacta de respuesta.

## Evidencia

- `node --test tests/classroom-people-wall-exact.test.mjs`: RED inicial 4 fallos por las diferencias previstas; GREEN final 6/6. El caso de modal inicialmente usó fixture incompleto sin nextCursor; se corrigió antes de repetir RED por título anterior y obtener GREEN. Homónimos no filtran IDs/correos/historial; guardas de capacidad rechazan extraño e historial estudiante. Respuesta confirma un POST y cierra el modal si falla refresco.
- `node --test tests/p6-wall-client.test.mjs`: 3/3, transporte y escape/tombstone.
- `npm run api:build`: generación Prisma y TypeScript API exit 0. `npx tsc --noEmit -p apps/web/tsconfig.json`: exit 0, repetido después de modales.
- `node --test tests/p5-enrollment.test.mjs`: 15/15 con PostgreSQL descartable; cleanup exit0. Expectativa ampliada con isSelf:true por autorización del coordinador; conserva todos los rechazos y retención de historial.
- `node --test --test-name-pattern='alumnos e historial|configuración distingue' tests/classroom-sections-redesign.test.mjs`: 2/2. Reconciliación autorizada de búsqueda retirada y texto de guardado; conserva comprobación de borrador, error y conflicto. Otros agentes poseen casos de material/progreso.
- ESLint en los cuatro componentes, proyección membresías y contrato: exit 0. `git diff --check` focalizado: exit 0.

## Límites y handoff

- No ejecuté Ego ni reinicié servicios. Root debe comprobar desktop/móvil: lista de Muro y respuesta modal, error/guardado, código copiado sin espacio, ficha, «Vos» con dos nombres iguales, vacío y filas de Historial, cambio de portada guardado y archivo/reactivación. El API del preview necesita incluir la nueva proyección isSelf para que aparezca «Vos».
- `tests/p6-wall-integration.test.mjs` recibió únicamente selectores de los modales/CTA autorizados; no se ejecutó aquí su browser E2E. Guardas y pasos se conservan.
- Ejecución amplia inicial de classroom-sections-redesign mostró fallos ajenos de material/progreso, derivados a sus propietarios. `grading-ai-settings.test.mjs` no arrancó en strip-only por constructor TypeScript con parameter property; no se declara pasada ni se modifica ese runner.
- Extensión backend autorizada por root: únicamente `memberships-operations-2.ts` (agrega booleano en proyección estudiante) y `Member` en contrato (campo opcional). Sin migraciones ni acceso a estado retenido.
- Sin commit, integración, publicación o deploy. Próximo paso: validación visual por root y reconciliación de guías canónicas en sus archivos compartidos.

## Revisión desde capturas Ego de root

- Pares inspeccionados: `.test-artifacts/classroom-interior-exact/after/{app,ref}-teacher-{settings,wall,members,history}-390.png`.
- Ajustes: el selector legado `label:last-child` hacía que Grupo ocupara ancho completo y Materia media columna. Se restableció distribución nombre completo + materia/grupo en escritorio y una columna hasta 520px. Entradas de 48px y texto de 16px según referencia.
- Footer de guardado blanco sticky `bottom:0`, hijo directo del formulario para evitar el contenedor especial fieldset. Se mantiene disabled explícito por busy/archived; controles reservan scroll-margin inferior de 140px para que el foco no quede debajo de la acción. No añade overflow oculto ni altura interna de scroll.
- Muro: la primera inspección había omitido la cascada de `learning.css`; esa fuente sí agrega byline y borde superior verdes. Se restauraron y se alinearon títulos 21/19px. CTA Muro e integrantes ocupa ancho completo móvil. Historial recupera texto gris azulado, antes naranja por cascada.
- Prueba de guardado/conflicto y TypeScript web verdes después de la corrección. La nueva prueba comprueba disabled del botón fuera del fieldset. Root conserva verificación Ego de sticky/scroll/foco con el candidato actualizado; una captura anterior no prueba el resultado nuevo.

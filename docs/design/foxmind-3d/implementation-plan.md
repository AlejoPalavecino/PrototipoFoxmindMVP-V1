# Plan de implementación FoxMind 3D

**Estado: diseño preparado; ejecución de producto pendiente.** Este plan cubre los 82 recorridos de la [matriz](coverage.md), contrastados con V1, Agenda y las funciones IA posteriores al MVP. El alcance actual crea recursos, especificaciones y maquetas locales. No ejecuta este plan, cambia contratos de producción ni despliega.

## Punto de partida y decisiones

Base inspeccionada: `main`, `e7f5d6f67520516fe56fe9794ab8d1ac97633bdd`, 2026-10-25. El producto usa Pages Router (`apps/web/pages/`) y módulos compartidos `apps/shared-ui`, `apps/classrooms-ui`, `apps/agenda-ui`. No migrar framework, autenticación ni datos para aplicar el diseño. Antes de ejecutar, reconciliar HEAD, roadmap, worktree y registros: este documento no certifica un futuro checkout.

La [especificación visual](foundations.md) fija composición, tokens, responsive y controles; los [seis contratos](README.md#especificaciones-de-todos-los-flujos) fijan comportamiento y permisos. Si un mockup omite un control, el contrato prevalece. Una pantalla del atlas es un diseño, no una prueba de integración.

Cambios de comportamiento deliberados: entrada ordinaria al aula en Plan para ambos roles; Inicio agregado por participación; separación de Configuración en `/settings`; sidebar desktop y drawer móvil. Conservar URLs existentes y destino profundo autorizado. No incorporar buscador global solo porque aparece en las referencias.

## Orden de ejecución

Cada etapa produce unidades revisables por comportamiento, con pruebas fallidas antes de cambios funcionales, implementación, verificación independiente y registro. Un cambio puramente decorativo necesita revisión visual y estructural, no tests que repitan CSS. Separar unidades amplias en commits de alcance coherente; no mezclar cambios de permisos con estilos. La publicación remota y el despliegue son pasos posteriores con autorización propia.

| Etapa | Resultado / dependencias | Superficie principal | Salida verificable |
|---|---|---|---|
| D0 · Baseline y contratos | Antes de editar: inventario actualizado, fixtures sintéticos por rol/estado y rutas permitidas; reconciliar diferencias de V1/IA/Agenda | Roadmap, tests existentes, matriz de este paquete | Ninguna función vigente sin ID; datos sintéticos; baseline observado y fallos previos registrados |
| D1 · Fundaciones y recursos | Tokens, iconos, SVG, cargador de portadas, controles base; depende de D0 | `apps/shared-ui/design-tokens.css`, `folders-*.css`, `dialog-focus.ts`, nuevos componentes pequeños dentro del módulo | Contraste, teclado, estados y 320–1440 px; assets/hash/dimensiones correctos; no masters públicos |
| D2 · Acceso y shell | AUTH-01..05, NAV-01, ACC-01..02; depende de D1 | `apps/web/pages/{index,sign-in,register,verify-email,forgot-password,recover-password,profile}.tsx`, `apps/web/src/components/account-screen.tsx`, `apps/shared-ui/AppNavbar.tsx`; nueva página `settings.tsx` | Rutas/next/guard/token/redirección conservados, perfil separado, password/logout reales, sin contenido privado fugaz |
| D3 · Aulas y membresías | CLASS-01..14, PEOPLE-01..04; depende de D2 | `apps/classrooms-ui/{Classrooms,ClassroomsApp,ClassroomView,Wizard,PlanExtraction,ExtractionEditor}.tsx`, hooks/clientes existentes | Cards/pendientes/asistente/IA plan/invitar/código/salir/archivo; permisos y conflictos comprobados |
| D4 · Aula y contenido | CLASS-15, PLAN-01..05, LIB-01..05, WALL-01..04, NAV-02; depende de D3 | `apps/classrooms-ui/{Plan,Library,Wall,Notifications}.tsx`, `apps/web/pages/files.tsx` | Plan por defecto y deep links; archivos privados; mantenimiento/versiones; conversaciones y lecturas |
| D5 · Autoría manual e IA | ACT-01..07, AI-01..05; depende de D4 | `Activities`, `ActivityAuthoring`, `ActivityCurriculum`, `ActivityGeneration`, `ActivityGenerationForm`, `ActivityGenerationProposal`, `use-activity-generation` en `apps/classrooms-ui` | Los tres tipos, preguntas/puntos/plazos, generación durable, revisar/aplicar/publicar separados |
| D6 · Resolver y entregar | SUB-01..08; depende de D5 | `PracticalAttempt`, `QuestionnaireAttempt`, `AttemptSession`, `AttemptHistory`, `AssignmentSubmissions` en `apps/classrooms-ui` | Elegibilidad/lock/guardado/archivos/plazo/primera entrega/reentrega/historial; comprobante confirmado |
| D7 · Corregir y consultar progreso | GRADE-01..05, PROG-01..03; depende de D6 | `GradingEditor`, `PublishedResult`, `PublishedGradeCorrection`, `Progress` en `apps/classrooms-ui` | Privado/publicado/corrección auditada; detalle por pregunta autorizado; tres medidas separadas |
| D8 · Agenda | AGENDA-01..10; puede avanzar después de D2 sin editar aulas en paralelo | `apps/agenda-ui/{Agenda,AgendaMonth,AgendaDay,Upcoming,EventForm,EventFields,EventWhenFields,EventZoneFields,EventRepeatFields}.tsx` y hooks existentes; `apps/web/pages/agenda.tsx` | Mes/día, eventos personales, plazos, recurrencia, zona/DST, conflicto, crear/editar/borrar verificados |
| D9 · Inicio dinámico | HOME-01..02; depende de contratos de D3–D8 y D2 | `apps/classrooms-ui/Home.tsx`, composición autorizada en clientes/servicio a definir con contrato primero | Ocho escenarios reales, colas exactas, miniagenda, acción directa con aula y permiso, error parcial |
| D10 · Integración y cierre | Todas las etapas | Flujos cruzados/rutas compartidas/docs de operación | Matriz completa de aceptación, auditoría independiente, visual real, rendimiento, rollback documentado |

## D1: integración de gráficos y portadas

Copiar únicamente `assets/brand`, `assets/icons`, `assets/hero`, `assets/covers`, `assets/scenes`, `assets/states` a un namespace nuevo de `apps/web/public/foxmind-3d/`. Mantener nombres del manifest o generar módulo de rutas tipado. No sustituir archivos históricos en su ubicación original. `asset-manifest.json` define tres tamaños por imagen, dimensiones, hashes, posición focal y texto seguro. Para WebP, usar el mecanismo de imagen actual o un `picture/img` dimensionado; no introducir otra librería solo para esto.

Compatibilidad inicial de `coverKey`: `explore → general`, `create → creative`, `discover → science`. Guardar estas claves actuales sin transformación en DB. El rediseño completo incluye la unidad D3-COV: ampliar el enum compartido con `literature`, `math`, `biology`, `society`, `science`, `creative`, `general`; validar en API/cliente, conservar las tres claves heredadas y probar lectura/escritura/unknown-key fallback. Habilitar primero lectura y validación compatibles, después la selección de siete portadas. No exige renombrar registros existentes. Durante una integración parcial, solo se muestran las tres persistibles hasta que el contrato extendido esté disponible. El tema escrito libremente no determina automáticamente una portada.

Estado de elección de D3-COV: incluido en el plan de rediseño, no implementado ahora. D0 debe confirmar localización exacta de los enums/validadores y su compatibilidad antes de tocar contratos. La extensión no habilita carga de imágenes ni exige una clasificación de materia.

## D2: rutas, cuenta y navegación

Conservar el acceso anónimo en `/` y `/sign-in`, retorno limitado y separación de verificar/recuperar/aceptar invitación. La página nueva `/settings` mueve presentación de contraseña y logout, reutilizando operaciones de cuenta existentes. Añadir ruta a la política de retorno solo con prueba específica; `/profile` sigue editando nombre/apellido y email readonly. No ampliar `next` a cualquier ruta ni exponer tokens en UI/URL visible.

Reemplazar visualmente la navegación por shell común mediante una unidad acotada. La campana existente conserva su diálogo y destino autorizado. El buscador de aulas queda en `/mis-aulas`; los atajos docentes seleccionan aula localmente. No existe selector permanente de rol. Una persona puede estudiar y enseñar al mismo tiempo.

## D3–D7: conservar estado al cambiar la presentación

Extraer componentes de presentación pequeños alrededor de hooks/clientes actuales; mantener revisión, idempotencia, guardados, locks y sesiones en sus dueños actuales. No copiar operaciones dentro de cards, crear timers para simular guardado ni derivar permiso solo de botones visibles. Si un componente supera el límite de trabajo revisable, dividir por subflujo (por ejemplo, formulario/estado/lista) sin duplicar la lógica de dominio.

El nuevo Plan inicial conserva destinos explícitos y vuelve al recurso correcto tras notificación/Agenda. En cambios de pestaña, cerrar solo overlays correspondientes y confirmar salida si hay edición no guardada. Header de aula compacto, sin perder rol, archivo ni contexto. Historial de alumnos separado del actual, material enlazado protegido, estados docentes de tema separados de progreso individual.

En autoría, resolver las discrepancias observadas en [ACT/AI](flows/activity-authoring.md#diferencias-observadas-que-debe-resolver-la-implementación-visual) con el contrato autoritativo vigente: límites de preguntas y copys de vista previa, sin relajar validadores para ajustarse a un diseño. La IA nunca publica al terminar. Un fallo de proveedor no pierde edición manual ni dispara una llamada repetida sin decisión explícita.

En entrega/calificación, preservar primera entrega confirmada para puntualidad, reentrega explícita, resultado privado/publicado, publicación por intento con detalle de puntos/devolución por pregunta y corrección con motivo/auditoría. El rediseño no recalcula notas ni cambia a quién se publica. Ninguna respuesta correcta privada se coloca en datos HTML de una vista estudiante.

## D9: contrato propuesto del Inicio dinámico

El Inicio actual no demuestra un agregado completo de colas. Antes de construir su UI final, diseñar un contrato compartido tipado y tests de proyección; no hacer fan-out ilimitado de aulas × actividades desde el navegador. El endpoint o composición de servidor es una tarea nueva de D9, no una API existente en esta entrega.

| Módulo propuesto | Fuente / reglas | Presentación y acción |
|---|---|---|
| Participación | Membresías autorizadas y estado actual del aula; borradores/invitaciones no son membresía | `study`, `teach`, `mixed`, `none`; historial archivado separado. Si falla, no adivinar rol. |
| Para entregar | Actividades publicadas, elegibilidad propia, último intento y habilitaciones; plazo efectivo del usuario | Pendiente sin enviar o reentrega habilitada; atrasado separado de próximo; abrir actividad autorizada. |
| Para revisar | Entregas confirmadas de aulas propias que requieren corrección/publicación según estado actual | Agrupar por actividad; cantidad de entregas real, no notificaciones; distinguir borrador de corrección pendiente de publicar. |
| Devoluciones | Resultado publicado para usuario/actividad/intento; actualización segura | No mostrar nota privada. Última devolución con vínculo al intento y estado Leída/Disponible según datos existentes. |
| Miniagenda | Misma proyección de eventos privados y plazos autorizados de Agenda | Próximos 3 eventos futuros desde hora actual; zona explícita si difiere; evento personal abre detalle, plazo abre actividad. |
| Consultas recientes | Hilos autorizados de aulas donde enseña | Orden reciente; no inventar estado «sin responder» si no viene del contrato. Abrir hilo específico. |
| Material | Material publicado autorizado; si no existe seguimiento real de apertura, denominar Material reciente | No presentar «Retomar» como progreso medido. Abrir documento contextual y privado. |
| Atajos | Aulas activas autorizadas y acciones por permiso | Crear actividad / Subir material / Publicar aviso con aula destino visible; sin aula activa, Crear aula y Unirse. |

Forma lógica propuesta: `generatedAt`, `participation`, y módulos independientes `{status: ready|loading|error, items, count?, hasMore, nextCursor?}`. Cada item incluye identificador opaco, aula/rol, estado, fecha efectiva si aplica y destino tipado; no URL externa libre, respuestas privadas ni datos de estudiantes ajenos. Paginación acotada: hasta 5 filas de trabajo por módulo inicial, enlace Ver todas al listado filtrado; si ese filtro no existe, construirlo en la misma unidad y verificarlo. Count solo si hay consulta exacta; si no, omitir, nunca usar el tamaño de una página como total.

Orden determinista: pendientes con vencimiento en orden ascendente (vencidos en bloque identificado), sin fecha al final; revisión por antigüedad de entrega pendiente; consultas por actualización descendente; desempate estable por ID. Los módulos mantienen posición por familia, no saltan según red. Omitir solo módulos de rol inexistente cuando participación se obtuvo correctamente. Mixto conserva ambos bloques, sin escondérselos con un selector exclusivo.

Refrescar al entrar y después de una mutación relevante; al volver a foco, refrescar si pasaron 60 segundos desde la última respuesta. Invalidar de inmediato al salir/remover/archivar/cambiar sesión; un TTL nunca sustituye revalidar permiso. Cancelar respuestas de cuenta anterior y revalidar cada acción en servidor. Con fallo parcial, mantener datos anteriores solo si siguen autorizados, indicando Desactualizado; jamás confundir error con estar al día. No polling continuo. Mantener límites/timeout del repositorio y probar reloj real; la vista inicial carga como máximo cinco filas por cola y tres eventos de miniagenda.

## Matriz de aceptación y evidencia

| Superficie | Casos obligatorios |
|---|---|
| Identidad | Anónimo/verificado/no verificado; cuenta ajena; token vencido/usado/recargado; destinos permitidos; correo amplio; límites de contraseña; sesión incierta |
| Roles | Solo estudiante, solo docente, mixto, ninguna aula; borradores/invitaciones sin membresía; solo archivadas; revocación durante apertura |
| Estados | Normal, vacío, sin resultados, carga, error parcial, solo lectura, ocupado, conflicto de revisión, resultado incierto, permiso perdido |
| Académico | TP/cuestionario/evaluación; multi-tema; primera matrícula/reingreso; lock otro dispositivo; envío confirmado; plazo/override; notas privadas/publicadas/corregidas |
| Agenda | Día completo y hora; zona distinta; salto/repetición DST; serie semanal; editar/borrar serie; conservación de día consultado; plazos readonly |
| UI | 320/390/768/1024/1440 px; teclado, lector de pantalla, zoom 200 %, textos largos, imágenes bloqueadas, reduced motion |
| Cruces | Crear cuenta → verificar → aceptar invitación; crear aula → plan IA revisado → invitar; autoría → publicar → entregar → corregir → publicar → consultar resultado; Agenda/notificación → destino exacto |

Usar suites existentes y ampliar donde cambia comportamiento. Para UI nueva, verificación independiente en ego(lite) con cuentas sintéticas y permisos reales; registrar screenshots y estado del servidor, no solo una captura de mockup. Errores funcionales previos siguen siendo errores explícitos, no PASS por renovación visual. No ejecutar pruebas contra datos retenidos, participantes reales ni servicios privados no autorizados.

Presupuesto de arte por pantalla: cargar variantes adecuadas; ningún WebP de producción actual supera 70 KiB y el conjunto completo de 48 variantes ronda 1.14 MiB. Esta cifra no incluye JavaScript ni red/API: medir LCP/CLS/INP reales cuando exista implementación. Reservar espacio para evitar CLS; el banner no bloqueará la primera tarea.

## Integración, rollback y cierre

Introducir estilos bajo namespace/entrypoint del rediseño o mecanismo de variante ya disponible, sin migración de datos. Conservar el anterior entrypoint hasta completar D10. Un rollback visual vuelve a estilos/layout previos manteniendo contratos y datos; `/settings` puede conservar compatibilidad redirigiendo a cuenta según plan de rollout. No intentar rollback con borrado de entregas, versiones o clases.

La salida final de D10 exige: todos los IDs cubiertos con evidencia, ningún flujo vigente eliminado, rutas/permiso/estado intactos, accesibilidad y móvil observados, assets optimizados en uso, documentación actualizada y auditoría independiente. Recién entonces preparar la revisión y publicación autorizada. Esta entrega de diseño no marca ninguna fase funcional del roadmap como implementada.

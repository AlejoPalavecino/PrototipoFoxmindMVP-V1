# Paridad del producto con UI Lab

Candidato local del 15 de noviembre de 2026 en `codex/foxmind-product-parity`, base `ef6828b96084b0fcaf9a883e4afb95e0871cf1d6`. Sin commit, integración, publicación ni despliegue. Referencia: [plan aprobado](../../../design/foxmind-ui-lab/IMPLEMENTATION-PLAN.md), HTML iteración 17 con SHA256 `81642edc107f01b3d602d11399bacfd3189e13841842e289739c3f3540764ff0`.

## Entorno y alcance de la evidencia

Último repaso de Inicio: [ambos roles y navbar móvil](home-final/README.md), build `eU402ssoRgFJBGYgK9vxr`. Incluye la tarjeta única vertical y la corrección del menú que desaparecía al bajar.

La corrección vigente de **Inicio y navbar** está en [la comparación del16 de noviembre](home-exact/README.md). Reabre las conclusiones de esas dos superficies: las capturas del usuario evidenciaron ancho excesivo y módulos sobrantes que el barrido anterior no detectó. La nueva evidencia incluye1920px y el contenido debajo del primer pliegue, sin extender la conclusión al resto de pantallas.

El informe funcional que sigue conserva su candidato histórico. El refinamiento visual posterior solicitado por el usuario terminó en build local `QuoiLeFkpez_y5nNmscUm`, con implementación Astra y comparación en Ego Lite. La nueva [galería y manifiesto](refinement/candidate-manifest.json) identifica 308 archivos productivos del candidato combinado, sin atribuir todo ese trabajo a esta iteración. No hubo commit ni integración.

La revisión de ese corte comprende 28 vistas de docente/estudiante,140 comprobaciones de geometría a 320/390/768/1000/1440 y capturas a 390/1440. No se detectaron desbordes horizontales, imágenes visibles rotas ni controles fuera del ancho del documento en el corte final. La revisión visual independiente detectó además una compresión interna de cards estudiantiles que esas métricas no detectaban; quedó corregida y reconfirmada. Se muestrearon 24 textos con fondos opacos (contraste mínimo 5.35:1), reducción de movimiento y Escape/retorno de foco en navegación e Historial. Esto no constituye una auditoría WCAG completa ni acreditó la fidelidad de Inicio en escritorio amplio.

| Vista del refinamiento | Escritorio | Celular |
|---|---|---|
| Inicio docente | [1440](refinement/cut-teacher-home-1440.png) | [390](refinement/cut-teacher-home-390.png) |
| Inicio estudiante | [1440](refinement/cut-student-home-1440.png) | [390](refinement/cut-student-home-390.png) |
| Actividades estudiante | [1440](refinement/cut-student-activities-1440.png) | [390](refinement/cut-student-activities-390.png) |
| Plan docente | [1440](refinement/cut-teacher-plan-1440.png) | [390](refinement/cut-teacher-plan-390.png) |
| Agenda | [1440](refinement/cut-teacher-agenda-1440.png) | [390](refinement/cut-teacher-agenda-390.png) |
| Foxy | [1440](refinement/cut-teacher-foxy-1440.png) | [390](refinement/cut-teacher-foxy-390.png) |
| Mi estudio | [1440](refinement/cut-student-study-chat-1440.png) | [390](refinement/cut-student-study-chat-390.png) |
| Perfil | [1440](refinement/cut-teacher-profile-1440.png) | [390](refinement/cut-teacher-profile-390.png) |
| Devolución publicada | [1440](refinement/cut-student-feedback-1440.png) | [390](refinement/cut-student-feedback-390.png) |

En el entorno local persistente propio se comprobó autoría manual/publicación, generación Gemini real de dos preguntas y rúbrica, edición y guardado privado, resolución de cuestionario, TP con PDF, corrección 8 con devolución estructurada y publicación visible para estudiante. La propuesta IA sin publicar permaneció oculta para ese rol. También se completaron los cuatro pasos de carpeta vinculada a un aula, edición del plan copiado, material de Biblioteca visible en el tema, avance dado conservado tras recarga y edición de Agenda con fecha/color/aviso persistidos. Los detalles, fallos intermedios y límites están en el [registro del refinamiento](../../work-log/2026-11-15-root-visual-fidelity.md).

Las capturas adicionales de flujos incluyen builds anteriores dentro de este refinamiento; los28 archivos de auditoría de rutas identifican todos el build final. La prueba con fecha nativa requirió eventos de teclado: `fill` de Ego actualizaba el valor DOM sin reflejarlo en el estado React, por lo que las primeras tentativas no acreditaban cambio de fecha. Se confirmó luego 20 de noviembre/verde/30 minutos al reabrir. A 638 px de alto, la autoría requiere desplazamiento vertical normal; no se afirma que todo el formulario entre simultáneamente. Los datos reales, avatares disponibles y categorías del contrato se conservan; la barra demo y los datos de ejemplo no se incorporan al producto.

API, PostgreSQL, almacenamiento y scanner reales, descartables y aislados; cuentas sintéticas docente/estudiante; proveedores de IA sintéticos. Las capturas de esta carpeta corresponden a la aplicación productiva compilada, no a la maqueta. La variación de contenido refleja los datos reales de esas cuentas. Las galerías del 12 de noviembre siguen acreditando únicamente su propio candidato.

Se completó el barrido visual de ambos roles: [docente](teacher-visual-review.md) y [estudiante](student-visual-review.md), con capturas a 1440 y 390 px y mediciones a 320/390/768/1024/1440 px. Los controles secundarios se revalidaron sobre compilaciones de producción. La corrección final de foco en Mi estudio pasó la revalidación independiente con teclado a 390 y 1440 px; conserva el borrador y el destino al compositor. El [tablero](../../../odd/tasks/foxmind-product-parity.md) conserva el estado y las dependencias; el [registro del coordinador](../../work-log/2026-11-15-root-product-parity.md) atribuye los controles y sus límites.

## Recorridos comprobados

| Recorrido | Evidencia del candidato |
|---|---|
| Aula manual, IA y borrador | Guardado/retorno; PDF aprobado; extracción sintética; edición de unidades y texto prellenado; revisión y confirmación; aula activa persistida. Invitación real del entorno de prueba aceptada, retorno a Activas y recarga sin perder el aula. |
| Plan y Biblioteca | Tema dado conservado al recargar; PDF vinculado a unidad visible desde el tema; edición de portada persistida tras resolver revisión obsoleta. |
| Autoría y participación | Idea IA requerida, edición de propuesta y rúbrica, borrador privado y publicación; cuestionario, evaluación y TP con rechazo de archivo y descarga íntegra. [Registro](../../work-log/2026-11-15-activity-frontend-parity.md). |
| Devolución | Nota cero guardada privada, consulta estudiantil sin nota antes de publicar, devolución publicada visible con la otra cuenta. [Registro](../../work-log/2026-11-15-activity-frontend-parity.md). |
| Agenda y avisos | Creación/edición con anticipación y color; lectura reversible, filtros y destinos exactos de invitación/repaso. [Registro](../../work-log/2026-11-15-agenda-notifications-product-parity.md). |
| Foxy y Mi estudio | Contexto autorizado, hilo recuperado, publicación de creación sin duplicados; carpeta desde plan del aula sin archivo adicional, edición propia y repaso confirmado en Agenda. [Registro](../../work-log/2026-11-15-foxy-study-impl-product-parity.md). |
| Navegación y aislamiento | E11 con enlace profundo, recarga, Atrás/Adelante y 320 px en P7; IDs ajenos rechazados por la API. Carpetas y conversaciones mantienen su identidad al volver. |
| Perfil | Vista previa local, cancelar, descartar, guardar y recargar nombre/avatar. [Registro](../../work-log/2026-11-15-activity-frontend-parity.md). |
| Muro y administración | Aviso persistido tras recarga, miembros e historial vacío sin desborde móvil; Ajustes conserva control de rol y revisión. [Registro](../../work-log/2026-11-15-agenda-notifications-classroom-secondary.md). |

## Controles técnicos

- Recorridos de navegador en build `itNER5mJohCBmeNzCurv-`: integral Brújula 1/1 y autoría P7 6/6, ambos PASS. API, DB, almacenamiento y scanner reales aislados; incluye permisos, privados/publicados, preguntas inválidas, DST, descarga, reinicio y Atrás/Adelante. Limpieza propia sin fallos.
- API y web de producción compilan; TypeScript y límites de arquitectura pasan. Transporte: 87 pruebas, cero fallos.
- La pasada rápida final cubrió los 372 archivos: 2077 casos aprobados, cero fallos pendientes y cero omitidos. El agregado combina el recorrido oficial, su cola y la repetición de tres archivos con siete expectativas antiguas (singular o apertura de panel). Los fallos intermedios y los comandos se conservan en la [reconciliación](../../work-log/2026-11-15-parity-test-reconciliation.md).
- Revisión independiente: 45 pruebas de interfaz y 13 SQL/HTTP de Biblioteca, con compatibilidad de descripciones antiguas, custodia de revisiones y rollback. Invitaciones verificadas con controles de destinatario, rechazo, limpieza de enlace y contador.
- El último build `WalicEcb0TsMY-ZKneE2f` sólo añade a producción el retorno de foco Biblioteca/Contexto → Materiales y Plan. La corrección tuvo RED verificable, 14/14 pruebas focales y recorrido independiente con teclado en ambos tamaños; compila en producción. El [manifiesto de 344 archivos](candidate-manifest.json) identifica la base, referencia y hashes del candidato; no es un commit.
- Sesenta migraciones aplicadas dos veces en una base descartable; Prisma sin drift. Conversión DOC/PPT/PPTX comprobada con el conversor aislado. [Backend y archivos](../../work-log/2026-11-15-activity_backend_impl-product-parity.md).

## Límites

La auditoría integral anterior usó IA sintética. En una activación posterior autorizada se verificaron dos respuestas reales de Gemini: Foxy docente y Mi estudio con un PDF propio y cita. No se verificaron todas las familias de generación con proveedor pago, un despliegue real, carga productiva ni accesibilidad WCAG completa. Los cinco formatos y el límite exacto tienen pruebas de política/contrato; los recorridos interactivos de archivo usan PDF. La prueba de descarga valida HTTP autorizado y hash de bytes, sin atribuir un recibo de descarga nativo no observado.

Una reversión de UI es independiente de la compatibilidad de datos. Si se guardaron rechazos, cancelaciones, actividades interunidad o carpetas importadas sin archivo, conservar lectores y migraciones compatibles; no retroceder ciegamente al binario anterior ni eliminar datos. Este trabajo no ejecutó una reversión de una base retenida.


## Últimos controles visuales

- [Retoma final de Foxy AI y Mi estudio](foxy-study-exact/README.md): lector de visuales, edición por versión, dos publicaciones explícitas y recaptura de Mi estudio en móvil, tablet y escritorio.

- Cabecera móvil final: [aula docente](teacher-plan-final-390.png); aceptación de invitación: [estudiante](student-invitation-final-390.png).
- Propuesta: [vista estudiantil sin claves](final-student-preview-390.png). Fuentes y generaciones recientes abren un diálogo, Escape devuelve foco y conserva las ediciones. La rúbrica del fixture sintético fue completada por UI para comprobar su edición; no se atribuye generación a un proveedor real.
- Foxy: [editar y compartir](final-foxy-share-390.png). Cerrar/reabrir edición conserva el título; guardar lo refleja en lectura; Escape retorna a Abrir recurso.
- La corrección final de foco de Estudio y sus límites están en el [registro específico](../../work-log/2026-11-15-study-library-focus.md) y el [informe estudiante](student-visual-review.md).


## Vista local para pruebas con Gemini

Por solicitud posterior del usuario, el candidato está activo en `http://127.0.0.1:3000`, con configuración Gemini real y datos de prueba persistentes propios del worktree. El preview sintético anterior fue detenido. Las cuentas están en `.test-artifacts/local-app/accounts.json` (ignorado). Se probaron ambos accesos, una respuesta docente y una respuesta de Estudio basada en PDF. Imágenes conserva la deshabilitación de la configuración existente; esquemas está habilitado. [Registro de activación](../../work-log/2026-11-15-root-product-parity.md).

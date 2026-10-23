# Matriz de cobertura — Toda V1, no solo Inicio
**Estado inicial de todas las filas: pendiente.** Roles D = docente del aula, E = estudiante del aula, C = cuenta general. La misma cuenta puede ser D y E en aulas diferentes; no existe admin global aprobado.

El implementador debe agregar por fila: estado, commit/candidato, prueba funcional, captura escritorio/móvil, fallos/skips y handoff. No usar «no aplica» para retirar alcance sin razón funcional y revisión.

## Superficies, UX e invariantes
| ID | Superficie / rol | Cambio esperado | Invariantes y aceptación | Módulos de main |
|---|---|---|---|---|
| UI01 | Raíz y login / anónimo,C | AuthShell carpeta, jerarquía breve, destino Inicio y continuidad | Sin flash de perfil/login para sesión válida; errores seguros; next cerrado | index, sign-in, account-screen, account-client |
| UI02 | Registro / anónimo | Formulario corto, errores de campo y acuse como siguiente paso | Sin rol global/perfil obligatorio/autologin; igual respuesta para cuenta existente | register, AccountField |
| UI03 | Verificación / C | Espera, reenvío, confirmación y continuación inequívocos | POST explícito; TTL/cooldown; anónimo luego login; no aula sin verificar | verify-email, VerificationGuidance, token-capture |
| UI04 | Recuperación / anónimo,C | Solicitud, enlace inválido, nueva contraseña y éxito coherentes | Genérico; single-use; recuperar revoca sesiones; token nunca en storage | forgot/recover-password, account-client |
| UI05 | Perfil y seguridad / C | Datos y seguridad diferenciados; guardar/cancelar claros | Email inmutable; nombre sin cambiar rol; cambiar contraseña conserva sesión actual/rota otras; logout | profile, account-screen |
| UI06 | Navbar y menú / C | Carpetas Inicio/Mis Aulas, marca original, campana/menú | Logo Inicio; perfil voluntario; teclado, Escape, foco; enlaces móviles visibles | AppNavbar, AccountNavbar |
| UI07 | Inicio sin aulas / C | Bienvenida, orientación a Mis Aulas, sin falsa urgencia | Crear/unirse ausentes incluso vacío; invitaciones/borradores reales accesibles | Home |
| UI08 | Inicio E, D y mixto | Lo próximo, Estudio y Enseño simultáneos, novedades | Sin mocks o permisos globales; tarea con estado/fecha/zona real; fallo no es vacío | Home, summary adapter pendiente |
| UI09 | Mis Aulas / C | Carpetas Enseño/Estudio, búsqueda clara, crear/unirse allí | Aulas archivadas etiquetadas; no ocultar inventario; nombres largos/duplicados; borradores privados | Classrooms |
| UI10 | Borrador y creación / D futuro | Wizard cuatro pasos, progreso y guardado verificable | Datos generales, plan, unidades/temas, revisión; requerido completo; no crear aula por abrir borrador | Wizard, api |
| UI11 | Crear/retomar errores / D | Reanudar en paso coherente; errores visibles sin pérdida | revision/conflicto no sobrescribe; plan PDF/DOCX listo; zona elegida se fija al publicar | Wizard, file client |
| UI12 | Unirse por código / E futuro | Código → preview permitido → confirmar → aula | Sin ingreso automático; inválido/existente/cuenta errónea genérico; no reingreso por código | Classrooms join |
| UI13 | Invitación por correo / C,D | Pendiente/aceptar; docente enviar/reenviar/revocar con estado real | Email invitado, vencida/revocada, 7 días, aceptación explícita; entrega de email no fingida | Classrooms, ClassroomView |
| UI14 | Shell de aula / D,E | Breadcrumb, rol local, portada moderada, tabs; Actividades por defecto | Deep link prevalece; recarga/Back; cambiar aula revalida permisos | ClassroomView, route adapter |
| UI15 | Alumnos / D | Tabla/lista legible; resumen académico contextual; invitación/remoción | Solo aula propia; acción sensible confirmada; historial preservado | ClassroomView |
| UI16 | Compañeros / E | Lista simple de nombres, sin acciones académicas por persona | No emails/perfiles, entregas/notas ajenas ni controles docentes | ClassroomView |
| UI17 | Historial de alumnos / D | Separar actuales y antiguos; estados de acceso claros | Antiguos no contaminan promedio actual; docente conserva historial; alumno removido no accede | ClassroomView, Progress |
| UI18 | Configuración/archivar / D; salir / E | Gestión secundaria accesible, consecuencias explícitas | Sin borrar aula; archivo lectura; reactivar no extiende plazos; salir no borra historial | ClassroomView |
| UI19 | Plan / D,E | Unidades/temas como índice legible; estados con texto e iconos | D modifica, E consulta; máximo un Siguiente; sin avance automático ni dominio individual inferido | Plan |
| UI20 | Edición y versiones de plan / D | Versiones, reordenar y errores claros; alternativa a arrastrar | No borrar tema vinculado o dado; unidad solo vacía; conservar versiones/links | Plan, Wizard |
| UI21 | Biblioteca / D,E | Buscar/filtrar por datos existentes, archivo/tipo/tamaño/acción claros | D carga/edita metadata; E consulta; links/privacidad/archivo bloquean cambios | Library |
| UI22 | Cargas/preview/download / D,E | Estado multietapa, errores recuperables, cuota legible | Selección ≠ upload ≠ ready; scan inaccesible no habilita; formatos/límites vigentes; descarga autorizada | file-client, private-file-panel, Library |
| UI23 | Material vinculado/eliminar / D | Explicar por qué no puede borrarse o reemplazarse | Archivo publicado no se sobreescribe; vinculado no se elimina; metadata permitida no cambia contenido | Library |
| UI24 | Muro / D,E | Hilos de avisos/consultas y respuestas; componer/editar con contexto | Solo texto; orden vigente; nombres/iniciales sin email; sin reacciones/DM adjuntos | Wall |
| UI25 | Moderación / autor,D | Confirmación y marcador eliminado | Autor edita lo suyo, D puede remover no reescribir ajeno; respuestas ajenas preservadas | Wall |
| UI26 | Actividades / D,E | Lista por estado/tipo/unidad, acción clara por rol | E solo publicadas/elegibles; D ve privados; fechas/zona; sin empezar intento al listar | Activities |
| UI27 | Autoría TP / D | Consigna, recursos, requisitos, plazo y revisión agrupados | Observaciones/PDF/DOCX al menos uno; adjuntos alumno según config; unidad/tema obligatorios | ActivityAuthoring |
| UI28 | Autoría cuestionario/evaluación / D | Constructor ordenado, validación contextual, preview | Desarrollo/única/múltiple; opciones/puntos válidos; preview docente no inicia intento | ActivityAuthoring |
| UI29 | Publicar/retirar/bloqueo / D | Distinguir Guardar borrador, Publicar, Editar metadata | Primer intento bloquea consigna/puntos/links; no borrar historia ni publicar silenciosamente | Activities, ActivityAuthoring |
| UI30 | Plazos y elegibilidad / D,E | Zona visible, reglas de recepción y excepciones comprensibles | DST ambiguo exige elección; no acortar tras inicio; plazo individual efectivo; primer ingreso tardío | ActivityAuthoring, AttemptSession |
| UI31 | TP / E | Consigna, carga de archivos y entrega explícita, recibo | Primera apertura inicia/bloquea pero no entrega; máximo 5×50MB; gate scanner; recepción servidor | PracticalAttempt, AttemptSession |
| UI32 | Cuestionario / E | Preguntas, respuestas pendientes, guardado y revisar antes de entregar | Autosave 2s/cambio; persistencia real; incompletas con confirmación; no publicar nota | QuestionnaireAttempt, questionnaire-draft |
| UI33 | Evaluación / E | Modo concentrado, header reducido, navegación preguntas y salida segura | Mismas reglas de autosave/entrega; sin campana/mascota distractora o timer inventado | QuestionnaireAttempt, AttemptSession |
| UI34 | Editor ocupado/red/reload / E | Solo lectura y transferencia explícita; avisos de borrador | Un editor servidor; no autosubmit; cambios no confirmados no prometidos offline | AttemptSession, questionnaire-draft |
| UI35 | Entregado e historial / E,D | Recibo con fecha/estado, intentos newest-first, resultado efectivo | No editar enviado; nuevo intento no borra anterior ni copia nota; E solo propio | AttemptHistory, AssignmentSubmissions |
| UI36 | Reabrir/primera entrega habilitada / D | Diferenciar nuevo intento de primera entrega; plazo individual | Si cerró recepción requiere fecha futura; anterior nota efectiva hasta nueva publicación | AttemptSession, AttemptHistory |
| UI37 | Corrección privada / D | Cola real, vista de trabajo/respuesta, puntos/feedback y guardado | TP nota global 0–10; desarrollo manual; cero válido; guardar ≠ publicar | GradingEditor |
| UI38 | Publicación/corrección posterior / D | Revisar → publicar; posterior motivo obligatorio | Publicar libera feedback junto a nota; auditoría actor/fecha/antes/después docente-only | GradingEditor, PublishedGradeCorrection |
| UI39 | Resultado publicado / E | Nota, respuestas propias, puntos y feedback claros | Nada privado antes de publicar; no answer key completa; sin nota aprobatoria universal | PublishedResult |
| UI40 | Progreso / D; Mi Progreso / E | Separar entregas, desempeño y plan; tablas accesibles | Última nota publicada efectiva, media individual y luego de alumnos actuales; sin ceros por pendientes | Progress |
| UI41 | Notificaciones / C por aula | Lista leída/no leída, abrir destino, volver al contexto | Rol y acceso revalidados; notificación no restaura acceso revocado; no email masivo | Notifications, ClassroomsScreen |
| UI42 | Denegado/archivada/404/conflicto / D,E | Estado claro + siguiente paso seguro | No redirigir todo a perfil, no filtrar datos ajenos, no mutaciones optimistas engañosas | Shell y límites de cada módulo |
| UI43 | Utilidad /files y previews locales existentes | Aplicar componentes comunes si sigue siendo superficie de producto | F0 clasifica pública/interna; no exponer diagnóstico como menú nuevo; permisos intactos | pages/files, private-file-panel, p5-preview |

## Contrato común de estados
Para cada fila aplicable probar: carga inicial, éxito, vacío real, error de red/servidor, validación, reintento, doble clic, navegación atrás, texto largo, 320px y escritorio. Para edición además: dirty, guardando, guardado confirmado, conflicto, cancelación y cierre. Para permisos: anónimo, no verificado, rol contrario, acceso revocado y aula archivada.

No simular estado vacío ocultando error. No usar success toast como único recibo de entrega o publicación. No depender de hover ni color para revelar acciones/estados.

## Fixtures mínimos (solo sintéticos)
- Cuenta nueva no verificada y verificada sin aulas.
- Estudiante con varias aulas; docente con varias aulas; misma cuenta docente en A y estudiante en B.
- Otra persona sin acceso; exalumno removido; invitación válida, vencida y cuenta equivocada.
- Aula activa, archivada y reactivada; nombres largos y duplicados; muchas filas/unidades.
- TP con y sin adjuntos obligatorios; cuestionario incompleto; evaluación; deadlines pasados/futuros/sin fecha/individual y zonas DST.
- Archivo listo, pendiente, rechazado, scanner no disponible y cuota agotada.
- Intento editable, otro editor, enviado, reabierto; nota privada, publicada y corregida; sin notas.

Nada de fixtures personales ni secretos en logs/capturas. Los conteos y microcopy del producto se derivan de datos reales, no de estos ejemplos incrustados.

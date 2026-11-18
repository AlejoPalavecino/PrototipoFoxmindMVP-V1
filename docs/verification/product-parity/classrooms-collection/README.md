# Mis aulas: catálogo, creación e ingreso

La ampliación de las pantallas de espera está documentada al final de esta galería. Sus comprobaciones corresponden a un candidato posterior al catálogo original.

Revisión local del 16 de noviembre de 2026, TASK-017. Implementación Astra y verificación del coordinador con Ego Lite. Worktree `foxmind-product-parity`, rama `codex/foxmind-product-parity`; sin commit, integración ni publicación. Los interiores de las aulas quedan fuera de esta revisión.

## Referencia y datos

UI Lab iteración 17 del worktree `foxmind-ui-lab`, HTML autónomo `01-foxmind.html` (SHA256 `81642edc107f01b3d602d11399bacfd3189e13841842e289739c3f3540764ff0`). La barra de controles de la maqueta agrega 38 px en escritorio y no pertenece al producto. Las cuentas, fechas, cantidades y portadas seleccionadas son datos reales del entorno sintético local; no se reemplazan por los ejemplos de la maqueta.

## Comparación visual

| Superficie | Referencia | Producto |
|---|---|---|
| Catálogo docente | [Escritorio](reference-catalog-final-1440.png) | [Escritorio](accepted-teacher-1440.png) · [Celular](accepted-teacher-390.png) |
| Catálogo estudiante con invitación | [Escritorio](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity/classrooms-collection/reference-student-final-1440.png) | [Escritorio](accepted-student-1440.png) · [Celular](accepted-student-390.png) |
| Identidad del aula | [Diálogo original](reference-wizard1-before-1440.png) | [Escritorio](review-wizard1-1440.png) · [Celular](review-wizard1-390.png) |
| Programa y método | [Referencia](reference-wizard2-1440.png) | [Escritorio](accepted-wizard2-1440.png) · [Celular](accepted-wizard2-390.png) |
| Unidades y temas | [Referencia](reference-wizard3-1440.png) | [Escritorio](review-wizard3-1440.png) · [Celular](review-wizard3-390.png) |
| Revisión antes de crear | [Celular de referencia](reference-wizard4-390.png) | [Escritorio](accepted-wizard4-1440.png) · [Celular](accepted-wizard4-390.png) |
| Invitación | [Escritorio](reference-invitation-final-1440.png) · [Celular](reference-invitation-final-390.png) | [Escritorio](final-invitation-1440.png) · [390 px](final-invitation-390.png) · [320 px](final-invitation-320.png) · [Contenido desplazado](final-invitation-scrolled-320.png) |
| Código | [Entrada de referencia](reference-join-390.png) | [Error recuperable](join-error-390.png) · [Vista previa](accepted-code-preview-390.png) · [Ingreso confirmado](accepted-code-joined-1440.png) |
| Guardar y crear | — | [Borrador guardado](draft-saved-green-1440.png) · [Aula creada](accepted-create-green-1440.png) |

Los cuatro pasos conservan acciones dentro del diálogo: 1050×790 px a 1440×1000 y 352.4×820 px a 390×844. Se retiraron filtros/vista de lista, editor alternativo de texto y controles extra del archivo aprobado en el aula. Los controles compartidos de estudio se preservaron. La portada de borradores anteriores se mantiene; las altas nuevas ofrecen las tres portadas de referencia.

## Recorridos comprobados

- Crear manualmente con PDF sintético aprobado, editar unidad/temas, guardar, volver a abrir en el paso guardado y confirmar creación. No se publica al subir el archivo ni al guardar.
- Guardar y salir selecciona Borradores y confirma en verde. Retomar elige el borrador actualizado más recientemente, conforme al orden del servicio.
- Emitir invitación al estudiante sintético, revisar datos/portada, cancelar sin rechazar y aceptar. El aula aparece en Activas con la membresía real.
- Código inválido conserva el formulario y muestra error rojo. Código válido, también con espacio intermedio, muestra una vista previa sin inscribir. Confirmar incorpora el aula y permanece en Mis aulas.
- Archivadas vacías y búsqueda sin coincidencias con acciones para volver. Escape cierra el diálogo de invitación y devuelve el foco a Revisar invitación.

Se creó únicamente contenido de QA identificable por su nombre. Se conservan las aulas de prueba y una invitación pendiente para continuar el recorrido local; las aulas previas del entorno no se modificaron.

## Pruebas y límites

[Resumen verificable](verification.json): 17 vistas con 220 muestras de texto, sin desborde horizontal ni footer inaccesible después de las correcciones. Los 36 enlaces locales originales de esta galería resuelven correctamente.

Coordinador: 46/46 pruebas focales de creación, archivo, navegación, catálogo e invitaciones. Astra: 16/16 pruebas de retornos/avisos y aislamiento por cuenta; borradores 7/7 con caso RED→GREEN del más reciente; colección 3/3. Proxy de metadatos 9/9, backend 11/11 y membresía con PostgreSQL aislado 15/15, con limpieza exitosa. Los grupos se solapan y no se suman como un total de pruebas únicas. Tipos web y límites de arquitectura pasan.

Catálogo de ambos roles comprobado a 320, 390, 768, 1440 y 1920 px sin desborde horizontal ni imágenes rotas. Las muestras de contraste sobre textos opacos visibles del catálogo y los diálogos tienen mínimo 4.99:1; esto no equivale a una auditoría WCAG completa. Se detectó un footer fuera de vista en invitación a 320×740 y se corrigió fijándolo al borde inferior del área desplazable: [geometría final](final-invitation-320.json), botones y618–676 dentro del diálogo y45–695, también después de desplazar el contenido. La recaptura usa CSS compilado, sin estilos temporales. Escape restaura el foco; reduced motion deja cero animaciones activas en el diálogo.

Gemini real devolvió límite de uso en la única extracción solicitada. Se comprobó el error y la recuperación manual conservando los datos hasta crear el aula. No se afirma generación satisfactoria real ni se modificó proveedor/cuota. La ruta satisfactoria conserva pruebas sintéticas. La imagen [del error](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity/classrooms-collection/ai-quota-error-1440.png) documenta el hallazgo previo del texto azul heredado; esa herencia fue corregida en el candidato posterior.

Build principal de los recorridos: `t4lxzUXa3I2zLAVibRkZA`. Build final con footer corregido: **`SumPNj_fdM4dd4fknQlbZ`**, READY en http://127.0.0.1:3000. [Manifiesto](final-build.json), [catálogo final](final-student-catalog-1440.png), [referencia al mismo viewport](final-reference-student-1440.png) y [registro completo](../../../work-log/2026-11-16-root-classroom-collection-parity.md). La galería distingue las comprobaciones previas conservadas de las recapturas del último cambio; no representa una nueva auditoría de las superficies modificadas por la otra sesión.

## Carga del programa y análisis de Foxy

Ampliación R1 del 16 de noviembre, solicitada después del catálogo. Pantallas dedicadas basadas en UI Lab: ilustración, etapas, movimiento indeterminado y retorno al programa. Las etapas describen señales reales del servicio, sin porcentajes ni finalización simulada. El diálogo ajusta su altura al contenido y mantiene las acciones visibles en pantallas bajas; errores en rojo, recepción confirmada en verde y movimiento reducido respetado.

| Estado | Referencia | Producto |
|---|---|---|
| Subir programa | [Escritorio](loading-reference-upload-1440.png) | [Escritorio](loading-accepted-upload-1440.png) · [Celular](loading-accepted-upload-390.png) |
| Foxy preparando propuesta | [Celular](loading-reference-ai-390.png) | [Escritorio](loading-accepted-ai-running-1440x1000.png) · [390 px](loading-accepted-ai-running-390x844.png) · [320 px](loading-accepted-ai-running-320x740.png) |
| Recuperar consulta de estado | — | [Error y acciones](loading-accepted-ai-poll-error-390.png) · [Pantalla baja](loading-accepted-ai-poll-error-short.png) |

La subida del PDF fue real: archivo aprobado y limpio, conservado en un borrador propio sin publicar. SENDING, QUEUED, RUNNING, READY y error de consulta se ensayaron con respuestas controladas exclusivamente en la pestaña local y el borrador de QA; esa interceptación se retiró al terminar. Volver, Escape y reabrir conservaron una única solicitud. Consultar análisis recuperó por GET; la propuesta quedó pendiente de aplicación explícita. Un intento real respondió `AI_BUDGET_EXCEEDED`: no se acredita generación real exitosa ni se cambió el proveedor o su cuota.

[Candidato, medidas, persistencia y hashes de capturas](loading-verification.json) · [Registro y límites](../../../work-log/2026-11-16-root-classroom-loading-parity.md). No constituye una nueva auditoría de las pantallas de estudiante, interiores, Foxy AI o Mi estudio.

# Mis aulas, creación e ingreso: comparación con la maqueta

- Coordinador: root; runtime sin identidad registrada. Implementación Astra por decisión del usuario vigente en esta sesión.
- Worktree: C:/Users/alejo/.codex/worktrees/foxmind-product-parity/ProtipoFoxMind; rama codex/foxmind-product-parity; HEAD ef6828b96084b0fcaf9a883e4afb95e0871cf1d6. Candidato inicial eU402ssoRgFJBGYgK9vxr READY en 3000/3001.
- Alcance autorizado: Mis aulas de docente/estudiante, tarjetas, estados, invitaciones, flujo de crear y de unirse; referencia UI Lab iteración 17. Se conservan datos/contratos vigentes y controles de archivos reales. Interiores de aulas excluidos. No commits/integración/publicación.
- Aceptación: dimensiones, tipografía, color, componentes y jerarquía coincidentes con la referencia; cuatro pasos claros, persistencia y revisión antes de crear; código con vista previa y confirmación; invitaciones con decisión explícita; carga/error/éxito coherentes; escritorio y móvil sin superposiciones ni acciones inaccesibles. Retirar presentaciones extra ajenas a la maqueta en estas superficies sin eliminar capacidades del backend.
- QA: cuentas sintéticas existentes y recursos de prueba propios; no alterar aulas académicas previas. Se podrán crear aulas/borradores de QA y realizar ingreso con esas aulas. Mantener Gemini configurado; pruebas automatizadas sintéticas por defecto.
- Estado: DONE; TASK-017. Implementado y verificado localmente; límites de proveedor documentados abajo. Sin integración ni publicación.

## Comparación inicial

Ego Lite, espacio 1, app 3000 y referencia 4173. Ambos roles, catálogo y código; cuatro pasos manuales recorridos en la maqueta. Capturas ignoradas en `.test-artifacts/classroom-collection-20261116`.

- Catálogo real agrega Filtros y tarjetas/lista, ausentes de referencia. Retirar sólo estos controles de presentación; conservar búsqueda y estados.
- El modal real de creación mide 560 px en escritorio frente a 1050 px de referencia. Continuar no recibe clic: el diálogo intercepta el puntero porque el pie está fuera del área accesible. A 390×844, Guardar y salir aparece y843 y Continuar y893; referencia mantiene acciones dentro del diálogo. Evidencia anterior: app-wizard1-before-1440/390.
- Unirse conserva copy y composición antiguos; referencia usa entrada de código y vista previa común con invitaciones antes de aceptar. No inscribe al consultar el código. Código inválido real devuelve error sin salir.
- Invitaciones/preview no proyectan coverKey; el catálogo estudiante descarta studentCount aunque el detalle autorizado ya lo presenta. Proyecciones mínimas de datos existentes, sin permisos nuevos ni migración.
- Borrador conserva contenido pero reinicia paso0. Metadata opcional wizardStep/wizardMethod en JSONB permite reanudar como referencia; se valida y excluye al publicar, sin disparar IA al abrir.

Implementación delegada a Astra con superficies disjuntas: frontend_parity catálogo/join/invitación; classroom_fidelity asistente; agenda_account_fidelity proyecciones/metadatos. Coordinador exclusivo de navegador, runtime, registro y TTP. No se modifican interiores.

Incidencias de herramientas: snapshot subtree exige ref vigente (se corrigió a snapshot completo filtrado); un wait usó título anterior de paso2 en referencia y venció pese a haber avanzado. Ninguno demuestra error del producto. El rechazo de clic Continuar sí fue confirmado por geometría del producto anterior.

## Primer candidato y correcciones de integración

Build `LZgMVvBvatu7gGml_-0YT` READY. Ego confirmó modal1050 y pie dentro del viewport; catálogo docente/estudiante a390 sin overflow. Persistir paso encontró INVALID_INPUT: faltaba extender allowlist del proxy web. Se corrigió con validación acotada y prueba HTTP RED→GREEN (9/9). Segundo ajuste de CSS igualó encabezado, color de texto, peso500, portadas68/58, altura de botones44 y dos columnas de acciones del ingreso móvil; retiró editor alternativo de texto sólo del aula.

Root ejecutó suite de membresía sobre SQL aislado: falló sólo allowlist antigua de preview por coverKey nuevo (13/14 subcasos). Se autorizó actualizar exclusivamente la clave permitida y comprobar contra portada persistida. Reejecución de Astra15/15 PASS con limpieza exit0. Tests backend adicionales11/11; frontend catálogo/borradores/invitaciones/join19/19; wizard y navegación27/27 tras reconciliar pruebas antiguas con la UX aprobada. Tipos y boundaries del primer candidato PASS.

El segundo build quedó bloqueado por cambios concurrentes de otra sesión en Foxy/Mi estudio. Se corrigió únicamente una llave JSX faltante en study-collection.tsx; el usuario confirmó que la otra sesión resolvió sus errores de iconos/tipos y autorizó reiniciar el entorno local, ya que sus pruebas usan servicios aislados. No se alteraron sus flujos ni diseños.

## Recorridos reales y refinamiento final

Builds `SGk5ky7iKfVvDpjsBR1LV` y `vnS6cBCNAzZNrmdZZrF0b` READY. Se creó un aula propia de QA con PDF sintético, se editaron unidad/temas, se guardó y reanudó en el paso exacto, y se publicó mediante confirmación. Publicar retorna a Activas; Guardar y salir a Borradores, con éxito verde. Las cuentas y aulas académicas preexistentes no se modificaron.

Se intentó una sola extracción real con Gemini: el proveedor devolvió límite de uso. El error y la recuperación manual se comprobaron; nombre, programa y edición se conservaron hasta crear la segunda aula propia. No se cambió proveedor ni cuota y no se afirma generación exitosa con Gemini. La ruta de generación satisfactoria conserva cobertura sintética. Se detectó y corrigió el párrafo azul heredado dentro del aviso rojo.

Invitación emitida al estudiante sintético, visible con portada/materia/grupo/docente/fecha reales. Ahora no conserva la invitación; aceptar la incorpora a Activas. Código inválido muestra error rojo sin perder entrada; código válido con espacio intermedio muestra vista previa sin inscribir. Confirmación de ingreso pendiente del candidato final.

La inspección visual encontró estilos del catálogo que pisaban el diálogo de invitación anidado: botones sin padding/radio y subtítulo sin margen. Se aumentó especificidad sólo para estos diálogos. Se quitaron Descargar/Retirar del programa aprobado del aula, ausentes de referencia, preservando Cambiar archivo y el componente compartido de estudio. El banner Retomar elegía el último array pese al orden SQL descendente; corrección al borrador más reciente en curso.

En 1440×1000, asistente 1050×790; en 390×844, 352.4×820. Cuatro pasos sin overflow horizontal, con acciones dentro del diálogo. Revisión móvil con Editar/Editar plan inline, sin pills heredadas. Invitaciones y código con vistas de escritorio y móvil. Un registro de imagen inicialmente sin cargar durante la animación de IA se resolvió al finalizar la carga; no se comprobó recurso roto. Un snapshot temprano de invitaciones se aclaró con carga completa/GET200; no se cambió lógica por esa observación.

Pruebas adicionales del coordinador: 46/46 en ocho suites de creación, archivo, navegación, paridad, catálogo e invitaciones. Astra: 16/16 en retornos de catálogo y aislamiento por cuenta; tipos web y límites de arquitectura PASS. Comprobaciones focales de singular/plural y reemplazo de archivo PASS. Documentación previa a cierre: 159 archivos/1003 enlaces válidos; tablero17 válido. Candidato visual final y evidencia consolidada pendientes.

## Cierre verificado

Build final `SumPNj_fdM4dd4fknQlbZ` READY en3000/3001 con configuración Gemini existente. La otra sesión conservó sus archivos y sus servicios aislados; este registro sólo acredita Mis aulas, creación e ingreso. Evidencia consolidada en [la galería](../verification/product-parity/classrooms-collection/README.md).

Ambos catálogos se comprobaron a320/390/768/1440/1920. Capturas sin hover mantienen tarjetas alineadas; el desplazamiento de3px observado antes correspondía al hover intencional. Muestras de contraste mínimo4.99:1. A320×740 se detectaron acciones de invitación fuera del área visible: footer sticky final las mantiene y618–676, dentro del diálogo y45–695, con desplazamiento real de contenido y sin estilos temporales. Escape devuelve el foco; reduced motion sin animaciones activas. Formularios y vistas recorridos sin overflow horizontal ni imágenes rotas finales.

Ingreso por código confirmado con alta real, portada y datos del aula; vuelve a Activas, confirma en verde y retira la invitación pendiente de esa misma aula. También se probaron búsquedas sin resultados y Archivadas vacías. Creación final, guardado/reanudación y aceptación de invitación pasaron. Banner Retomar elige el borrador más reciente: caso RED por id/nombre antiguo y GREEN, suite7/7; singular/plural de progreso colección3/3. Los grupos de pruebas se solapan, no se suman como casos únicos.

Se mantienen tres aulas propias de QA y una invitación pendiente para continuar pruebas, sin modificar aulas académicas previas; el borrador propio inicial se convirtió en aula. El documento es sintético. La maqueta conserva su contenido previo y el borrador propio usado para comparar, sin reinicio global. Ego queda devuelto al usuario con aplicación y referencia abiertas.

Límite: la extracción real con Gemini no pudo terminar por cuota del proveedor; se verificó su error/recuperación y la ruta satisfactoria tiene cobertura sintética. No se afirma éxito real de esa generación, ni auditoría completa de accesibilidad, ni pruebas de todos los estados de la plataforma. Próxima unidad: interiores de aula, sólo al continuar el alcance pedido. No commits, push, merge ni despliegue.

Controles de cierre: `npm run docs:check` PASS (159 archivos, 1011 enlaces); validador TTP PASS (17 tareas); `git diff --check` acotado PASS. Comprobador propio de galería: 36 enlaces locales válidos, 17 vistas, 220 muestras de contraste, mínimo 4.99:1, sin overflow ni footer inaccesible en las mediciones consolidadas. Rama y HEAD permanecen `codex/foxmind-product-parity` / `ef6828b96084b0fcaf9a883e4afb95e0871cf1d6`.

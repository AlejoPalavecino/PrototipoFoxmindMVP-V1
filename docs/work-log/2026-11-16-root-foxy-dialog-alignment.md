# Alineación de diálogos de Foxy AI y Mi estudio

- Coordinador: Codex, sesión sin identificador expuesto. 2026-11-16, `codex/foxmind-product-parity`, worktree `foxmind-product-parity`, base `ef6828b`.
- Alcance autorizado: igualar el selector de archivos con el de Mi estudio y corregir superposiciones de Historial y Creaciones en ambos roles. Se conservan permisos y flujos.
- Causa: estilos del campo de mensaje del docente reducían la etiqueta del archivo a 0 px y el ícono a 16 px. El estilo general de formularios ponía el buscador en columna; los paneles posicionaban la acción de renombrar sobre la fila.
- Cambio: se acotó el CSS del compositor, se compartió el diseño de carga y se unificaron buscadores, encabezados, filas de historial y el estado vacío de Creaciones. El pie queda al borde inferior y el contenido puede desplazarse. La opción de guardar también en la carpeta sigue siendo exclusiva de Mi estudio.
- Verificación: 12 pruebas focalizadas de adjuntos, contexto y persistencia; `npm run docs:check` sin incidencias; `git diff --check` limpio para los archivos tocados. El chequeo global encontró espacios en cambios previos ajenos a esta unidad. La app local quedó lista con `npm run local:restart`, compilación web `rEixbG_WZY4FDaV5u3svc`.
- Ego Lite: dos roles de prueba, a 1440, 390 y 320 px. Se comprobó selección de un PDF sintético sin enviarlo, opción de carpeta según rol, buscadores y estados sin resultados, acción de renombrar y retorno al chat. Los primeros intentos necesitaron corregir localizadores y tolerancias del script; ambos roles terminaron con código 0. Capturas bajo `.test-artifacts/foxy-dialog-alignment/`.
- Estado: verificado localmente. Sin cambios de backend, generación de IA, commit, integración ni despliegue.

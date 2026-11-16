# Implementación de la paridad con la maqueta

- Responsable: root/orquestador; identidad de runtime no expuesta, sin escrituras de memoria.
- Fecha: 2026-11-15. Rama: `codex/foxmind-product-parity`.
- Worktree: `C:/Users/alejo/.codex/worktrees/foxmind-product-parity/ProtipoFoxMind`.
- Base: `ef6828b96084b0fcaf9a883e4afb95e0871cf1d6`.
- Autorización: implementar el plan aprobado en worktree separado para ambos roles. No incluye commit, push, merge, despliegue ni acceso a recursos retenidos.
- Referencia: `design/foxmind-ui-lab/IMPLEMENTATION-PLAN.md` y maqueta iteración 17, SHA256 `81642edc107f01b3d602d11399bacfd3189e13841842e289739c3f3540764ff0`.
- Decisiones actuales: PDF/Word/PowerPoint hasta 20 MB por archivo, manteniendo cuota total del chat. Anticipación de avisos personales elegida por usuario dentro del evento (incluye media hora y un día). Contexto autorizado completo, cancelación durable y lectura de aulas archivadas según plan.
- Alcance: P0–P9; UI real y contratos necesarios, sin sustituir persistencia por datos de demostración.

## Evidencia inicial

- `git worktree add -b codex/foxmind-product-parity ... main`: PASS.
- Base del producto coincide con la auditoría. El worktree nuevo está limpio; los cambios ajenos de main y el laboratorio se conservan.
- Lectura de arquitectura, especificación, política documental y plan; inspección del manifiesto.

## Estado

Implementación y verificación local completas. Estado final y evidencia en `odd/tasks/foxmind-product-parity.md` y `docs/verification/product-parity/README.md`. Candidato local sin integración/publicación/despliegue; los apartados siguientes conservan las rondas y fallos intermedios.


## Candidato y controles en curso

- Sistema visual local Nunito/assets, navegación plegable, Inicio real, colecciones, invitaciones, wizard compartido, banner compacto, Plan y Biblioteca integrados. Pendiente comparación final de todas las rutas y tamaños.
- Backend/autoría/archivos, Agenda/notificaciones y Foxy/Study tienen registros propios de los trabajadores. Se incorporaron migraciones 001–004, 006–007 y contratos aprobados.
- Pruebas root: decline servicio 3/3, Biblioteca descripción/vínculos RED→GREEN 1/1, cliente formatos/límite RED→GREEN 1/1, Web tsc PASS, lint boundaries PASS 0 excepciones.
- Revisión independiente detectó proxy obsoleto de autoría (frontend corrigió 6/6), filtros de rechazo omitidos y revise TEXT incompatible con nueva metadata. Filtros corregidos con SQL RED→GREEN independiente 2/2; revise en verificación. No se declara cierre mientras estos recorridos sigan abiertos.
- Inventario actualizado 572 entradas/54 exclusiones, routing PASS; conversión legacy opt-in documentada. TTP estructural PASS (10 tareas).
- Preview aislado actual: scripts/parity-preview.mjs, API/DB/storage/scanner reales descartables, IA sintética explícita. No se reutilizó .env ni recursos retenidos. Reinicios propios observados con cleanup 0 fallos.
- Rondas previas: perfil guardó nombre/avatar y recargó; Agenda docente persistió aviso elegido, filtro, leída/no leída y deep link; Foxy aula mostró fuente real. Se encontró desborde móvil del shell; corrección compartida pendiente de nueva captura.
- Evidencia efímera en .test-artifacts; las cuentas sintéticas no se registran en documentos ni Git. Primer paso pendiente: terminar Library revise y validar shell, E01/E02 y completar E03–E11 coordinados con ambos roles.

## Reconciliación y candidato compilado

- `npm run test:ci` final: API build PASS, pure 311/0 y transport 87/0. Web production build PASS, TypeScript web y lint boundaries PASS, cero excepciones. `git diff --check` PASS. Inventario final 574 pruebas / 54 exclusiones / 23 rutas.
- Reconciliación de pruebas: 370 archivos rápidos recorridos, 2054 PASS y dos RED nuevos de descripción FILE legada. Corregidos por el dueño de backend; lote final focal de 22 archivos 94/94. No se reemplazaron los negativos de permisos, publicación explícita, doble envío ni recuperación. El test histórico de navegador tiene selectores adaptados y sintaxis comprobada; su ejecución completa sigue pendiente.
- Revisión independiente de backend: migraciones repetidas, 38 invariantes, formatos Office reales y contratos. Revisión independiente posterior de frontend: 45/45, y Biblioteca SQL/HTTP 13/13. Manifiesto final del revisor SHA256 `4C64BC2266231EC48CF32C6D3B7C574490B48CA6655897524FEB434487DEC1DB`; las correcciones visuales posteriores se verifican aparte.
- Fallos reales corregidos: descripción FILE histórica conservada/editable/borrable sin duplicar ni truncar; revisión TEXT y referencias de actividades iniciadas; aceptación/rechazo desde enlace limpia su destino y actualiza avisos; aceptar retorna Activas como la maqueta. Los títulos/IDs de las aulas de prueba no son reglas de producto.
- Producción aislada: creación manual de aula de cuatro pasos, PDF validado y confirmación; marca de tema dado persistida tras recarga; PDF asociado a unidad aparece dentro del tema. Ajustes rechazó una revisión antigua sin perder el borrador y permitió recargar/guardar la portada; la portada persistió al recargar.
- Se retiró el `details` nativo remanente de edición textual del plan. Un botón explícito abre el editor prellenado y permite volver; un no-op mantiene el esquema. Los datos de borrador siguen el contrato vigente sin IDs de plan publicado.
- Evidencia persistente y estado del barrido visual: `docs/verification/product-parity/README.md`. Proveedor de IA sintético; sin gasto externo ni recursos retenidos.

## Incidente de herramienta y recuperación

Un comando del revisor perdió su variable de workdir y copió por error tres fuentes de Biblioteca y una prueba nueva al checkout principal. Se detuvo el trabajo, se conservaron copias con hash fuera del repositorio y se restauraron exclusivamente esas cuatro rutas contra la evidencia inicial de que main sólo contenía cambios ajenos de laboratorio/documentación. El revisor comprobó que las fuentes quedaron limpias y el test volvió a estar ausente. Main conserva sus cambios previos; su `.build` ignorado fue regenerado por aquel comando. No se tocaron datos retenidos ni Git remoto. Los comandos posteriores del revisor usan rutas absolutas literales verificadas.


## Última ronda visual y controles secundarios

- Barrido independiente docente de 15 superficies y estudiante de 19 estados a 320/390/768/1024/1440 px, capturas a 1440/390. Sin desborde horizontal; contraste de texto sobre fondos sólidos dentro del umbral medido. Capturas y límites en los informes de `docs/verification/product-parity/`.
- Root comprobó la cabecera de aula final a 390: 173 px, título completo y pestaña activa naranja; menú móvil cierra con Escape y devuelve foco. Creación con IA sintética completa, edición de unidad/texto y confirmación. Invitación enviada, revisada y aceptada desde estudiante: retorno a Activas, mensaje coherente, aula persistida al recargar.
- Recorrido E2E integral aprobado en build DjCTHtE_ZH09q3BT7FhwU: 1/1, 62 segundos. API/DB/storage reales, IA sintética, cleanup sin fallos. Se repite después del último ajuste de disclosures.
- Error de extracción con borrador conservado ahora usa feedback rojo/alerta; aplicado usa éxito y cancelar mantiene tono informativo. RED→GREEN 5/5 y tipos PASS. Se eliminó la duplicación de encabezado de propuesta dentro del wizard.
- Agenda Upcoming: controles secundarios en diálogo explícito, selección cierra antes de navegar y error con reintento. RED→GREEN 4/4. Autoría, corrección, participación, Foxy y Study eliminan los desplegables triangulares restantes en unidades independientes, sin sustituir las validaciones ni permisos.
- Preview 61543 detenido mediante stop propio; `P4 owned cleanup failures: 0`. TTP reconciliado y validador PASS (10 tareas); cierre integral pendiente de las últimas unidades y recompilación.


## Candidato final y regresión

- Release `itNER5mJohCBmeNzCurv-`: E2E Brújula 1/1 + autoría P7 6/6, con servicios reales descartables y proveedores sintéticos. Cero fallos de cleanup. Grupo fast: 372 archivos únicos, 2077 casos aprobados/0 fallos pendientes/0 omitidos, agregado de corrida oficial, cola y recheck. Se corrigieron siete expectativas antiguas, conservando las reglas y negativos.
- Root volvió a recorrer propuesta IA, fuentes, generaciones, rúbrica y vista previa sin claves a 390. Escape retorna al disparador. El editor docente abre su clave sólo a pedido. Foxy generó un recurso privado, guardó título editado y mantuvo estado al plegar/abrir edición; Compartir móvil no desborda y Escape vuelve a Abrir recurso.
- Revisor encontró un fallo real de foco al pasar Biblioteca→Materiales y Plan: el disparador del segundo diálogo se desmontaba. Dueño corrigió sólo StudyWorkspace, con RED→GREEN y 14/14 focales, sin tocar el diálogo compartido. Nuevo build `WalicEcb0TsMY-ZKneE2f` PASS; el resto del producto conserva las fuentes de las pruebas E2E. Revalidación focal independiente en curso.
- Preview anterior 61127 cerrado con cleanup 0. Preview final de revisión: `http://127.0.0.1:64974`, datos sintéticos propios, fixture ignorado `.test-artifacts/study-preview-b9a29fa24fc2194b/fixture.json` y stop del mismo directorio. No registrar sus credenciales en docs. El coordinador deja esta vista de prueba disponible para revisión local.
- Manifiesto del candidato: `docs/verification/product-parity/candidate-manifest.json`. Referencia inmutable confirmada, 344 archivos de implementación/pruebas con SHA256. Tipos, boundaries, diff-check y escaneo de caracteres de los cambios pasaron. Sin commit, merge, push ni despliegue.


## Cierre verificado

- Revisión independiente de foco sobre build WalicEcb0TsMY-ZKneE2f: Biblioteca→Materiales y Plan→Escape vuelve a Biblioteca, y Contexto→Temas y fuentes→Materiales y Plan→Escape vuelve al selector. Verificado con teclado a 390×844 y 1440×900, borrador intacto; Estudiar enfoca el compositor con el tema. Capturas e informe final estudiante guardados. No quedan bloqueantes conocidos en la matriz acordada.
- Fuente productiva después de E2E sólo cambió StudyWorkspace para este foco. El lote fast incluyó cuatro casos de demand-panels; la quinta regresión se comprobó después dentro del lote 14/14. Se conserva el conteo fast 2077 sin mezclar repeticiones ni inflarlo.
- Recuperación final del incidente de main: tras verificar que seguía con sus nueve bajas de laboratorio y tres documentos previos, se recompiló únicamente TypeScript del API desde sus fuentes restauradas. Exit 0, log local `foxmind-main-derived-build-recovery.log`; su salida ignorada vuelve a corresponder a main. No se accedió a entorno privado ni bases retenidas.
- Tablero: diez tareas DONE. Se conserva preview final de prueba en 64974 para el usuario. No se escribió memoria (sin identidad de runtime registrada), ni commits, push, merge o despliegue.
- Límites: IA externa/paga, carga real de producción y auditoría WCAG exhaustiva no ejecutadas. Los contratos de formatos y Office legacy tienen evidencia aislada; no se ensayó downgrade sobre una base retenida. Para integración futura, revisar este candidato y conservar las migraciones/lectores compatibles.


## Activación local con Gemini real solicitada por el usuario

- Autorización posterior al cierre: levantar este candidato con la configuración local existente para pruebas docentes y estudiantiles antes de integrarlo a main. Trabajo operativo R1; sin cambios de producto, commit ni publicación. Identidad de runtime no registrada; no se escribe memoria.
- Se confirmó main detenido y los puertos 3000/3001 libres. Se reutilizaron la clave y las opciones Gemini de su `.env` únicamente en el `.env` ignorado del worktree de paridad. No se copiaron la base, los archivos ni los secretos de identidad de main. El supervisor creó un propietario, servicios y cuentas locales propios y persistentes. La comparación de clave sólo devolvió un booleano verdadero; su valor no se imprimió.
- El preview sintético 64974 se detuvo mediante su stop propio, con `P4 owned cleanup failures: 0`. `npm run local:up` en el worktree de paridad aplicó migraciones a la base nueva, compiló API/web y terminó con READY. Web `http://127.0.0.1:3000`; API `http://127.0.0.1:3001`. Ambas comprobaciones HTTP devolvieron 200. Imagen del convertidor Office local disponible.
- Se conservaron proveedor `gemini-developer`, modelo `gemini-3.8-flash`, presupuestos/límites, esquemas habilitados e imágenes deshabilitadas. El API usa el entrypoint productivo y adaptadores reales, sin overrides sintéticos.
- Ego Lite: acceso docente y respuesta real de Foxy en contexto general; acceso estudiante, creación de carpeta vinculada con copia editable del plan, carga/escaneo de PDF y respuesta real de Mi estudio con una fuente consultada. Antes de adjuntar el material, la carpeta vacía rechazó la consulta indicando que faltaban fuentes legibles y conservó el mensaje; después respondió usando el archivo. No se ejecutó una auditoría completa de todas las familias IA pagas.
- Accesos, configuración y logs permanecen sólo en `.test-artifacts/local-app/` y `.env`, ignorados. No se registran credenciales en este documento. Para detener o retomar, ejecutar los comandos `local:stop`, `local:up` o `local:restart` desde este worktree. La aplicación queda activa para el usuario y la pestaña de Estudio conserva la respuesta de prueba.

# Publicación y consolidación en main

- Coordinador: root; runtime de sesión no expuesto, no se inventa.
- Autorización del usuario: «Bien hace push y lleva todo main para que solo quede esa rama».
- Base local:880612e9b3c2e1d95bc6649e471e470fd1605255; remoto inicial main:dd6f4bc92b959cce0e2c68343291614270c4a17e.
- Alcance: consolidar cambios vigentes, publicar main y retirar las demás ramas locales/remotas después de verificar preservación. Sin deploy, proveedores reales, cambios de producto ni acceso a datos retenidos.
- Continuidad: [tablero de integración](../../odd/tasks/refactor-integration.md), [evidencia del combinado](../verification/refactor-integration.json).

## Aceptación

1. Inventariar refs, worktrees, estado preparado/no preparado/no seguido y remoto fresco. Respaldar commits y trabajo único fuera del repositorio antes de retirar refs.
2. Conservar las implementaciones vigentes ya verificadas. No reanudar prototipos cancelados ni reemplazar diseño actual con versiones anteriores. Material único histórico queda recuperable en respaldo y su worktree, separado de la publicación.
3. Revisar y verificar el E2E pendiente de enseñanza; retirar documentación cancelada y assets ya marcados como eliminados sólo con referencias comprobadas. Registrar qué se incorpora y qué ya estaba integrado.
4. Push explícito sólo de main; comprobar igualdad entre HEAD local, origin/main y ls-remote. Borrar otras ramas remotas sólo tras verificar que sus commits están contenidos en main o preservados.
5. Dejar únicamente refs/heads/main local y refs/heads/main en origin. Desligar worktrees auxiliares de sus ramas sin borrar sus archivos, configuraciones privadas o datos. Conservar respaldo fuera de refs/heads.

## Estado inicial

Main está siete commits por delante del remoto y conserva nueve eliminaciones de diseño y tres documentos de una tarea UX cancelada. Todos los tips de ramas de código son ancestros de main; sólo la ref de respaldo pre-refactor contiene un commit adicional de preservación. Se encontraron cambios no seguidos en UI Lab y maqueta histórica, además de tres cambios pendientes de integración UX. Hay tres ramas remotas además de main. Inspección y respaldo en curso; todavía no hay push ni eliminación de ramas.

## Evidencia y cierre

Pendiente. No se atribuyen resultados del candidato anterior a los cambios nuevos de esta publicación.

### Preservación comprobada

Git fetch y ls-remote confirman main como rama por defecto y tres ramas remotas adicionales, todas con tips ya contenidos en main. Se guardó bundle completo fuera del repositorio en C:/Users/alejo/AppData/Local/FoxMind/git-backups/2026-11-17-main-only/all-branches-and-work.bundle; bundle verify EXIT0, SHA25656bc286433534331609f3a0a5535b57465dd143e806252842524907b2f3aaa83. Contiene refs originales, stash yseis snapshots por índices alternativos de worktrees con cambios. Status preparado/no preparado/no seguido cotejado antes/después, sin alterar las fuentes.

Explorador Avicenna: de369rutas UI Lab,341 fuentes/assets coinciden conmain (65bytesexactos y276sóloEOL),0diferencias decontenido,27registros/tablero ausentes y1config omitida en inspección. Las fuentes no se copian otra vez; registros de iteración se conservan en respaldo/worktree por política de no resucitar documentación histórica. El prototipo maqueta antiguo también está capturado, sin reanudarlo ni incorporarlo al producto vigente.

Se archivaron fuera del repo los tres documentos de la tarea UX cancelada, preservando hashes byteexactos y rutas en retired-main-files.json. Las nueve eliminaciones de diseño ya eran trabajo previo del usuario; se cotejaron referencias, que sólo aparecen en registros históricos o menciones textuales. No hay consumidor runtime ni cambio visual/productivo nuevo.

Revisor Mill: los tres pendientes UX faltan en main y conservan permisos/custodia/digest/reinicio. Detectó un retry heredado tras429 que vuelve a seleccionar Progreso activo y no recarga. El implementador de pruebas prepara el control explícito del dueño y observer por fase/path antes de repetir el recorrido completo; no modifica producto ni retira aceptación.

### Consolidación y gates

P9 ydosregistros se adoptaron en c6dd43f0 desde el candidato pendiente. El helper nuevo observa GET/path exactos iniciados por el gesto; ante429 exige RATE_LIMITED,Retry-Afterdecimal1..60 yelbotón Reintentar progreso dentro del aviso propietario. El primer selector filterhas estaba malanclado: revisión independiente lo detectó yse corrigió a región→alert→botón. Se repitió el archivo completo tras la corrección, no se reutilizó el GREEN anterior para otro hash.

Final:P9 completo1PASS/0FAIL/0SKIP,115s,cleanup0 yDockerantes/después idénticos. Retrypuro pasóRED→GREEN1/1;429deprogreso no se activó en el E2E, sí hubo Retry-Afterreal45s del recorridoP6. SHA25623e9eba624161ce1428a137ad556b42deab641a91ffa3bef98abe689caefef43. Revisor Mill confirma scoping final yconservación del cuerpo de aceptación; no ejecutó DB/browser propio. El ejecutor fue integration_e2e.

Las nueve eliminaciones previas se consolidaron en e5ccdf9c. La unidad retira856líneas de artefactos históricos completos, sin código de producción, por lo que excede la guía400sin fragmentar artificialmente la retirada. Los tres borradores cancelados no se agregan al producto: permanecen en respaldo completo y copia de archivos externa.

Gates nuevos:docs211archivos/1126enlaces/0issues;inventario685entradas/57exclusiones/23rutas;guardAST0excepciones yownershipfrontendPASS;TTP7válido ydiffcheckPASS. El refactor combinado conserva su evidencia anterior de2879pruebas rápidas y23E2E;no se presentan como una ejecución nueva de esta publicación. Se publica sólo main;ningún bundle,clave,datos retenidos oartefactos ignorados se envía al remoto.

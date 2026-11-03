# ARQ-02 — revisión independiente del candidato local

- Agent / role: /root/arq02_review, revisión independiente, solo lectura; despachado como gpt-6.1-sol/xhigh según instrucciones vigentes.
- Session or task ID: /root/arq02_review (identificador de tarea devuelto por runtime; no se infiere una sesión).
- Persisted by: /root, coordinador, a partir de los reportes del revisor; el revisor no escribió este archivo ni los cambios revisados.
- Date: 2026-11-02.
- Branch / worktree: main, ProtipoFoxMind, árbol compartido con pendientes.
- Starting commit: add38ec16a6f03e4e4332288b198036161e4cf58; candidato: diff local de ARQ-02, no nuevo commit.
- Phase and detailed task/spec links: [ARQ-02](../../odd/tasks/architecture-consolidation.md#arq-02--recuperar-verificación-continua), [coordinación y ejecuciones](2026-11-02-id-unavailable-arq02-verification.md).
- Status: completed (revisión; no implica cierre global de ARQ-02).

## Request and scope

Revisar diagnóstico Foxy y correcciones de infraestructura/fixtures surgidas al recuperar cobertura. No modificar archivos, decisiones de producto, aceptaciones para obtener PASS, ni ejecutar DB/servicios/proveedores. La coordinación aplicó los cambios tras los diagnósticos; no se atribuyen esas ediciones al revisor.

## Work performed

El revisor confirmó que setClassroomId es asíncrono, deja busy:true mientras carga y hace que setTitle/prepare prematuros no alcancen el escenario de error incierto. Agregar await en foxy-workspace-runtime.test.mjs:165 conserva todas las aserciones. Inspeccionó el RED en el log del coordinador y ejecutó focal sobre el archivo ya corregido: no afirmó haber reproducido el original sin cambios.

Confirmó 36 migraciones en disco y Git, con las 19 previas como prefijo exacto. Recomendó agregar los 17 nombres literales al helper canónico y conservar deepEqual, orden y doce hashes, sin usar autodiscovery como expectativa.

Identificó dos fixtures que modificaban artefactos después de su vínculo inmutable. Para el blob histórico recomendó reconstruir únicamente la fila sintética dentro de la transacción existente mediante snapshot JSONB texto, manteniendo triggers y verificando restauración íntegra. Para size binding recomendó fixture artifactSize=101 al primer vínculo y ramas explícitas para los otros casos, sin borrar custodia por caída al else. Inspeccionó las correcciones y las aserciones conservadas.

Diagnosticó el hueco de cleanup de Agenda tras timeout de docker run, antes de created=true. Verificó sintéticamente en el helper corregido run→inspect→rm solo para propietario correcto, y cero rm para recurso ausente, propietario ajeno o inspección no disponible; callback no alcanzado y timeout20s conservado. Su etiqueta inicial P1 fue revisada a P2: evidencia de fiabilidad/fuga de recurso de pruebas, sin impacto productivo demostrado. No inspeccionó ni eliminó el contenedor real; esa acción corresponde al coordinador y consta en su registro.

Revisó la adaptación de Inicio a teacher/student: datos/membresías/módulos coherentes, grupo propio visible y acción contraria ausente. Loading solo añade accountRole. Disclosure conserva recursos cerrados, trabajo fuera del desplegable, materiales dentro, acciones reales y navegación; separar roles conserva ambas coberturas del contrato vigente.

Para los hashes P9 comprobó que CRLF era la única diferencia y que .gitattributes ya exige LF. Recomendó restaurar LF en cuatro archivos, en lugar de modificar guards o digests encadenados. Confirmó bytes idénticos a HEAD y hashes fijos exactos después de esa restauración.

Revisó descubrimiento tests/apps/src, clasificación, rutas, compile-only enlazado por import type, mocks y preload file URL. Confirmó tsconfig idéntico a HEAD tras retirar un include temporal; el build estricto incorpora ambos contratos de tipos. Observó el riesgo de npm test:ci sin preparación, resuelto al agregar build-api al comando. Ninguna exclusión previa, entrada ejecutable o asignación anterior se retiró. Último reporte consolidado: sin hallazgos accionables.

## Verification

Evidencia ejecutada por el revisor, según sus reportes (la coordinación no la presenta como ejecuciones propias):

- Focal del test Foxy actual por --test-name-pattern: 1 PASS/0 FAIL, exit0, aproximadamente703ms. SHA256 del archivo inspeccionado: 442947B5A4068834CA89F7E44D22E657D61DC8D6AD3F999C4363F4E7010F665D.
- Diagnóstico sintético con runtime/controladores reales y clientes stub: antes de esperar carga, busy:true/título ignorado/cero solicitudes; después, pendiente incierto y navegación comprobados. Separado del PASS del archivo versionado.
- Runner sintético: rechazó {}, null, NaN, infinito, negativos y fracciones; stop scheduling; TAP vacío y salida no0 fallan; URLs file y mocks presentes en ambos ejecutores.
- Factory de Agenda con spawn falso: cuatro clases de cleanup, sin Docker real ni callback; límite20000ms conservado.
- Focal conservado api-build-pipeline: 1/1 PASS, exit0. tsc --noEmit --listFiles -p apps/api/tsconfig.json: exit0, ambos contratos de tipos incluidos.
- Reconciliación de inventario/rutas: 496 archivos =443 ejecutables+53 exclusiones, sin errores. Comprobaciones de hashes/HEAD/atributos y diff --check focal: exit0.
- SSR sintético de ambos roles, antes de la adaptación final del archivo: escenarios correctos; no se confundió con PASS del test versionado.

Evidencia solo inspeccionada: logs del coordinador con rol6/6, servicios2/2 y archivo del fixture histórico11/11 PASS. En el último reporte DB04 aún estaba en curso; el revisor no declaró PASS global ni ejecutó DB, servicios, proveedores o barridos adicionales.

## Commits and outcomes

Revisión adicional del proxy, posterior al reporte consolidado: ante fetch failed intermitente, el revisor instrumentó loopback con las mismas siete solicitudes y cero upstream. Reprodujo ECONNRESET en POST de1048577bytes, también con origin constante, y observó respuesta413/Connection:close mientras request.complete=false y65495bytes leídos. Esto descarta reutilización de puertos como requisito de esa reproducción, pero no atribuye causa exacta a la corrida histórica. Ocho rondas con consumo de respuestas completaron56/56, y otras ocho con cierre explícito de cliente también56/56; son evidencia de mitigación, no garantía universal ni un PASS retrospectivo.

El coordinador solo añadió consumo del cuerpo al loop y assert/consumo JSON al primer caso; conexiones y producto no cambiaron. El revisor verificó conservación de las siete solicitudes, tamaño real,4xx y cero upstream; focal de los dos casos afectados2/2 PASS, exit0, diff --check exit0. SHA256 del archivo inspeccionado:631e286a4fcff570ded4e148d8ce4a94c4d94d44ccc4f70470bfad2f50ad9588. Riesgo residual explícito: interacción de respuesta temprana413 y upload incompleto; no se confirma causa exclusiva por cuerpos sin consumir o keepalive, ni se propone relajar aceptación.

Sin cambios propios, commits o publicación del revisor. Revisión completada, sin hallazgos accionables en el candidato revisado. Las correcciones fueron escritas por /root; las ejecuciones ampliadas y el cierre de etapa dependen del registro coordinador.

## Handoff

Última unidad adicional revisada: shared-admission preparaba dispatch_started_at aislado, sin reserva/día/precios/ledger. El revisor confirmó rechazo correcto de recuperación y recomendó usar reserve real antes de vencer la lease, conservando las aserciones. Tras la implementación del coordinador verificó diff, nonce persistido y ramas dispatched/undispatched; se retiró solo DDL obsoleto porque las migraciones reales ya crean columnas. Log DB05 observado:26/26 PASS, diff --check focal exit0; SHA256 revisado b3040fd07f9947c3c5ed9dcfc0a2392e92395c29f724858899454c37a7de2a7f. No ejecutó DB ni repitió pruebas. Unidad revisada sin hallazgos; cierre global pendiente de la coordinación.

Reconciliar resultados finales de ejecución y cleanup antes de cerrar ARQ-02. Si aparece otro fallo o cambia el candidato, revisar el alcance afectado; no convertir esta revisión estática/sintética en aceptación funcional global.

Nota posterior de /root, quien persiste el registro: la coordinación reconcilió después los resultados finales y cleanup y cerró ARQ-02 en su propio registro y en plan/roadmap. Esta nota no atribuye esas ejecuciones ni ese cierre al revisor; su cobertura y límites anteriores se conservan.

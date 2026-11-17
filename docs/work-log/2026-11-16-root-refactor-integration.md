# Integración local de refactors backend y frontend

- Coordinador: root; identidad de sesión no expuesta, no se inventa.
- Autorización: el usuario pidió integrar backend y luego frontend después de aprobar el orden propuesto. Incluye commits necesarios y merge local en main tras verificación; no push, PR, despliegue ni datos retenidos.
- Base compartida: dd6f4bc92b959cce0e2c68343291614270c4a17e.
- Rama de integración: codex/refactor-integration; worktree C:/Users/alejo/.codex/worktrees/refactor-integration/ProtipoFoxMind.
- Fuentes: candidatos de codex/backend-capabilities y codex/frontend-cohesion, sus tableros y evidencia. Se preservan archivos, índices y HEAD de los worktrees originales.

## Resultado y aceptación

Combinar primero el backend verificado y luego el frontend verificado, conservando comportamiento, pruebas y documentación de ambos. Capturar cada árbol mediante índice Git alternativo y commits propios de snapshot; los originales tienen cambios sin commits y no se modifican. La unidad de entrega es cada migración ya verificada: su tamaño excede 400 líneas porque separar sus movimientos/imports/consumidores rompería el candidato reproducible. Las correcciones nuevas de integración se registran y verifican aparte.

1. Snapshots estables con mismo padre base, sin secretos ni artefactos ignorados; procedencia y hashes explícitos.
2. Conflictos resueltos por responsabilidad: backend conserva nuevas capacidades/loaders/contratos, frontend conserva organización, CSS, operaciones tipadas y regresiones. Inventarios se reconcilian por unión y movimientos, nunca descartando tests para pasar.
3. Entrada src/core/domain/index.ts conservada por decisión humana. No se retira durante esta integración, aunque frontend haya migrado sus imports.
4. Build API y web, lint/fronteras, inventarios, docs y TTP, suite rápida combinada, regresiones y recorridos críticos con recursos sintéticos. Fallos no se ocultan; evidencia anterior no se atribuye al combinado.
5. Revisión independiente proporcional sobre conflictos y contratos; main sólo recibe el candidato verificado. Cambios locales previos de main se conservan y se cotejan, sin incluir trabajo ajeno en los commits del refactor.

## Estado inicial

Ambos candidatos están cerrados localmente en sus tableros, sin commits, desde la misma base. Hay 27 rutas modificadas por ambos: CI, scripts de suites, pruebas y documentación; no hay archivos productivos UI/API compartidos en ese cruce. Main conserva eliminaciones de diseño y cambios/documentos ajenos. No se opera sobre ellos durante preparación.

## Evidencia y cierre

El [tablero](../../odd/tasks/refactor-integration.md) registra estados reales. Las notas siguientes conservan resultados e intentos; el cierre vigente está al final. Proveedores reales, entorno retenido, producción y publicación remota fuera del alcance.

### Snapshots y conciliación

Índices alternativos capturaron backend d79ee909e094b5c7dbbbcccf1eb2bf972908e0c1 (tree1a985002721e9f5420264b5f12a378ee320673d4) y frontend eba381b3f28662daaca366687d34b12cfb30d955 (tree58a2540514a7ce38012141c0af1c1a213823a00e). Ambos tienen padre dd6f4bc. Se cotejó status -z completo antes/después, sin modificar índices/HEAD/archivos originales. Las refs codex/integration-backend-snapshot y codex/integration-frontend-snapshot permiten recuperar cada candidato.

Backend se aplicó primero por fast-forward. Merge frontend dejó14conflictos:1CI,3scripts,8docs y2tests; ningún conflicto en código productivo. CI conserva pathsbackend nuevos y componentefrontend nuevo. Inventarios unen ambas ramas y remapean134tests backend/262movimientos frontend;685entradas,57exclusiones y23rutas PASS. El primer chequeo encontró referencias antiguas porque el mapa productivo no incluía testMoves; se corrigió usando el ledger explícito de134movimientos, sin retirar cobertura.

Los conflictos documentales eran enlaces a nuevos dueños; se preservaron textos y rutas de ambos lados. Tres enlaces backend seguían apuntando a directorios vacíos que existían en su worktree pero no en Git: el checkout limpio los detectó y ahora enlazan la capacidad real. Docs205archivos/1118enlaces/0issues. Dependencias locales: npm ci --ignore-scripts --prefer-offline --no-audit --no-fund,499paquetes; no se cargó .env ni se tocó la instalación ajena. API build fresco genera Prisma propio y compila EXIT0. Webbuild/lint y reconciliación tests en curso.

### Verificación del combinado

Build API fresco y web Next16.4.5: EXIT0. Lint/fronteras: EXIT0 y0 excepciones. Comparación independiente con blobs congelados:932 archivos backend y766 frontend conservados, sin fuentes ausentes ni cambios de contenido. Se eliminó después una única línea vacía al EOF de QuestionEditor.tsx detectada por git diff --cached --check; trimEnd contra el snapshot es idéntico, sin cambios de lógica. El build y los E2E usan el mismo contenido ejecutable.

La revisión independiente reprodujo un error introducido en la conciliación de CI: un registro añadido con source:null se había convertido en clave de reemplazo y alteraba nullglob. Se filtraron fuentes no vacías y se regeneró el workflow desde el snapshot backend más rutas frontend;15/15 controles CI y reproducción Bash posterior verdes. No se ocultó el fallo ni se cambió la política del workflow.

Pasada rápida combinada:474 archivos,2876 PASS/3 FAIL/0 SKIP. Los tres fallos fueron un fixture que buscaba capas Agenda retiradas, una URL de directorio del dominio mal dirigida y el pin Next16.4.2 anterior al parche frontend16.4.5. Root revisó y autorizó únicamente esa actualización exacta del pin; no se cambió stack ni se usó un rango de versiones. Los tres archivos repetidos dieron14/14. Ledger final por archivo:2879 PASS/0 FAIL/0 SKIP con sourceRun explícito; no representa una segunda pasada completa. Los dos conflictos iniciales de tests sólo combinaron imports; revisor cotejó4/4 cuerpos contra ambos snapshots y confirmó cero aserciones o lógica retiradas.

El revisor ejecutó138 pruebas focalizadas propias, verificó unión exacta de685 entradas/57 exclusiones/23 rutas sin omisiones, contratos UI/backend y compatibilidad global conservada. Detectó hashes desactualizados del mapa backend: se preservaron valores anteriores como snapshotRecordedCurrentSha256 y se regeneraron los actuales bajo política LF explícita, independiente del checkout. Cotejo posterior:615 fuentes,134 tests movidos y37 nuevos sin faltantes ni diferencias de hash. La validación original se etiqueta como histórica; la prueba del combinado vive en su recibo propio.

Ego Lite sobre el build combinado: docente inició sesión, abrió Biblioteca, cargó PDF y publicó un material; estudiante inició sesión y pudo leerlo en la misma aula, HTTP200. Luego cargó DOCX privado, preparó plan sintético, activó carpeta y recibió chat con fuente. Recarga recuperó carpeta ACTIVE,1 conversación y2 mensajes. Capturas390/768/1440 revisadas, sin overflow horizontal en los tamaños muestreados; Tab dentro de diálogo modal y Escape restaurando Herramientas. Espacio cerrado sin conservar páginas; preview propio EXIT0 y cleanup0.

E2E serial con recursos aislados: cuestionario8/8, práctica5/5 y corrección5/5 verdes. La primera publicación falló esperando GET tras Recargar con cambios sin guardar; la aceptación frontend aprobada protege ese borrador con confirmación. Root revisó la discrepancia y autorizó adaptar sólo el paso E2E: cancelar conserva texto y prohíbe GET/POST, confirmar permite sólo GET observado por path y fase. Se mantienen aserciones de privacidad, datos, cancelación/publicación, identidad y reinicio, y Retry-After real. Repetición completa de publicación en curso; no se cierra aceptación antes de su resultado.

Merge de ambos snapshots:399eaa58a0aad41b4b5e9042568aa00dc170791f. Los ajustes finales de evidencia/formato/E2E van en una unidad posterior. Main todavía no cambió. Se capturó su estado previo de16 rutas y copia byte exacta de documentos, sin leer secretos: backup commit c2c823bc0c1c082da1776128d1394cc92310a544 bajo codex/pre-refactor-main-work. Los borradores previos de arquitectura se conservan allí; no deben reemplazar el diseño aprobado integrado.

### Aceptación final antes de main

Publicación repetida completa:5 PASS/0 FAIL/0 SKIP,184s,cleanup0. Cuatro archivos E2E vigentes:23 PASS/0 FAIL/0 SKIP, sin sumar el intento rojo. Cuestionario8, práctico5, corrección5 y publicación5 cubren guardado/entrega, revisión, privacidad, resultado efectivo, notificaciones, reinicio y revocación. Se observó Retry-After real de47s en destino publicado; la rama429 de recarga no se activó y no se afirma cubierta por esta corrida.

La revisión independiente final verificó786 hashes actuales e históricos, cuatro sentencias AST de QuestionEditor idénticas y conservación de85/85 aserciones E2E más22 nuevas. Reejecutó descarte protegido3/3; no se atribuye ejecución E2E independiente. El [recibo combinado](../verification/refactor-integration.json) conserva fuentes de resultados y límites.

Gates finales previos a main: docs208 archivos/1121 enlaces/0issues; TTP4 tareas válido; inventario685/57/23; diff-check0. Las fuentes productivas siguen preservadas salvo la limpieza EOF declarada. La integración está lista para fast-forward local, sin push. El cierre de main se registra tras ejecutarlo y comprobar sus cambios previos.

### Entrega local completada

Main pasó por fast-forward desde dd6f4bc a6ad9f6b54998b454904d258d6a746ca26f18fa1f. Incluye backendd79ee909,frontendeba381b3,merge399eaa58 yverificación6ad9f6b5. No se modificaron los HEAD ni el contenido preparado de los worktrees originales. El cierre documental posterior no cambia producción ni las pruebas verificadas.

El estado local previo se preservó además en stash0da372d48b2f985c0ba9d2aa0a9f7908941434c3,ref codex/pre-refactor-main-work y copia byte exacta ignorada en el worktree de integración. Se restauraron las9eliminaciones de diseño y3documentos no seguidos ajenos, verificando hashes. Las2adiciones a mapa/guía ya están incluidas; los2borradores del backend se conservan en respaldo y su versión aprobada permanece activa. No se reinsertó el aviso obsoleto de implementación no autorizada. Main conserva12rutas ajenas sin commit; no se afirma árbol limpio.

Controles sobre main actualizado: ambos snapshots son ancestros, sin diff en API/core/Prisma/web/shared-ui/package/lock; docs208 archivos/1122 enlaces/0issues,guardAST0excepciones,guardfrontendPASS yTTP4 válido. Los builds y recorridos se ejecutaron en el worktree de integración; no se reinstalaron dependencias ni se inició el runtime retenido de main. Archivos .env, claves, datos retenidos y servicios ajenos no se leyeron ni modificaron.

Entrega: integrado localmente y recuperable. Sin push, PR, despliegue ni retiro de compatibilidad. Permanecen los límites de verificación proporcional del [recibo](../verification/refactor-integration.json): grupos completos DB/servicios/browser/wrappers no repetidos, proveedor real y producción fuera del alcance. No queda trabajo autorizado pendiente de implementación, integración o verificación. La publicación remota requiere un pedido específico.

### Higiene final sobre todo el rango

El chequeo incremental estaba verde, pero `git diff --check dd6f4bc main` detectó whitespace previo en ocho altas backend y dos registros. Se normalizaron únicamente espacios de fin de línea y líneas vacías al EOF. Comparación estructural completa del AST, incluidos valores de identificadores/literales: ocho fuentes idénticas en semántica; no se cambió ningún comportamiento. El recibo conserva las diez rutas y hashes antes/después. Las fuentes originales siguen intactas y el mapa de hashes actual se regeneró.

El primer helper de formato no aceptó la salida CRLF y código2 de git diff --check, y se detuvo sin cambiar archivos; se corrigió su lectura de salida. Después, el chequeo de todo el rango quedó EXIT0. API se recompila tras la limpieza; las suites funcionales previas conservan su validez por identidad AST. Este ajuste se entrega en un commit de higiene separado, sin nuevos cambios de producto.

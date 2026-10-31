# Unidades de la reorganización documental

Coordinador `/root`; base `d4fdf34`, rama `codex/documentation-reorganization`. El usuario autorizó corrección, organización, depuración segura y main sincronizado. Sin producto ni despliegue.

## A — Comprobador portable y pruebas

Biblioteca/CLI Node sin dependencias nuevas, once regresiones independientes y registro de la prueba en el inventario completo. RED/GREEN documentados por test_runner; FAST181 completo794/0/0, consumidores afectados35/0/0 y fronteras exit0. Runtime: fixtures de archivos temporales, sin servicios. El CLI acepta manifiesto explícito; su activación por defecto/package/CI se guarda después del mapa documental. Rollback de A retira solo este control nuevo y su entrada de inventario. Se comprueban blancos y secretos antes del commit.

Commit A observado `62e14a9`:8archivos/385inserciones, Gitleaks y diff-check del índice exit0.

## B — Migración editorial y compatibilidad completa

Las43guías pasan a rutas canónicas por dominio y dejan aliases por228anclas. Se reconcilian IA/login/estado, entradas/arquitectura y catálogos; se preservan1448archivos históricos con un manifiesto de hashes y se conservan los cuatro pares PNG con roles/procedencia confirmados. Se retiran cuerpos duplicados de las rutas antiguas, sin borrar evidencia ni licencias. Mapa activo único y recibos separados de los cortes anteriores.

Verificación: checker activo sin incidencias, barrido de destinos de archivo de todo Markdown sin faltantes, fuente/contratos e historia cotejados y revisión independiente aprobada. Rollback: revertir B como migración de contenido/aliases e índices, manteniendo el validador A sin activación global. Exceso de400líneas declarado: el mapa de43rutas y sus referencias cruzadas, los catálogos y el inventario de1448hashes son un corte documental consistente; partir los aliases/destinos dejaría rutas rotas. Se preserva el contenido, sin comprimir para ajustar el presupuesto. La activación de CI queda en C.

Commit B observado `0db1d2e`:150archivos,7871inserciones y2191eliminaciones (10062líneas cambiadas). Es una desviación explícita del presupuesto400, no se declara su cumplimiento. Incluye inventarios/catálogos generados y migración íntegra. Gitleaks del índice (~736KB) y diff-check exit0. La revisión técnica aprobó el contenido sin autorizar excepciones en nombre del usuario.

## C — Activación del control en CI

El workflow existente ejecuta `npm run docs:check` después de instalar el lock y antes de las verificaciones de producto. El script público ya acompaña al mapa en B. Workflow/OpenAPI conservan sus rutas y comprobaciones anteriores;35casos afectados y FAST completo794/0/0 pasaron. Rollback: retirar solo el paso nuevo de CI mantiene control local y documentación organizada. Activación y recibo pequeño, sin modificar dependencias ni comportamiento de la aplicación. Publicación directa no equivale a una ejecución remota de CI.

Commit C observado166cf77:5archivos/28líneas cambiadas, con secretos/blancos exit0. Integración fast-forward, checker en main y push observados; ls-remote confirmó166cf775294b19f62f86bf8f770ef159829bf099.

## D — Recibo de publicación

Actualiza estados y registra los hechos posteriores al merge/push sin anticipar su propio hash. Solo documentación; rollback de D no retira guías ni controles. Validación proporcional: docs:check, blancos y secretos; sin repetir suites funcionales por estos cambios editoriales. El hash final y la limpieza se comprueban directamente en Git.

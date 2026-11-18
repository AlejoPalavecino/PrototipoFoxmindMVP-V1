# Retiro de evidencia documental superada

- Agente `archivo`, responsable de `docs/verification/` y de la revisión de registros anteriores en `docs/work-log/`. La sesión de ejecución no se expone.
- 18 de noviembre de 2026, worktree principal, rama `main`, base `2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81`.
- Alcance autorizado por coordinación. Mantener resultados únicos, recibos consumidos y vínculos de trazabilidad al retirar galerías y registros superados.

## Resultado

- Se retiraron 190 PNG de capturas repetidas o superadas y 88 registros intermedios de entregas reconciliadas. Se conservaron los recibos estructurados, cierres, comparaciones y muestras necesarias para entender los ensayos. Los índices distinguen la galería del 18 de noviembre, el historial de paridad y los resultados de la base anterior.
- Los archivos históricos siguen disponibles por ruta y blob en los árboles de [verificación](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/tree/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification) (`96a0b420a7efc1b58ea5b7e12a65a4b737e6d7ee`) y [registros](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/tree/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/work-log) (`a2d7720fcf8759d318985f8aa7804b98eb4577f9`). Las rutas y hashes internos de los recibos JSON se conservaron para sus candidatos originales.
- Se comprobó el uso de las rutas retiradas en scripts, pruebas y CI. Las coincidencias en las pruebas de historial y progreso son archivos de salida que esos tests generan en directorios temporales. El README del módulo Aulas conserva su registro de implementación enlazado. Las referencias desde guías y tableros se informaron a sus responsables.

## Comprobaciones

- `node --test tests/documentation-links.test.mjs`: 11 pruebas aprobadas.
- Validador del repositorio sobre ambos directorios: 136 Markdown, 339 enlaces locales y cero incidencias. Los 291 destinos históricos distintos se cotejaron con el árbol de Git.
- `git diff --check -- docs/verification docs/work-log`: sin errores de whitespace.
- El primer `docs:check` global detectó entradas del mapa pendientes de sincronizar y enlaces a las nuevas capturas y diagramas mientras se producían. La comprobación global queda a cargo de coordinación sobre el árbol combinado.
- El trabajo fue documental. La verificación se limitó a archivos, pruebas del validador, enlaces e historia local de Git.

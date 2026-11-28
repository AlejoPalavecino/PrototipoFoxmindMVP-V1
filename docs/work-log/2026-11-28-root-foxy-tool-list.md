# Lista de herramientas de Foxy docente (2026-11-28)

- Alcance autorizado: el usuario pidió actualizar la guía de Foxy para que su lista de herramientas coincida con el código. Sólo documentación; sin cambios de producto, commits, push ni despliegue.
- Rol: agente único, escritor de documentación. Rama `ccr-58fa0542-ykzmhj`, commit inicial `53fd335`. Identificador de sesión no expuesto.

## Cambio

`docs/engineering/ai/foxy.md` decía «Las cinco herramientas son…» y omitía **Crear un quiz**. El catálogo vigente (`apps/web/src/features/foxy/tools/foxy-tool-groups.ts`) ofrece seis accesos en dos grupos:

- Para tu clase: Planificar una clase, Crear una actividad, Crear un quiz, Pensar una rúbrica.
- Para explicar: Preparar un apunte e Imágenes y esquemas (sólo con capacidad visual).

Crear un quiz abre el formulario de actividad en modo cuestionario, según el comentario del catálogo. Se conservan sin cambios las menciones a «cinco herramientas» en registros y verificaciones anteriores, porque describen lo comprobado en su fecha.

## Comprobaciones

- `npm run docs:check`: 252 archivos y 1224 enlaces, 0 problemas.
- `git diff --check`: sin problemas.

## Estado

Implementado y verificado localmente. El 2026-11-28 el usuario autorizó commit y push a la rama de sesión `ccr-58fa0542-ykzmhj`; no autorizó integración en main ni despliegue. Primer paso pendiente: integrar en main sólo si el usuario lo autoriza.

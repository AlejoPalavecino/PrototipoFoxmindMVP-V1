# Frontend por dominio y caso de uso

Diseño aprobado el 2026-11-16, ejecutado desde `dd6f4bc` en `codex/frontend-cohesion` e integrado después en `main`. [Distribución vigente](README.md) · [Evidencia de integración](../../verification/refactor-integration.json).

## Resultado y límites

Separar presentación, estado y protocolo en unidades de alta cohesión, agrupadas por dominio y caso de uso. Mantener Next Pages Router, React, rutas, contratos HTTP, permisos y presentación vigentes. Corregir la respuesta obsoleta entre carpetas de Estudio y el descarte silencioso al recargar una corrección. No modificar backend, esquema, proveedores, datos retenidos ni configuración privada. Esta autorización no incluye commits, push, PR, merge o despliegue.

## Distribución aprobada

```text
apps/web/pages/                        adaptadores Next
apps/web/src/application/
  shell/                              tema y foco global
  navigation/                         destinos y navbar
  workflows/                          coordinación entre features
  server/                             proxies y SSR
apps/web/src/screens/                 sesión, ruta y composición
apps/web/src/features/<dominio>/
  <caso-de-uso>/                      UI, estado, estilos y pruebas del caso
  api/                                adaptadores HTTP
  model/                              contratos/reglas compartidos dentro del dominio
  index.ts                            entrada pública explícita
  api.ts                              transporte puro cuando corresponde
apps/web/src/shared/                  soporte transversal del navegador
apps/shared-ui/                       controles, tokens y presentación reutilizable
src/core/                            contratos y reglas neutrales existentes
```

No crear carpetas vacías ni una capa por archivo. Cada estado tiene un único dueño. UI consume operaciones tipadas; adaptadores conocen HTTP. Composición entre dominios pertenece a application. Otras features no importan internals. Las entradas API no cargan React, CSS ni Node. Las reglas neutrales se importan desde su dominio concreto. No migrar contratos compartidos del backend en este trabajo.

Coordinación confirmada por el usuario: backend migra sus imports y conserva `src/core/domain/index.ts` como entrada de compatibilidad; frontend migra sus propios consumidores. Esta rama mantiene esa entrada intacta. Su retiro queda para el cierre coordinado posterior, después de integrar ambas ramas y comprobar cero consumidores vigentes, incluidas las pruebas de compatibilidad. El cierre local de frontend no autoriza eliminarla.

## Unidades y aceptación

1. Base: mapa de movimientos, candidato y evidencia reproducible. Las pruebas heredadas se distinguen de las del candidato.
2. Estudio: una operación iniciada en A no emite resultados sobre B tras replace, error o refresh tardío. Una escritura confirmada no se informa fallida por fallar su refresh.
3. Corrección: recargar con cambios pide descarte; cancelar conserva todos los campos; confirmar carga servidor. No generar POST por recargar.
4. Contratos: Biblioteca, Autoría, Corrección y Participación reciben operaciones de su capacidad. Mantener transporte de sesión/CSRF/timeout/abort/editor; ninguna extracción introduce un segundo dueño del borrador.
5. Biblioteca: separar catálogo, lectura y publicación; lector/upload no ejecutan consulta del catálogo sin necesidad. Preservar archivos aprobados, DOCX, polling, revisión, vínculos y confirmación efectiva.
6. Estudio: separar carpetas, conversaciones, creaciones y prácticas; transportar resultados tipados y seleccionar nuevo intento por su ID. Pantalla y workspace no crean clientes concretos para sus operaciones internas.
7. Autoría: separar drafting/generation/publication. Preservar CAS/revisiones, hora ambigua/inexistente, rúbrica, guardado, publicación e idempotencia.
8. Composición: agrupar academic-* por classroom-collection, classroom-creation, classroom-workspace y activity-session; mantener contratos públicos y adaptadores de prueba.
9. Otras features: reubicar por casos de uso cuando haya responsabilidades independientes; conservar piezas pequeñas y modelos ya cohesivos. Foxy separa workspace de sus controladores existentes.
10. Estilos: mover CSS específico a su dueño preservando primero orden/selectores; consolidar con evidencia visual y no por aparente desuso. Tokens/controles genéricos quedan compartidos.
11. Cierre: tipado, build, guard, suites afectadas e integración en navegador con datos sintéticos de ambos roles, mobile/tablet/desktop, teclado, foco, errores y descartes. Documentación y manifest de pruebas reconciliados.

## Estrategia de cambio y evidencia

Movimientos mecánicos y cambios de comportamiento se revisan como unidades distinguibles; no comprimir líneas para aparentar archivos pequeños. Pruebas de regresión primero RED por la causa esperada, luego GREEN. Actualizar rutas de tests y manifests sin quitar aserciones para aprobar. El orquestador mantiene [tablero](../../../odd/tasks/frontend-cohesion-refactor.md) y [registro](../../work-log/2026-11-16-root-frontend-cohesion.md). Cada escritor tiene superficie disjunta. Revisión independiente de las dos rutas de conservación/concurrencia. No se afirma aislamiento estricto entre subagentes del mismo worktree.

Pruebas automatizadas con proveedores sintéticos. Fixtures/servidores con recursos propios; no usar entorno retenido ni modificar servicios ajenos. Validación visual con Ego Lite a 390, 768 y 1440 px, más borde 1000/1001 cuando afecta navegación. Capturas solo prueban apariencia; recibos y pruebas cubren operaciones.

Cada unidad se puede revertir por sus rutas propias antes de la siguiente extracción. No retirar entrada antigua hasta actualizar todos sus consumidores y comprobar que no quedan imports. No agregar puentes permanentes ni excepciones a fronteras.

## Mantenimiento técnico necesario durante verificación

Next16.4.2 compila pero el comando finaliza con SecurityFatalError por avisos de seguridad publicados. Se aplica el parche16.4.5 dentro de la misma línea de framework, sin cambiar React/Router/contratos/configuración de producto. Release primaria: https://github.com/vercel/next.js/releases/tag/v16.4.5. Es una unidad de dependencia distinguible por package.json/package-lock.json; requiere build y recorridos del candidato actualizado. No se ejecuta el agente de upgrade ni se deshabilitan avisos.

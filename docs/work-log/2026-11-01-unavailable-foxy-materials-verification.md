# Validación acotada de materiales Foxy — en curso

- Agente / rol: coordinador, con test runners y revisor independientes.
- Session ID: no disponible; task: validación de materiales 2026-11-01.
- Rama / worktree: codex/foxy-ai; C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai.
- Commit inicial: ca3aa632d8288369aeac41cbdd9a10742a259c29.
- Alcance: verificar recorrido docente a Biblioteca del estudiante; sin imágenes, esquemas, despliegue ni publicación.
- Estado: completed para el recorrido acotado; limitaciones explicitadas.

## Evidencia

- /root/verify_flow: build API PASS; recorrido visual con PostgreSQL temporal y almacenamiento/scanner sintéticos: READY→editar/guardar→aula/unidad/tema→PDF (HTTP 200, 921 bytes)→confirmar PUBLISHED→estudiante ve material, Foxy API 403. IA deshabilitada. Fixture, servidores y DB propios cerrados; puerto 3000 libre. Captura no disponible: ventana ego minimizada; reapertura docente no comprobada en esta ejecución.
- Primera suite: dos pruebas de archivo fallaron por trigger de migración 012; /root/failure_review confirmó fixture PREPARING incompatible con protección vigente, sin evidencia de regresión productiva. /root/fixture_fix corrigió solo el fixture para estado histórico inconsistente sin deshabilitar triggers y agregó aserción de protección; suite de archivo 11/11 PASS con PG temporal. Revisión independiente focal 2/2 PASS previa a la aserción adicional.
- Se mantiene pendiente la comprobación real del aviso nativo Back/Forward y la captura visual; no se declara PASS.

## Siguiente acción

El alcance solicitado está validado localmente. Si se integra, conservar explícitas las limitaciones visuales y de navegación; no incluir recuperación UI ni generación de imágenes en esta validación.

- Lote repetido después de corregir fixtures: node --experimental-transform-types --test --test-reporter=dot apps/api/src/foxy-ai/foxy-application.test.mjs apps/api/src/foxy-ai/foxy-publication-confirmation.test.mjs apps/api/src/files/foxy-publication-files.test.mjs: 21/21 PASS, exit 0. El recorrido live se ejecutó sobre ca3aa632 y el único cambio posterior de producto/pruebas afecta fixtures de test; no se modificó producción.
- /root/failure_review revalidó el diff final y el trigger: 2 pruebas focales PASS, sin cambios de producción ni relajación de protección. La primera sonda independiente tuvo error de import de pdf-lib y se corrigió antes de la ejecución final.
- Docker Desktop se inició para pruebas; contenedores temporales y servidor del fixture cerrados. No se usaron proveedores reales ni datos retenidos.

# Reauditoría de Muro y personas

- Agente classroom_people_wall, 2026-11-16; encargo de root sobre worktree foxmind-product-parity, candidato local ef6828b con cambios concurrentes preservados.
- Alcance: Muro, Estudiantes/Compañeros, Historial, Ajustes y CSS propios; estados 320px/altura corta, diálogos, scroll/foco. Sin backend, shell, reinicios ni publicación.
- Evidencia inicial: capturas `classroom-interior-exact/final`. Ajustes escritorio muestra tres portadas vacías; captura de scroll muestra blanco extenso y falta de pie. Modales aparecen borrosos en capturas; root verificará estado estable antes de atribuir causa.
- Estado: IN_PROGRESS; root opera Ego y entorno. Próximo paso: inspección de cascada y correcciones reproducibles; pruebas focales y handoff.
- Hallazgo confirmado por captura/fuente `learning.css`: encabezados Muro/personas en escritorio eran 20px frente a 24px de referencia; corregidos con descripción14px/margen6px. Ajustes Portada heredaba padding17px encima del gap22px: eliminado padding extra y ajustado label15px. Botón cerrar modal propio ahora44px y header sticky top0, sin modificar otros diálogos.
- `node --test tests/classroom-people-wall-exact.test.mjs`: 7/7 PASS; `git diff --check` focalizado exit0. Esta pasada modifica únicamente CSS propio; no modifica persistencia, backend ni contratos.
- Corte congelado para medición Ego de root: portadas (src/naturalWidth/rect antes de cambiar carga o clipping), borrosidad de modal una vez estable, foco/scroll del pie a320×480 y banner código/copiar a320. No se resolvieron por hipótesis ni se declararon verificados a partir de capturas anteriores. Root puede reabrir con reproducción concreta.

## Cierre con evidencia de navegador del coordinador

Root midió Ego a320×480 y conservó evidencia en `.test-artifacts/classroom-interior-reaudit/before/dialogs.json`. Se inspeccionó ese archivo como evidencia atribuida al coordinador, sin operar navegador desde este agente.

- Portadas: naturalWidth640/640/640/600 y opacity1 al enfocar. Assets disponibles; no corresponde reemplazarlos ni cambiar su carga por la captura anterior.
- Ajustes: Grupo y radio de portada alcanzables con foco/scroll, pie visible. No corresponde modificar nuevamente sticky o agregar contenedores de scroll.
- Código y Copiar código: sin desborde a320.
- Muro docente/estudiante: opacity1, fondo opaco, overflow horizontal0 y Cancelar alcanzable al enfocar dentro del scroll del modal. La borrosidad de las capturas previas no reproduce un defecto estable.
- No se aplicaron cambios adicionales a esos casos. Root revalida el CSS del corte final (título24px, separación Portada y cerrar44px). Estado: FREEZE; pruebas focales7/7, sin cambios de comportamiento/backend ni publicaciones.

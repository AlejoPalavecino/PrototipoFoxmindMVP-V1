# Ajustes de legibilidad y densidad de Inicio

- Agent / role: root, coordinador
- Session or task ID: unavailable
- Date: 2026-11-04
- Branch / worktree: main, checkout principal
- Starting commit: d8441c1a5e63e2ae970458861581970defc4b055
- Phase and detailed task/spec links: [Inicio por rol](../../odd/tasks/home-by-role.md)
- Status: completed

## Request and scope
Implementar los ajustes indicados sobre Taller Cálido: máximo dos familias tipográficas, banner más bajo y vidrio más opaco, agenda sin superposiciones ni zonas técnicas, revisión más clara, íconos corregidos, aulas compactas con avance circular, menú bajo el nombre del usuario con perfil y cierre de sesión. Ambos roles, escritorio y celular. Sin despliegue, commit ni push solicitados. No modificar otros worktrees ni el registro operativo local preexistente.

## Work performed
Inspección de componentes, CSS heredado, contratos y fixtures. Dirección aprobada conservada: Fredoka para títulos/accesos y Segoe UI para lectura, acento terracota y tonos cálidos existentes. Los gráficos expresan solamente temas dados/total, con estado explícito para plan vacío o avance no disponible. El nombre abre un desplegable con acceso al perfil y salida; no se cambia autenticación. Agenda conserva cálculo horario y destinos autorizados, mostrando título, hora y tipo.

## Verification
- Test-first: tres nuevas expectativas fallaron antes de implementar (agenda sin contexto técnico, anillo accesible y desplegable bajo el nombre). GREEN posterior. Se actualizó la expectativa histórica de miniagenda según el pedido explícito de retirar aula/zona del resumen; se conservaron conversión horaria y destino autorizado.
- `node --test tests/home-*.test.mjs tests/p9-home-client.test.mjs tests/entry-glass-client.test.mjs tests/folder-platform.test.mjs tests/foxmind-3d-regressions.test.mjs tests/foxmind-3d-contracts.test.mjs`: exit 0, 65 PASS/0 FAIL/0 SKIP. Incluye seis casos SQL con base descartable. Log ignorado `.test-artifacts/home-refined-focused.log`.
- `npx tsc --noEmit --incremental false -p apps/web/tsconfig.json`, `npm run lint:boundaries` y build web final: exit 0. Fronteras:129 excepciones congeladas. Build final con Next16.4.2, sin errores; aviso histórico no bloqueante de lockfile externo. No se cambió backend ni se repitió su compilación.
- `node --test --test-isolation=none --test-concurrency=1 tests/p9-home-integration.test.mjs`: exit 0, 13 PASS/0 FAIL/0 SKIP en119792.9239ms. Log `.test-artifacts/home-refined-p9.log`. PostgreSQL, API, Next de producción, correo/escáner/almacenamiento descartables; avance/Muro, perfil, permisos y responsive aprobados. Se respetó Retry-After real de31s. Limpieza integrada/recursos: cero fallos. No se consultaron cuentas ni servicios retenidos.
- QA Ego Space4: docente y alumno a320/390/768/1440. Cero desborde, dos familias computadas, vidrio y Foxy contenidos. Separación fecha/texto/botón de8px móvil y16px escritorio, sin solapes de título/hora/tipo. Banner185/203/230/288px; escritorio máximo300px. El fondo extendido permite conservar la proporción del personaje al reducir altura.
- Capturas `.test-artifacts/home-refined-{teacher,student}-{320,390,768,1440}.png`; nombre largo a320 con espera explícita de hidratación en `home-refined-long-320.png`. Perfil y logout sintéticos conservan sus callbacks. Enter/Escape de cuenta conservan el drawer y foco; clic exterior cierra cuenta en escritorio. Space finalizado con keep vacío.
- Fallos intermedios conservados: una edición perdió temporalmente el selector de Foxy y bloqueó la compilación del fixture; el reviewer lo detectó y se restituyó antes de QA final/build/P9. La primera captura se tomó antes de decodificar el panorama y apareció difusa; las finales esperan decode/fonts.ready. Una aserción de separación exacta8px encontró7.999984px por redondeo CSS: tolerancia corregida a0.1px, sin cambio de producto. La primera selección amplia falló por la expectativa histórica de zona original retirada expresamente; tras actualizarla pasó la selección completa.
- `npm run docs:check`: 138 archivos/1736 enlaces, cero problemas antes del cierre de estos registros. `git diff --check`: exit 0; solo advertencias CRLF.
- [Revisión independiente atribuida](2026-11-04-home-refinement-independent-review.md): sin hallazgos abiertos. El reviewer ejecutó12 pruebas focales, inspeccionó la matriz, cuenta y estados, y leyó el cierre P9 del coordinador; no ejecutó P9 por su cuenta.
- Cierre documental final:138 archivos/1737 enlaces, cero problemas. Se detuvo solo el fixture sintético propio53191 verificando comando de su proceso padre y relación padre/hijo. La aplicación local retenida no se detuvo.

## Commits and outcomes
Sin commits nuevos.

## Handoff
Alcance solicitado implementado y verificado localmente. El diff queda disponible en main sin commit/push/deploy nuevos. El registro operativo local preexistente y los demás worktrees se conservaron intactos. No hay tarea funcional pendiente de este alcance.

Entrega posterior autorizada: implementación2257b80 integrada y publicada en main, con lectura remota exacta. El snapshot local anterior queda como historia. [Registro de sincronización](2026-11-04-id-unavailable-home-refinement-publication.md). Sin despliegue.

# Verificación y criterios de aceptación

**Esta planificación no ejecutó pruebas del producto.** Los comandos son una guía para el candidato futuro; revalidar disponibilidad en F0. Los historiales P3–P9/glass no constituyen aceptación del nuevo diseño.

## 1. Evidencia por cambio
Mantener un ledger por UI01–UI43 y por fase: ruta/estado/rol, viewport, commit, comando, resultado, archivo de captura y limitación. Actualizar registro propio; no sobrescribir evidencia histórica. Cada fallo/unavailable/skip queda explícito. Para afirmar cierre, cada requisito aplicable tiene evidencia real.

- Pruebas de lógica para destinos, parser, filtros, validación y estados.
- Pruebas de componente para roles, acciones visibles/ausentes, semántica y errores.
- Navegador con API/DB/correo/scanner de fixtures para recorridos críticos.
- Comparación visual con mismo viewport/estado, fuentes e imágenes cargadas; no comparar un PNG escritorio con un render diferente y declarar pixel-perfect.
- Revisión humana del estilo separada de pruebas automáticas.
- Verificación independiente según política activa al ejecutar. Si se autoriza un Verify subagente, respetar la instrucción del repositorio sobre modelo/esfuerzo; este plan no lo despacha ni infiere consentimiento de review.

## 2. Journeys obligatorios
| ID | Recorrido | Resultado comprobable |
|---|---|---|
| J01 | Login verificado desde entrada normal | /inicio sin clic extra ni visita a /profile; volver atrás no reabre formulario autenticado |
| J02 | / o login con sesión existente | Comprobación estable → Inicio; no flash de perfil/formulario |
| J03 | Registro nuevo y correo existente | Misma respuesta genérica; formulario pasa a próximo paso; no enumera ni autentica |
| J04 | Registro → correo capturado → confirmación → login | Verificación explícita, login → Inicio, sin completar perfil obligatorio |
| J05 | Login no verificado / token inválido-vencido-usado / resend | Gate correcto, cooldown, salida y recuperación; no aula ni consumo por GET/prefetch |
| J06 | Invitación → registro/login/verificación → aceptar | Intención conservada si disponible; aceptación explícita; cuenta errónea/expirada no inscribe ni revela datos |
| J07 | next manipulado, arrays, doble encoding, externo, stale | Rechazo a destino seguro sin open redirect; permisos de destino verifican en servidor |
| J08 | Recuperación y cambio de contraseña | Recuperación cierra anteriores; cambio conserva/renueva actual y revoca otras; sin perder políticas |
| J09 | Home sin aulas, solo D, solo E, mixto, muchas aulas | Ambos bloques coherentes; crear/unirse ausentes; tareas reales, carga/error no maquillados |
| J10 | Mis Aulas → crear borrador → salir → retomar → publicar | Wizard/draft persistido, campos/plan/unidad válidos; ningún aula ficticia por fallo |
| J11 | Código preview/confirm; invitación; remover/salir/reingresar | Política de membresía intacta; no duplicado, acceso revocado efectivo |
| J12 | Aula → sección → detalle → Back/refresh/deep link | Contexto y rol restablecidos, sin acceso ajeno; miembros no es paso obligatorio |
| J13 | Plan/Library/Muro docente y estudiante | Permisos, límites, versiones, relaciones y moderación; consulta móvil |
| J14 | Upload limpio/rechazado/pendiente/scanner caído/cuota | Estados fieles, descarga/preview privada, solo listo sirve para entregar |
| J15 | TP publicar → abrir E → adjuntar → entregar → recibo | Abrir no es entrega; completo recibido servidor decide hora; no doble envío |
| J16 | Cuestionario/evaluación → autosave → red fallida → retry/reload | Saved solo confirmado; conserva visible no confirmado mientras pantalla viva; recuperación sin promesa offline |
| J17 | Segunda pestaña → transferir control → entregar incompleto | Un editor, advertencia de cambios no transferidos, confirmación por preguntas sin responder |
| J18 | Corregir borrador → publicar → alumno consulta | Privado no filtrado, formato 8,50, feedback correcto; no answer key ajena |
| J19 | Reabrir/corregir nota publicada → progreso | Historia, motivo/auditoría, nota efectiva y medias exactas; sin aprobado/desaprobado |
| J20 | Archivar/reactivar → intentar operaciones ambos roles | Lectura conservada, mutaciones bloqueadas, reactivar no resetea fechas |
| J21 | Notificación → destino; perder acceso → reabrir | Autoriza cada apertura; no restauración de matrícula por notificación |
| J22 | Teclado/móvil/zoom/reduced motion en tareas críticas | Flujos completos sin trampa de foco, controles ocultos o pérdida de contenido |

## 3. Pruebas existentes a conservar/adaptar
No borrar aserciones de seguridad porque tengan «glass» en el nombre. Separar test funcional de snapshots/tokens del estilo anterior; actualizar los segundos al nuevo requisito y dejar historial en Git.

Ejemplos de comandos **desde el checkout completo validado**, no desde P3:
```powershell
node --test tests/p3-web-client.test.mjs tests/p3-web-proxy.test.mjs tests/p5-web-client.test.mjs tests/p5-web-proxy.test.mjs tests/p9-home-client.test.mjs
node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json --noEmit
npm run web:build
```

Verificar tests de token-head reales con origen del candidato según docs/p3-web.md; si se omiten por falta de origen, registrar SKIP, no PASS. No usar un test con transporte mockeado como prueba de sesión/backend real.

Familias a ejecutar según impacto y nuevamente al cierre:
- Cuenta/proxy/session: p3-web-*, p5-session-bridge, p5-web-*, entry-glass-client/browser/polish adaptados.
- Inicio/navigation: p9-home-client/integration/recovery, p6-mobile-navigation, nuevas pruebas de destino/ruta/next.
- Plan, Muro, Library/archivos: p4-web-*, p6-* y sus controles.
- Autoría, TP, cuestionario, tiempo, participación e historial: p7-* pertinentes; incluir autosave y control de editor.
- Publicación, corrección, progreso y precisión: p8-*.
- Recorridos completos P9 de enseñanza, membresía, TP, cuestionario, evaluación, correo/servicio fallido.
- CSS/componentes: platform-glass y entry-glass se migran al sistema, no se eliminan sus garantías de foco/semántica/contraste.

Existen npm run test:p5:integration, test:p6:integration, test:p7:integration y test:p8:integration en la base inspeccionada; **antes de ejecutar**, leer cada runner, sus recursos, límites y cleanup. No llamar scripts de servicios retenidos ni «npm test» indiscriminadamente. Usar fixtures aislados con identificación real y cleanup de lo propio; no cambiar límites/timeout para convertir un fallo en verde.

Nuevas pruebas propuestas (crear, aún no existen): folder-auth-destinations, folder-navigation, folder-home, folder-components y folder-platform-browser. Añadir casos específicos antes de cambiar comportamiento y registrar RED→GREEN cuando corresponda.

## 4. Responsive y accesibilidad
- Viewports mínimos: 320, 390, 768, 1024 y 1440 CSS px; comparar Inicio además a 1487×1058 para referencia de escritorio. El PNG móvil 853×1844 no define CSS width.
- Pruebas a 200% texto y reflow/zoom hasta equivalente de 320px; sin scroll horizontal de toda página. Tablas que realmente requieran dos dimensiones usan región accesible etiquetada y conservan encabezados/acciones; preferir adaptación legible por filas.
- Controles principales táctiles objetivo del producto ≥44×44px. WCAG 2.2 AA exige 24×24 CSS px o sus excepciones/espaciado, no confundir ambos criterios ([W3C tamaños](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)).
- Contraste sobre superficie renderizada: texto normal ≥4.5:1 y grande ≥3:1; medir estados reales, no solo nombres de tokens ([W3C contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)). El naranja claro se usa como relleno con texto oscuro.
- Focus-visible permanente y orden lógico; headers/sticky actions no ocultan el control enfocado. AA exige que no quede totalmente oculto; objetivo de diseño: completamente visible ([W3C foco](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)).
- Password manager, autofill y pegar permitidos; sin tests cognitivos adicionales o transcripción obligatoria ([W3C autenticación accesible](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html)).
- Focus trap correcto solo en diálogo modal; Escape/Cancelar y retorno al disparador; IDs únicos si hay varias instancias. Navegación por enlaces/tabs según semántica real.
- Labels/aria-describedby/aria-invalid, resumen de errores; estados live sin robo de foco constante. Temporizadores y autosave no anuncian cada tick.
- Navegación y selección no solo color; icono + texto; ilustraciones decorativas con alt vacío, marca con nombre accesible.
- Probar teclado real, tacto donde disponible y lectura asistiva representativa. Un viewport estrecho no prueba interacción táctil. Herramientas automáticas complementan, no certifican conformidad.
- Reduced motion conserva claridad sin depender de animaciones. Sin zoom bloqueado ni contenido esencial al hover.

## 5. Rendimiento y verdad del producto
- Comparar bundle/red y navegación contra baseline, mismos fixtures; no añadir grandes recursos para imitar PNG.
- Resumen Inicio acotado, sin barrido N+1 ni inicio de intentos durante render.
- Ninguna información placeholder, contador simulado o success sin persistencia queda en producción.
- Verificar error parcial, pérdida de sesión, race de navegación y acción ya confirmada con refresh fallido.
- No emitir tokens, cuerpos privados, credenciales o datos de alumnos a logs/screenshots.
- Evidencia visual no afirma píxeles exactos del raster ni calidad en dispositivos no probados.

## 6. Cierre
Cada UI01–UI43 y J01–J22 aplicable debe tener resultado. Cualquier brecha backend del resumen, pantalla antigua, modo móvil omitido, salto a perfil o test omitido relevante impide llamar al encargo «completo».

Entregar: commits propios, mapa de archivos, ledger, capturas por rol/estado, comandos/resultados, limitaciones, revisión visual humana y próxima acción. Actualizar docs/roadmap/registro de diseño solo con evidencia del candidato y conservando historia. Sin publicación/despliegue salvo autorización posterior.

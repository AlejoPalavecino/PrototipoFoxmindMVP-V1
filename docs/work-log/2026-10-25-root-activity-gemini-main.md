# Actividades — Gemini real e integración local autorizada

- Agent / role: coordinator.
- Session or task ID: /root.
- Date: 2026-10-25.
- Branch/worktree: codex/classroom-activity-ai; C:/Users/alejo/.codex/worktrees/classroom-activity-ai/ProtipoFoxMind.
- Starting commit: 3c74eb6.
- Phase/task: [actividades IA](../../odd/tasks/classroom-activity-ai.md), extensión de verificación/entrega.
- Status: completed.

## Request and scope

Usuario solicita verificación completa usando apikey Gemini y, si funciona, commits e integración a main. Autoriza cargar internamente la clave/configuración Gemini existente para llamadas reales, sin exponer sus valores. Datos sintéticos y servicios aislados; ninguna base retenida se modifica. Integración local condicionada a pruebas; no se infiere push/PR o despliegue.

## Work performed

Rama feature limpia3c74eb6 al inicio; roadmap/protocolo/guías revisados. Bootstrap read-only delegado para reconciliar main actual y localizar referencias documentadas del archivo AI. Autoridad actual supera sólo la restricción histórica de no smoke real/no integración para esta entrega.

## Verification

Plan inicial, completado en los checkpoints posteriores: prueba Gemini real, flujo docente/estudiante, esquema/fuentes/tipos/privacidad, builds y revisión de integración. Evidencia sintética anterior se conserva atribuida, no se etiqueta como real. El build API canónico posterior tiene una limitación explícita en la entrega siguiente.

Bootstrap/main preflight: main727614d9 y feature3c74eb6, origin/main igual tras fetch. Canonical sin staged/tracked changes;14archivos untracked ajenos, sin colisiones con rutas feature. No contenidos ajenos leídos ni modificados. Preview controlado63684 se detuvo por marcador propio: exit0/ownedcleanup0 antes de recompilar .next.

Launcher real revisado sin overrides/secret leaks. Primer entorno60976 activity_ai_real_test, modelo configurado existente y startup0jobs/usage; migraciones14/diff y builds PASS. Primer TPjob7a202b92 falló AI_UNAVAILABLE: SQL dispatch0/input/outputnull/reserva0/usage0, propuesta ausente. No prueba de generación ni facturación Google afirmada. Fallo y PNG/SQL se conservan en registro/evidencia del verificador; no se integró main.

Causa precisa inspeccionada en SDK2.31.0 local countTokensConfigToMldev9821: rechaza config.systemInstruction en Gemini DeveloperAPI antes de enviar HTTP. El mock anterior no detectaba la modalidad. Test_runner nuevo SDKreal+HTTPloopback observó3FAIL y refinó testfullinput con1FAIL adicional. Worker modificó sólo activity-adapter.ts: prefijo count-only de instrucción/schema completos, payload intacto y digest completo; generate privilegiado/quotas/retries sin cambios.10PASS por worker y reviewer, tipos/diffcheck PASS; sin nuevos env/migraciones. Prueba Google requiere backend fresco, no retry automático.

Supervisor del primer realpreview se encontró ausente después de su ejecución de subagente; root62354 no era accesible y PID41348/listener60976 ausentes, aunque quedaban servicios Docker. Marcador propio existía. Causa de terminación no probada; no evidencia de fallo del polling de marcador. Launcher completó cleanup de huérfanos con labels exactos (P4/Mailpit propios, cero fallos y listado posterior vacío), sin recursos retenidos ajenos. Fresh API build tras fix PASS. Segundo runtime abierto por coordinador en sesión propia después de esa limpieza/build, conservando fallo anterior como histórico.

Segundo entorno real root63174: http://127.0.0.1:51960/inbox51948, startup0jobs/usage e inventario14/diff PASS. Un primer gesto de QA recargó antes del recibo y no llegó a crear job (SQL0); corregido el harness, no producto ni reenvío de resultado incierto. TPjobb483aba9 falló AI_INPUT_LIMIT6.729283s con dispatch0/tokensnull/reserva0/usage0. Ese segundo fallo sigue histórico, no marcado PASS ni atribuido a una causa no probada.

Diagnóstico root count-only con la MISMA entrada persistida y bytes sintéticos verificados por digest: Word1101B/147caracteres/parse423ms; PDF1002B/1página/parse434ms. `GeminiActivityGenerationAdapter` con cliente SDKreal delegado devolvió1572tokens en1294ms; maxInput100000 vigente confirmado sin valores secretos. Cero generateContent en ese diagnóstico; no consulta de facturación Google ni cambio de cuotas. Artefacto ignorado count-diagnostic.json. El rechazo de límites original no se reprodujo; origen exacto no demostrado. Se autorizó una única acción explícita igual después de ese control, con stop si falla, sin autoretry/expansión de políticas. Integración continúa condicionada al PASS real completo.

## Commits and outcomes

Cierre independiente explícito PASS recibido de /root/gemini_real_verify:110PASS/0FAIL/0SKIP/0cancel,134553ms y640inputs sin cambios. Root comprobó de nuevo los640hashes contra manifiesto post-suite:0cambios. Dos ventanas parsing post-fix40/40PASS: tempranoWord129–406/PDF293–1518ms; tardío(~71s de suite)Word118–790/PDF301–918ms. Reviewer aprobó DoD. Aceptación del escenario finito verificado, no atribución causal exacta de cada fallo histórico ni garantía bajo contención arbitraria. Cuatro dispatches reales y todos los recorridos funcionales previos siguen válidos; el delta final sólo inicialización por formato, sin nuevas llamadas Google.

Unidades previstas: compatibilidad SDK+tests/registro; aislamiento parser+RED/GREEN/diagnóstico; launcher real+registro; prueba real/archivo visual; evidencia de carga post-fix; cierre documental. Cada unidad máximo400líneas, sin compactar código para el presupuesto. Rollback por unidad conserva anteriores evidencias; revertir parser restaura únicamente la carga eager, revertir count restaura la incompatibilidad documentada. Runtime launcher se puede retirar sin cambiar producto; es exclusivamente arnés real con datos propios. No nuevas variables ni migraciones adicionales respecto del feature ya verificado.

Continuación real: TP7320e755 y regeneración explícita cdfdfdf4 llegaron READY con fuentes PDF/Word READ y semántica revisada. Se conservó edición docente mediante Conservar, aplicó exactamente un DRAFT privado y reabrió persistido. Nuevo quiz ae5da637 falló AI_INPUT_LIMIT antes de dispatch; mismo contenido pequeño. Sin causa original demostrada ni expansión de límites. Diagnóstico arquitecto atribuido en [informe](2026-10-25-gemini_limit_diagnosis.md).

Root detuvo63174 con exit0/ownedcleanup0 tras conservar artefactos. Instrumentación externa ignorada de fetch/Worker revisada LGTM; observa sólo etapas/count/timing, sin alterar requests/resultados ni contenido/credenciales. Runtime propio82071, web57499, startup0 y migraciones14/diff PASS. Quiz61bde07a READY: parsing Word511ms/PDF365ms, count1580/HTTP200 y generateHTTP200; exacto desarrollo/única/múltiple, claves/puntos/PARTIAL correctos. Publicación explícita, estudiante403/list0 antes y DTO público sin claves después; entrega única, progreso100% y Agenda pendingfalse; calificación publicada10.00. Coordinador inspeccionó TP/quiz/evaluación y estudiante desktop/mobile seleccionados; gates aprobados. Verificador sigue con cierre evaluación/suite: estos resultados no borran los rechazos anteriores ni prueban su causa.

Memoria atribuida deshabilitada por hook de identidad tras compactación; no se inventó sesión ni se reintentaron escrituras. Registros del repositorio conservan recuperación.

Evaluación a4370bf9 READY/APPLIED/DRAFT reabierta con título/puntos editados. Cuatro dispatches reales exitosos acumulados (TP+regen en runtime anterior, quiz+evaluación actual); ningún otro generate solicitado. Verificador sostiene bloqueo de fiabilidad por los dos rechazos históricos, aunque E2E funcional pasó.

Diagnóstico acotado root, sólo parsing y sin Google: diez rondas secuenciales con exactamente el Word147caracteres y PDF1página del fixture actual durante la suite CPU/Docker.19lecturas,18OK357–2730ms y Word round7 AI_INPUT_LIMIT3137ms. Artefacto ignorado parser-diagnostic.json. Reproduce rechazo intermitente dentro de límites documentales, sin demostrar aún el punto original del fallo histórico. Architect reactivado para evidencia/contrato mínimo antes de RED; integración suspendida, sin ampliar timeout/guardas.

Siguiente captura acotada de origen, sin Google:18DOCX en3lotes de6concurrentes, todos531–591ms PASS; no timeout nuevo para stack, sin atribución causal adicional. Arquitecto aprobó RED determinista contra imports ajenos, tester observó2FAIL y worker cambió sólo carga por rama. Worker2GREEN/noEmit PASS, pruebas intactas. Delta mantiene3s, memoria, bytes, páginas, ZIP/XML, mensajes y warnings. Runtime82071 detuvoexit0/ownedcleanup0 después de exportar SQLunique. API recompilada sesión25819 Prisma+tsc exit0; sin UI modificada. Verificador reactivado para110regresiones y parsing bajo carga; integración sigue pendiente de ese cierre.

Commits locales observados: e9f8b30 conteoSDK (201líneas cambiadas), dca3444 aislamiento+RED/GREEN/diagnóstico (316), d8df1cc runtime real (252), f76773a carga post-fix (332), dafcbf1 aceptación real/visual/SQL (275). Todos menores400. Feature tenía previamente commits hasta3c74eb6. Cierre documental e integración siguen debajo; no commit ID inventado.

## Handoff

Verificación real aceptada y producto congelado. Main avanzó por FF a577445c con igualdad exacta HEAD/tree y18untracked ajenos preservados. [Entrega canónica y limitación](2026-10-25-root-activity-main-delivery.md): frontend PASS; API canónico no completó presupuesto compartido30s (Prisma PASS, TypeScript ETIMEDOUT sin diagnósticos). No se afirma PASS de ese build ni runtime canónico. Fuente integrada coincide con la que pasó API/110tests en worktree; próximo trabajo es preparar el runtime canónico antes de usarlo, con diagnóstico específico y sin retry ciego. Sin push/PR/despliegue ni migraciones sobre bases retenidas. Ambos runtimes propios ya limpiados; Space3 ajeno preservado, Space4 conserva sólo última pantalla histórica sin servidor activo.

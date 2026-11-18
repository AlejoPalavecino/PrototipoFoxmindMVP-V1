# Feature: Tiempo de respuesta de FoxMind

- **Spec:** #especificacion
- **Design:** #diseno
- **Approval:** approved
- **Evidence mode:** candidate-v1

## Especificacion
Medir cola, preparación, conteo, generación y presentación. Reducir conteos con historial preservando fuentes y límite exacto. Respuestas breves ampliables en consultas puntuales. Texto progresivo sólo para conversación docente, con controles de propiedad, revocación y cancelación.

## Diseno
Conservar transporte y perfiles existentes salvo extensión de entrega parcial privada. Mantener validación final y usar fixtures sintéticos.

## Tasks

### TASK-001 — Tiempos por etapa
- **State:** DONE
- **Depends on:** none
- **Owner:** /root/metrics
- **Acceptance:** Comparar los tiempos por flujo con escenarios sintéticos y distinguir el primer texto del resultado final sin registrar contenido privado.
- **Scope:** ["apps/api/src/bootstrap/study-composition.ts", "apps/api/src/bootstrap/study-runtime.ts", "apps/api/src/platform/ai/text-metrics.ts", "apps/web/src/shared/chat-timing.ts", "apps/web/src/features/foxy/conversations/foxy-chat-controller.ts", "apps/web/src/features/foxy/workspace/foxy-workspace.tsx", "apps/api/src/modules/foxy/turns/infrastructure/turn-preparation.ts", "apps/api/src/modules/foxy/turns/infrastructure/turn-queue.ts", "apps/api/src/modules/foxy/turns/infrastructure/worker.ts", "apps/api/src/modules/foxy/turns/application/queue-contracts.ts", "tests/ai-chat-latency.test.mjs", "tests/study-exact-practice.test.mjs", "apps/api/src/modules/foxy/turns/infrastructure/turn-preview.ts", "tests/study-runtime.test.mjs", "apps/api/src/modules/study/generation/application/tests/study-generation-cancellation.test.ts", "apps/api/src/modules/study/application/ports.ts", "apps/api/src/modules/study/folders/application/service.ts", "apps/api/src/modules/study/generation/infrastructure/providers/study-adapter.ts", "apps/api/src/modules/study/generation/infrastructure/providers/study-ai-execution.ts", "apps/web/src/features/study/conversations/use-study-chat.ts", "apps/web/src/features/study/model/study-commands.ts", "tests/study-ai-execution.test.mjs", "apps/api/src/modules/foxy/turns/infrastructure/tests/foxy-text-worker.test.mjs", "apps/web/src/features/study/practice/presentation/StudyPracticeView.tsx", "apps/web/src/features/study/ui/study-workspace.tsx"]
- **Evidence:** {"command": "node --import ./scripts/register-api-test-build.mjs --experimental-transform-types --test tests/ai-chat-latency.test.mjs tests/study-exact-practice.test.mjs apps/api/src/modules/foxy/turns/infrastructure/tests/foxy-text-worker.test.mjs", "result": "PASS. Fixture integrado confirmó CANCELLED en generación y persistencia; reloj de navegador opcional. Ver registro de QA ampliada.", "candidate": "sha256:90f774c65c9c29ca275f22e734c186e705c8e351e797fa3e06a4fb819f3b5897"}
- **Blocker:** none

### TASK-002 — Menos conteos con historial
- **State:** DONE
- **Depends on:** none
- **Owner:** /root/history
- **Acceptance:** Usar menos conteos en historiales largos de tamaños iguales y desiguales, confirmar el límite exacto y preservar fuentes y permisos.
- **Scope:** ["apps/api/src/modules/foxy/turns/infrastructure/turn-preparation.ts", "tests/ai-foxy-preflight-budget.test.mjs"]
- **Evidence:** {"command": "node --experimental-transform-types --test tests/ai-foxy-preflight-budget.test.mjs", "result": "PASS. Dos fixtures de 10 pares bajaron de seis conteos a tres. Suite combinada de seis archivos pasó.", "candidate": "sha256:057168f97aefb782305ca481b2f10acf461accdb406422112670edba4c8b605c"}
- **Blocker:** none

### TASK-003 — Extensión según tarea
- **State:** DONE
- **Depends on:** none
- **Owner:** /root/brevity
- **Acceptance:** Las dudas puntuales admiten una respuesta breve ampliable y las instrucciones preservan el detalle de materiales y rúbricas.
- **Scope:** ["apps/api/src/modules/foxy/turns/infrastructure/providers/foxy-prompt.ts", "apps/api/src/modules/foxy/turns/infrastructure/providers/tests/foxy-text-adapter.test.mjs", "src/core/domain/study/engine.ts", "apps/api/src/modules/study/generation/application/engine.test.ts"]
- **Evidence:** {"command": "node --experimental-transform-types --test apps/api/src/modules/foxy/turns/infrastructure/providers/tests/foxy-text-adapter.test.mjs apps/api/src/modules/study/generation/application/engine.test.ts", "result": "PASS. Contratos de longitud, ampliación y detalle conservado en la suite combinada. Sin inferencia estadística de longitud con Gemini.", "candidate": "sha256:bf7a91f5f4466f859d0d94b6d6ce5b6d639618267c8bc8626dde0d1d6ff4b30e"}
- **Blocker:** none

### TASK-004 — Texto progresivo de Foxy
- **State:** DONE
- **Depends on:** none
- **Owner:** /root y /root/stream
- **Acceptance:** El docente puede leer texto parcial y detener el turno en el chat general apto. Un trabajo ajeno, cancelado u obsoleto no expone parciales. El resultado final pasa validación.
- **Scope:** ["apps/api/src/bootstrap/foxy-runtime.ts", "apps/api/src/modules/foxy/turns/application/turn-service.ts", "apps/api/src/modules/foxy/turns/infrastructure/worker.ts", "apps/api/src/modules/foxy/turns/infrastructure/turn-preview.ts", "apps/api/src/modules/foxy/turns/infrastructure/providers/foxy-adapter.ts", "apps/api/src/modules/foxy/turns/infrastructure/providers/foxy-stream-preview.ts", "apps/api/src/modules/foxy/turns/infrastructure/tests/foxy-turn-stream.test.mjs", "apps/api/src/platform/ai/gemini-client.ts", "apps/api/src/platform/ai/gemini-text-transport.ts", "apps/api/src/platform/ai/text-client.ts", "apps/api/src/platform/ai/text-contract.ts", "apps/api/src/platform/ai/text-execution.ts", "apps/web/src/features/foxy/api/foxy-client.ts", "apps/web/src/features/foxy/conversations/foxy-transcript.tsx", "apps/web/src/features/foxy/conversations/foxy-wait.tsx", "apps/web/src/features/foxy/workspace/foxy-workspace.module.css", "apps/web/src/features/foxy/workspace/foxy-workspace.tsx", "apps/web/src/features/foxy/ui/foxy-collections.test.mjs", "scripts/ci-suites.mjs", "scripts/complete-suite-inventory.json", "scripts/complete-suite-routes.json"]
- **Evidence:** {"command": "node --experimental-transform-types --test apps/api/src/modules/foxy/turns/infrastructure/tests/foxy-turn-stream.test.mjs apps/web/src/features/foxy/ui/foxy-collections.test.mjs apps/web/src/features/foxy/ui/foxy-visual-workspace.test.mjs", "result": "PASS. Cinco chats con Gemini real emitieron prefijos de la respuesta; Ego Lite integrado verificó foco, cancelación y entrega definitiva en escritorio y móvil.", "candidate": "sha256:2d7014609cee774205450c0e5254ba85813f0334eafaf859d244e4ca38647f44"}
- **Blocker:** none

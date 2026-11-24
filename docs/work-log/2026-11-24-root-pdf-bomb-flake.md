# Flake de la prueba de la bomba de descompresión de PDF (24/11/2026)

- **Alcance autorizado:** el 24/11 el usuario pidió arreglar el flake de `pdf-inflate-bomb`, que apareció mientras se verificaba el [arreglo de admisión de Estudio](2026-11-24-root-study-admission-flake.md). Commit y push, sólo si los pide. No incluye despliegue.
- **Rol:** coordinador, único escritor. Rama `main`, worktree raíz, commit inicial `50b5ca33`. La sesión no expone su identificador.

## Causa

La primera pasada local de `npm run test:complete -- --group fast` se cortó en `pdf-inflate-bomb.test.mjs`: el rechazo de la bomba de 1 GiB tardó 4039 ms y el tope era de 3000 ms. Medido en reposo, `assertPdfInflateBudget` tarda unos 25 ms, pero `inspectContent` levanta un Worker `.ts` nuevo en cada llamada y eso cuesta ~1 s. El tope absoluto medía sobre todo el arranque del Worker, que con la máquina cargada se estira.

## Cambios

- `apps/api/src/modules/files/custody/infrastructure/tests/pdf-inflate-bomb.test.mjs`: cada consumidor (`inspectContent` y los dos Workers de documento) se compara contra el mismo consumidor procesando un PDF normal, medido justo antes, con 3000 ms de margen. El tope de memoria (256 MiB) no cambia. No se modificó código de producto.
- `docs/engineering/files/README.md`: frase sobre cómo mide la prueba.

## Verificación

| Comprobación | Resultado |
|---|---|
| Prueba original, 10 y luego 24 copias en paralelo | Sin fallas; el flake no se reproduce a demanda. |
| Mutación: guarda desactivada, prueba original | Falla en `plan-document-worker.ts`: 8267 ms y 2029 MiB. `inspectContent` seguía devolviendo `FILE_REJECTED`. |
| Prueba nueva, archivo completo | 4/4. |
| Mutación: guarda desactivada, prueba nueva | Falla: 16840 ms contra 1472 ms del PDF normal, 2028 MiB. La guarda se restauró (`git diff` vacío en ese archivo). |
| Prueba nueva, 12 copias en paralelo | 12/12. |
| ESLint sobre la prueba | Sin errores. |
| `npm run test:complete -- --group fast` | 1238/1: la cortó `tests/activity-ai-adapter.test.mjs:64` (`AI_TIMEOUT` con un plazo de fixture de 50 ms), que no está relacionado con el cambio. Solo pasa 5/5. No hubo otra pasada completa. |

## Límites

- No hay un RED determinista del flake: depende de la carga de la máquina. La evidencia es la causa medida y que la prueba sigue detectando la regresión sin la guarda.
- Si el arranque de un Worker varía más de 3 s entre dos mediciones seguidas, la prueba todavía puede fallar.

- `activity-ai-adapter.test.mjs` ("A2 unreliable and excessive token counts…") también depende del tiempo, por su plazo de 50 ms. No se tocó.

**Primer paso pendiente:** arreglar el flake de `activity-ai-adapter` y repetir el grupo `fast` completo. Sigue pendiente `owned-db` con Docker activo, del registro de admisión de Estudio.

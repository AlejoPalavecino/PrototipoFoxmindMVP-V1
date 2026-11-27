# Diseño del frontend (F3–F11 de la auditoría)

- **Alcance autorizado:** hallazgos F3–F11 de la [auditoría](2026-11-26-root-full-stack-audit.md), salvo F1 y F2, en cortes aprobados por el usuario el 2026-11-26. Sin cambios visibles de producto. Commits en la rama propia; push, PR o merge no autorizados.
- **Rol:** sesión lateral iniciada por la sesión coordinadora; único escritor de este registro y de [su tablero](../../odd/tasks/audit-frontend-design.md).
- **Rama y worktree:** `claude/audit-frontend-71cf98` en `.claude/worktrees/audit-frontend-71cf98`, desde `main` en `a06c9214`.
- **Fuera de alcance:** `apps/web/src/application/server/` (F1/F2 en la sesión coordinadora).

## Decisiones

- Formateador (F7): sólo sobre los archivos con líneas largas, fuera de `application/server/`; la regla de F9 impide que vuelvan.
- F8: diferido hasta integrar F1, coordinado con la sesión principal. El tope fijo de 10 s está en `apps/api/src/modules/files/uploads/presentation/http.ts:46`, junto a un corte por inactividad.
- Token CSRF (F5): se reutiliza sólo si la API lo acepta más de una vez.

## Cortes

### Corte 1 · reglas de hooks (F4)

- Se instaló `eslint-plugin-react-hooks@7.1.1` y `lint:boundaries` aplica `rules-of-hooks`, `exhaustive-deps` y `set-state-in-effect` como error en web y shared-ui.
- Al activarlas marcaron 114 casos en 65 archivos: 31 de `exhaustive-deps` y 83 de `set-state-in-effect`. Los 31 se corrigieron sin cambiar cuándo se dispara cada efecto. Se usó `useEffectEvent` para leer callbacks y estado vigente; `useScopedValue` (nuevo, `apps/web/src/shared/`) para los clientes que se recrean a propósito al cambiar de cuenta o materia; y alias locales cuando la regla confundía `state.current` con una ref.
- Los 83 de `set-state-in-effect` quedan en `eslint-suppressions.json`: un caso nuevo falla y una supresión sobrante también. Se bajan en los cortes siguientes.
- Los simuladores de hooks de cuatro pruebas implementan `useEffectEvent`.
- Comprobación: `npx tsc --noEmit -p apps/web/tsconfig.json` sin errores; `npm run web:build` exit 0; `npm run lint:boundaries` pasa; `npm run test:complete -- --group fast` 3224/3224 (la primera corrida falló 11 en `use-foxy-workspace-actions.test.mjs` por un simulador sin `useEffectEvent`; corregido); `npm run docs:check` 0 problemas. Toca código de pantallas sin cambiar su comportamiento; la verificación en el navegador se hace junto con el corte siguiente, que también toca efectos.

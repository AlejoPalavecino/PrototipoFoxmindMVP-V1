# Preparación de cadena PR — issue #2

- Agente: coordinador /root; sesión real no disponible; 2026-10-29.
- Alcance: el usuario eligió PRs encadenadas con rama integradora. Preparación local; no autorizó push ni crear PR.
- Estado: completed para preparación local; publicación pendiente. Base main verificada `7aee4181e62d680631e9fe9ad18b605d54c36bcc4`? No: valor exacto observado mediante ls-remote es `7aee4181e62d680631e9fe9ad18c39744c6f7754`.
- Exploración atribuida a /root/explorer (solo lectura): identificó 15 commits, árbol limpio, 3058 adiciones y 34 eliminaciones en el punto inicial, candidatos de grupos y límites de verificación. No modificó Git ni archivos.
- Estrategia: rama integradora desde main, PR integradora draft/no-merge a main; primera rama hija desde integradora y cada hija posterior desde la anterior. El alcance completo no se fusiona hasta revisar e integrar toda la cadena.
- Orden previsto: contrato/cola de entrega; guardia de adjuntos; lectores durables; evidencia/proveedor; cola SQL; runtime; aplicación privada; integración del worker; configuración; UI de revisión; pruebas de revocación; pruebas integradas y documentos.
- Validación disponible: conjunto final verificado en registro issue2; los tramos parciales no tienen CI independiente observado. La prueba P7 concurrente falló una vez, diagnóstico posterior pasó y causa permanece desconocida. Gemini real y autenticación completa sin comprobar.
- Siguiente acción: crear ramas locales sobre los commits existentes y verificar diffs inmediatos. La skill branch-pr exige issue aprobada y selección de referencia; issue #2 carece status:approved. Confirmación explícita es necesaria antes de push/PR. No despliegue.

## Cadena preparada localmente

La integradora `feat/ia-correccion-tracker` nace de main y añade un registro de seguimiento, para que la futura PR integradora tenga cambios propios. Las ramas hijas se apilan sobre su predecesora; la última contiene el producto verificado y los registros. El coordinador reprodujo los commits sin modificar el producto y verificó que, respecto de `codex/correccion-ia-issue-2`, el único cambio adicional antes de este registro era el documento del tracker. La rama original se conservó.

| Posición | Rama | Base | Alcance |
|---|---|---|---|
| Tracker | `feat/ia-correccion-tracker` | `main` | Seguimiento; futura PR draft sin merge. |
| 1 | `feat/ia-correccion-01` | tracker | Contrato y encolado al entregar. |
| 2 | `feat/ia-correccion-02` | 01 | Guardia de adjuntos. |
| 3 | `feat/ia-correccion-03` | 02 | Lectores durables de archivos. |
| 4 | `feat/ia-correccion-04` | 03 | Evidencia y proveedor. |
| 5 | `feat/ia-correccion-05` | 04 | Cola SQL y cuota compartida. |
| 6 | `feat/ia-correccion-06` | 05 | Procesamiento automático. |
| 7 | `feat/ia-correccion-07` | 06 | Aplicación privada y API. |
| 8 | `feat/ia-correccion-08` | 07 | Integración y permisos del worker. |
| 9 | `feat/ia-correccion-09` | 08 | Configuración y rúbrica docente. |
| 10 | `feat/ia-correccion-10` | 09 | Interfaz de revisión. |
| 11 | `feat/ia-correccion-11` | 10 | Regresiones de ciclo de vida y revocación. |
| 12 | `feat/ia-correccion-12` | 11 | Recorridos integrados y documentación. |

Cada diff entre ramas se comprobó por debajo de 400 líneas; no hay pruebas o CI ejecutados separadamente en cada rama. El conjunto original tuvo las pruebas y límites del registro de implementación. Antes de publicar: verificar protección/CI del repositorio y la aprobación requerida de issue #2; decidir referencia de cierre o no cierre y obtener autorización explícita de push y creación de PR. Sin publicación ni despliegue en esta sesión.

Estado: preparación local completada; primera acción pendiente es resolver esos requisitos de publicación.

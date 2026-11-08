# Aulas pendientes de creación

- **Spec:** [aulas](../../docs/engineering/classrooms/README.md), [especificación](../../docs/foxmind-v1-functional-spec.md).
- **Design:** Activas · Archivadas · Pendientes (sólo docente), tarjetas con banner automático, Continuar creación, Eliminar pendiente con confirmación; vacío explícito. Reutilizar Brújula y diálogo accesible.
- **Approval:** usuario aprobó flujo y autorizó implementación el 2026-11-08 en este chat.
- **Owner:** /root, único escritor.
- **Record:** [registro](../../docs/work-log/2026-11-08-root-pending-classrooms.md).

## PEN-01 — Pendientes seguros y persistentes
- **State:** DONE
- **Depends on:** none
- **Owner:** /root
- **Acceptance:** sólo propietario docente verificado elimina un borrador sin publicar, con revisión vigente y confirmación; borradores eliminados no se listan, continúan, publican, cuentan en Inicio ni autorizan archivos/IA. Aulas creadas protegidas. Referencias internas conservadas.
- **Evidence:** API compila; PostgreSQL descartable pasa (propiedad, revisión, persistencia, revocación archivos/IA y carrera con publicación). Revisión independiente detectó limpieza bloqueada; corrección includeDeleted interna comprobada y test persistente de dos cargas PASS. [Detalle](../../docs/work-log/2026-11-08-root-pending-classrooms.md).
- **Blocker:** none

## PEN-02 — Catálogo y confirmación
- **State:** DONE
- **Depends on:** PEN-01
- **Owner:** /root
- **Acceptance:** selector con contador sólo docente; pendientes separados de aulas e invitaciones; banner automático incluso sin nombre; búsqueda/ciclo/división, tarjetas/lista, continuar y confirmar eliminación; cancelar no muta; error conserva pendiente; carga bloquea duplicados; vacío explícito; responsive/teclado.
- **Evidence:** Ego Lite espacio 3: selector docente, banner, continuar restaura nombre; cancelar no emite DELETE y devuelve foco; eliminar emite una llamada y deja contador 0; error conserva tarjeta/diálogo; estudiante sin selector. Móvil 390 px sin overflow, acciones 44/48 px.
- **Blocker:** none

## PEN-03 — Verificación y documentación
- **State:** DONE
- **Depends on:** PEN-01, PEN-02
- **Owner:** /root
- **Acceptance:** pruebas focales permisos/concurrencia/UI, tipos, lint y documentación; revisión real en navegador con datos sintéticos, límites explícitos. Fuentes canónicas actualizadas.
- **Evidence:** 36 tests PASS sin skips, tipos UI/web, build API, lint/boundaries, inventario CI y docs:check pasan. Capturas desktop/tablet/mobile y revisión independiente reconciliadas. Sin despliegue ni sesión integrada con S3; DB/transporte y navegador se verificaron separadamente. [Detalle](../../docs/work-log/2026-11-08-root-pending-classrooms.md).
- **Blocker:** none

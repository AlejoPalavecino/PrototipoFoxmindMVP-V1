# Feature: Avatares Foxy y alineación de Configuración

- **Spec:** docs/engineering/identity/README.md; criterios de este registro.
- **Design:** docs/design/README.md; propuesta aprobada en este chat el 2026-11-08.
- **Approval:** approved. El usuario aprobó expresamente diseño e implementación: cuatro variantes, ambos roles, vista previa, Guardar cambios, persistencia en cuenta, perfil/Mi cuenta y retorno a iniciales.
- **Delivery:** tareas TASK-001–004 integradas y publicadas en main mediante 842a6e892679442d2768d3314bf97f4c6f3ed517 el 2026-11-08, con autorización posterior explícita del usuario. Sin despliegue. Recibo en docs/work-log/2026-11-08-root-profile-avatars.md.

## Contrato aprobado

Mi perfil ofrece iniciales o Foxy clásico, lector, explorador y creativo en una grilla accesible. Seleccionar prepara vista previa; Guardar cambios confirma junto con los nombres. Recargar conserva la elección; ante error conserva la selección para reintentar sin anunciar guardado. Cuentas existentes conservan iniciales. Sólo se actualiza la cuenta autenticada/verificada con controles vigentes de sesión/Origin/CSRF. No se admiten subidas ni URLs externas; catálogo fijo y recurso local. Campo técnico avatarKey con valor inicial initials; migración aditiva. No cambia rol, correo ni contraseña. Mi cuenta refleja la elección en las pantallas privadas. Responsive y teclado, foco, loading/disabled, éxito/error conforme controles existentes. Sin publicación ni despliegue.

## Tasks

### TASK-001 — Botones Mostrar contenidos y operables
- **State:** DONE
- **Depends on:** none
- **Owner:** /root
- **Acceptance:** Tres botones dentro del campo, sin superposición con texto; mostrar/ocultar operable en móvil/escritorio.
- **Evidence:** Ego real: antes campo 39 px/botón 44 px/padding 11 px; después campo 48 px/botón 44 px/padding 100 px. Mostrar cambia type=text y aria-pressed=true. Capturas locales en .test-artifacts/profile-avatars-review.
- **Blocker:** none

### TASK-002 — Cuatro imágenes de Foxy consistentes
- **State:** DONE
- **Depends on:** none
- **Owner:** /root
- **Acceptance:** Cuatro imágenes generadas usando Foxy actual como referencia, transparentes y aptas para recorte circular; recursos persistidos en public.
- **Evidence:** Cuatro imágenes revisadas visualmente y guardadas en public/brujula/avatars con alpha, 512 × 512. Catálogo en src/core/domain/account-avatar.ts.
- **Blocker:** none

### TASK-003 — Selección privada persistente y avatar en navegación
- **State:** DONE
- **Depends on:** TASK-002
- **Owner:** /root
- **Acceptance:** Catálogo validado en servidor, aislamiento por cuenta, persistencia en recarga, compatibilidad de nombres y retorno a iniciales, sin URLs arbitrarias. Grilla accesible con selección única y vista previa; guardado explícito.
- **Evidence:** Account integración 6/6; identidad HTTP 21/21; componentes/contrato 18/18. Ego docente/estudiante: selección, recarga, regreso a iniciales, navegación; error/reintento docente. Ver docs/verification/profile-avatars.json.
- **Blocker:** none

### TASK-004 — Verificación y fuentes canónicas
- **State:** DONE
- **Depends on:** TASK-001, TASK-002, TASK-003
- **Owner:** /root
- **Acceptance:** Pruebas focales y compilación pasan; UI real por ambos roles, desktop/tablet/móvil; documentación y contrato reflejan comportamiento y límites.
- **Evidence:** Lint boundaries y admisión de suite completa exit 0; revisión independiente focal VERIFIED tras corregir ejemplos/inventario. API/web compiladas por local:restart. Docs:check: 64 archivos, 713 enlaces, 0 problemas. Capturas/catalog/hash actualizados; git diff --check exit 0. Local:status READY. Suite completa/CI y WCAG integral no ejecutados; ver recibo y registro de límites.
- **Blocker:** none

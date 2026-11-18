# Identidad y cuenta

La identidad tiene un rol global exclusivo: teacher o student. El registro recibe accountRole y el perfil permite cambiar nombres y elegir un avatar predefinido de Foxy. No hay cambio de rol/correo ni subida de fotos.

## Recorridos actuales

Registro → respuesta genérica → iniciar sesión → verificar correo capturado → confirmar verificación → enlace Ir a Inicio. La verificación no debe aceptarse por visitar una URL: requiere confirmación. Login verificado ordinario lleva a Inicio; las continuaciones permitidas de invitaciones conservan su validación.

Mi perfil muestra nombre y apellido editables, y correo y rol de solo lectura. La franja de identidad muestra el nombre y avatar en edición. Docentes y estudiantes pueden elegir Mis iniciales, Foxy clásico, lector, explorador o creativo. Cambiar avatar abre un selector con vista previa. Cancelar conserva el avatar anterior y Usar este avatar lo incorpora al formulario. Descartar cambios recupera los nombres y el avatar guardados. Guardar cambios confirma nombres y avatar juntos. Ante error conserva la selección para reintentar. La elección persiste en la cuenta y aparece en perfil, navegación y Mi cuenta. Cuentas existentes conservan iniciales; Mis iniciales permite restaurarlas. El panel Configuración de cuenta lleva a los controles para cambiar contraseña y cerrar sesión. El cambio de contraseña renueva la sesión actual sin extender su límite absoluto y revoca las otras. Recuperación usa correo, enlace de un uso y nueva contraseña; cierra las sesiones anteriores y exige iniciar sesión.

## Avatar predefinido

`PATCH /account` admite `avatarKey` opcional: `initials`, `foxy-classic`, `foxy-reader`, `foxy-explorer`, `foxy-creative`. Omitirlo conserva el valor. No admite null, URL, ruta libre ni upload. Perfil e identidad de sesión devuelven la elección. La migración aditiva `202611080001_account_foxy_avatar` agrega `User.avatar_key` con default `initials` y CHECK del catálogo. Mantiene autorización de cuenta propia/verificada bajo lock, sesión vigente, Origin, CSRF y límites de frecuencia. Los recursos transparentes son locales; usar el selector no llama al proveedor IA.

## Políticas que se conservan

- Contraseña: 16–128 puntos de código Unicode; nombres: 1–80 cada uno; preservar espacios y escritura admitida, sin truncar ni normalizar silenciosamente.
- Sesión: 30 minutos de inactividad y 12 horas absolutas.
- Verificación: 1 hora; recuperación: 15 minutos; enlace de un uso; mínimo 60 segundos para reenvío y políticas de abuso.
- Registro/recovery no revelan existencia de cuenta. Aceptar una solicitud de correo no acredita entrega ni inicia sesión o inscripción.
- Dominio de correo debe venir en minúsculas; no reescribir el local part. Conservar soporte de direcciones entrecomilladas/internacionales y búsqueda canónica del backend.
- Sesión, Origin y CSRF se comprueban en el servidor. Cookies y tokens no son datos de documentación/capturas; los fragmentos de enlaces de correo no se registran.

Contrato exacto: [HTTP](../../api/accounts-sessions.md) y [OpenAPI](../../api/accounts-sessions.openapi.json). Fuentes: [runtime](../../../apps/api/src/bootstrap/identity-runtime.ts), [transportes y configuración](../../../apps/api/src/modules/identity/). La evidencia actual de UI está en [flujos](../../verification/flows.md); no revalida todos los formatos de correo o límites temporales.

## Responsabilidades del frontend

`apps/web/src/features/identity` reúne cliente/errores/validación, tipos de vista/formulario y UI de acceso/perfil/configuración. `index.ts` es la entrada de UI/model; `api.ts` expone el transporte puro sin cargar componentes. `screens/identity-screen.tsx` coordina los flujos y las continuaciones existentes. Navbar global y shell pertenecen a `application`; proxy, SSR no-store/no-referrer y script estático de captura de enlace quedan en `application/server`. Las rutas y el orden de captura se conservan; los archivos frontend anteriores están retirados. El backend conserva `modules/identity` y organiza su interior por capacidades:

- `accounts`: runtime de cuenta y perfil, seguridad, store, autenticación transaccional y transporte. Registro, recuperación, perfil y sesión conservan locks y transacciones compartidos; no se fragmenta el runtime por su longitud.
- `sessions`: proyecciones y contratos públicos independientes del driver. La implementación transaccional sigue junto al store de cuentas que gobierna sus locks.
- `mail-delivery`: contrato de entrega, adapter SMTP y outbox. Aceptación SMTP no acredita entrega al destinatario.
Las capacidades exponen contratos nombrados desde `public.ts`; las reglas puras compartidas permanecen en `identity/domain`. Ninguna capacidad importa implementaciones privadas de sus hermanas.

La configuración agregada, composición, hooks Nest y temporizador de correo pertenecen a `bootstrap/identity-configuration.ts`, `identity-runtime.ts`, `identity-mail.module.ts` e `identity-mail-lifecycle.ts`. El runtime application no arranca ni cierra correo. El adapter SMTP ofrece `close()`; el host conserva `onModuleDestroy()`, `stopMail()` y `shutdownMail()`. El cierre espera la invocación activa y los envíos antes de cerrar SMTP, sin solapamiento ni reprogramación tras detenerse.
La migración conserva comportamiento, campos, mensajes, avatar, estilos y garantías de seguridad. La evidencia del corte y límites de QA sintético están en el [registro](../../work-log/2026-11-10-root-identity-frontend.md); no representan pruebas con datos reales, correo enviado o nueva validación DB.

La reorganización backend y su evidencia sintética se registran en [TASK-013](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/work-log/2026-11-16-worker-backend-identity-capabilities.md). No acredita entrega real de correo ni verificación sobre datos retenidos.

# Identidad y cuenta

La identidad tiene un rol global exclusivo: teacher o student. El registro recibe accountRole y el perfil sólo permite cambiar nombres; no hay cambio de rol, correo o avatar desde esos formularios.

## Recorridos actuales

Registro → respuesta genérica → iniciar sesión → verificar correo capturado → confirmar verificación → enlace Ir a Inicio. La verificación no debe aceptarse por visitar una URL: requiere confirmación. Login verificado ordinario lleva a Inicio; las continuaciones permitidas de invitaciones conservan su validación.

Mi perfil muestra nombre, apellido y correo de sólo lectura. Configuración permite cambiar contraseña y cerrar sesión. El cambio de contraseña renueva la sesión actual sin extender su límite absoluto y revoca las otras. Recuperación usa correo, enlace de un uso y nueva contraseña; cierra las sesiones anteriores y exige iniciar sesión.

## Políticas que se conservan

- Contraseña: 16–128 puntos de código Unicode; nombres: 1–80 cada uno; preservar espacios y escritura admitida, sin truncar ni normalizar silenciosamente.
- Sesión: 30 minutos de inactividad y 12 horas absolutas.
- Verificación: 1 hora; recuperación: 15 minutos; enlace de un uso; mínimo 60 segundos para reenvío y políticas de abuso.
- Registro/recovery no revelan existencia de cuenta. Aceptar una solicitud de correo no acredita entrega ni inicia sesión o inscripción.
- Dominio de correo debe venir en minúsculas; no reescribir el local part. Conservar soporte de direcciones entrecomilladas/internacionales y búsqueda canónica del backend.
- Sesión, Origin y CSRF se comprueban en el servidor. Cookies y tokens no son datos de documentación/capturas; los fragmentos de enlaces de correo no se registran.

Contrato exacto: [HTTP](../../api/accounts-sessions.md) y [OpenAPI](../../api/accounts-sessions.openapi.json). Fuentes: [runtime](../../../apps/api/src/identity/runtime.ts), [transportes y configuración](../../../apps/api/src/identity/). La evidencia actual de UI está en [flujos](../../verification/flows.md); no revalida todos los formatos de correo o límites temporales.

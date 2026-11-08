# Contrato vigente de cuenta y sesión

El [OpenAPI](accounts-sessions.openapi.json) define las doce operaciones, sus formas, errores, ejemplos y políticas de identidad. Se mantiene esta ruta porque las pruebas resuelven sus referencias locales. La descripción de verificación es la de la base actual, sin sumas de entregas anteriores.

El navegador usa /api/v1; Nest conserva autenticación, Origin, CSRF, rate limits, sesión y autorización. Los detalles de expiración y formatos no se sustituyen por los ejemplos de UI.

| Grupo | Operaciones |
|---|---|
| Lectura de seguridad | Sesión y CSRF |
| Autenticación | Registro, login y logout |
| Correo | Solicitar/reconfirmar verificación |
| Recuperación | Solicitar enlace y confirmar contraseña nueva |
| Cuenta | Consultar/editar perfil y cambiar contraseña |

Las solicitudes aceptadas de correo no acreditan entrega ni existencia de cuenta. Registro y recuperación responden genéricamente. El rol exclusivo se selecciona al registrar; perfil sólo modifica nombres.

[Guía de identidad](../engineering/identity/README.md), [especificación](../foxmind-v1-functional-spec.md) y [checks actuales](../verification/flows.md). Los límites temporales/formatos exhaustivos se verifican con pruebas de contrato y seguridad, no por capturas.

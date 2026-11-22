# Endurecimiento de seguridad

- /root, orquestador; la identidad de sesión no está expuesta. 22/11/2026, `main` desde 666adbf5. El árbol inicial sólo contenía la configuración local ignorada.
- Alcance autorizado por el usuario: revisar todo el proyecto, corregir las vulnerabilidades existentes y dejar FoxMind estable. Incluye dependencias y auditoría de código, con corrección de los hallazgos confirmados y su prueba. Se autorizan commits y push a `main`. No incluye despliegue, proveedores reales ni datos retenidos.
- Decisiones del usuario:
  - Cancelar un turno de IA ya despachado consume del cupo mensual el monto reservado.
  - Se incluyen los cuatro hallazgos de severidad baja.
- Tablero: [security-hardening](../../odd/tasks/security-hardening.md).

## Auditoría

Se hicieron cinco revisiones independientes de sólo lectura, una por superficie: identidad y plataforma, autorización de aulas, archivos y parsers, Foxy/Estudio/IA, y web. El coordinador verificó cada hallazgo contra el código antes de corregirlo.

| Id | Severidad | Hallazgo | Corrección |
|---|---|---|---|
| F1 | Alta | Todos los límites por IP eran un único balde, porque la API sólo veía la dirección del proxy Next. | El proxy envía la dirección del cliente firmada con `FOXMIND_PROXY_CLIENT_KEY`; la API la acepta sólo desde loopback y con prueba vigente. |
| F2 | Media | El proxy de Estudio cargaba en memoria subidas de hasta 50 MiB antes de autenticar. | Las subidas se envían en streaming con un contador de bytes. |
| F3 | Media | Cancelar un turno de Foxy (chat o visual) después del despacho no consumía cupo mensual. | La cancelación del usuario liquida el monto reservado; la recuperación por vencimiento conserva PENDING. |
| F9 | Media | Un PDF de 1 MB cuyo object stream se descomprime a 1 GiB hacía crecer el RSS de la API unos 2 GB. | Antes de `PDFDocument.load`, se descomprimen `/ObjStm` y `/XRef` con un límite de 32 MiB por stream y 64 MiB en total. |
| F4 | Baja | La API leía el cuerpo de las subidas de Estudio antes de verificar la sesión. | Autoriza antes de leer, valida `Content-Length` y aplica un tiempo máximo de lectura. |
| F5 | Baja | Se podía bloquear el inicio de sesión de una cuenta ajena conociendo su email. | Un login correcto o un reset completado liberan los baldes del identificador. |
| F6 | Baja | `account_action_controls` crecía sin límite. | Purga periódica y acotada de las filas inactivas por más de 24 h más la ventana más larga. |
| F7 | Baja | No había tope diario en dólares por usuario. | Variable opcional `AI_DAILY_ACTOR_BUDGET_USD`, que no puede superar el tope global. |
| F8 | Baja | El código de aula de 6 dígitos se podía adivinar por fuerza bruta. | Códigos nuevos de 8 caracteres sin ambigüedades, compatibilidad con los de 6 dígitos y un límite global de 300 fallos cada 10 minutos. |

Dependencias: `npm audit` informaba 10 hallazgos (4 altos). La corrección que sugería npm bajaba Prisma a 6.12, así que se fijaron las versiones parcheadas de `effect` 3.22.1, `fast-xml-parser` 5.12.0 y `minimatch` 11.0.5. Después de fijarlas, `npm audit` informa 0 hallazgos.

Superficies revisadas sin hallazgos: sesiones, CSRF, tokens, enumeración, SQL, ZIP/XML/imágenes, antivirus, aislamiento entre aulas, contexto de Foxy, XSS y SSRF.

Hallazgo sin corregir en esta entrega: la CSP de la web conserva `script-src 'unsafe-inline'` (baja). No se encontró ningún sink XSS explotable.

## Implementación y verificación

Cada unidad se implementó en un worktree propio y quedó en un commit con su prueba. El coordinador revisó cada diff antes de integrarlo.

- Corrección del coordinador sobre F9: la guarda original presupuestaba todas las imágenes Flate, lo que rechazaba PDFs escaneados legítimos. Se limitó a los streams que pdf-lib descomprime al cargar. Antes del ajuste la prueba nueva fallaba (la imagen de 100 MiB se rechazaba); después pasan 8/8.
- RED de F8: se compiló `.build` con las fuentes anteriores y la prueba falló (0/1). Con las fuentes nuevas pasan 11/11. Las pruebas de aula importan `.build`, así que revertir sólo las fuentes no basta para obtener RED.
- Las unidades F1/F2, F3/F7 y F5/F6 informaron RED por la causa esperada antes de implementar.
- El límite fijo de 30 s de `build-api.mjs` se agotó con cinco worktrees compilando en paralelo. Por eso los workers verificaron con `tsc` directo, y la suite completa se ejecutó sobre `main` integrado con la máquina libre.

Resultados sobre `main` integrado (con la máquina libre):

| Comprobación | Resultado |
|---|---|
| `npm run api:build` · `npm run web:build` | Ambos con salida 0. |
| `npm run lint:boundaries` | Salida 0, sin excepciones congeladas. |
| `npm run docs:check` | Salida 0. |
| `npm audit` | 0 vulnerabilidades. |
| `npm run test:complete -- --group fast` | 3090 pasan y 0 fallan (línea base: 3055). |
| `npm run test:complete -- --group owned-db` | 748 pasan y 3 fallan. Los 30 archivos que el runner no ejecutó después de la falla se corrieron uno por uno: 206 pasan y 0 fallan. |

La integración descubrió tres dobles de seguridad armados a mano a los que les faltaba `clientAddress` (`study-runtime`, `p5-codes`, además de `p4-host` y `p5-host`); se corrigieron en commits separados.

Fallas previas, comprobadas sobre un checkout limpio de 666adbf5:

- `foxy-resource-service` esperaba `foxy-chat-v6` y una regla de rúbrica en inglés. 666adbf5 volvió vigente `v7` y redactó la regla en español. Se actualizaron las expectativas, que siguen comprobando la misma presencia y ausencia de la regla. Esta falla cortaba el grupo owned-db antes de ejecutar más de 100 archivos.
- `grading-ai-sql`: 3 subpruebas fallan igual en 666adbf5. La prueba espera que `reserve` devuelva `false` al agotarse el presupuesto global, pero el código lanza `AI_GLOBAL_DAILY_BUDGET_EXCEEDED`. No se modificó: la divergencia entre la prueba y el código queda señalada para una decisión del producto.

## Límites

- La dirección firmada sólo se acepta cuando Next y la API comparten host, porque el par TCP debe ser loopback. Si se despliega detrás de un balanceador, la dirección que ve Next es la del balanceador. Eso requiere configurar un borde confiable, que queda fuera de esta entrega.
- El límite global de códigos de aula permite que muchas cuentas coordinadas demoren los ingresos por código de otros usuarios durante la ventana. Las invitaciones por email no se ven afectadas.
- Para usar la variable nueva hay que agregar `AI_DAILY_ACTOR_BUDGET_USD` al `.env`; sin ella se mantiene el comportamiento anterior. `FOXMIND_PROXY_CLIENT_KEY` se genera en el próximo `npm run local:up`.
- No hubo verificación en navegador del diálogo de ingreso por código ni un recorrido real Next→API con la clave configurada; las pruebas usan servidores sintéticos.

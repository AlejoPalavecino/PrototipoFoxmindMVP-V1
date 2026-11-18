# Configuración y avatares de Foxy

- Responsable: Codex, orquestador /root; identidad de sesión no expuesta.
- Inicio: 2026-11-08, rama main, commit 0271815; árbol limpio.
- Autorización: revisar/corregir botones Mostrar de Configuración y generar variantes de Foxy para selección desde perfil. Sin autorización nueva de publicación ni despliegue.
- Ruta: corrección visual R1; personalización de perfil R2, pendiente propuesta concreta y aprobación de dirección UX/datos conforme AGENTS.md.
- Inspección: AccountField comparte password-control/password-toggle con acceso. Perfil actual sólo edita nombre/apellido, AccountUser no tiene avatar. Base canónica leída: README, roadmap, especificación, arquitectura, identidad, diseño y política documental.
- Trabajo actual: generar variantes a partir de brujula/foxy-bienvenida.webp e inspeccionar interfaz real en entorno propio.
- Evidencia inicial: git status --short sin cambios; main en 0271815. Se intentaron rutas docs/architecture/README.md y docs/engineering/accounts/README.md inexistentes; lectura corregida a engineering/architecture.md e identity/README.md.
- Aprobación posterior: el usuario respondió Sí, implementar esta propuesta a cuatro variantes, ambos roles, vista previa, Guardar cambios, persistencia, Mi cuenta y retorno a iniciales. Registro único: [tarea](../../odd/tasks/profile-foxy-avatars.md).

## Resultado y evidencia

- Corrección R1 en brujula-account.css: campo de contraseña 48 px, botón 44 px centrado y padding derecho de 100 px con especificidad suficiente. Los tres botones muestran/ocultan y permanecen contenidos en ambos roles a 1440/390 px.
- Cuatro WebP 512 × 512 con alpha real en apps/web/public/brujula/avatars, derivados de image_gen integrado y optimizados con sharp sin alterar ilustración. Generación explícitamente solicitada; no se usó API key local ni generación IA de producto para esta tarea.
- Selector nativo de cinco radios, vista previa sin guardar, aviso Sin guardar, confirmación junto con nombres y bloqueo durante operación. Avatar compartido con fallback a iniciales si falta recurso. Propagado al perfil y Mi cuenta/navegación, incluido Inicio/Mis aulas.
- Campo avatar_key aditivo con default initials/CHECK y catálogo compartido cerrado; PATCH valida valor y conserva aislamiento/lock/sesión/CSRF/Origin/verificación. Migrado únicamente el entorno local propio mediante local:restart.
- RED observado: nueva prueba falló porque avatarKey era undefined. GREEN final: integración account 6/6, identidad HTTP 21/21, componentes y contrato 18/18; lint:boundaries exit 0; inventario --check exit 0 (498 entradas, 53 exclusiones, 23 rutas). local:restart compiló API y web y quedó READY.
- Ego Lite sobre app real: docente guardó lector y explorador tras recargar, avatar en Mi cuenta e Inicio, fallo de red simulado conserva selección/reintento exitoso. Estudiante cambió mediante flecha nativa, guardó clásico, restauró iniciales con recarga, guardó lector y lo vio en Inicio. Capturas docentes 1440/834/390 px y estudiante 1440/390 px, sin desborde horizontal. TaskSpace finalizado con keep vacío; app local sigue disponible.
- Revisión independiente de /root/review_profile_avatars, sólo lectura: detectó ejemplos OpenAPI incompletos e inventario sin nueva prueba. Ambos corregidos y revalidados independientemente: contratos 9/9, admisión completa exit 0, veredicto focal VERIFIED. Typecheck web independiente sin emisión pasó. No repitió HTTP ni navegador.
- [Recibo estructurado](../verification/profile-avatars.json), [perfil docente](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/design/current/teacher-profile-avatars.png), [móvil](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/design/current/teacher-profile-avatars-mobile.png), [perfil alumno](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/design/current/student-profile-avatars.png), [configuración](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/design/current/teacher-account-settings.png).

## Fallos y límites conservados

Una fixture nueva intentó cambiar rol luego de crear usuario: el trigger inmutable la rechazó; se corrigió para crear cada rol desde su INSERT. La prueba previa invocaba AccountProfile directamente y falló al incorporarse hooks; ahora usa el runner de hooks existente, sin quitar aserciones. Hubo búsquedas iniciales de rutas inexistentes y glob de PowerShell incompatible con rg; no afectaron el candidato.

Automatización Ego: primera página usó etiqueta inexistente y se corrigió a p1 del espacio 2. El primer intento de simular error reemplazando fetch no interceptó el cliente ya creado; no se contó como fallo de producto ni evidencia de error. Se verificó después bloqueando la ruta por CDP y restaurándola antes del reintento. Una espera de avatar visible en Inicio a 390 px venció porque está en navegación móvil; se confirmó luego el avatar en el DOM/Inicio de escritorio. Los recorridos continuaron desde el estado observado. Suite HTTP emitió MaxListenersExceededWarning de SIGINT/SIGTERM sin fallos.

No se ejecutaron suite completa, CI, auditoría WCAG integral, carga ni proveedor IA de la app. Los checks Mostrar no enviaron cambio de contraseña. No se accedió a recursos retenidos ni secretos históricos. Sin commits/push/PR/despliegue. La aprobación previa de publicación se limitaba al trabajo pendiente de aquella entrega y no se reutilizó para esta funcionalidad.

## Prompts de los recursos

Herramienta integrada, referencia de identidad foxy-bienvenida.webp y, para mantener consistencia, el lector generado como referencia de composición. Prompts finales: retrato frontal de cabeza/hombros de Foxy, zorro naranja alegre con hocico/orejas crema, contorno marrón oscuro, ojos grandes y estilo cartoon 2D pulido; un personaje, fondo transparente, ambas orejas visibles y margen para recorte circular; sin texto/marca de agua/escena. Variantes: clásico sin ropa, sonrisa y pata saludando; lector con anteojos redondos y libro abierto; explorador con sombrero verde oliva y tiras de mochila; creativo con boina verde azulado y pincel con pintura violeta. Archivos finales: foxy-classic.webp, foxy-reader.webp, foxy-explorer.webp y foxy-creative.webp.

## Estado

Implementado, verificado localmente, integrado y publicado en main como 842a6e892679442d2768d3314bf97f4c6f3ed517; tarea cerrada con evidencia. Docs:check comprobó 64 archivos y 713 enlaces sin problemas; git diff --check exit 0 y local:status READY. Catálogo visual actualizado con hashes exactos de las nueve capturas afectadas/nuevas. No queda trabajo de implementación pendiente en este alcance; primer paso opcional: revisión del usuario en la app local. Sin despliegue.

## Publicación Git autorizada

El 2026-11-08 el usuario pidió realizar los commits, push y dejar todo en main. Autoriza publicar este trabajo; no implica despliegue. Fetch origin --prune y rev-list comprobaron main/origin/main en 027181517b15246aecff6206e468575f3874d0d8, sin divergencia; sólo existían main y el checkout principal. Se prepara rama temporal codex/profile-foxy-avatars-publication para integrar por fast-forward y retirarla al finalizar.

Unidad de funcionalidad: avatares de perfil y corrección de configuración con migración aditiva, recursos, pruebas y documentación/evidencia. Se conserva como entrega coherente aunque las capturas/metadatos eleven el diff; no se abre PR ni se fragmenta el catálogo de evidencia. Límite de reversión: revertir esta entrega completa; una base que ya aplicó la migración conserva la columna aditiva sin uso si se revierte código, sin borrar elecciones/datos automáticamente. Unidad posterior: recibo del commit real publicado y estado reconciliado. Comprobaciones previas focales ya observadas: 45 pruebas, builds API/web y lint; en publicación se revalidan enlaces, admisión de suite, whitespace y hashes exactos del índice. Resultado de push pendiente en este punto del registro.

Resultado comprobado: commit 842a6e892679442d2768d3314bf97f4c6f3ed517 creado (56 archivos), integrado a main por fast-forward y push origin main exitoso. ls-remote --heads origin devolvió sólo main con ese mismo hash; status quedó limpio. Rama temporal de funcionalidad eliminada con branch -d tras integración. Precommit: catálogo del índice con 178 capturas/356 hashes exactos coincidentes; diff --cached --check aprobado; docs:check 64 archivos/713 enlaces/0 problemas; inventario 498 entradas/53 exclusiones/23 rutas válido. No se repiten pruebas funcionales ya aprobadas al no haber cambios de lógica desde la validación anterior. Este recibo se prepara en una segunda rama temporal, se integra/publica y se retira para dejar únicamente main; su hash se verifica externamente después del push, sin inventarlo dentro de su propio contenido.

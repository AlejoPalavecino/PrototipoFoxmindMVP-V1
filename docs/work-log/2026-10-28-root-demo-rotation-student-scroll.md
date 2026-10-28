# Rotación demo y acceso a ficha de estudiante

- Agent / role: /root, coordinador
- Session or task ID: /root
- Date: 2026-10-28
- Branch / worktree: main / foxmind-student-publication
- Starting commit: 7e58b35 (main local, dos registros operacionales aún no publicados)
- Phase and detailed task/spec links: [verificación local de IA](2026-10-28-root-student-ai-local-migration.md), [cuenta demo](../local-demo-account.md)
- Status: completed

## Request and scope
Rotar credencial demo expuesta, corregir botón de resumen tapado por barras y verificar ambos. Mantener confidenciales contraseñas y tokens, preservar datos y no publicar ni desplegar sin solicitud.

## Work performed
Estado Git y registro del incidente inspeccionados; se asignó rotación acotada, reproducción RED y diseño de corrección. Cuenta exacta pendiente de corroboración sin exponer secreto.

Explorer /root/explorer revisó Git, instrucciones, archivos de interfaz y guías demo en solo lectura; identificó el desplazamiento bajo la cabecera como hipótesis y no pudo confirmar la identidad expuesta a partir del registro anterior. No ejecutó pruebas ni cambió archivos. La identificación posterior vino del agente que presenció el incidente.

Se confirmó exposición de principal y posible auxiliar; ambas se rotaron vía flujo de cambio de contraseña del producto, con actualización del archivo DPAPI y preservación del visor. Un intento adicional de inspección del visor emitió las dos contraseñas anteriores a salida interna; se reemplazaron después de ese incidente. No se anotaron valores en archivos. El verificador de rotación comprobó ambos accesos leyendo el DPAPI definitivo; claves anteriores rechazadas y nuevas aceptadas, sesiones anteriores revocadas. [Registro](2026-10-28-demo-credential-rotation.md).

Se corrigió el scroll al entrar en Alumnos, sin repetir el centrado cuando cambia el roster. El revisor /root/review encontró inicialmente un salto al actualizar alumnos y un test incompatible con Node sin fixture; ambos se corrigieron. Su recheck con componente real y DOM simulado observó cero desplazamientos tras actualizar, uno al reentrar, y test Node con SKIP explícito sin fixture; sin hallazgos abiertos. No leyó credenciales ni cambió archivos.

## Verification
RED de /root/red: a 894×486 el encabezado cubría el botón; GREEN en ego con fixture sintética, hit-test y foco por Tab correctos. El segundo RED reprodujo salto al actualizar roster y pasó después. La fixture no prueba persistencia real. Build web, TypeScript y dos tests de progreso PASS; test Node de scroll omite explícitamente si no está la fixture ego. `gitleaks protect --staged` PASS. La aplicación local se reinició con build nuevo del commit `6a4db7201d305183602aef1ea9f9d62afde63a22`. /root/ui verificó aplicación autenticada a 894×486: después de desplazar y abrir Alumnos el botón estuvo visible y clic abrió diálogo; Tab lo alcanzó y Enter abrió diálogo. Credenciales demo usadas privadamente, sin valores en evidencia; Space 34 cerrado.

## Commits and outcomes
Código y prueba en commit local `6a4db7201d305183602aef1ea9f9d62afde63a22`; sin push ni despliegue.

## Handoff
Ambas cuentas están rotadas y el visor DPAPI existente conserva las credenciales nuevas. La aplicación local corregida está disponible en http://127.0.0.1:52171; iniciar sesión de nuevo porque las sesiones anteriores fueron revocadas. No se publicó remotamente ni se desplegó. El visor gráfico no fue abierto durante verificación; sus archivos y formato se conservaron y ambas credenciales releídas autenticaron exitosamente.

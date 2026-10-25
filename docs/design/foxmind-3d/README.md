# FoxMind 3D · diseño completo para implementar

La dirección elegida combina **Foxy naranja en 3D, superficies claras y acciones fáciles de encontrar**. Este paquete guarda los recursos reutilizables y especifica todas las funciones actuales antes de su implementación visual. El Inicio se adapta a las aulas donde cada persona aprende o enseña; no asigna un rol global a su cuenta.

**Estado:** paquete de diseño local. No reemplaza la interfaz actual, no cambia backend ni datos y no está desplegado. Base inspeccionada: `main/e7f5d6f67520516fe56fe9794ab8d1ac97633bdd`, 25 de octubre de 2026. La aprobación del concepto no equivale a implementación ni publicación.

## Empezar por aquí

1. [Abrir el catálogo gráfico](review/index.html): ilustraciones WebP, logo original y acceso al atlas.
2. [Recorrer las pantallas y estados](review/screens.html): elegir flujo, variante y estado; revisar desktop o reducir el ancho para móvil. Funciona como archivo local, con datos sintéticos. Los controles de producto son demostrativos.
3. [Leer el plan de implementación](implementation-plan.md): etapas D0–D10, archivos afectados, dependencias, contratos nuevos explícitos y criterios de salida.
4. [Consultar los 82 flujos](coverage.md): cada recorrido enlaza a contrato y vista. Incluye las 11 páginas actuales y las herramientas internas del aula.

## Entrega gráfica

| Contenido | Entrega |
|---|---|
| Ilustraciones originales | 16: dos bienvenidas, cuatro escenas de cuenta/Agenda, tres estados transparentes y siete familias de portadas |
| WebP para interfaz | 48 archivos, tres medidas por ilustración; 1.199.184 bytes en total, máximo 68.732 bytes por archivo |
| Logo original | ZorroH conservado sin pérdida; 3 WebP responsive y 6 SVG: 5 composiciones con imagen original embebida + wordmark vectorial |
| Iconografía | 42 SVG de controles y un sprite común |
| Conservación | 16 masters lossless WebP, prompts/manifiesto y 10 referencias del usuario en WebP |

[Guía de uso de recursos](ASSETS.md) · [Manifiesto de imágenes](asset-manifest.json) · [Manifiesto SVG](vector-manifest.json) · [Logo original](brand-manifest.json) · [Vista del conjunto](checks/asset-contact-sheet.webp) · [Vista de marca](checks/brand-preview.webp).

El logo usa el **ZorroH.png original indicado por el usuario**, sin redibujarlo ni recolorearlo. Se retiró el símbolo propuesto y sus variantes monocromas. Las escenas 3D siguen siendo ilustraciones del concepto aprobado. Textos, calendarios, nombres, estados y botones se implementarán como UI, no incrustados en imágenes.

## Especificaciones de todos los flujos

| Contrato | Incluye |
|---|---|
| [Acceso, cuenta y navegación](flows/account-and-navigation.md) | Crear cuenta, iniciar sesión, verificar, recuperar, perfil, contraseña/logout, shell, notificaciones e Inicio adaptable |
| [Aulas y membresías](flows/classrooms-and-membership.md) | Cards, borradores, wizard completo, extracción IA del plan, unidades, crear aula, código, invitaciones, participantes, archivo/reactivación y salida |
| [Trabajo dentro del aula](flows/classroom-workspace.md) | Plan, avance docente, mantenimiento, versiones, Biblioteca, archivos privados, Muro, respuestas/moderación y participantes |
| [Autoría manual e IA](flows/activity-authoring.md) | Actividades TP/cuestionario/evaluación, preguntas/puntajes/plazos, fuentes, trabajo IA durable, revisión, aplicación, publicación y cambios restringidos |
| [Resolver, entregar y corregir](flows/submissions-and-grading.md) | Elegibilidad, guardado, archivos, editor/dispositivo, plazos, envío, reentrega, excepciones, corrección privada, publicación, rectificación, resultados y progreso |
| [Agenda](flows/agenda.md) | Mes/día, eventos privados, plazos académicos, alta/edición/borrado, zona horaria, día completo, repetición semanal, DST y conflictos |

Cada contrato define entrada, composición desktop/móvil, controles, validaciones, permisos, estados y aceptación futura. [Fundaciones visuales](foundations.md) aporta reglas comunes de diseño, tokens y accesibilidad; no hay que repetirlas en 82 componentes.

## Decisiones de implementación importantes

- Inicio: estudiante, docente, mixto, sin aulas, al día, archivadas, invitaciones/borradores y fallo parcial. Omitir herramientas irrelevantes sin esconder un contexto existente.
- Aula: abrir Plan para ambos roles, respetando actividad/notificación dirigida. Tabs locales horizontales en móvil; selector de tema propio dentro de Plan.
- Perfil y Configuración se separan, con `/settings` como ruta propuesta. Email sigue readonly. Buscar aulas queda en Mis aulas; no se inventa búsqueda global.
- Las siete portadas tienen recursos terminados; las tres claves actuales tienen adaptador. La ampliación del catálogo persistido está incluida en D3-COV y requiere validación de contrato, no cambio silencioso de datos.
- Cumplimiento, desempeño y avance del plan son conceptos distintos. Imágenes y colores no modifican reglas académicas ni permisos.

## Evidencia y continuidad

[Comprobaciones del paquete](checks/README.md) · [Registro coordinador](../../work-log/2026-10-25-root-3d-design-handoff.md) · [Revisión independiente atribuida](../../work-log/2026-10-25-root-3d-attributed-reviews.md).

Referencias elegidas preservadas en [references/index.json](references/index.json); 01/02 son versiones anteriores, 07/08 sus refinamientos. El buscador global o un dato ilustrativo de esas imágenes no incorpora funcionalidad al contrato. Ninguna fase funcional del roadmap cambia a completada por la existencia de este paquete.

# FoxMind · auditoría final de la maqueta

Fecha: 2026-11-15. Candidato: iteración 17, verificada localmente. Base de producto inspeccionada: `ef6828b96084b0fcaf9a883e4afb95e0871cf1d6`.

## Alcance y método

Revisión de ambos roles: Inicio, Mis aulas/invitaciones/creación, todas las pestañas del aula, autoría manual/IA, resolución/entrega/recibo/devolución, revisión docente y progreso, Agenda, Foxy, carpetas/mini biblioteca/repaso, Notificaciones y Perfil. Incluye navegación compartida, paneles, búsqueda, diálogos y estados vacíos, errores y guardado.

Se usaron Chromium aislado para recorridos y mediciones repetibles, Ego Lite para interacción visible, lectura de código y revisión de capturas. Datos exclusivamente sintéticos. El código real se inspeccionó para preparar el [plan de implementación](IMPLEMENTATION-PLAN.md), sin ejecutar servicios, acceder a datos retenidos o consumir proveedores.

La matriz base recorre 34 vistas lógicas en cinco anchos: 1440, 1024, 768, 390 y 320 px. Alturas 900/844; suites específicas agregan 638/706/740 px, texto largo, listas densas y diálogos. El modo móvil es una emulación de viewport; no acredita por sí solo teclado virtual ni Safari en un teléfono físico.

## Resultado

HTML SHA-256: `81642edc107f01b3d602d11399bacfd3189e13841842e289739c3f3540764ff0`. [Manifiesto del candidato](verification-final.json).

- 31/31 suites correctas sobre el mismo candidato.
- 170 variantes de 34 vistas; sin desbordes, superposición de los grupos medidos, títulos recortados ni imágenes rotas.
- 8.744 muestras de contraste de texto sobre fondos sólidos, sin incumplimientos detectados por el método descrito.
- 46/46 controles independientes en 12 recorridos y 24/24 regresiones focalizadas.
- Revisión visual de capturas representativas de todas las familias de pantallas; interacción adicional en Ego Lite a 1440×900 y 390×844.
- Documentación: 143 archivos/854 vínculos/0 problemas; tablero estructural: 18 tareas válidas.

No quedaron defectos bloqueantes conocidos en el alcance auditado. Esto no significa que cualquier combinación posible de datos y navegador haya sido probada.

## Hallazgos corregidos y regresiones

| ID | Hallazgo reproducido | Corrección verificada |
|---|---|---|
| A01 | Un aula recién creada sin estudiantes aparecía y se abría en el rol estudiante. | Unificar filtro de pertenencia en listados, acceso rápido, búsqueda y entrada a aula; invitación/código incorpora al estudiante sintético en el aula correcta. |
| A02 | Un aviso publicado en Fotografía aparecía en el muro de Biología. Las consultas de Inicio eran una fila fija. | Posts con identidad y aula; lectura/respuesta por aula y autor; consultas derivadas de la actividad real de la maqueta. Mantener separados los avisos legados sin procedencia demostrable. |
| A03 | Atrás volvía a la última aula/actividad/carpeta seleccionada, no al recurso de la entrada histórica. | URLs con identidad de recurso y restauración al navegar/recargar, manteniendo rutas antiguas compatibles. |
| A04 | Un fallo de almacenamiento al guardar borrador o aceptar invitación dejaba cambios en memoria que otra acción guardaba después. | Operación con rollback: error visible, datos editables conservados y sin alta/borrador fantasma. |
| A05 | Aula archivada todavía ofrecía una actividad pendiente y permitía confirmar una entrega nueva. | Consulta conservada; tareas pendientes y acciones de resolver/entregar bloqueadas para el aula archivada. |
| A06 | Un toast de publicación docente seguía visible después de cambiar al rol estudiante. | Retirar feedback de otro rol sin ocultar confirmaciones legítimas dentro del mismo recorrido. |
| A07 | Un dato de revisión sin fecha causaba una excepción al construir notificaciones. | Manejar el campo opcional sin inventar fecha y mantener la pantalla operable. |
| A08 | El recibo mostraba «1 archivos». | Concordancia singular/plural de archivos, respuestas, preguntas y estudiantes. |

Los casos de cruces de pantalla tienen RED independiente sobre la iteración 16: 12 recorridos, 46 controles, 13 fallos de aserción correspondientes a los hallazgos, sin errores del runner ni de consola. El conjunto final se volvió a ejecutar: 46/46 controles correctos sobre el HTML reconstruido, con hash estable antes y después.

## Presentación, textos y accesibilidad observados

- Tipografía Nunito embebida, sin dependencias de red para abrir la maqueta. Títulos, botones, campos y cuerpo mantienen la misma familia y jerarquía.
- Paleta naranja/pastel consistente; texto oscuro legible sobre superficies. Error rojo, éxito verde e información azul/gris, acompañados de mensajes e iconos. Las seis categorías de color de Agenda se prueban en los estados densos.
- Contadores 0, 4 y 12 con caja centrada y diferencia óptica de texto dentro de 1,5 px. Cabeceras, filtros y filas de componentes no se solapan en las variantes medidas.
- Cards de aulas conservadas. Banners de Inicio, cabecera compacta del aula y tarjetas de Agenda mantienen el diseño ya aprobado.
- Chat con compositor visible, paneles temporales y navegación compacta; listas largas y textos extensos se comprueban sin ensanchar la página.
- Botones con nombre accesible, foco visible, restauración al cerrar diálogos y navegación por teclado en recorridos críticos. Se prueba movimiento reducido.
- Revisión de copy: voseo, acciones explícitas, estados privados/publicados, singular/plural y mensajes de error. No se trasladan frases de demostración, fechas fijas o éxito simulado al producto.

El análisis automático de contraste calcula texto sobre fondos sólidos compuestos de sus ancestros y excluye ocultos, decoraciones y controles deshabilitados. No certifica contraste sobre imágenes, todos los estados de todos los controles ni cumplimiento WCAG completo. Las capturas se inspeccionan visualmente para complementar esas limitaciones.

## Evidencia y reproducibilidad

Scripts bajo `review/final-audit/`; evidencias locales bajo `.test-artifacts/ui-lab/final-audit/` en la raíz del worktree. Este directorio de artefactos está ignorado por Git. El HTML y este informe son entregables persistentes del diseño.

```powershell
node design/foxmind-ui-lab/build.mjs
node design/foxmind-ui-lab/review/final-audit/run-suites.mjs
node design/foxmind-ui-lab/review/final-audit/matrix.mjs
node design/foxmind-ui-lab/review/final-audit/independent/cross-flows.mjs all candidate-81642edc
python C:/Users/alejo/.codex/harness/bin/taskboard.py check odd/tasks/foxmind-ui-lab.md
```

El runner de suites conserva logs por suite y hash del HTML. Se adaptaron las pruebas de iteraciones anteriores que buscaban el wizard viejo o no completaban la idea docente ahora requerida. Las comparaciones contra `before.html` históricos se sustituyen por la matriz del diseño vigente; los originales y sus fallos quedan disponibles. No se modificó una expectativa funcional para ocultar un defecto. La matrícula del fixture vacío se conserva al comprobar la vista estudiantil vacía.

Los controles Ego incluyeron recuperaciones de herramienta: selector ambiguo, referencia invalidada tras cambiar viewport y atajo Alt+Izquierda no ejecutado por el shell. Se retomó el estado observado y se comprobó Atrás con el historial del navegador. No se contabilizaron esos intentos como verificaciones exitosas.

La primera matriz señaló títulos `.sr-only` como texto recortado. Es contenido intencional para tecnologías de asistencia; se corrigió el detector para excluirlo. No era una superposición visual.

## Límites y paso siguiente

La maqueta sigue siendo HTML/CSS/JS autónomo con persistencia local y simulaciones. Los controles de rol sirven para recorrerla, no prueban autorización. Archivos, extracción, IA, jobs, persistencia SQL, concurrencia real, correos, contraseña y sesiones no quedan certificados por estas pruebas.

La implementación real requiere el [plan trazable](IMPLEMENTATION-PLAN.md), fixtures equivalentes, pruebas de API con usuarios distintos y comparación de capturas por recorrido. El plan identifica discrepancias que no se deben copiar de la simulación: límites de archivos, contexto completo del aula, cancelación durable, avisos de Agenda y consulta de aulas archivadas.

No se hicieron commits, integración, push, publicación ni despliegue. El paso siguiente es aprobar la ejecución del plan y resolver sus decisiones agrupadas antes de las unidades que dependen de ellas.

# Acompañamiento docente · escritura y estrategias compartidas

19 de noviembre de 2026. Rama codex/semaforo-riesgo, base 0aa8be0d. Alcance delegado: análisis de escritura solicitado desde la ficha docente, referencias al lector y gestión optativa de una estrategia para el aula vinculada en Mi Estudio. Datos sintéticos en pruebas. Trabajo coordinado con backend, transporte, calidad y pruebas de flujo final.

UI de Mi Estudio. Opciones de carpeta activa con aula vinculada abre el editor de estrategia, selección explícita del aula, revisión del texto exacto y confirmación. Un retiro requiere confirmación y el identificador vigente. Un 409 obliga a revisar el estado de la publicación que la reemplazó antes de actuar. El cierre del modal mantiene el punto de entrada existente.

UI docente. La ficha muestra únicamente el texto publicado por el estudiante. Al tomar foco o volver a estar visible, consulta la ficha y oculta la estrategia anterior mientras revalida. Análisis de escritura consulta disponibilidad sin solicitar generación, explica el consumo de cuota, vuelve a consultar un trabajo en ejecución y ofrece lectura de las fuentes del informe vigente con el lector autorizado. Si cambia la evidencia, se solicita una nueva generación explícita.

TDD. La prueba inicial `node --test tests/teacher-support-extension-ui.test.mjs` obtuvo dos fallos por componentes aún ausentes. Las primeras regresiones focalizadas incluyeron Study client, flujo de paneles y acompañamiento previo, 29/29. Un caso posterior reprodujo el bloqueo en carga inicial si el foco interrumpía el primer GET y se producía un 503. Quedó en GREEN con botón de reintento. El runner oficial `node --import ./scripts/register-api-test-build.mjs --experimental-transform-types --test tests/teacher-support-extension-ui.test.mjs tests/teacher-support-ui.test.mjs` completó 9/9. Pasaron ESLint focalizado, frontera frontend, docs:check y diff --check.

La primera compilación de producción Next terminó con código 0. La prueba de flujo y compilación posterior al ajuste de foco se coordinan con el ejecutor de E2E.

Sobre los cambios de interfaz completos, el runner oficial pasó 30/30 al sumar las regresiones de cliente, paneles y ficha. La primera aceptación de ambos recorridos pasó 6/6 en Chromium con runtime aislado y proveedor sintético. Revisé consentimiento móvil, ficha docente con texto compartido y análisis en escritorio. Corregí el estilo de acciones de ficha y cita bajo el reset de Inicio. Se regeneró Next con código 0 después del ajuste visual. La comprensión con docentes y estudiantes queda pendiente de evaluación con participantes.

En el candidato con el pulido final de botones se inspeccionó una nueva captura del análisis en Inicio. Las citas, la acción Volver a la ficha y Cerrar ficha recuperan contorno, espaciado y jerarquía de Brújula. Confirmación de estrategia y lectura docente se observaron con el diálogo y datos aislados del E2E.

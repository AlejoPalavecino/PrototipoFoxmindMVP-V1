# Segunda auditoría del interior de aulas

- Coordinador: Codex, sesión sin identificador expuesto. 2026-11-16, `codex/foxmind-product-parity`, base `ef6828b`. Build inicial `t5pFKl-x2iaUtLN4Ue4F6`, 551 entradas de trabajo preexistentes.
- Autorización vigente: reauditar y corregir las diferencias visuales, de estado e interacción del interior de aulas de ambos roles contra UI Lab. El pedido no amplía política de archivos, arquitectura ni destino de publicación.
- Referencia: HTML de FoxMind UI Lab en el worktree `foxmind-ui-lab`; seguimiento TASK-023 en el tablero de paridad. Nueva evidencia tras el cierre anterior. No leer ni copiar secretos; cuentas sintéticas y pruebas de estado controladas.

## Diferencias reproducidas y correcciones

- Cabecera y pestañas: a 521 px se comprimía el título al reservar espacio para tres accesos; a 601 px los íconos desaparecían por una regla heredada. A 1920 px el ancho de la cabecera era 1474 frente a 1200 de UI Lab. La identidad ahora agrupa portada y texto; los accesos bajan juntos cuando falta espacio y el contenido y el breadcrumb comparten eje. Estudiantes conserva la posición al entrar desde lo alto.
- Plan y Biblioteca: si una escritura era confirmada y fallaba la lectura siguiente, la UI podía invitar a repetir la escritura. El reintento ahora sólo refresca. Se alinearon la cabecera de Plan a ancho intermedio, el vacío de Biblioteca y los diálogos de tema, lector y carga con la jerarquía de UI Lab.
- Progreso: al cargar, Docente mostraba el encabezado del estudiante; se distingue el rol también al fallar. Se ajustaron paneles, medalla, tamaño de las gráficas y grilla a los tamaños de la referencia.
- Actividades: pendiente se representa con ámbar, revisión privada o entrega recibida con azul y devolución publicada con verde. En el cuestionario a 320×480 y 320×568, un error de guardado tapaba parte del último campo al llegar al final; el pie fijo calcula su alto y deja disponible el borde de la tarjeta.
- Muro, Estudiantes/Compañeros, Historial y Ajustes: alineación de encabezados y controles, espaciado de portadas y cierre de Muro con área de 44 px. Las portadas cargan y las capturas tomadas durante la animación no se trataron como un fallo persistente sin reproducción.

## Verificación del candidato

- Build de la pasada completa `Otwr6HFEqdqnXu7is1RKD`, `npm run local:status` devolvió READY. No se ejecutó generación contra el proveedor. Se cerró el servidor sintético separado del fixture.
- 62 pruebas focales de aulas, actividades, avance y navegación; 19 de cuestionario y participación, todas verdes. TypeScript web y límites arquitectónicos en verde.
- Ego Lite, componentes reales de cuestionario con datos sintéticos, con y sin error: ocho comprobaciones a 320×480, 320×568, 390×640 y 1440×900. El último campo se puede alcanzar; a 320 px el borde de la tarjeta pasó de quedar unos 21 px debajo a unos 28 px por encima del pie. Resultados en `.test-artifacts/classroom-interior-reaudit/after/questionnaire{,-error}.json`.

- Ego Lite: 38 pares de cabecera y navegación (19 anchos por rol entre 320 y 1920 px), con mismo ancho de cabecera y alto de pestañas que la referencia, sin desborde ni solapamiento detectado en el área medida. La barra de demostración de UI Lab añade 37,5 px arriba; no forma parte de la app.
- Ego Lite: 42 vistas del interior (14 combinaciones de rol y pestaña en tres tamaños) y 741 muestras de texto sobre fondos sólidos calculables, sin déficits de contraste ni controles fuera del ancho en esas muestras. Nueve comprobaciones de diálogos y controles de tema, lector, Muro, carga, código y Ajustes a 320×480. Se confirmó foco alcanzable y que portadas e iconos renderizan.
- En ambos roles se retrasó y luego bloqueó sólo la lectura de Progreso; se verificaron carga, fallo en rojo y recuperación por el botón Reintentar, con el encabezado correcto en los tres estados. La escritura seguida de fallo de lectura en Plan y Biblioteca se comprobó con pruebas focales; sólo hay un POST.
- El cotejo de escritorio detectó además una columna vacía heredada en Historial y el denominador de entregas apilado en Progreso. Se corrigieron y se revalidó en el build final `94WguZwVmhnJQ3AoCDlAf` a 320, 601 y 1440 px. Historial ocupa el mismo ancho de las pestañas, con encabezado de 17 px igual a la maqueta; los denominadores quedan alineados en la misma línea. Evidencia: `.test-artifacts/classroom-interior-reaudit/final/details.json`.
- Casos cubiertos en navegador con zoom normal y anchos emulados; no se probaron dispositivos físicos ni se ejecutó generación real en esta reauditoría. Los datos reales de las cuentas de prueba (nombres de aulas, notas, portadas elegidas y cantidades) se conservan; UI Lab usa ejemplos distintos. Sin commits, integración ni despliegue; la app sigue lista en 3000.

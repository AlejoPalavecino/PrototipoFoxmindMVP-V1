# Seguimiento pedagógico por rol

Ejecutor: /root/informes. Fecha: 2026-11-18 UTC. Rama feature/latencia-ia, base 6e9c1312, checkout compartido. Alcance autorizado por la coordinación: análisis individual docente y Mi progreso en las superficies vigentes. El análisis toma exclusivamente evidencia métrica anónima. Mi progreso reutiliza las obligaciones, reentregas y devoluciones publicadas que ya recibe el estudiante.

## Cambios

- El análisis docente usa la versión `student-report-v2` para orientar con una señal observable, una acción y una comprobación posterior. La instrucción distingue entregas, puntualidad y rendimiento publicado. Los datos anonimizados carecen de respuestas y criterios. La vista muestra las referencias ya autorizadas y describe qué información puede interpretar el docente.
- En Mi progreso, la orientación prioriza una reentrega habilitada, luego una actividad obligatoria pendiente y después una devolución publicada. En aulas archivadas sugiere revisar devoluciones disponibles. La precedencia es una decisión de implementación para dar continuidad al trabajo reciente con los datos que ya muestra la pantalla. La acción principal sigue llevando a Actividades y las devoluciones abren el intento de la nota publicada.
- Las filas con V1 conservan exactamente su instrucción. La fila de un intento fallido antes del envío conserva su perfil al reintentar. El contrato de respuesta y los permisos siguen establecidos por los servicios actuales. Un informe compartido de IA admitiría nuevos permisos y reglas de publicación. El informe IA de este corte sigue siendo de lectura docente.

## Evidencia observada

- RED: 9/12. Fallaron los dos casos de orientación del estudiante y la ausencia de instrucciones pedagógicas V2.
- GREEN dirigido: 13/13 con las pruebas de componente, contrato y nombres autorizados. Suite ampliada de esos archivos más pruebas de transporte, cliente y proxy P8: 52/52.
- PostgreSQL descartable: 8/8. Se verificó la prohibición de lectura a estudiante/tercero, el descarte por cambio de pertenencia, el mapeo de evidencia, y un reintento de V1 tras activar V2. Un cambio posterior de evidencia sí generó un informe V2. En la primera ejecución el fixture carecía de la identidad de versión de la aplicación que exige el trigger. Se corrigió en la transacción del fixture.
- ESLint sobre los tres archivos TypeScript de producción, comprobación documental y `git diff --check` pasaron.
- P8 con Chromium, API y compilación web locales: 7/7. A 375 × 812 la orientación nombró la reentrega recién habilitada junto con la nota anterior, y la acción abrió Actividades. La misma suite comprobó recarga, archivo, retiro y accesos rechazados. Datos descartables con limpieza de servicios y recursos propios sin errores.
- No hubo llamadas a un proveedor real en esta unidad. Se verificó la instrucción que se envía, la anonimización, el permiso de lectura y el perfil SQL persistido. Para medir utilidad en aula se requieren respuestas reales y evaluación docente.

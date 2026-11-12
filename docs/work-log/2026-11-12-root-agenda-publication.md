# Publicación de Agenda — 2026-11-12

- Responsable: root, orquestador; sesión no expuesta.
- Origen: codex/agenda-ux, base 1f61923407fa839df0abb97e673c0274cf12bb1b.
- Autorización vigente: usuario pidió commit, integración y push de Agenda a main local/remoto. Luego aclaró conservar las ramas activas de Aulas e Inicio y eliminar sólo Agenda.
- Alcance: interfaz Agenda, pruebas, fixture, capturas y documentación de esta funcionalidad. Excluye cambios de Foxy en checkout principal y trabajos de Aulas/Inicio. Sin despliegue.
- Evidencia previa: 59/59 pruebas antes de iteración de tarjetas; 16/16 focales tras tarjetas, tipos/lint PASS; build previo a tarjetas PASS. QA Ego Lite sintético y límites en agenda-ux.json y registro de ejecución.
- Rollback: revertir unidad Agenda (UI, pruebas y documentación acompañante); sin migraciones ni cambios backend.
- Corte: una unidad conjunta para selección/navegación/formulario y tarjetas aprobadas, con fixture y evidencia reproducible; supera 400 líneas por conservar la verificación junto al comportamiento.

## Auditoría visual posterior: pendientes conocidos

Publicación del estado revisado; el usuario solicitó publicar después de recibir estos hallazgos, no corregirlos en este paso.

1. Calendario: filas 86 px / celdas 92 px en escritorio (solapamiento 6 px); 64/68 px en móvil (4 px).
2. Mes móvil: CSS oculta previews y también contador/indicadores, por lo que no se distinguen visualmente días con eventos.
3. Formulario tablet 768 px: Crear evento se expande respecto de Cancelar.
4. Cabecera semanal a 320 px: 25 px más alta que Mes/Día; capitalización automática de cada palabra.
5. Vista Día: tarjeta anidada, bordes duplicados y espacio inferior por altura mínima.
6. Detalle: radios distintos en acciones, ícono de editar sin separación suficiente, botones comprimidos con título largo.

Auditoría: componentes reales, cliente sintético; 1440×1000, 768×1024, 390×844 y 320×740. No desborde horizontal en escenarios medidos; formulario y footer accesibles. No cobertura exhaustiva de entregas académicas ni auditoría de accesibilidad completa. Capturas/métricas de exploración en .test-artifacts/agenda-audit (ignoradas); hallazgos esenciales conservados aquí.

## Estado

Preparación de commit. Resultado Git se registra después de comprobar integración y push.

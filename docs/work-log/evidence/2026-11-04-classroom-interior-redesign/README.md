# Evidencia local del interior de aulas

Capturas del componente real ClassroomView y AppNavbar existente con fixtures sintéticos del harness `tests/helpers/classroom-interior-reference/`. No corresponden a datos productivos ni prueban un proveedor o base de datos real.

[Resultado legible por máquina](qa.json): 56 escenarios (8 secciones docente y 6 alumno, anchos 320/390/768/1440), sin overflow ni errores de página. Ocho comprobaciones: guardar estado de tema, deshacer NEXT, borrador contextual, editor conservado entre pestañas, borrador privado, contexto y revisión IA, ninguna llamada a proveedor y ninguna publicación.

[Plan escritorio](teacher-plan-1440.png) · [Plan móvil](teacher-plan-390.png) · [Editor](teacher-editor-1440.png) · [Revisión IA](teacher-ai-review-1440.png). El flujo IA se detiene antes de generar; generación real no está verificada aquí.

La matriz poblada se complementa con pruebas de permisos alumno/archivado, errores de guardado y respuestas tardías. No se declara cobertura exhaustiva de todas las combinaciones de estado ni QA backend.

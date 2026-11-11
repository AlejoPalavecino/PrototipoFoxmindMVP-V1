# Vista previa de diseño docente

- Agente: `/root/teacher_design_preview` (diseño); identificador de sesión no expuesto.
- Fecha: 2026-11-11. Rama `main`, commit inicial `3895f4d`; árbol inicial sin cambios informados por `git status --short`.
- Alcance autorizado por el coordinador: maqueta HTML local, sin conexión y con datos ficticios; no modifica producto, documentación canónica ni servicios.
- Superficies: `docs/design/classroom-teacher-preview.html` y este registro.
- Estado: en preparación. Pendiente: crear la maqueta y comprobar estructura local; la validación de interacción y responsive con navegador corresponde al coordinador.

## Cierre del candidato

- Artefacto creado: `docs/design/classroom-teacher-preview.html`. Cinco vistas seleccionables, pestañas interiores, editor compartido, ejemplo de guardado/deshacer, confirmación de código e invitaciones con resultado parcial de muestra. El máximo de 50 por tanda es una propuesta visual, no un límite global aprobado.
- Ajuste contractual comunicado por coordinación: invitaciones con vencimiento de 7 días y espera mínima de 60 segundos para reenvío; código sin vencimiento temporal, invalidado al regenerar sin retirar alumnos; resultado incierto independiente del fallido.
- Verificación local: `git status --short`, `git branch --show-current` y `git rev-parse --short HEAD` al inicio; parser HTML de Python sin errores ni IDs duplicados, cinco IDs de vistas presentes y fuente Lexend local existente. El archivo contiene 25 líneas largas por compactación de CSS/HTML; no equivale a validación visual.
- Sin conexiones ni envío real; botones y resultados ilustran presentación. No se corrió navegador ni pruebas de interacción, responsive o contraste: quedan a cargo del coordinador con Ego. No se modificó producto ni se creó commit.
- Estado: candidato listo para revisión, pendiente de QA real y aprobación de la dirección. Primer paso: abrir el HTML local y recorrer las cinco vistas a 1440 y 390 px, inclusive teclado y diálogos.

## Corrección posterior a revisión

El coordinador detectó desvíos respecto del diseño canónico. Se corrigieron filtros Ciclo/División y contadores, tema dado/deshacer en Plan, actividad dentro de página con pesos porcentuales, paso móvil compacto, diálogo nativo de creación, ejemplo de invitaciones con correos `example.test`, feedback en página y pestañas con teclado. Los controles sin comportamiento están deshabilitados cuando corresponde. Se ajustaron cuerpo, borde de campos y foco; HTML y CSS se dividieron en líneas legibles. La maqueta sigue mostrando datos y acciones locales de ejemplo, sin validar ni enviar correos.

Comprobación estática: parser HTML sin IDs duplicados y `node --check` del JavaScript sin errores. El archivo tiene aproximadamente 644 líneas por formato legible; excede la sugerencia inicial de 350 para evitar líneas comprimidas. La revisión real con navegador, el contraste efectivo y la interacción siguen pendientes. El candidato queda congelado para QA del coordinador.

## Ajuste final solicitado

Se retiró la descripción de unidad y se representaron tres temas como campos individuales etiquetados. Biblioteca Archivo ahora muestra una zona de carga y una fila ficticia en revisión con selección y reintento deshabilitados; son estados de muestra sin backend. Candidato congelado para la inspección del coordinador.

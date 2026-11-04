# Agenda — propuesta visual 2026-11-04

Estado: dirección aprobada por el usuario el 2026-11-04; implementada y comprobada en worktree aislado e integrada en main local el 2026-11-04 por autorización posterior.
Alcance solicitado: presentación de Agenda y formulario, en codex/agenda-polish desde a3afdc7.

## Composición
- Conservar crema, naranja, tipografías existentes y Foxy 3D.
- Quitar Agenda de la barra superior solo para esta pantalla, sin cambiar navegación lateral/notificaciones/perfil ni otras pantallas.
- Corrección solicitada por el usuario: escena ilustrada continua de izquierda a derecha, con elementos de planificación en todo el ancho. Sin mitad lisa ni concentración de la ilustración solo a la derecha. Revisión vigente: menos objetos y perspectiva más tranquila; Foxy a la izquierda, CTA Nuevo evento a la derecha, título/descripción en zona de lectura con contraste a validar. Foxy debe permanecer visible en todos los tamaños; sin control de zona del calendario.
- Arte vigente: banner-proposal-v4.png, aprobado por el usuario. Texto y CTA son HTML accesible. Versiones descartadas conservadas localmente en .test-artifacts/agenda-polish/rejected; el registro conserva las razones de cada iteración.
- Escritorio: calendario principal y columna lateral con día seleccionado y próximas entregas, separaciones consistentes de 16/24px; eliminar el vacío excesivo entre tarjetas.
- Foxy de próximas entregas se muestra completo, conservando proporción, sin recortar orejas/cara/cola.
- Móvil: cabecera compacta sobre la imagen completa, sin extensión crema; título y CTA dentro del arte. Hasta480px se priorizan título y acción ocultando la frase secundaria; conservar vistas mes/semana/día existentes.
- Seguimiento solicitado: Segoe UI compartida con Inicio, botón inspirado en el worktree Mis aulas (naranja, borde crema, radio22px, ícono plus) y miniilustración de próximas entregas156x104px.

## Formulario
- Quitar desplegable Más opciones y resumen automático Sin título/fecha/hora.
- Fecha final/multiday y zona del evento pasan al bloque Cuándo antes de Observaciones. Quitar control de zona de cabecera no altera la zona interna ni la serialización existente.
- Observaciones es el último campo; debajo solo Cancelar y Crear evento en alta. Edición conserva acciones actuales y avisos reales de conflicto/serie.
- Color: muestras más grandes con fondo de su tono, nombre legible y marca de selección; radios accesibles con foco visible. Conservar seis tokens y Automático; no cambiar persistencia ni categorías.

## Criterios para implementación autorizada
- Sin cambios de API, esquema, permisos, horario interno, borrador/guardado, recurrencia ni datos.
- Verificar disposición a 1440, 768 y 390/320px; Foxy completo, CTA integrado, paneles próximos y ausencia del título superior.
- Verificar teclado y selección de color; alta sin resumen ni Más opciones, Observaciones último campo; edición multiday y errores conservan acceso a controles.
- Pruebas focales de Agenda/formulario, tipos y build según herramientas disponibles; evidencia visual con fixture sintética. Sin datos reales ni servicios sensibles.
- No commits, integración, push ni despliegue sin nueva autorización.

La ubicación final del texto y CTA debe respetar la escena completa solicitada y comprobar legibilidad sin tapar los elementos principales. La propuesta anterior de reservar la mitad izquierda queda descartada.


Criterio añadido por el usuario: el botón a la derecha nunca tapa a Foxy; en móvil adaptar posición/tamaño del arte y flujo del contenido, evitando recortes que oculten al personaje.


Revisión vigente del arte: banner-proposal-v4.png. V3 queda como antecedente rechazado por anatomía de orejas; v4 usa el Foxy original como referencia y cabeza frontal con dos orejas equilibradas. Aprobación visual explícita recibida.

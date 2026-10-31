# F7UI-A: cliente de recursos y publicaciones

Estado: completado. Alcance: cliente web Foxy tipado, sin cambios de pruebas ni proveedores.

Se agregaron operaciones de recurso, preparación, listado, inspección y confirmación, además de URL local de archivo. Se reutilizan transporte privado, CSRF fresco por escritura y cancelación existentes; las revisiones permanecen como cadenas.

Verificación: pruebas focales cliente/controlador 22 PASS; TypeScript web y lint de fronteras PASS. No se usaron proveedores ni datos retenidos. Siguiente paso: integrar el cliente en la interfaz y revisar el flujo completo.

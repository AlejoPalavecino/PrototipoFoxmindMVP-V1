# R1: aislamiento de estado del editor

Estado: completado. getState y onChange reciben copias independientes; respuestas se copian y el cliente recibe copia del intento privado. Retry conserva UUID, revisión y cuerpo.

Controlador y cliente: 17 PASS, incluidos tres casos adversos; TypeScript web y fronteras PASS. Sin cambios de tests, proveedores o datos retenidos. Handoff: revisión independiente.

# M0: decisión de gestión de publicaciones

Estado: completado inicial. Función pura calcula disponibilidad de retry/descarte, motivo con precedencia y estado de limpieza; no ejecuta I/O.

Pruebas: 5 PASS; API build y fronteras PASS. Consultada decisión sobre códigos inesperados; no se usaron bases ni proveedores. Handoff: revisión independiente.

Decisión arquitectónica aplicada: solo FILE_NOT_READY habilita retry; códigos nulos o desconocidos se rechazan. Suite 6 PASS, API build y fronteras PASS.

Contrato de custodia aplicado: reserva no liberada, fases y estados exactos; READY comprobado no depende de versión de renderer. 9 PASS, API build y fronteras PASS.

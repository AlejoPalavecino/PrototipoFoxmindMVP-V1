# M4D1: reserva síncrona

Estado: completado. La intención y busy/pending se reservan antes de reentrada; el latch impide doble UUID/POST y se valida identidad después del observer antes de I/O.

Controlador y cliente: 30 PASS; TypeScript web y fronteras PASS. Sin cambios de pruebas ni datos retenidos. Handoff: revisión independiente.

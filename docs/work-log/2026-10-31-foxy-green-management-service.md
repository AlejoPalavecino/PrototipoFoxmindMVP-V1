# M4A: servicio de gestión

Estado: implementación inicial completada; pendiente revisión. Inspect usa una consulta autorizada y coherente con hechos crudos M0; servicio proyecta siete campos y ejecuta comandos vía UoW real, sin I/O externo.

Servicio y repo sintético: 4 PASS; API build y fronteras PASS. Primer intento detectó error de validación sincrónica, corregido a promesas. Review independiente detectó P2010 existente en locks M1/M3, fuera de este corte y pendiente corrección.

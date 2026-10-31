# R2A: pérdida de acceso

Estado: completado. Ante pérdida de identidad se limpia y aborta R2 y se bloquea rebind de una sesión anterior; ante FORBIDDEN/NOT_FOUND se limpia el destino y se permite elegir otro, sin borrar el editor R1.

Preparación y editor: 46 PASS; TypeScript web y fronteras PASS. Primera ejecución de latch: dos fallos porque el camino prepare no llamaba revoke; corregido y verificado. Sin cambios de tests ni datos retenidos. Handoff: revisión independiente.

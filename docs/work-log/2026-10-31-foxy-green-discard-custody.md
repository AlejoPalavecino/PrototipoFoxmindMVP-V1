# M1: custodia descartada terminal

Estado: completado inicial. Trigger cerca nonce y plazo vigente, exige prueba de blob eliminado para ACK y evita regresar desde deleted; claim vencido exige nuevo nonce y al menos 90 segundos desde trigger.

Descarte y Biblioteca: 20 PASS en PostgreSQL sintético; Prisma diff sin diferencias, API build y fronteras PASS. Expiración real de 90 segundos y revisión independiente en curso por otros agentes.

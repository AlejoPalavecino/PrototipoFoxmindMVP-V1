# M1: descarte durable

Estado: implementación inicial completada, sujeta a revisión. Migración 012 añade DISCARDED, recibos y guardas; repositorio autentica/ordena locks, valida referencias y CAS, cerca custodia y retiene cuota y bytes. Dominio expone comandos y gestión. No se realiza I/O de storage.

PostgreSQL aislado Docker tmpfs: descarte y Library 15 PASS; incluye carrera worker y token de custodia. Prisma diff sintético: sin diferencias; API build, TypeScript web y fronteras PASS. Falta prueba de FileService realmente en vuelo y revisión independiente.

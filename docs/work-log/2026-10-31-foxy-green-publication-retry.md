# M2: reintento de publicación

Estado: implementación inicial completada; pendiente revisión. Retry usa autorización/locks compartidos, política M0, CAS y recibo idempotente; conserva descriptor, archivo y cuota. La versión del renderer se comparte entre productor y verificador. Sin I/O de storage.

Retry PostgreSQL sintético: 6 PASS; PDF: 16 PASS; API build y fronteras PASS. Se solicitaron pruebas adicionales de custodia y replay; no hay datos retenidos.

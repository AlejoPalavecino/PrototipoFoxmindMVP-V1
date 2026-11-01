# M3: limpieza durable Foxy

Estado: implementación inicial completada, pendiente revisión y wiring de runtime. Reclama custodia con locks y nonce, valida descriptor/referencias, elimina fuera de SQL y confirma con concesión vigente; conserva cuota ante fallo y sanitiza errores.

Cinco pruebas focales PASS; tres de vencimiento natural PASS en PostgreSQL sintético aislado, ejecutadas por test_runner tras el último cambio. API build y fronteras PASS. Sin datos retenidos ni servicios externos.

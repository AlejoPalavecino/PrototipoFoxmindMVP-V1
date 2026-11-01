# Codificación de controladores

Estado: completado. Tres controladores convertidos de cp1252 a UTF-8 sin cambiar lógica.

Lectura UTF-8 de los tres y TypeScript web: PASS. Build/QA visual delegado al coordinador; no se ejecutaron pruebas funcionales para esta conversión de codificación.

Corrección: el material original mezclaba codificaciones; se repararon seis literales con secuencias dañadas, sin cambiar lógica. Verificación de UTF-8 y búsqueda de mojibake: PASS.

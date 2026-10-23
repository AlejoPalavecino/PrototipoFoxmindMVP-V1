# Inicio carpetas v3 — Escritorio y móvil

Refinamiento solicitado por el usuario tras aprobar las recomendaciones de la crítica. Solo imágenes conceptuales; aplicación sin cambios.

- [Escritorio](inicio-carpetas-v3-escritorio.png).
- [Móvil, página completa desplazable](inicio-carpetas-v3-movil.png).
- [Base v2 preservada](inicio-carpetas-v2.png).
- [Prompts y corrección focal](PROMPTS-v3.md).
- [Dimensiones efectivas y hashes](manifest-v3.json).

## Cambios visibles
- Saludo reducido, mascota más pequeña y eliminación de trazos decorativos en escritorio.
- Panel «Lo próximo», estado «Por entregar», actividad, aula y vencimiento explícito.
- Botón principal naranja; secundarios blancos, menos cargados.
- Carpetas Estudio menta, Enseño coral y Novedades amarilla. Conservados ambos roles, mismos contenidos y navegación superior.
- Móvil con cabecera en dos filas, una columna, botones debajo de los datos y actividad como primera acción.
- Crear aula y Unirse con código siguen fuera de Inicio, destinados a Mis Aulas.

## Reglas para futuros estados (no pantallas generadas)
- El resumen debe usar pendientes reales según las aulas de la persona, no un rol global. El ejemplo muestra un pendiente de estudiante y aulas en ambos roles.
- Sin pendientes: mensaje tranquilo, sin estadísticas inventadas. Sin aulas: orientación a Mis Aulas, sin duplicar crear/unirse en Inicio.
- Carga: conservar geometría y comunicar carga; error: aviso localizado con reintento. Estos estados requieren diseño detallado y verificación al implementar.

## Inspección y límites
Inspección visual de ambas imágenes: texto y secciones principales presentes; no crear/unirse, sidebar, rankings ni funciones de IA. Un primer resultado de escritorio se corrigió por cabecera excesivamente grande. El resultado final reduce el saludo y la mascota, pero la posición de las aulas sigue cercana a v2: no se afirma reducción exacta del 25% del bloque. Los rellenos aún tienen suaves variaciones tonales; no se afirma aplicación literal de tokens planos. ImageGen aproxima bordes, medidas y marca, no produce componentes ni reutilización pixel-perfect del zorro. En implementación se usarían originales de marca.

El móvil representa una página con scroll, no todo el contenido dentro de un único viewport. Los tamaños nominales del prompt no son dimensiones CSS verificadas; consultar manifest para píxeles efectivos. Datos de ejemplo. No hay pruebas funcionales, contraste, foco, lector de pantalla ni responsive real. La aprobación de mejoras para mockups no autoriza implementación.

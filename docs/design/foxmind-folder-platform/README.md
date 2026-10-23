# FoxMind — Handoff de implementación UX/UI «Carpetas»
Fecha: 2026-10-22. **Plan listo; implementación no iniciada.**

Extender la dirección de Inicio v3 a **toda la plataforma V1**, con experiencia coherente para docente, estudiante y una misma persona en ambos roles. Corregir el acceso: **Inicio es el destino general; Mi perfil es una sección voluntaria**, no una bienvenida ni un requisito de onboarding.

## Lectura y ejecución
1. Leer [plan](IMPLEMENTATION-PLAN.md), especialmente F0 y la tabla de acceso.
2. Reconciliar la base completa y el servidor real según [evidencia](BASELINE.md). **No implementar sobre el checkout P3 de este chat.**
3. Recorrer la [matriz de cobertura](COVERAGE-MATRIX.md): ninguna superficie/rol se cierra por un simple cambio de CSS.
4. Ejecutar por fases con las pruebas y evidencias de [verificación](VERIFICATION.md).
5. Usar el [prompt de handoff](HANDOFF.md) en el chat del agente implementador.

## Referencias elegidas
- [Inicio escritorio v3](references/inicio-carpetas-v3-escritorio.png).
- [Inicio móvil v3](references/inicio-carpetas-v3-movil.png), imagen de página completa, no de un solo viewport.
- [Zorro original](references/zorro-original.png) y [emblema original](references/zorro-emblema-original.png).
- [Procedencia y hashes](manifest.json).

Los PNG son anclas de estilo y jerarquía, no contratos funcionales ni especificaciones CSS exactas. La familia visual es **carpetas y contornos suaves, fondo blanco, menta/coral/amarillo y naranja de acción**, no glass/lavanda. Las exploraciones antiguas se preservan como historia; no se mezclan como objetivos visuales de este encargo.

## Alcance y estado
- [Recuperación en Engram: #550–#553](ENGRAM.md); plan y anexos guardados íntegros y relectura comprobada.
- Usuario solicita **plan y persistencia en Engram para otro agente**. Esta tarea modifica únicamente documentación y copia referencias.
- El futuro encargo de ejecución debe confirmar su autorización; este paquete no autoriza publicaciones, despliegues, cambios de políticas de seguridad ni operaciones sobre datos retenidos.
- F0–F9 están **pendientes**. No se ejecutaron pruebas del producto en esta planificación.
- Componentes, datos y reglas existentes se conservan; no se reconstruye V1 ni se reemplazan APIs por mocks.
- El plan se guarda en este checkout por ser el workspace del chat. El agente de main deberá copiar **solo este paquete documental y referencias**, verificando hashes, o abrirlo por su ruta absoluta. No fusionar la rama P3 para transportarlo.

# Mis aulas: evidencia visual local

Fixture sin backend, con componentes reales `ClassroomCollectionHero`, `AppNavbar` y `ClassroomCollection`, y un aula sintética. No acredita autenticación ni navegación de producción.

Desde la raíz del worktree:

```powershell
node docs/work-log/evidence/2026-11-04-mis-aulas-header/preview.mjs
```

En otra terminal:

```powershell
node docs/work-log/evidence/2026-11-04-mis-aulas-header/browser-check.mjs
```

El servidor escucha solo en `127.0.0.1:4317`, con puerto estricto y sin leer configuración privada. Cerrarlo al terminar. Las capturas `teacher-*.png` cubren seis anchos; `teacher-keyboard.png` muestra el foco y `student-390.png` la acción de unirse del encabezado. `metrics.json` conserva medidas y comprobaciones. `banner-preview.png` muestra el retoque de escritorio.

La colección sintética de apoyo es docente en todas las capturas; la variante `student` cambia únicamente el rol del encabezado que se está comprobando. Los filtros y las tarjetas no se modifican por esta entrega.

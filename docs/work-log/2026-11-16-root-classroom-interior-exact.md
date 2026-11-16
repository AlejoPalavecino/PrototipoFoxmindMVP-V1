# Interior de aulas: paridad con FoxMind UI Lab

- Coordinador: Codex, sesión sin identificador expuesto. 2026-11-16, worktree `foxmind-product-parity`, rama `codex/foxmind-product-parity`, base `ef6828b`.
- Alcance: auditar e implementar en ambos roles el interior de aulas siguiendo la maqueta indicada. Se pueden ampliar proyecciones o flujos del backend necesarios para paridad, manteniendo permisos y datos existentes. Los elementos ajenos a la maqueta se retiran de la interfaz. Sin autorización de publicación ni migraciones sobre datos retenidos.
- Referencia de ejecución: `C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/design/foxmind-ui-lab/01-foxmind.html` y sus fuentes. Continuidad en TASK-018 a TASK-022 del tablero de paridad.
- Estado inicial: 521 entradas de Git en el candidato de trabajo compartido; app y API listas. Se preservan contribuciones preexistentes. La evidencia histórica no acredita esta auditoría.

## Resultado

- Cabecera compacta, accesos según rol, grilla de navegación y carga anunciada. Se retiró el selector redundante.
- Plan: mapa, selección, avance y vínculos reales; lector y carga se abren encima del tema. Biblioteca: búsqueda, filtro, lector y carga en dos pasos con publicación separada.
- Muro: avisos, consultas y respuestas mediante diálogos. Estudiantes, Compañeros e Historial con filas según rol; «Vos» usa identidad autenticada y no revela IDs ajenos. Ajustes: campos, portadas y pie de guardado visible.
- Actividades: listas por rol, borradores, consigna, entrega y revisión. Entregas y Progreso distinguen pendiente, revisión privada y devolución publicada. Primera reentrega disponible; cada nota efectiva abre la devolución de su propio intento.
- Se retiraron campos o controles ajenos a la referencia del interior. Los registros y las operaciones históricas del backend se conservan.

## Verificación y límites

- Build `t5pFKl-x2iaUtLN4Ue4F6` listo en `127.0.0.1:3000` y API en 3001. API/web compiladas; esta unidad no agrega migraciones.
- Ego Lite: 56 pares app/maqueta (14 combinaciones rol/pestaña × 320, 390, 768 y 1440 px), sin desbordes, cruces de cabecera/navegación ni imágenes rotas en la medición. Las 24 comprobaciones de interacción pasaron: carga con latencia, contraste muestreado, movimiento reducido, PDF sin publicar, lectores, modales, primera reentrega hasta la confirmación, devolución efectiva y Ajustes durante scroll. Evidencia en `.test-artifacts/classroom-interior-exact/final/` (geometría, interacciones y capturas).
- Suite focal del coordinador: 68 casos más dos de carga/navegación; 15 recontroles verdes tras la carga sobre Plan. No sumar las suites solapadas. PostgreSQL descartable: progreso 11/11, membresías 15/15 y entregas 2/2, informados por sus autores.
- Revisión independiente: detectó y revalidó dos problemas (primera reentrega y destino de nota publicada), repitió 20 pruebas focales y no encontró fuga de datos ni bloqueantes en las proyecciones revisadas.
- La corrida amplia anterior conservó tres fallos preexistentes de expectativas de Inicio/navbar en `folder-platform.test.mjs`; sólo se actualizaron las pruebas del aula. Se corrigieron localizadores fuera del viewport en el guion de Ego y se revalidaron con teclado. No es una certificación completa de accesibilidad.
- Biblioteca mantiene la política real de archivos. XLS legado, OpenDocument, TXT/CSV y WebP de la maqueta aún no están habilitados. No se inició generación de IA paga ni se publicó el PDF de prueba; tampoco se cambiaron notas o membresías desde los recorridos de navegador. Sin commits, main, push ni despliegue.

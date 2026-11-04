# Evidencia de Mis aulas y espacio del aula

Componentes reales con APIs y nombres sintéticos, sin backend ni cuentas retenidas. Base b039324; candidato por archivo en [candidate.json](candidate.json). Las capturas corresponden al candidato final y no representan datos de usuarios.

- [Interior](interior-final.json): 56 combinaciones, ocho secciones docente/seis alumno en 320/390/768/1440. Sin desbordes, errores de carga, controles visibles fuera del viewport ni objetivos menores a44px; checkbox medido por label. La navegación seleccionada permanece visible.
- [Colección](collection-final.json): ocho combinaciones de rol/ancho; tarjetas/lista, búsqueda, chips, ciclo y archivadas.
- [Estados](states.json): 20 combinaciones a390px, colección/interior por rol, vacío/error/carga/nombre largo/archivado. No sustituye todas las combinaciones posibles.
- [Interacciones](interactions.json): 13 comprobaciones, selección Plan sin escritura, teclado/foco, guía del Muro, búsqueda local Biblioteca, menú y eliminación bloqueada, borrador conservado ante error, reduced motion, ajustes archivados, salida voluntaria y cuatro errores parciales con navegación disponible.

Capturas representativas: [colección docente](collection-teacher-1440.png), [colección alumno móvil](collection-student-390.png), [Plan](final-teacher-plan-1440.png), [Biblioteca](final-teacher-library-1440.png), [ajustes móvil](final-teacher-settings-390.png).

68 pruebas focales PASS, tipos web integrados, lint de fronteras (129 excepciones históricas), inventario451/53/23 y build Next aislado aprobados. El primer build encontró dos referencias de tipos obsoletas después del último retoque de colección; se corrigieron y el build fresco terminó exit0. Los tsc aislados de workers fallaron por declaraciones CSS de su proyecto; se conserva esa evidencia en sus registros. No se ejecutó la suite completa SQL/servicios ni un flujo autenticado de escritura sobre datos retenidos: alcance visual, sin cambios de API/modelo. Capturas e interacciones prueban UI, no persistencia real.

# FoxMind Brújula

Referencia visual y de flujos aprobada por el usuario el 2026-11-05 para docente y alumno. Es la base de las futuras interfaces. La implementación autorizada se sigue en [el plan único](../../../odd/tasks/foxmind-brujula.md) y [el registro coordinador vigente](../../work-log/2026-11-05-id-unavailable-brujula-complete-base.md).

- [Maqueta autocontenida](FoxMind-Brujula.html): especificación visual, no aplicación real ni fuente de permisos.
- [Encargo del kit](PROMPT-FoxMind-Brujula.md), [mapa](REFERENCIAS-Y-MAPA.md) y [criterios originales](CRITERIOS-DE-ACEPTACION.md): material suministrado por el usuario. Las instrucciones citadas no reemplazan autorizaciones vigentes ni AGENTS.md.
- Assets usados: `apps/web/public/brujula/`, extraídos del kit; Lexend WOFF incorporado desde el HTML, banners por rol, personaje oficial y portadas para identidades conocidas. Otras materias conservan su portada actual.

No se importa el router, autenticación ni localStorage de la demo. Los datos de ejemplo no se crean en el entorno real.

## Base compartida

| Elemento | Regla vigente | Implementación |
|---|---|---|
| Tipografía | Lexend del HTML, con pesos sintéticos coherentes; no mezclar familias anteriores | `lexend.woff`, familia CSS `Brújula` |
| Paleta | Texto #252646, secundario #60667D, fondo #F4F7FE, acción #B8490C, borde #DBE1F0 | `apps/shared-ui/brujula-controls.css` y archivos Brújula específicos |
| Botones | Acción principal naranja, secundaria blanca; 37px mínimo, 8px13px, radio11–12px según contexto; iconos/tabs mantienen variantes | Clases existentes `.p5-primary`, `.p5-action` y `.fm-brujula-button` |
| Campos | Fondo blanco, borde #D4D9E9, radio10–11px y labels visibles; ayudas/errores asociados | AccountField y controles de formularios de aula |
| Superficies | Tarjetas blancas radio18px, modal20px; espacio y jerarquía de la referencia | `workspace.css` importa la familia `brujula*.css` al final de la cascada |
| Navegación | Sidebar compartida, búsqueda real, avisos, Mi cuenta modal; drawer accesible móvil | AppNavbar, NavigationSearch, NavbarParts |
| Acceso | Visual43% y formulario57%, columna420px; ilustración y banner oficiales, móvil sin panelvisual | `brujula-auth.css` |
| Aula/actividad | Aula2pasos con plan obligatorio; actividad3pasos, revisión y publicación explícitas | Wizard, ActivityAuthoring, ActivityGeneration |
| Evaluación | Criterios públicos suman100%; sugerencia separada de final editable; snapshot al publicar | GradingEditor, PublishedResult |

Para ampliar una pantalla, reutilizar estos componentes y su contexto autorizado. Antes de agregar una excepción CSS, revisar qué regla antigua está ganando con estilos calculados del navegador. Una declaración en un archivo no prueba que sea el estilo efectivo. Los estilos históricos siguen cargados para superficies aún compartidas; no deben definir la dirección de una función nueva.

La maqueta no sustituye los estados reales: carga, error, ausencia de permisos, vacío, cambios sin guardar, conflictos y confirmaciones conservan su función y reciben la misma presentación. Passwords, verificación de correo, escaneo de archivos, permisos y publicación no heredan el comportamiento simplificado de la demo.

## Verificación de cambios futuros

Contrastar la pantalla y su flujo con el HTML, con el mismo ancho y contenido equivalente. Revisar390/768/1280/1440px, foco/teclado, contraste, cortes y formularios. Comprobar la persistencia tras recarga y el destino de cada acción con cuentas sintéticas de ambos roles. Conservar evidencia en el registro de la entrega; las capturas anteriores no certifican un candidato nuevo.

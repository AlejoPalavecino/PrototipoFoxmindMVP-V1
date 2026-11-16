# Repaso final de Inicio, ambos roles

- Coordinador: root, sin identidad runtime registrada. Fecha: 2026-11-16.
- Worktree: foxmind-product-parity; rama codex/foxmind-product-parity, base ef6828b96084b0fcaf9a883e4afb95e0871cf1d6. Sin commits ni integración.
- Pedido: comparar por última vez Inicio de docente/estudiante contra la maqueta. Revisión visual de 1920/1440/390, arriba y abajo, y variantes de consultas.
- Candidato inicial: RXJGPgRyO0PeKZcHbgOZx, local READY.
- Comprobado: mismos bloques y ancho 1200/1120.8/343.2 según viewport, estilos de color/tamaño/padding/radios coincidentes en elementos compartidos. La diferencia de fallback tipográfico no altera Nunito, que carga en ambos. Día activo, portadas, cantidades y textos corresponden a datos reales; la barra de demo sólo existe en el HTML.
- Hallazgo reproducido: al bajar en móvil el navbar del producto sale de pantalla (position relative, y=-668), mientras la maqueta lo mantiene sticky. Corrección R1 autorizada dentro de la paridad vigente, limitada a .entry-home para ambos roles; Astra implementa y root valida scroll/drawer/foco.
- Muestra docente de contraste: 21 textos opacos del producto y 35 de referencia, mínimo 5.35:1, sin muestras bajo 4.5:1. No acredita auditoría WCAG completa ni todos los estados.
- Estado: DONE, verificado localmente. Astra añadió una regla sticky top 0 bajo media <=1000 px y scope .p5-app.entry-home; no se modificaron otras pantallas.
- Build final eU402ssoRgFJBGYgK9vxr READY mediante local:restart, sin cambiar configuración/proveedor ni generar con IA. Agente informó 9/9 pruebas existentes home-warm-navigation PASS; diff-check PASS del coordinador.
- Recontrol final: ambos roles en 1920/1440/390, sin overflow, controles fuera ni imágenes rotas. Navbar sticky visible desde el final a 390/768 en ambos roles, top 0 y alturas 60/64, menú abierto/cerrado con Escape sin perder posición de scroll y con retorno del foco. Contador de notificaciones cargado confirmado.
- Muestra estudiante adicional: 17 textos opacos, mínimo 5.35:1; sumada a docente son 38 muestras del producto, no una evaluación WCAG completa. No se identificaron otras diferencias visuales que exigieran cambios en los estados observados.
- [Informe y capturas](../verification/product-parity/home-final/README.md). Producto y maqueta abiertos para el usuario; siguiente pantalla fuera de este corte.

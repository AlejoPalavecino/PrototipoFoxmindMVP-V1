# Integración local de refactors backend y frontend

- Coordinador: root; identidad de sesión no expuesta, no se inventa.
- Autorización: el usuario pidió integrar backend y luego frontend después de aprobar el orden propuesto. Incluye commits necesarios y merge local en main tras verificación; no push, PR, despliegue ni datos retenidos.
- Base compartida: dd6f4bc92b959cce0e2c68343291614270c4a17e.
- Rama de integración: codex/refactor-integration; worktree C:/Users/alejo/.codex/worktrees/refactor-integration/ProtipoFoxMind.
- Fuentes: candidatos de codex/backend-capabilities y codex/frontend-cohesion, sus tableros y evidencia. Se preservan archivos, índices y HEAD de los worktrees originales.

## Resultado y aceptación

Combinar primero el backend verificado y luego el frontend verificado, conservando comportamiento, pruebas y documentación de ambos. Capturar cada árbol mediante índice Git alternativo y commits propios de snapshot; los originales tienen cambios sin commits y no se modifican. La unidad de entrega es cada migración ya verificada: su tamaño excede 400 líneas porque separar sus movimientos/imports/consumidores rompería el candidato reproducible. Las correcciones nuevas de integración se registran y verifican aparte.

1. Snapshots estables con mismo padre base, sin secretos ni artefactos ignorados; procedencia y hashes explícitos.
2. Conflictos resueltos por responsabilidad: backend conserva nuevas capacidades/loaders/contratos, frontend conserva organización, CSS, operaciones tipadas y regresiones. Inventarios se reconcilian por unión y movimientos, nunca descartando tests para pasar.
3. Entrada src/core/domain/index.ts conservada por decisión humana. No se retira durante esta integración, aunque frontend haya migrado sus imports.
4. Build API y web, lint/fronteras, inventarios, docs y TTP, suite rápida combinada, regresiones y recorridos críticos con recursos sintéticos. Fallos no se ocultan; evidencia anterior no se atribuye al combinado.
5. Revisión independiente proporcional sobre conflictos y contratos; main sólo recibe el candidato verificado. Cambios locales previos de main se conservan y se cotejan, sin incluir trabajo ajeno en los commits del refactor.

## Estado inicial

Ambos candidatos están cerrados localmente en sus tableros, sin commits, desde la misma base. Hay 27 rutas modificadas por ambos: CI, scripts de suites, pruebas y documentación; no hay archivos productivos UI/API compartidos en ese cruce. Main conserva eliminaciones de diseño y cambios/documentos ajenos. No se opera sobre ellos durante preparación.

## Evidencia y cierre

Pendiente de ejecutar. El [tablero](../../odd/tasks/refactor-integration.md) registra estados reales. Proveedores reales, entorno retenido, producción y publicación remota fuera del alcance.

### Snapshots y conciliación

Índices alternativos capturaron backend d79ee909e094b5c7dbbbcccf1eb2bf972908e0c1 (tree1a985002721e9f5420264b5f12a378ee320673d4) y frontend eba381b3f28662daaca366687d34b12cfb30d955 (tree58a2540514a7ce38012141c0af1c1a213823a00e). Ambos tienen padre dd6f4bc. Se cotejó status -z completo antes/después, sin modificar índices/HEAD/archivos originales. Las refs codex/integration-backend-snapshot y codex/integration-frontend-snapshot permiten recuperar cada candidato.

Backend se aplicó primero por fast-forward. Merge frontend dejó14conflictos:1CI,3scripts,8docs y2tests; ningún conflicto en código productivo. CI conserva pathsbackend nuevos y componentefrontend nuevo. Inventarios unen ambas ramas y remapean134tests backend/262movimientos frontend;685entradas,57exclusiones y23rutas PASS. El primer chequeo encontró referencias antiguas porque el mapa productivo no incluía testMoves; se corrigió usando el ledger explícito de134movimientos, sin retirar cobertura.

Los conflictos documentales eran enlaces a nuevos dueños; se preservaron textos y rutas de ambos lados. Tres enlaces backend seguían apuntando a directorios vacíos que existían en su worktree pero no en Git: el checkout limpio los detectó y ahora enlazan la capacidad real. Docs205archivos/1118enlaces/0issues. Dependencias locales: npm ci --ignore-scripts --prefer-offline --no-audit --no-fund,499paquetes; no se cargó .env ni se tocó la instalación ajena. API build fresco genera Prisma propio y compila EXIT0. Webbuild/lint y reconciliación tests en curso.

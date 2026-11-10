# Verificar con evidencia proporcional

Elegir pruebas por contrato/permiso/datos/capas afectados. No atribuir una suite completa a un conjunto focal ni transformar fixture/proveedor sintético en aceptación externa.

| Nivel | Entrada |
|---|---|
| Carpetas de estudio | npm run test:study (build fresco, motor/cliente/proxy, permisos HTTP, PostgreSQL aislado, uploads/Agenda/avisos y presupuesto IA sintético) |
| Documentación | npm run docs:check |
| Parser/compatibilidad documental | node --test tests/documentation-links.test.mjs |
| Contrato de identidad | node --test tests/p31-contracts.test.mjs |
| Guard de CI de corrección IA | node --test tests/issue2-ci-workflow.test.mjs |
| Límites de módulos | npm run lint:boundaries |
| API fresca | node scripts/build-api.mjs |
| Web | npm run web:build; typecheck del proyecto apps/web |
| Selección de suites | scripts/ci-suites.mjs y scripts/complete-suite-inventory.json |
| Suite completa | npm run test:complete; leer admisión, grupos y recursos antes de ejecutarla |

Los runners pueden crear PostgreSQL/S3/escáner/correo propios; otros requieren activación explícita de entorno/proveedor. Revisar el inventario y los guards antes de ejecutar. No descubrir secretos ni usar una base persistente como fixture.

El helper de fuentes `tests/helpers/load-ts-module.mjs` pasa el nombre real del archivo a TypeScript para distinguir genéricos `.ts` de JSX `.tsx`. Las pruebas de inventario mantienen una lista explícita de las 52 migraciones y hashes históricos; agregar una migración exige actualizar la fixture deliberadamente, sin sustituirla por descubrimiento dinámico ni reescribir SQL.

Las fixtures de upgrade siembran únicamente columnas presentes en su baseline histórico. `aiFixture` conserva `account_role='teacher'` por defecto para el esquema actual; sólo el escenario anterior a la migración de rol exclusivo usa `accountRoleColumn: false`. Esto no omite permisos ni altera snapshots o aserciones del upgrade.

## Navegador

Usar una sola TaskSpace de Ego Lite por objetivo, cuentas sintéticas de ambos roles y recursos autorizados. Registrar estado inicial, acción, resultado y evidencia; una captura demuestra apariencia, no una transacción por sí sola.

Comprobar navegación, persistencia, permisos, estados vacíos/errores y confirmaciones. Revisar desktop/tablet/mobile, foco/teclado, accesibilidad y movimiento según el cambio. Diferenciar errores de selectores/scroll de fallas de producto; no ocultar pasos que necesitaron recuperación.

El [recorrido vigente](../../verification/flows.md) contiene capturas actuales y recibos de cierre, acciones reales y limitaciones. El número final se obtiene del catálogo actual, no de esta descripción. [Política de documentación](../../documentation-policy.md).

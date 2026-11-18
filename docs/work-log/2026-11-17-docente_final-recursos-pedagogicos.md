# Recursos docentes del arnés pedagógico

Agente `/root/docente_final`, checkout principal `feature/latencia-ia` sobre `6e9c1312` con cambios locales concurrentes. La continuación autorizada amplía los recorridos existentes de esquemas, imágenes, planes de clase, rúbricas y resúmenes. El coordinador mantiene el tablero y el registro común de perfiles de texto.

Los casos de prueba cubren las instrucciones en el conteo y la generación, las versiones persistidas y la recuperación visual después de reiniciar.

## Resultado

- Resumen fiel en el chat, en Preparar un apunte y con el propósito de API `SUMMARY`. Foxy V5 pide conservar relaciones, condiciones y excepciones de las fuentes.
- El plan de clase editable explicita qué va a poder hacer el estudiante, cómo practicarlo y qué comprobar antes de avanzar. La rúbrica editable describe evidencia observable por criterio y nivel.
- La imagen V2 parte de un objetivo y prioriza explicar un proceso o mostrar una comparación. El esquema V2 pide etiquetar las conexiones y explicarlas en la descripción. Se rechazan los enlaces V2 sin etiqueta.
- Las pruebas comparan la instrucción exacta de los apuntes V2–V4 y el contenido contado con el generado. Los trabajos visuales antiguos sobreviven al cambio de perfil con sus instrucciones y límites originales. Cambiar tarifas conserva el rechazo previo al despacho.

## Evidencia

- RED de transporte: las cuatro pruebas nuevas detectaron ausencia de políticas de texto, cambio de la instrucción anterior por la nueva versión activa y rechazo por configuración de ambos perfiles visuales nuevos. Luego, al incluir el uso habitual de resumen en chat y apunte, fallaron ambas pruebas dirigidas hasta incorporar esa regla condicional.
- GREEN: 68 pruebas de transporte, preparación, snapshots, configuración y worker con `node --experimental-transform-types --experimental-test-module-mocks --test` en `foxy-text-adapter.test.mjs`, `foxy-turn-preparation.test.mjs`, `foxy-image-adapter.test.mjs`, `foxy-diagram-adapter.test.mjs`, `foxy-visual-configuration.test.mjs`, `foxy-visual-worker.test.mjs` y `tests/ai-generation-snapshots.test.mjs`.
- PostgreSQL temporal: 3 pruebas en `foxy-resource-service.test.mjs` y `foxy-visual-restart-profile.test.mjs` con `node --experimental-transform-types --test --test-concurrency=1`. El primer montaje de tres visuales agotó el espacio de reserva privada del fixture, que estaba dimensionado para un trabajo. El ajuste del fixture mantuvo el límite de producción y permitió comprobar dos trabajos V1 recuperados en V2 y el rechazo antes del despacho al cambiar tarifas.
- ESLint de las diez rutas TypeScript tocadas, `node scripts/check-boundaries.mjs` y `npm run docs:check` pasaron.

Las salidas usadas en este registro son sintéticas. El coordinador verifica las generaciones reales y los recorridos de interfaz. Los cambios quedan locales.

### Ajuste de rúbricas después de Ego Lite

La rúbrica de Gemini llegó como tabla de Markdown. El coordinador observó sus barras en el editor y las exportaciones. Foxy V6 pide por defecto un encabezado por criterio, su peso si corresponde y una lista que asocia nivel y evidencia. El formato explícito del docente conserva prioridad.

La prueba de transporte falló primero por ausencia de la regla y luego pasó. La batería de adaptador, preparación y snapshots pasó 37/37. Verificó el texto exacto de V5 para rúbricas, las demás finalidades V5/V6 y la coincidencia entre conteo y generación. PostgreSQL temporal pasó 2/2 en `foxy-resource-service.test.mjs`. Encoló por separado dos rúbricas con V5/V6 y procesó ambas bajo el runtime activo V6. ESLint de `foxy-prompt.ts` pasó.

### Plazo del proveedor de imágenes

Dos trabajos reales en Ego finalizaron en `PROVIDER_OUTCOME_UNKNOWN`. El transporte tenía un corte a los 15 segundos, anterior al del adaptador y al del trabajo. Una respuesta que llegara después de ese corte se cancelaba y se informaba como resultado incierto. Las filas del entorno descartable ya habían sido limpiadas, por lo que la duración exacta de los dos fallos no pudo recuperarse.

El diagnóstico aislado autorizado envió una generación con la misma consigna sintética, proporción 1:1, modelo y controles de imagen V2. Usó el SDK y el parser de producción con un fetch de diagnóstico sujeto a la señal de 90 segundos. Recibió HTTP 200 a los 4,680 segundos y validó un JPEG de 179.290 bytes a los 5,600 segundos. El tope estimado según la configuración fue USD 0,139264. El parser devolvió uso sin detalle, por lo que el costo real quedó sin medición. Esa salida confirma que la petición y el parser pueden completar el caso, con variación de latencia todavía pendiente de corroborar en el recorrido integral.

Se unificaron los plazos del adaptador, SDK y transporte de imagen según `AI_DEADLINE_MS`, con un máximo de 90 segundos. Las pruebas RED reprodujeron la caída del transporte ante una respuesta recibida a 20 segundos virtuales y la ausencia de un plazo propio en la configuración. GREEN pasó 45/45, incluido el SDK con fetch sintético, una sola generación, abortos antes y después del despacho, límite de bytes y finalización de lecturas bloqueadas. El plazo del trabajo y los controles de esquema siguen vigentes.

### Imagen solicitada sin texto

En la repetición real el coordinador obtuvo la imagen con las dos cantidades de flechas pedidas. Aparecieron dos rótulos aunque el encargo decía «sin texto». El perfil de imagen V3 da prioridad a la presentación pedida en el encargo, que se identifica por separado de las fuentes e historial. Para pedidos sin texto usa formas, posición y espaciado. Para las demás imágenes permite etiquetas breves cuando ayudan a entender.

La prueba RED detectó la ausencia de soporte de V3. La regresión comprueba el encargo intacto, la separación de evidencia no confiable, el mismo contenido en conteo y despacho y las huellas exactas de las instrucciones V1 y V2. GREEN pasó 46/46 en adaptadores, transporte, configuración y worker. PostgreSQL temporal pasó 1/1 al recuperar imágenes pendientes V1/V2 y un esquema V1 con los perfiles vigentes. Al cambiar la tarifa, el worker continuó bloqueando el despacho. El esquema conserva versión y comportamiento. ESLint focalizado pasó.

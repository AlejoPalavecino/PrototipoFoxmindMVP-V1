# Verificación de cantidades y lectura de archivos

Coordinación de la continuación del arnés pedagógico. Inicio en `main` en `6057791c`, con árbol limpio y aplicación local detenida. El usuario pidió resolver los pendientes del cierre anterior. Se usan materiales y cuentas sintéticos en un entorno local descartable.

El caso de regresión pide comparar dos aperturas con dos y seis flechas, sin rótulos. La comprobación exige contar lo que realmente se ve. Para el PDF, se comprueba qué información llega a una interfaz de accesibilidad en un archivo exportado. [Tablero y criterios del arnés](../../odd/tasks/pedagogical-harness.md).

## Lectura del PDF y preparación del piloto

La verificación independiente de lectura abrió un PDF sintético de Foxy en Chrome 157 con un perfil descartable y accesibilidad habilitada. Windows UI Automation expuso en orden el título, los planes de viaje, la pregunta final, los importes y la expresión `50 × 5 = 250`. En ese visor las viñetas aparecieron agrupadas como texto. Una segunda inspección del visor quedó bloqueada al no poder verificar su URL. Se cerraron ambos perfiles temporales y el espacio de Ego.

PDFium y pypdf identificaron en el archivo docente título, idioma español, tres encabezados y diez elementos de lista. El documento del piloto contiene dos encabezados de sección y tres elementos de lista. La estructura coincide con el contenido marcado de ambas páginas de prueba, cada una en su respectivo archivo. Los recibos sintéticos están en `.test-artifacts/exportacion-pedagogica/lectura-chrome-uia-v2.json` y `lectura-tags.json`. Esto acredita lectura lineal y semántica del archivo. La navegación por encabezados con un lector habitual se comprobará con participantes.

Por decisión del usuario, el [piloto queda preparado](../verification/piloto-con-participantes.md). Incluye consignas, soluciones para coordinación, criterios de puntuación, dos encargos docentes, tareas de lectura y una ficha de registro. El PDF de prueba está en `.test-artifacts/harness-cierre/piloto-lectura.pdf`.

## Comparación exacta de aperturas

El perfil V4 reconoce una comparación autónoma en General, sin historial, adjuntos ni fuentes. Un encargo compatible especifica dos círculos iguales sobre fondo blanco, aperturas de distinto tamaño, de una a doce flechas por caso y ausencia de texto. El trabajo asigna los conteos por orden o tamaño, dibuja un PNG local y lo entrega por la custodia privada habitual. Ante condiciones adicionales o ambiguas usa el flujo de generación existente. Las instrucciones fijadas de trabajos anteriores conservan su versión.

Las pruebas RED iniciales mostraron la reserva para Gemini incluso en el caso exacto. Dos reformulaciones posteriores expusieron que mover «sin texto» o identificar una abertura por tamaño volvía a enviar el pedido al proveedor. Las pruebas GREEN cuentan trazos en los píxeles del PNG y comprueban el diámetro de cada apertura. Pasaron 36 pruebas focales y cuatro de integración visual y reinicio con PostgreSQL descartable. Una primera corrida de integración agotó el espacio privado previsto en el fixture para un segundo trabajo. La repetición con espacio suficiente aisló y comprobó el límite diario de solicitudes.

En Ego Lite se abrieron dos imágenes desde una cuenta docente sintética y se recuperaron los PNG privados de 1600 × 1600. En la primera, la apertura pequeña recibió dos flechas y la grande seis. En la segunda se invirtió el orden de los círculos y se pidieron las cantidades por tamaño: habían quedado ocho flechas frente a la grande y tres frente a la pequeña. Las imágenes carecen de rótulos. Cada entorno registró una solicitud con costo de proveedor cero y se cerró sin errores. Artefactos locales en `.test-artifacts/harness-cierre/precision-recurso.png` y `precision-variante-recurso.png`.

La verificación independiente de concurrencia usó dos docentes y dos workers con cupo global de una solicitud. Un trabajo obtuvo el PNG, el otro recibió el límite presupuestario y repetir sus identificadores devolvió los mismos trabajos. El costo y los tokens permanecieron constantes. La comprobación de persistencia recuperó el PNG después de reiniciar y denegó acceso desde otras cuentas. El build de API, ESLint y los límites de arquitectura pasaron. La corrección queda local, sin despliegue.

# Métricas iniciales de uso pedagógico

Coordinación, rama local `main`, base `6057791c`, con cambios del arnés en curso preservados. El usuario pidió dejar listas métricas que permitan mejorar FoxMind a partir del uso. Primer corte: obtener contadores agregados reproducibles de las operaciones existentes. Se verifican con PostgreSQL descartable y casos sintéticos.

## Cómo leer el informe

La [consulta semanal](../../scripts/metricas-uso-pedagogico.sql) devuelve una fila por cada una de las dos últimas semanas completas, de lunes a lunes en UTC. Para ejecutarla en una base autorizada, abrí una sesión de `psql` con permisos de lectura y usá `\i scripts/metricas-uso-pedagogico.sql` desde la raíz del proyecto. También podés ejecutar el SELECT en un cliente SQL. La consulta lee fechas, estados y revisiones. Devuelve totales de toda la instalación y excluye nombres, identificadores, mensajes y contenidos.

| Señal | Lectura para producto |
| --- | --- |
| Turnos docentes iniciados, listos, fallidos y cancelados | Si crecen los fallos respecto del total, contrastá con la latencia y los códigos de error que ya registra la ejecución. Un turno cancelado se informa aparte. El total también incluye estados pendientes u obsoletos. |
| Solicitudes registradas y completadas en Mi Estudio | Una caída en la proporción completada orienta la revisión del recorrido técnico. El denominador incluye solamente las solicitudes registradas en la tabla de ejecución. |
| Recursos docentes de texto creados y porcentaje con edición | Tres ediciones del mismo recurso cuentan como un recurso editado. Una edición puede ser una corrección o una adaptación intencional. Para distinguirlas, usá la ficha docente del piloto. |
| Repasos incorporados a Agenda | Cuenta sesiones según la fecha en que se agendaron, incluidas las canceladas más tarde. Sirve para observar adopción del planificador. La asistencia y el recuerdo posterior requieren otra medida. |

Las filas agrupan por fecha de creación y muestran el estado o revisión disponible al consultar. Una edición tardía puede modificar el dato de la semana anterior. Con cero recursos creados, el porcentaje queda vacío. Compará los conteos junto a las proporciones, sobre la misma instalación; los datos de prueba mezclados con datos reales distorsionan la lectura.

Para valorar transferencia, retención, utilidad del borrador, minutos docentes y accesibilidad, usá el [piloto preparado](../verification/piloto-con-participantes.md). Esta entrega deja una consulta manual y conserva los registros operativos existentes.

Se ejecutó la consulta en una transacción de solo lectura contra el esquema migrado de PostgreSQL descartable. Con tablas de prueba sintéticas se comprobaron semanas vacías, los límites exactos de lunes en UTC, tres estados docentes y un recurso editado sobre dos (50 %). El entorno se cerró correctamente. No se consultaron datos de usuarios.

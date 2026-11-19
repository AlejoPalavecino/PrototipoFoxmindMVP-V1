# Estrategias compartidas desde Mi Estudio

19/11/2026. /root/verification como responsable de implementación de esta unidad. Worktree ProtipoFoxMind, rama codex/semaforo-riesgo, base 0aa8be0d.

Alcance autorizado por coordinación. Publicar texto escogido y confirmado por la cuenta estudiante hacia el docente de su aula activa vinculada. Revalidar propiedad y matrícula. Revocar al retirar, desvincular, archivar o cerrar la matrícula. Proyectar solamente identificador y texto confirmado al docente.

RED confirmado con node --test. La política falló porque faltaba el módulo de validación y el escenario PostgreSQL porque no existía la lectura docente. GREEN en candidato 7146e1436d55018a520e9bc1a631ea33908a07eebd270f147e6a8b3a8dd2965c. Pasaron los dos casos de política/HTTP, un recorrido Prisma y PostgreSQL propio con migraciones reales y lint de los módulos cambiados. El recorrido verificó publicación fiel, GET no-store, retiro obsoleto con conflicto, dueño y aula, salida, reingreso, cambio de vínculo, archivo y ausencia de reactivación. El texto retirado se elimina de la tabla de estrategias. Los flujos de aula conservan la revisión de la carpeta y los registros académicos.

Se añadió comprobación de publicación y retiro concurrentes, y del rechazo físico de un período de matrícula ajeno. Repetición en coordinación con el cierre integrado.

La repetición con carrera de publicación/retiro y escritura de matrícula cruzada pasó 1/1 sobre PostgreSQL descartable. Redistribuir y archivar siguen eliminando sólo la estrategia. Se preserva la experiencia y revisión de Mi Estudio.

import type { Payload } from '../../../../../../src/core/contracts/classrooms.ts';
import type { FileState } from '../../../../../../src/core/contracts/materials.ts';

export function classroomGeneralProblem(payload: Payload) {
  if (!payload.name?.trim() || !payload.subject?.trim() || !payload.division?.trim())
    return 'Completá el nombre, la materia y la división del aula.';
  if (!Number.isInteger(payload.academicYear) || payload.academicYear! < 1 || payload.academicYear! > 9999)
    return 'Completá un ciclo lectivo válido.';
  return '';
}
export function classroomPlanFileProblem(payload: Payload, file: FileState | null) {
  if (!payload.planFileId && !file) return 'Subí el archivo del plan de estudio para continuar.';
  if (!file?.ready || file.id !== payload.planFileId)
    return 'El archivo del plan debe estar aprobado y superar la revisión antes de continuar.';
  return '';
}
export function classroomPlanProblem(payload: Payload, analysisUnapplied: boolean) {
  if (!payload.units?.length || payload.units.some(unit => !unit.name.trim() || !unit.topics.length || unit.topics.some(topic => !topic.name.trim())))
    return 'Agregá al menos una unidad con un tema y completá sus nombres. El aula necesita un plan escrito.';
  if (payload.units.length > 100 || payload.units.some(unit => unit.name.length > 120 || unit.topics.length > 100 || unit.topics.some(topic => topic.name.length > 120)) || payload.units.reduce((count, unit) => count + unit.topics.length, 0) > 500)
    return 'Revisá los límites del plan: nombres de hasta 120 caracteres, 100 unidades, 100 temas por unidad y 500 temas en total.';
  if (analysisUnapplied) return 'Esperá el análisis y aplicá la propuesta revisada, o elegí continuar manualmente.';
  return '';
}

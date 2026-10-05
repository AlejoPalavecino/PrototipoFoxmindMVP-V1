import { aulaColorPalette } from '../data/classroomCreationFixtures';
import type { ClassroomCreationForm, ClassroomCreationResult, ClassroomCreationTopic, StudyPlanFile } from '../model/ClassroomCreation';

export function createClassroomForm(): ClassroomCreationForm {
  return { subject: '', year: '', division: '', observation: '', color: 'blue', topics: [] };
}

export function describeStudyPlanFile(file: { name: string; size: number }): StudyPlanFile {
  return { name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB` };
}

export function validateClassroomForm(form: ClassroomCreationForm, file: StudyPlanFile | null): string | null {
  if (!form.subject.trim()) return 'Ingresa el nombre de la materia';
  if (!form.year || !form.division) return 'Selecciona año y división del curso';
  if (!file) return 'Debes cargar el plan de estudios para que la IA lo analice';
  return null;
}

// The mock ignores file contents and samples the clock separately for each unit.
export function analyzeClassroomPlan(subject: string, now: () => number): ClassroomCreationTopic[] {
  const subjectName = subject.trim();
  return [
    {
      id: `u-${now()}-1`,
      name: `Unidad 1: Fundamentos e Introducción a ${subjectName}`,
      subtopics: ['Contexto histórico y marco conceptual', 'Objetivos de aprendizaje y metodología', 'Diagnóstico inicial']
    },
    {
      id: `u-${now()}-2`,
      name: 'Unidad 2: Núcleo temático y desarrollo de habilidades',
      subtopics: ['Ejes teóricos estructurantes', 'Análisis de fuentes y bibliografía', 'Actividades de fijación']
    },
    {
      id: `u-${now()}-3`,
      name: 'Unidad 3: Trabajo práctico y producción colaborativa',
      subtopics: ['Casos de estudio aplicados', 'Metodologías activas y talleres', 'Instancias DUA de diversificación']
    },
    {
      id: `u-${now()}-4`,
      name: 'Unidad 4: Proyecto integrador y evaluación formativa',
      subtopics: ['Consigna y rúbrica de evaluación', 'Presentación grupal / individual', 'Autoevaluación y cierre']
    }
  ];
}

// Planning only: caller owns the local list and replacement of session curriculum.
// Confirmation adds no validation (even an empty edited curriculum is accepted).
export function createTeacherClassroom(form: ClassroomCreationForm, now: () => number): ClassroomCreationResult {
  const selectedColorObj = aulaColorPalette.find(c => c.id === form.color) || aulaColorPalette[0];
  return {
    classroom: {
      id: `aula-${now()}`,
      subject: form.subject.trim(),
      course: `${form.year} ${form.division}`,
      color: selectedColorObj.bgClass,
      studentsCount: 25,
      activeTasks: 1,
      pendingSubmissions: 0,
      avgGrade: 0,
      progress: 0,
      teacherName: 'Docente a cargo',
      lastActivity: 'Recién creada'
    },
    curriculum: form.topics.map((t, idx) => ({
      id: idx + 1,
      unit: t.name,
      status: idx === 0 ? 'current' : 'pending',
      topics: t.subtopics
    }))
  };
}

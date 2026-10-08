import type { StudyGeneratedResource } from '../../../views/alumno/estudio/estudioTypes';

export function createStudySummaryResource(folder: {
  id: string;
  name: string;
  topics?: readonly { name: string }[];
}): StudyGeneratedResource {
  return {
    id: `res-sum-${Date.now()}`,
    title: `Resumen Foxy: ${folder.name}`,
    type: 'resumen',
    folderId: folder.id,
    folderName: folder.name,
    topic: folder.topics?.[0]?.name || folder.name,
    description: 'Síntesis didáctica con puntos esenciales y glosario.',
    createdAt: 'Justo ahora',
    fileSize: '3 págs',
    fileFormat: 'MARKDOWN',
    data: {
      summary: {
        id: `sum-${Date.now()}`,
        title: `Resumen de Síntesis: ${folder.name}`,
        folderId: folder.id,
        folderName: folder.name,
        topic: folder.name,
        readTimeMinutes: 5,
        createdAt: 'Hoy',
        keyPoints: [
          `La clave de ${folder.name} reside en articular los conceptos con ejemplos prácticos.`,
          'Evitá memorizar de forma mecánica: entendé el "por qué" detrás de cada propiedad.',
          'Repasá este resumen en intervalos de 48 horas para maximizar la curva de retención.'
        ],
        contentMarkdown: `## 📚 Síntesis Didáctica: ${folder.name}\n\n### 1. Ideas Principales\nComprender este tema te permitirá abordar tanto preguntas de opción múltiple como ensayos de desarrollo extenso.\n\n### 2. Consejos para Exámenes\n- Definí con precisión los términos técnicos.\n- Citá ejemplos concretos cuando justifiques tus respuestas.\n- Realizá una lectura global antes de contestar.`,
        glossary: [
          { term: 'Concepto Central', definition: 'Núcleo temático sobre el que se estructuran las consignas de evaluación.' }
        ]
      }
    }
  };
}

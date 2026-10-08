import type { StudyGeneratedResource } from '../../../views/alumno/estudio/estudioTypes';

export function createStudyConceptMapResource(folder: {
  id: string;
  name: string;
  topics?: readonly { name: string }[];
}): StudyGeneratedResource {
  return {
    id: `res-map-${Date.now()}`,
    title: `Mapa Conceptual: ${folder.name}`,
    type: 'mapa',
    folderId: folder.id,
    folderName: folder.name,
    topic: folder.topics?.[0]?.name || folder.name,
    description: 'Esquema jerárquico interactivo con nodos interconectados.',
    createdAt: 'Justo ahora',
    fileSize: '5 nodos',
    fileFormat: 'CONCEPT_MAP',
    data: {
      conceptMap: {
        id: `map-${Date.now()}`,
        title: `Mapa Conceptual: ${folder.name}`,
        folderId: folder.id,
        folderName: folder.name,
        centralTopic: folder.name,
        createdAt: 'Hoy',
        summary: 'Interconexión de conceptos fundamentales, metodologías y casos prácticos.',
        nodes: [
          {
            id: 'n-core',
            label: folder.name,
            description: 'Eje central de estudio y estructuración teórica.',
            category: 'core',
            connectedTo: ['n-fund', 'n-met']
          },
          {
            id: 'n-fund',
            label: 'Fundamentos & Orígenes',
            description: 'Principios rectores y antecedentes históricos o matemáticos.',
            category: 'branch',
            connectedTo: ['n-sub1']
          },
          {
            id: 'n-met',
            label: 'Aplicación Práctica',
            description: 'Resolución de problemas, ejercicios típicos y análisis crítico.',
            category: 'branch',
            connectedTo: ['n-sub2']
          },
          {
            id: 'n-sub1',
            label: 'Postulados Básicos',
            description: 'Reglas y axiomas indispensables.',
            category: 'subbranch'
          },
          {
            id: 'n-sub2',
            label: 'Ejemplos de Examen',
            description: 'Casos resueltos y modelos de parcial.',
            category: 'subbranch'
          }
        ]
      }
    }
  };
}

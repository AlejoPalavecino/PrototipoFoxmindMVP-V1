import type { StudyGeneratedResource, StudentAgentMode, StudentStudyMessage } from '../../../views/alumno/estudio/estudioTypes';
import { createStudyFlashcardResource } from './studyFlashcardGeneration';
import { createStudyQuizResource } from './studyQuizGeneration';
import { createStudyConceptMapResource } from './studyConceptMapGeneration';
import { createStudySummaryResource } from './studySummaryGeneration';

type StudyChatCanvas = {
  title: string;
  type: 'flashcards' | 'quiz' | 'resumen' | 'mapa';
  content: string;
  resource: StudyGeneratedResource;
};

export function decideStudyChatResponse(
  query: string,
  folder: Parameters<typeof createStudyFlashcardResource>[0],
  agentMode: StudentAgentMode,
  setCanvasDocument: (document: StudyChatCanvas) => void,
  onSaveResourceToLibrary: (resource: StudyGeneratedResource) => void
) {
  const lowerQuery = query.toLowerCase();

  let aiResponseText = '';
  let generatedTool: StudyGeneratedResource | undefined = undefined;
  let suggestedActions: NonNullable<StudentStudyMessage['suggestedActions']> = [];

  if (lowerQuery.includes('flashcard') || lowerQuery.includes('tarjeta') || lowerQuery.includes('/flashcards')) {
    const newDeckResource: StudyGeneratedResource = createStudyFlashcardResource(folder);

    aiResponseText = `🃏 ¡He generado un **Mazo de Flashcards** para tu estudio de **${folder.name}**!\n\nUtiliza el método de **Active Recall** (recuperación activa). Haz clic en la tarjeta para practicar en modo 3D con pistas pedagógicas.`;
    generatedTool = newDeckResource;
    suggestedActions = [
      { label: '🃏 Practicar Mazo Ahora', actionPrompt: 'Abrir mazo de flashcards', iconType: 'flashcards' },
      { label: '⚡ Tomar Quiz Rápido', actionPrompt: 'Hagamos un quiz de autoevaluación', iconType: 'quiz' }
    ];

    setCanvasDocument({
      title: newDeckResource.title,
      type: 'flashcards',
      content: `# ${newDeckResource.title}\n\n- **Tema:** ${newDeckResource.topic}\n- **Tarjetas generadas:** 3\n- **Estado:** Pendiente de práctica`,
      resource: newDeckResource
    });

    onSaveResourceToLibrary(newDeckResource);
  } else if (lowerQuery.includes('quiz') || lowerQuery.includes('evaluacion') || lowerQuery.includes('cuestionario') || lowerQuery.includes('/quiz')) {
    const newQuizResource: StudyGeneratedResource = createStudyQuizResource(folder);

    aiResponseText = `⚡ ¡He preparado un **Quiz Rápido de Autoevaluación** de **${folder.name}**!\n\nRespondé las preguntas y te iré dando explicaciones socráticas inmediatas para consolidar el tema antes de tu examen.`;
    generatedTool = newQuizResource;
    suggestedActions = [
      { label: '⚡ Iniciar Quiz Formativo', actionPrompt: 'Comenzar quiz interactivo', iconType: 'quiz' },
      { label: '🧠 Ver Mapa Conceptual', actionPrompt: 'Mostrame el mapa conceptual del tema', iconType: 'mapa' }
    ];

    setCanvasDocument({
      title: newQuizResource.title,
      type: 'quiz',
      content: `# ${newQuizResource.title}\n\n- **Preguntas:** 2\n- **Dificultad:** Intermedia\n- **Foco:** Comprensión analítica`,
      resource: newQuizResource
    });

    onSaveResourceToLibrary(newQuizResource);
  } else if (lowerQuery.includes('mapa') || lowerQuery.includes('red') || lowerQuery.includes('/mapa')) {
    const newMapResource: StudyGeneratedResource = createStudyConceptMapResource(folder);

    aiResponseText = `🧠 He diseñado el **Mapa Conceptual Interactivo** de **${folder.name}**.\n\nPuedes hacer clic en cualquier nodo para explorar sus relaciones y guardar conceptos clave en tus apuntes.`;
    generatedTool = newMapResource;
    suggestedActions = [
      { label: '🧠 Abrir Mapa Conceptual', actionPrompt: 'Ver mapa conceptual interactivo', iconType: 'mapa' },
      { label: '📝 Generar Resumen', actionPrompt: 'Crear resumen ejecutivo', iconType: 'resumen' }
    ];

    setCanvasDocument({
      title: newMapResource.title,
      type: 'mapa',
      content: `# Mapa Conceptual: ${folder.name}\n\n- Eje Central: ${folder.name}\n- Ramas: Fundamentos, Aplicación Práctica\n- Nodos interactivos disponibles en el visor`,
      resource: newMapResource
    });

    onSaveResourceToLibrary(newMapResource);
  } else if (lowerQuery.includes('resumen') || lowerQuery.includes('sintesis') || lowerQuery.includes('/resumen')) {
    const newSummaryResource: StudyGeneratedResource = createStudySummaryResource(folder);

    aiResponseText = `📝 He elaborado un **Resumen Ejecutivo con Puntos Clave** de **${folder.name}**.\n\nPuedes leerlo en el panel lateral, editarlo o exportarlo para tu repaso personal.`;
    generatedTool = newSummaryResource;
    suggestedActions = [
      { label: '🃏 Crear Flashcards del Resumen', actionPrompt: 'Generar flashcards de este resumen', iconType: 'flashcards' },
      { label: '⚡ Evaluarme con Quiz', actionPrompt: 'Tomarme un quiz sobre este resumen', iconType: 'quiz' }
    ];

    setCanvasDocument({
      title: newSummaryResource.title,
      type: 'resumen',
      content: newSummaryResource.data?.summary?.contentMarkdown || '',
      resource: newSummaryResource
    });

    onSaveResourceToLibrary(newSummaryResource);
  } else {
    // Socratic / Explanatory Answer
    if (agentMode === 'socratico') {
      aiResponseText = `🦊 **Análisis Socrático:**\n\nPara profundizar en tu consulta sobre **${query}**, pensemos juntos:\n\n1. ¿Cuál crees que es la causa principal o el punto de partida en este fenómeno?\n2. Si tuvieras que explicarle este concepto a un compañero en 2 oraciones, ¿qué palabras clave usarías?\n\n*Pruébame tu respuesta y te daré pistas para perfeccionarla antes del examen.*`;
    } else if (agentMode === 'explicador') {
      aiResponseText = `💡 **Explicación Fácil (ELI5):**\n\nImagina que **${folder.name}** es como armar un rompecabezas. Cada pieza representa una regla básica que encaja con la siguiente.\n\nEl secreto está en no apresurarse y seguir el orden lógico paso a paso. ¿Te gustaría que hagamos un ejemplo resuelto?`;
    } else if (agentMode === 'riguroso') {
      aiResponseText = `🏛️ **Modo Examen Riguroso:**\n\nEn una evaluación formal, se evaluará la precisión terminológica y la justificación metodológica.\n\nRespecto a tu consulta: asegúrate de enunciar la definición formal, contrastarla con contraejemplos y verificar las condiciones de validez. ¿Quieres ponerlo a prueba en un simulacro de 3 preguntas?`;
    } else {
      aiResponseText = `📋 **Síntesis Rápida:**\n\n- Punto 1: Identificación clara de la premisa.\n- Punto 2: Desarrollo lógico de las etapas.\n- Punto 3: Conclusión y verificación.\n\n¿Quieres que generemos un quiz o flashcards para afianzarlo?`;
    }

    suggestedActions = [
      { label: '🃏 Generar Flashcards', actionPrompt: 'Quiero un mazo de flashcards de esto', iconType: 'flashcards' },
      { label: '⚡ Quiz Rápido', actionPrompt: 'Tomarme un quiz de autoevaluación', iconType: 'quiz' },
      { label: '🧠 Mapa Conceptual', actionPrompt: 'Diseñame un mapa conceptual', iconType: 'mapa' }
    ];
  }

  return { aiResponseText, generatedTool, suggestedActions };
}

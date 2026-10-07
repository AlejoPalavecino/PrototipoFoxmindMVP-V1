export function detectStudyFolderTopics(name: string) {
  const lowerName = name.toLowerCase();

  if (lowerName.includes('historia') || lowerName.includes('revoluci') || lowerName.includes('social')) {
    return [
      {
        id: 'top-1',
        name: 'Unidad 1: Crisis del Antiguo Régimen y Estados Generales',
        subtopics: ['Monarquía absoluta y privilegios', 'Toma de la Bastilla (1789)', 'Declaración de Derechos del Hombre'],
        selected: true
      },
      {
        id: 'top-2',
        name: 'Unidad 2: La Convención Nacional y el Terror',
        subtopics: ['Girondinos vs Jacobinos', 'Robespierre y el Comité de Salvación Pública', 'Constitución de 1793'],
        selected: true
      },
      {
        id: 'top-3',
        name: 'Unidad 3: Directorio y Ascenso Napoleónico',
        subtopics: ['Reacción termidoriana', 'Golpe del 18 de Brumario', 'Código Civil y expansión europea'],
        selected: true
      }
    ];
  } else if (lowerName.includes('biolog') || lowerName.includes('cienc') || lowerName.includes('celul')) {
    return [
      {
        id: 'top-1',
        name: 'Unidad 1: Estructura y Función Celular',
        subtopics: ['Células procariotas y eucariotas', 'Membrana plasmática y transporte', 'Organelas y metabolismo'],
        selected: true
      },
      {
        id: 'top-2',
        name: 'Unidad 2: Genética y Ciclo Celular',
        subtopics: ['Mitosis y Meiosis', 'Leyes de Mendel', 'Estructura del ADN y replicación'],
        selected: true
      },
      {
        id: 'top-3',
        name: 'Unidad 3: Ecosistemas y Dinámica Poblacional',
        subtopics: ['Cadenas tróficas', 'Ciclos biogeoquímicos', 'Impacto antropogénico'],
        selected: true
      }
    ];
  } else {
    return [
      {
        id: 'top-1',
        name: `Unidad 1: Fundamentos y Conceptos Clave de ${name}`,
        subtopics: ['Definición y principios rectores', 'Evolución histórica y contexto', 'Axiomas y postulados básicos'],
        selected: true
      },
      {
        id: 'top-2',
        name: 'Unidad 2: Desarrollo Analítico y Aplicación Práctica',
        subtopics: ['Metodología de resolución', 'Estudio de casos tipo parcial', 'Errores conceptuales frecuentes'],
        selected: true
      },
      {
        id: 'top-3',
        name: 'Unidad 3: Síntesis e Integración para Exámenes',
        subtopics: ['Cuadros comparativos clave', 'Simulacro de preguntas socráticas', 'Esquema de repaso espaciado'],
        selected: true
      }
    ];
  }
}

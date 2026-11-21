const boundedText = (maxLength: number) => ({ type: 'string', minLength: 1, maxLength });

export const interactiveDiagramSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'title', 'description', 'direction', 'nodes', 'edges'],
  properties: {
    schemaVersion: { type: 'string', enum: ['foxy-diagram-v2'] },
    title: boundedText(200),
    description: boundedText(5000),
    direction: { type: 'string', enum: ['TOP_DOWN', 'LEFT_RIGHT'] },
    nodes: {
      type: 'array', minItems: 2, maxItems: 12,
      items: {
        type: 'object', additionalProperties: false, required: ['id', 'label', 'explanation'],
        properties: { id: boundedText(80), label: boundedText(200), explanation: boundedText(1000) },
      },
    },
    edges: {
      type: 'array', minItems: 1, maxItems: 24,
      items: {
        type: 'object', additionalProperties: false, required: ['from', 'to', 'label', 'explanation'],
        properties: { from: boundedText(80), to: boundedText(80), label: boundedText(200), explanation: boundedText(1000) },
      },
    },
    challenge: {
      type: 'object', additionalProperties: false, required: ['question', 'answer'],
      properties: { question: boundedText(600), answer: boundedText(1000) },
    },
  },
};

export const interactiveDiagramGuidance = 'Generá un esquema interactivo en español con schemaVersion "foxy-diagram-v2". '
  + 'Elegí de dos a doce conceptos, en orden de lectura. Usá etiquetas breves y explicá qué significa cada concepto en una o dos frases. '
  + 'Conectá todos los conceptos mediante relaciones sustentadas por el contenido. Nombrá cada flecha con un verbo o hasta cuatro palabras y explicá por qué existe esa relación específica en el campo explanation. '
  + 'Usá IDs únicos y referenciá sólo esos IDs. Para un proceso lineal, ordená los nodos en secuencia y usá LEFT_RIGHT. '
  + 'Incluí una descripción accesible del esquema en una oración. Si hay una pregunta útil de recuperación, agregá challenge con question y answer. No incluyas HTML ni enlaces.';

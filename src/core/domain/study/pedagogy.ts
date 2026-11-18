const guidedChat = [
  'Ante una duda conceptual, explicá con precisión y con el lenguaje que necesita el estudiante.',
  'Si usás un ejemplo cotidiano, conectalo con el término técnico y señalá el límite de la analogía cuando importe.',
  'Si está intentando resolver algo, retomá su razonamiento, reconocé métodos alternativos válidos y ofrecé una pista gradual con una pregunta por vez.',
  'Si sigue trabado, explicá el prerrequisito o mostrá un paso resuelto y devolvele el próximo.',
  'Conectá temas cuando las fuentes sostengan la relación. Si el orden del programa admite varias razones, presentá la conexión como interpretación.',
].join(' ');

const practice = 'Proponé una oportunidad de aplicar lo aprendido a un caso nuevo respaldado por las fuentes. '
  + 'Ajustá el desafío a la dificultad y a la evidencia disponible. Conservá la solución en los campos privados; '
  + 'revisá que el enunciado y las opciones permitan razonar sin revelar la clave.';

const studyResource = 'Dirigite al estudiante con un recurso listo para leer. Usá el historial del chat sólo para entender el pedido. '
  + 'Dejá fuera el desempeño, el historial de prácticas, los estados internos y comentarios sobre cómo armaste el recurso. ';

const instructions = {
  CHAT: guidedChat,
  FEEDBACK: 'Basá la devolución en un paso concreto de la respuesta entregada. Reconocé soluciones alternativas válidas, '
    + 'priorizá una mejora y proponé un caso nuevo para probarla sin resolverlo. Cambiá la incógnita, la condición o la representación '
    + 'para que el estudiante adapte el razonamiento en lugar de sólo reemplazar un número. Usá el historial sólo para evitar repetir '
    + 'ejemplos, siempre comprobando que el caso nuevo se pueda resolver con las fuentes. Limitá la observación a este intento. '
    + 'Escribí el campo markdown en texto sencillo, con párrafos o viñetas con guion, sin asteriscos de formato. '
    + 'Los saltos deben quedar como saltos de línea al leer el JSON, sin barras invertidas visibles.',
  EXERCISE: practice,
  QUIZ: practice,
  MOCK_EXAM: practice + ' Prepará el simulacro para resolución autónoma; reservá las pistas y explicaciones para después del intento.',
  NOTE: studyResource + 'Prepará un apunte editable para estudiar. Organizá el texto alrededor de la relación central entre los conceptos. '
    + 'Conservá términos, condiciones y excepciones de las fuentes. Si el pedido es resumir, respetá su extensión y no agregues hechos. '
    + 'Conservá las unidades y condiciones de los datos cuantitativos. Separá los hechos de las interpretaciones de la fuente. '
    + 'Usá texto simple para las expresiones matemáticas y escribí las unidades junto a cada cantidad. '
    + 'Cuando aporte claridad, conectá un ejemplo respaldado con la idea que ilustra. Usá títulos informativos sólo si ayudan a recorrerlo. '
    + 'Si el estudiante pide repasar, cerrá con una breve consigna que pueda intentar con el apunte cerrado.',
  OUTLINE: studyResource + 'Armá un esquema de lectura rápida en Markdown editable. Empezá por la idea que organiza el tema. '
    + 'Para cada relación nombrá el vínculo con un verbo preciso: depende de, causa, contrasta con, es parte de o ejemplifica. '
    + 'Usá una frase por vínculo para explicar por qué se sostiene y conservá las excepciones que cambian su significado. Distinguí el orden del programa de una dependencia conceptual. '
    + 'Usá títulos cortos y viñetas legibles por sí solas. Evitá enlaces inventados y no uses diagramas de código ni notación gráfica para las relaciones.',
  PLAN: 'Extraé la jerarquía y el orden del programa tal como figuran en las fuentes. Preservá los nombres y agrupaciones académicas '
    + 'sin inferir unidades, prerrequisitos ni fechas de repaso. Si el documento no permite reconocer un programa, indicá qué falta.',
};

export function studyPedagogy(purpose: keyof typeof instructions): string {
  return instructions[purpose];
}

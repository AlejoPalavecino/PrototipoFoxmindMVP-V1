type Opening = 'small' | 'large';
type OpeningCase = { opening: Opening; arrowCount: number };
export type ExactOpeningImage = readonly [OpeningCase, OpeningCase];

// Match the complete brief. Extra drawing constraints must go to the existing image provider.
const drawingStart = /^(?:para ensenar (?:la )?apertura[,:] *)?(?:dibuja|ilustra|mostra|crea) (?:(?:en|sobre|con) (fondo blanco) )?(?:dos|2) circulos (?:del mismo tamano|iguales)(?: (?:en|sobre|con) (fondo blanco))?[, :] */u;
const openingPair = /^(?:uno|el primero) con (?:abertura|apertura) (pequena|grande)(?: y |[,;] *(?:y )?)(?:otro|el segundo) con (?:abertura|apertura) (pequena|grande)(?= *[.,;:]|$)/u;
const presentation = /(^|[.,;:] *| y )((?:en|sobre|con) fondo blanco|(?:una comparacion sencilla y )?sin (?:texto|textos|etiquetas))(?= *[.,;:]| y |$)/gu;
const punctuation = /^[.,;:\s]+|[.,;:\s]+$/gu;
const placement = '(?:frente al|delante del|para el) (primero|segundo)|(?:frente a la|delante de la|para la) (?:(?:abertura|apertura) )?(pequena|grande)';
const afterCount = new RegExp(`^(?:exactamente )?(\\w+)(?: (flechas?))? (?:${placement})`, 'u');
const beforeCount = new RegExp(`^(?:${placement}),? (?:exactamente )?(\\w+)(?: (flechas?))?`, 'u');
const countWords = ['un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'];

function arrowAssignment(clause: string, firstOpening: string) {
  const leadingCount = afterCount.exec(clause);
  const leadingTarget = leadingCount ? null : beforeCount.exec(clause);
  const matched = leadingCount ?? leadingTarget;
  if (!matched) return null;
  const amount = leadingCount?.[1] ?? leadingTarget?.[3] ?? '';
  const unit = leadingCount?.[2] ?? leadingTarget?.[4];
  const ordinal = leadingCount?.[3] ?? leadingTarget?.[1];
  const opening = leadingCount?.[4] ?? leadingTarget?.[2];
  const count = /^\d{1,2}$/u.test(amount) ? Number(amount) : countWords.indexOf(amount === 'una' ? 'un' : amount) + 1;
  if (count < 1 || count > 12 || (unit && unit !== (count === 1 ? 'flecha' : 'flechas'))) return null;
  const position = ordinal ? (ordinal === 'primero' ? 0 : 1) : (opening === firstOpening ? 0 : 1);
  return { position, count, unit, rest: clause.slice(matched[0].length).trimStart() };
}

export function parseExactOpeningImage(prompt: string): ExactOpeningImage | null {
  const normalized = prompt.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/gu, ' ').trim();
  let white = false;
  let noText = false;
  const content = normalized.replace(presentation, (_match, separator: string, rule: string) => {
    if (rule.endsWith('fondo blanco')) white = true;
    else noText = true;
    return separator === ' y ' ? '' : separator;
  }).replace(punctuation, '');
  if (!noText) return null;
  const drawing = drawingStart.exec(content);
  if (!drawing || (!white && !drawing[1] && !drawing[2])) return null;
  const casesAndArrows = content.slice(drawing[0].length);
  const openings = openingPair.exec(casesAndArrows);
  if (!openings) return null;
  const [, firstOpening, secondOpening] = openings;
  if (!firstOpening || !secondOpening || firstOpening === secondOpening) return null;
  const arrows = casesAndArrows.slice(openings[0].length).replace(punctuation, '').replace(/^(?:pone|dibuja|mostra) /u, '');
  const left = arrowAssignment(arrows, firstOpening);
  if (!left || !/^(?:[.,;:]|[ye] )/u.test(left.rest)) return null;
  const right = arrowAssignment(left.rest.replace(punctuation, '').replace(/^[ye] /u, ''), firstOpening);
  if (!right || right.rest || left.position === right.position || (!left.unit && !right.unit)) return null;
  const [first, second] = left.position === 0 ? [left, right] : [right, left];
  return [
    { opening: firstOpening === 'pequena' ? 'small' : 'large', arrowCount: first.count },
    { opening: secondOpening === 'pequena' ? 'small' : 'large', arrowCount: second.count },
  ];
}

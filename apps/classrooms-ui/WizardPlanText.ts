import type { Unit } from './api.ts';

/** `Unidad: nombre` introduces a unit and `- nombre` always introduces a topic.
 * Numbered manual headers (`Unidad 1 · Tema`) remain supported. */
export function parseClassroomPlan(text: string): Unit[] {
  const units: Unit[] = [];
  const addTopic = (name: string) => {
    if (!units.length) units.push({ name: 'Unidad 1', topics: [] });
    units.at(-1)!.topics.push({ name });
  };
  for (const line of text.split(/\r?\n/).map(value => value.trim()).filter(Boolean)) {
    // Bullets always mean topics, including names that look exactly like unit headers.
    if (/^[-•](?:\s+|$)/u.test(line)) { addTopic(line.replace(/^[-•](?:\s+|$)/u, '')); continue; }
    const explicit = /^unidad:\s*(.*)$/iu.exec(line);
    if (explicit) units.push({ name: explicit[1], topics: [] });
    else if (/^unidad\s+\d+\b/iu.test(line)) units.push({ name: line, topics: [] });
    else addTopic(line);
  }
  return units;
}

export function formatClassroomPlan(units: Unit[] = []): string {
  return units.map(unit => [
    `Unidad: ${unit.name}`,
    ...unit.topics.map(topic => `- ${topic.name}`),
  ].join('\n')).join('\n\n');
}

export function prepareClassroomPlan(text: string): string {
  // Already structured text must not split a topic such as "- Unidad 2" into a header.
  if (text.split(/\r?\n/).some(line => /^\s*(?:unidad:|[-•](?:\s+|$))/iu.test(line))) return text.trim();
  return text.replace(/\s+(unidad\s+\d+)/gi, '\n$1').split(/\r?\n|[.;]+ /).map(value => value.trim()).filter(Boolean).join('\n');
}

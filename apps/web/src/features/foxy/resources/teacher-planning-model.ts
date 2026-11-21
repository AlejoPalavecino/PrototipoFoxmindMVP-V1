type TextSection = { heading: string; body: string; depth: number };
type RubricCriterion = { title: string; levels: { label: string; description: string }[]; depth: number };
export type TeacherRubric = { introduction: string; criteria: RubricCriterion[] };

export function teacherTextSections(markdown: string): TextSection[] {
  const sections: TextSection[] = [{ heading: '', body: '', depth: 0 }];
  for (const line of markdown.replace(/\r\n?/gu, '\n').split('\n')) {
    const heading = /^(#{1,4})\s+(.+)$/u.exec(line);
    if (heading) sections.push({ heading: heading[2], body: '', depth: heading[1].length });
    else sections[sections.length - 1].body += line + '\n';
  }
  return sections.map(section => ({ ...section, body: section.body.trim() }));
}

export function readTeacherRubric(markdown: string): TeacherRubric | undefined {
  const sections = teacherTextSections(markdown);
  const first = sections.findIndex(section => section.heading && /^[-*+]\s+/u.test(section.body));
  if (first < 1) return;
  const introduction = sections.slice(0, first).map(section => (section.heading ? '#'.repeat(section.depth) + ' ' + section.heading + '\n\n' : '') + section.body).filter(Boolean).join('\n\n');
  const criteria: RubricCriterion[] = [];
  for (const section of sections.slice(first)) {
    const levelRows = section.body.replace(/(?:\n\s*)-{3,}\s*$/u, '').split(/\n/u).filter(line => line.trim());
    const levels: RubricCriterion['levels'] = [];
    for (const line of levelRows) {
      // Read both common Gemini variations: "**Nivel:** ..." and "**Nivel**: ...".
      const value = /^[-*+]\s+(.+?)\s*:\s*(.+)$/u.exec(line);
      if (!value) return;
      const label = value[1].replace(/\*\*/gu, '').trim();
      const description = value[2].replace(/^\*\*\s*/u, '').trim();
      if (!label || !description || levels.some(level => level.label.toLowerCase() === label.toLowerCase())) return;
      levels.push({ label, description });
    }
    if (!section.heading || levels.length < 2) return;
    criteria.push({ title: section.heading, depth: section.depth, levels });
  }
  return { introduction, criteria };
}

export function readTeacherLessonPhase(heading: string): { title: string; minutes: string } | undefined {
  const phase = /^(.+?)\s*(?:[·–—]\s*|\(\s*)?(\d+\s*(?:minutos?|min\.?))\s*\)?(?:\s*:\s*(.+))?\s*$/iu.exec(heading);
  if (!phase) return;
  return { title: [phase[1].trim(), phase[3]?.trim()].filter(Boolean).join(' · '), minutes: phase[2] };
}

export function writeTeacherRubric(rubric: TeacherRubric): string {
  const criteria = rubric.criteria.map(({ title, depth, levels }) => {
    const rows = levels.map(({ label, description }) => '- ' + label + ': ' + description.replace(/\r?\n/gu, ' '));
    return ['#'.repeat(depth) + ' ' + title, '', ...rows].join('\n');
  });
  return [rubric.introduction, ...criteria].filter(Boolean).join('\n\n');
}

export type InlineRun = { text: string; style: 'plain' | 'bold' | 'italic' | 'code' };
export type ResourceBlock =
  | { kind: 'paragraph' | 'divider' | 'blank'; text: string }
  | { kind: 'heading'; text: string; level: number }
  | { kind: 'list'; text: string; marker: string; indent: number };

const mathSymbols: Readonly<Record<string, string>> = {
  times: '×', cdot: '·', div: '÷', pm: '±', le: '≤', leq: '≤',
  ge: '≥', geq: '≥', ne: '≠', neq: '≠', to: '→',
};

function formatMath(expression: string): string | undefined {
  const format = (value: string) => value
    .replace(/\\text\{([^{}]*)\}/gu, '$1')
    .replace(/\\([a-z]+)(?![a-z])/giu, (command, word: string) => mathSymbols[word] ?? command);
  const value = format(expression.trim().replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/gu, '($1) / ($2)'));
  return value && !/[\\{}$]/u.test(value) ? value : undefined;
}

function readableMath(text: string): string {
  return text.replace(/\\\(([^\r\n]+?)\\\)|(?<![\w$\\])\$(?!\s)([^$\r\n]+)\$(?![$\p{L}\p{N}])/gu,
    (original, parentheses: string | undefined, dollars: string | undefined) => {
      const expression = parentheses ?? dollars ?? '';
      // A price such as "$300" is ordinary text. Treat paired dollars as
      // mathematics only when the body looks like notation.
      const notation = parentheses !== undefined || /^[\p{L}\p{N}.,]+$/u.test(expression)
        || /\\|[=+×÷^_<>]|\d\s*[-*/]\s*\d/u.test(expression);
      return notation ? formatMath(expression) ?? original : original;
    });
}

export function resourceInlineRuns(text: string): InlineRun[] {
  return text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|!?\[[^\]\n]*\]\([^\n]*?\))/gu).map((part): InlineRun => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
      return { text: readableMath(part.slice(2, -2)), style: 'bold' };
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
      return { text: readableMath(part.slice(1, -1)), style: 'italic' };
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
      return { text: part.slice(1, -1), style: 'code' };
    const label = /^!?\[([^\]]*)\]\(.+\)$/u.exec(part);
    return { text: readableMath(label?.[1] ?? part), style: 'plain' };
  }).filter(run => run.text.length > 0);
}

export function resourceBlocks(markdown: string): ResourceBlock[] {
  const headings: number[] = [];
  return markdown.replace(/\r\n?/gu, '\n').split('\n').map((line): ResourceBlock => {
    if (!line.trim()) return { kind: 'blank', text: '' };
    if (/^ {0,3}-{3,}[ \t]*$/u.test(line)) return { kind: 'divider', text: '' };
    const heading = /^(#{1,6})\s+(.+)$/u.exec(line);
    if (heading) {
      const sourceLevel = heading[1]!.length;
      while (headings.length && headings.at(-1)! >= sourceLevel) headings.pop();
      headings.push(sourceLevel);
      return { kind: 'heading', level: headings.length, text: heading[2]! };
    }
    const item = /^(\s*)([-*+]|\d+[.)])\s+(.+)$/u.exec(line);
    if (item) return { kind: 'list', indent: item[1]!.replaceAll('\t', '    ').length, marker: item[2]!, text: item[3]! };
    return { kind: 'paragraph', text: line };
  });
}

export function resourcePlainText(markdown: string): string {
  return resourceBlocks(markdown).map(block => {
    if (block.kind === 'divider') return '---';
    const text = resourceInlineRuns(block.text).map(run => run.text).join('');
    return block.kind === 'list' ? `${' '.repeat(block.indent)}${block.marker} ${text}` : text;
  }).join('\n');
}

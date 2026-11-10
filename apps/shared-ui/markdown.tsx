import { Fragment, type ReactNode } from 'react';
import styles from './markdown.module.css';

// Deliberately small Markdown vocabulary: React escapes every model-provided string.
// Links and images become labels; no model-controlled navigation or raw HTML.
function inline(value: string): ReactNode[] {
  return value.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|!?\[[^\]]*\]\([^\n]*?\))/gu).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    if (/^!?\[/u.test(part)) return <Fragment key={i}>{part.slice(part.indexOf('[') + 1, part.indexOf(']'))}</Fragment>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}
export function FoxyMarkdown({ markdown }: { markdown: string }) {
  const lines = markdown.replace(/\r\n?/gu, '\n').split('\n'), blocks: ReactNode[] = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const heading = /^(#{1,6})\s+(.+)$/u.exec(line);
    if (heading) { blocks.push(heading[1].length <= 2 ? <h3 key={i}>{inline(heading[2])}</h3> : <h4 key={i}>{inline(heading[2])}</h4>); i++; continue; }
    const list = /^\s*(?:[-*+]\s+|\d+[.)]\s+)/u;
    if (list.test(line)) {
      const ordered = /^\s*\d/u.test(line), start = i, items: ReactNode[] = [];
      while (i < lines.length && list.test(lines[i]) && /^\s*\d/u.test(lines[i]) === ordered) {
        items.push(<li key={i}>{inline(lines[i].replace(list, ''))}</li>); i++;
      }
      blocks.push(ordered ? <ol key={start}>{items}</ol> : <ul key={start}>{items}</ul>); continue;
    }
    const start = i, paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s+.+$/u.test(lines[i]) && !list.test(lines[i])) paragraph.push(lines[i++]);
    blocks.push(<p key={start}>{inline(paragraph.join('\n'))}</p>);
  }
  return <div className={styles.markdown}>{blocks}</div>;
}

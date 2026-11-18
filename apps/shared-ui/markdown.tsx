import { Fragment, type ReactNode } from 'react';
import { resourceInlineRuns } from '../../src/core/domain/documents/resource-markdown.ts';
import styles from './markdown.module.css';

// Deliberately small Markdown vocabulary: React escapes every model-provided string.
// Links and images become labels; no model-controlled navigation or raw HTML.
function inline(value: string): ReactNode[] {
  return resourceInlineRuns(value).map(({text, style}, i) => {
    if (style === 'bold') return <strong key={i}>{text}</strong>;
    if (style === 'italic') return <em key={i}>{text}</em>;
    if (style === 'code') return <code key={i}>{text}</code>;
    return <Fragment key={i}>{text}</Fragment>;
  });
}
export function FoxyMarkdown({ markdown }: { markdown: string }) {
  const lines = markdown.replace(/\r\n?/gu, '\n').split('\n'), blocks: ReactNode[] = [];
  const divider = /^ {0,3}-{3,}[ \t]*$/u;
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (divider.test(line)) { blocks.push(<hr key={i}/>); i++; continue; }
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
    while (i < lines.length && lines[i].trim() && !divider.test(lines[i]) && !/^(#{1,6})\s+.+$/u.test(lines[i]) && !list.test(lines[i])) paragraph.push(lines[i++]);
    blocks.push(<p key={start}>{inline(paragraph.join('\n'))}</p>);
  }
  return <div className={styles.markdown}>{blocks}</div>;
}

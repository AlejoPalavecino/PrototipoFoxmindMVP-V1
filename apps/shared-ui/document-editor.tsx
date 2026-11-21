import { useEffect, useRef, useState } from 'react';
import {
  documentInk, resourceBlocks, resourceInlineRuns, type DocumentInk, type InlineRun,
} from '../../src/core/domain/documents/resource-markdown.ts';
import styles from './document-editor.module.css';

const ink = { standard: '#243548', ...documentInk };
const colorNames = { standard: 'Tinta', orange: 'Naranja', green: 'Verde', blue: 'Azul' };
const inlineTags = { plain: 'span', bold: 'strong', italic: 'em', code: 'code' };

function loadDocument(root: HTMLElement, value: string) {
  const doc = root.ownerDocument;
  const blocks = resourceBlocks(value).map(block => {
    if (block.kind === 'divider') return doc.createElement('hr');
    const element = doc.createElement(block.kind === 'heading' ? `h${Math.min(6, block.level + 2)}` : 'p');
    if (block.kind === 'list') element.append(`${' '.repeat(block.indent)}${block.marker} `);
    for (const run of resourceInlineRuns(block.text)) {
      const span = doc.createElement(inlineTags[run.style]);
      if (run.color) span.style.color = documentInk[run.color];
      span.textContent = run.text;
      element.append(span);
    }
    if (!element.hasChildNodes()) element.append(doc.createElement('br'));
    return element;
  });
  root.replaceChildren(...blocks);
}

function readInk(color: string): DocumentInk | undefined {
  const rgb = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/u.exec(color);
  const hex = rgb ? '#' + rgb.slice(1).map(value => Number(value).toString(16).padStart(2, '0')).join('') : color.toLowerCase();
  return Object.entries(documentInk).find(([, value]) => value === hex)?.[0] as DocumentInk | undefined;
}

function runMarkdown(run: InlineRun) {
  const token = { plain: '', bold: '**', italic: '*', code: '`' }[run.style];
  const text = run.text.replace(/\u00a0/gu, ' ');
  const inline = token && text.trim() ? text.replace(/^(\s*)(.*?)(\s*)$/u, `$1${token}$2${token}$3`) : text;
  return run.color && text.trim() && !/[<>]/u.test(text) ? `<span data-foxmind-ink="${run.color}">${inline}</span>` : inline;
}

function extractDocument(root: HTMLElement): string {
  const lines: { level: number; runs: InlineRun[] }[] = [];
  let current: (typeof lines)[number] | undefined;
  function walk(node: Node, level = 0, style: InlineRun['style'] = 'plain', color?: DocumentInk) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.textContent) return;
      if (!current) {
        current = { level, runs: [] };
        lines.push(current);
      }
      const last = current.runs.at(-1);
      if (last && last.style === style && last.color === color) last.text += node.textContent;
      else current.runs.push({ text: node.textContent, style, color });
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName;
    const heading = /^H([1-6])$/u.exec(tag);
    const block = heading || /^(P|DIV|LI|UL|OL|BR|HR)$/u.test(tag);
    if (block) current = undefined;
    if (tag === 'HR') lines.push({ level: 0, runs: [{ text: '---', style: 'plain' }] });
    const nextStyle = /^(B|STRONG)$/u.test(tag) || node.style.fontWeight === 'bold'
      ? 'bold' : /^(I|EM)$/u.test(tag) ? 'italic' : tag === 'CODE' ? 'code' : style;
    const explicitColor = node.style.color || node.getAttribute('color');
    const nextInk = explicitColor ? readInk(explicitColor) : color;
    for (const child of node.childNodes) walk(child, heading ? Math.max(1, Number(heading[1]) - 2) : level, nextStyle, nextInk);
    if (block) current = undefined;
  }
  for (const node of root.childNodes) walk(node);
  return lines.reduce((markdown, { level, runs }) => {
    const body = runs.map(runMarkdown).join('').trimEnd();
    if (!body.trim()) return markdown;
    const isList = /^\s*(?:[-*+] |\d+[.)] )/u.test(body);
    const previousIsList = /(?:^|\n)\s*(?:[-*+] |\d+[.)] )[^\n]*$/u.test(markdown);
    const separator = !markdown ? '' : !level && isList && previousIsList ? '\n' : '\n\n';
    return markdown + separator + (level ? '#'.repeat(level + 1) + ' ' : '') + body;
  }, '');
}

export function DocumentEditor({ id, value, onChange, disabled, invalid, descriptionId }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  descriptionId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const serialized = useRef<string | undefined>(undefined);
  const selection = useRef<Range | undefined>(undefined);
  const [formatting, setFormatting] = useState<{ heading: boolean; bold: boolean; color: keyof typeof ink }>(
    { heading: false, bold: false, color: 'standard' },
  );
  useEffect(() => {
    if (serialized.current === value || !ref.current) return;
    loadDocument(ref.current, value);
    serialized.current = value;
    selection.current = undefined;
  }, [value]);

  function rememberSelection() {
    const root = ref.current;
    const current = root?.ownerDocument.getSelection();
    if (!root || !current?.rangeCount || !root.contains(current.anchorNode) || !root.contains(current.focusNode)) return;
    selection.current = current.getRangeAt(0).cloneRange();
    const doc = root.ownerDocument;
    const element = current.anchorNode instanceof Element ? current.anchorNode : current.anchorNode?.parentElement;
    const heading = !!element?.closest('h1,h2,h3,h4,h5,h6');
    const bold = doc.queryCommandState('bold');
    const color = readInk(doc.queryCommandValue('foreColor')) ?? 'standard';
    setFormatting(previous => previous.heading === heading && previous.bold === bold && previous.color === color
      ? previous : { heading, bold, color });
  }
  function update() {
    if (!ref.current) return;
    serialized.current = extractDocument(ref.current);
    onChange(serialized.current);
    rememberSelection();
  }
  function format(command: string, value?: string) {
    const root = ref.current;
    if (!root || disabled) return;
    const doc = root.ownerDocument;
    root.focus();
    if (selection.current && root.contains(selection.current.commonAncestorContainer)) {
      const actual = doc.getSelection();
      actual?.removeAllRanges();
      actual?.addRange(selection.current);
    }
    doc.execCommand(command, false, value);
    update();
  }
  return <div className={styles.editor}>
    <div role="group" aria-label="Formato del texto seleccionado" className={styles.toolbar}
      onMouseDown={event => event.preventDefault()}>
      <button type="button" disabled={disabled} aria-pressed={!formatting.heading} onClick={() => format('formatBlock', 'p')}>Párrafo</button>
      <button type="button" disabled={disabled} aria-pressed={formatting.heading} onClick={() => format('formatBlock', 'h3')}>Subtítulo</button>
      <button type="button" disabled={disabled} aria-pressed={formatting.bold} onClick={() => format('bold')}>Negrita</button>
      {Object.entries(ink).map(([label, hex]) => <button key={label} type="button" disabled={disabled}
        className={styles.swatch} aria-label={`Color ${colorNames[label as keyof typeof colorNames]}`}
        aria-pressed={formatting.color === label} title={colorNames[label as keyof typeof colorNames]} onClick={() => format('foreColor', hex)}>
        <span style={{ backgroundColor: hex }}/>
      </button>)}
    </div>
    <div id={id} ref={ref} className={styles.paper} contentEditable={!disabled} role="textbox"
      aria-label="Contenido" aria-multiline="true" aria-readonly={disabled} aria-invalid={invalid}
      aria-describedby={descriptionId} onInput={update} onMouseUp={rememberSelection}
      onKeyUp={rememberSelection} onBlur={rememberSelection} onDrop={event => event.preventDefault()}
      onPaste={event => {
        event.preventDefault();
        if (!disabled) event.currentTarget.ownerDocument.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
      }}/>
  </div>;
}

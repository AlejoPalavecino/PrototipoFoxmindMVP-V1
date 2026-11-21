import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { FoxyDiagram } from '../../src/core/domain/foxy/visual.ts';
import { FoxmindIcon } from './FoxmindIcon';
import { Dialog } from './feedback';
import styles from './interactive-diagram.module.css';

type Selection = { kind: 'node' | 'edge'; index: number };

export function VisualFocusPage({ children, onClose, disabled }: {
  children: ReactNode;
  onClose(): void;
  disabled?: boolean;
}) {
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => back.current?.focus({ preventScroll: true }), []);
  return <section className={styles.focusPage} aria-label="Esquema interactivo"
    onKeyDown={event => {
      if (event.key !== 'Escape' || event.defaultPrevented || disabled
        || event.target instanceof Element && event.target.closest('dialog')) return;
      event.preventDefault();
      if (!event.repeat) onClose();
    }}>
    <div className={styles.focusInner}>
      <nav className={styles.focusNav} aria-label="Navegación del esquema">
        <button ref={back} type="button" className={styles.secondary} onClick={onClose} disabled={disabled}>
          <FoxmindIcon name="arrow-left" />Volver al chat
        </button>
      </nav>
      {children}
    </div>
  </section>;
}

export function VisualCreationCover({ title, label, description, image, action }: {
  title: string;
  label: string;
  description?: string;
  image?: boolean;
  action?: ReactNode;
}) {
  return <div className={styles.cover}>
    <div className={styles.coverIcon}><FoxmindIcon name={image ? 'spark' : 'layers'} /></div>
    <div className={styles.coverText}>
      <p>{label}</p>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
    {action}
  </div>;
}

export function InteractiveDiagram({ diagram, teacher = false }: {
  diagram: FoxyDiagram;
  teacher?: boolean;
}) {
  const detailId = useId();
  const answerId = useId();
  const [selection, setSelection] = useState<Selection>({ kind: 'node', index: 0 });
  const [revealed, setRevealed] = useState(false);
  const [projected, setProjected] = useState(false);
  const nodes = new Map(diagram.nodes.map(node => [node.id, node]));
  const selectedNode = selection.kind === 'node' ? diagram.nodes[selection.index] : undefined;
  const selectedEdge = selection.kind === 'edge' ? diagram.edges[selection.index] : undefined;
  const selectedTitle = selectedNode?.label ?? selectedEdge?.label;
  const selectedExplanation = selectedNode?.explanation ?? selectedEdge?.explanation ?? diagram.description;
  const orderedEdges = diagram.nodes.slice(1).map((node, index) =>
    diagram.edges.findIndex(edge => edge.from === diagram.nodes[index].id && edge.to === node.id));
  const linear = orderedEdges.length === diagram.edges.length && orderedEdges.every(index => index !== -1);

  function select(kind: Selection['kind'], index: number) {
    setSelection({ kind, index });
    setRevealed(false);
  }

  function concept(index: number, target: string) {
    const node = diagram.nodes[index];
    return <button key={node.id} type="button" className={styles.node}
      aria-pressed={selection.kind === 'node' && selection.index === index} aria-controls={target}
      onClick={() => select('node', index)}>
      <FoxmindIcon name="book" /><strong>{node.label}</strong>
    </button>;
  }
  function relationship(index: number, target: string) {
    const edge = diagram.edges[index];
    return <button key={index} type="button" className={styles.edge}
      aria-pressed={selection.kind === 'edge' && selection.index === index} aria-controls={target}
      aria-label={`${nodes.get(edge.from)?.label}: ${edge.label || 'relación'} → ${nodes.get(edge.to)?.label}`}
      onClick={() => select('edge', index)}>
      <span aria-hidden="true" className={styles.arrow}>→</span>
      <strong>{edge.label || 'Relación'}</strong>
    </button>;
  }

  function atlas(projection = false) {
    const target = projection ? `${detailId}-projection` : detailId;
    return <section className={styles.atlas} aria-label="Esquema de conceptos">
      <div className={styles.atlasHeader}>
        <h4>{linear ? 'Recorrido de conceptos' : 'Mapa de conceptos'}</h4>
        {teacher && !projection && <button type="button" className={styles.secondary}
          onClick={() => setProjected(true)}>
          Proyectar
        </button>}
      </div>
      {linear ? <div className={styles.sequence} aria-label="Conceptos y relaciones">
        {diagram.nodes.flatMap((_, index) => index < orderedEdges.length
          ? [concept(index, target), relationship(orderedEdges[index], target)] : [concept(index, target)])}
      </div> : <>
        <div className={styles.concepts} aria-label="Conceptos">{diagram.nodes.map((_, index) => concept(index, target))}</div>
        {diagram.edges.length > 0 && <ul className={styles.relations} aria-label="Relaciones">
          {diagram.edges.map((edge, index) => <li key={index}>
            <span>{nodes.get(edge.from)?.label}</span>
            {relationship(index, target)}
            <span>{nodes.get(edge.to)?.label}</span>
          </li>)}
        </ul>}
      </>}
      <div className={styles.detail} id={target} aria-live="polite" aria-atomic="true">
        <div className={styles.detailVisual} aria-hidden="true">
          <span>{selectedEdge ? nodes.get(selectedEdge.from)?.label : selectedNode?.label}</span>
          {selectedEdge && <>→ <span>{nodes.get(selectedEdge.to)?.label}</span></>}
        </div>
        <div className={styles.caption}>
          <small>{selectedEdge ? 'Relación' : `Concepto ${selection.index + 1} de ${diagram.nodes.length}`}</small>
          <h4>{selectedTitle || 'Relación'}</h4>
          <p>{selectedExplanation}</p>
        </div>
      </div>
    </section>;
  }
  return <div className={styles.reader}>
    {atlas()}
    {diagram.challenge && <section className={styles.challenge}>
      <img src="/foxmind/foxy.webp" alt="" width={44} height={44} />
      <div>
        <strong>{teacher ? 'Pregunta para el aula' : 'Ponete a prueba'}</strong>
        <h4>{diagram.challenge.question}</h4>
        <p id={answerId} hidden={!revealed}>{diagram.challenge.answer}</p>
      </div>
      <button type="button" className={revealed ? styles.secondary : styles.reveal}
        aria-expanded={revealed} aria-controls={answerId} onClick={() => setRevealed(value => !value)}>
        {revealed ? 'Ocultar respuesta' : 'Ver respuesta'}
      </button>
    </section>}
    {projected && <Dialog className={styles.projected} title={diagram.title} onClose={() => setProjected(false)}>
      {atlas(true)}
      <button type="button" className={styles.exitProjection} onClick={() => setProjected(false)}>Salir de proyección</button>
    </Dialog>}
  </div>;
}

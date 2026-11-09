import s from './interaction-feedback.module.css';

export function AsyncFeedback({ title, detail, compact = false }: { title: string; detail?: string; compact?: boolean }) {
  return <div className={`${s.feedback} ${compact ? s.compact : ''}`} role="status" aria-live="polite" aria-atomic="true">
    <img className={s.mascot} src="/brujula/foxy-logotipo-redondo.webp" alt="" width={44} height={44}/>
    <div><strong>{title}</strong>{detail && <p>{detail}</p>}<span className={s.dots} aria-hidden="true"><i/><i/><i/></span></div>
  </div>;
}

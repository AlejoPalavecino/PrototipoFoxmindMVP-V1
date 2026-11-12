import { useEffect, useState } from 'react';
import s from './interaction-feedback.module.css';

export function AsyncFeedback({ title, detail, compact = false, showDelay = false }: {
  title: string; detail?: string; compact?: boolean; showDelay?: boolean;
}) {
  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    if (!showDelay) return;
    const timeout = setTimeout(() => setDelayed(true), 12000);
    return () => clearTimeout(timeout);
  }, [showDelay]);
  return <div className={`${s.feedback} ${compact ? s.compact : ''}`} role="status" aria-live="polite" aria-atomic="true">
    <img className={s.mascot} src="/brujula/foxy-logotipo-redondo.webp" alt="" width={44} height={44}/>
    <div><strong>{title}</strong>
      {showDelay && delayed ? <p>Está tardando más de lo habitual. Seguimos esperando la respuesta.</p> : detail && <p>{detail}</p>}
      <span className={s.dots} aria-hidden="true"><i/><i/><i/></span></div>
  </div>;
}

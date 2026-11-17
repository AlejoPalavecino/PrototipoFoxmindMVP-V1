import type { ReactNode, RefObject } from 'react';
import { Dialog, Notice } from '../../../../../../shared-ui/feedback';
import { AiProgress } from '../../../../../../shared-ui/AiProgress';

export function renderStudyFolderShell({ step, blocked, heading, headingText, description, error, leave, analyzing, working, status, onClose, onAdvance, onResume, onDiscard, sidebar, content, footer }: {
step: number; blocked: boolean; heading: RefObject<HTMLHeadingElement | null>; headingText: string; description: string; error: string; leave: boolean; analyzing: boolean; working: boolean; status: string; onClose: () => void; onAdvance: () => void; onResume: () => void; onDiscard: () => void; sidebar: ReactNode; content: ReactNode; footer: ReactNode;
}) {
return (<Dialog title="Crear una carpeta" className="parity-classroom-wizard parity-study-wizard study-exact-wizard" onClose={onClose}>
    <form
      className="class-wizard-form"
      data-wizard-step={step}
      aria-busy={blocked}
      onSubmit={(event) => {
        event.preventDefault();
        onAdvance();

      }}>
      <div className="class-builder">
        {sidebar}
        <section className="class-builder-stage">
          <div className="class-step-heading">
            <span>Paso {step + 1} de 4</span>
            <h3 ref={heading} tabIndex={-1}>
              {headingText}
            </h3>
            <p>{description}</p>
          </div>
          <div key={step} className="class-step-content">
            {error && <Notice error>{error}</Notice>}
            {leave && (<Notice>
              Hay cambios sin guardar.{' '}
              <button type="button" autoFocus onClick={() => onResume()}>
                Seguir editando
              </button>{' '}
              <button type="button" onClick={onDiscard}>
                Salir sin guardar
              </button>
            </Notice>)}
            {analyzing ? (<AiProgress state="RUNNING" task="plan" hint="Vas a poder revisar y ajustar las unidades antes de crear tu carpeta." />) : (<fieldset disabled={blocked || leave}>
              {content}
            </fieldset>)}
          </div>
          <p className="brujula-wizard-save" role="status">
            {working && <span className="wizard-spinner" aria-hidden="true" />}
            {status}
          </p>
        </section>
      </div>
      {footer}
    </form>
  </Dialog>);
}

import { useEffect, useRef, useState } from 'react';
import { createWebFoxyClient } from '../api/foxy-client';
import { createFoxyCatalogController } from './foxy-catalog-controller';

type Controller = ReturnType<typeof createFoxyCatalogController>;
export function useFoxyCatalog({ subjectId, onIdentityRequired, stamp }: { subjectId: string; onIdentityRequired: (code: string) => void; stamp: string }) {
  const callback = useRef(onIdentityRequired); callback.current = onIdentityRequired;
  const subject = useRef(subjectId); subject.current = subjectId;
  const [view, setView] = useState<{ subjectId: string; controller: Controller; state: ReturnType<Controller['getState']> } | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let active = true;
    const controller = createFoxyCatalogController({
      client: createWebFoxyClient(fetch, code => {
        if (active && subject.current === subjectId) { active = false; controller.dispose(); setView(null); callback.current(code); }
      }),
      onChange: state => { if (active && subject.current === subjectId) setView({ subjectId, controller, state }); },
    });
    setView({ subjectId, controller, state: controller.getState() });
    void controller.refresh();
    const close = () => { active = false; controller.dispose(); setView(null); };
    window.addEventListener('pagehide', close);
    return () => { active = false; controller.dispose(); window.removeEventListener('pagehide', close); };
  }, [subjectId]);
  const current = view?.subjectId === subjectId ? view : null;
  const controller = current?.controller;
  useEffect(() => {
    if (!controller) return;
    const timer = setTimeout(() => { void controller.refresh(); }, 200);
    return () => clearTimeout(timer);
  }, [controller, stamp]);
  return current;
}

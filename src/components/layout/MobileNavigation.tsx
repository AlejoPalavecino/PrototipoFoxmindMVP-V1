import React, { useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import type { AppView } from '../../app/navigation';

interface MobileNavigationItem {
  id: AppView;
  label: string;
  mobileLabel?: string;
  icon: LucideIcon;
}

export function MobileNavigation({ items, view, routeKey, onNavigate }: {
  items: MobileNavigationItem[];
  view: AppView;
  routeKey: string;
  onNavigate: (view: AppView) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const navRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const primary = items.slice(0, 5);
  const overflow = items.slice(5);
  const overflowActive = overflow.some(item => item.id === view);

  useEffect(() => { setIsOpen(false); }, [routeKey]);

  useEffect(() => {
    if (!isOpen) return;
    const onOutside = (event: Event) => {
      if (event.target && !navRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('focusin', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onOutside);
      document.removeEventListener('focusin', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [isOpen]);

  const navigate = (id: AppView) => {
    setIsOpen(false);
    onNavigate(id);
  };
  const focusStyle = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fox-orange';

  return (
    <nav ref={navRef} aria-label="Navegación móvil" className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-fox-border shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
      {/* Six equal-width targets fit at 320px; the 80px bar matches main's pb-20. */}
      <div className="grid grid-cols-6 h-20 w-full px-1 py-2">
        {primary.map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" onClick={() => navigate(item.id)}
              aria-label={item.label} aria-current={view === item.id ? 'page' : undefined}
              className={`min-w-0 min-h-[44px] flex flex-col items-center justify-center rounded-lg ${focusStyle} ${view === item.id ? 'text-fox-orange' : 'text-fox-text-muted/70'}`}>
              <Icon size={22} aria-hidden="true" className="shrink-0" />
              <span className="text-[10px] mt-1 font-medium max-w-full truncate">{item.mobileLabel ?? item.label}</span>
            </button>
          );
        })}
        {overflow.length > 0 && (
          <button ref={triggerRef} type="button" onClick={() => setIsOpen(open => !open)}
            aria-expanded={isOpen} aria-controls={panelId}
            className={`min-w-0 min-h-[44px] flex flex-col items-center justify-center rounded-lg ${focusStyle} ${overflowActive ? 'text-fox-orange' : 'text-fox-text-muted/70'}`}>
            <MoreHorizontal size={22} aria-hidden="true" />
            <span className="text-[10px] mt-1 font-medium">Más</span>
          </button>
        )}
      </div>
      {/* After the trigger in tab order; ordinary buttons, no menu or modal semantics. */}
      <div id={panelId} hidden={!isOpen} className="absolute bottom-full left-0 right-0 bg-white border-t border-fox-border shadow-lg p-2 max-h-[60vh] overflow-y-auto">
        {overflow.map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" onClick={() => navigate(item.id)}
              aria-label={item.label} aria-current={view === item.id ? 'page' : undefined}
              className={`w-full min-w-0 min-h-[44px] flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-left ${focusStyle} ${view === item.id ? 'bg-fox-orange text-white' : 'text-fox-text-muted hover:bg-fox-bg hover:text-fox-orange'}`}>
              <Icon size={20} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 break-words">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

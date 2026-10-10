import React, { useState, useRef, useEffect } from 'react';
import { X, Type, Contrast, BookOpen, Scaling } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../../context';

export function AccessibilityPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSettings } = useAppContext();

  const toggleSetting = (key: keyof typeof settings) => {
    if (key === 'dyslexic' || key === 'contrast' || key === 'easyRead') {
      updateSettings({ [key]: !settings[key] });
    }
  };

  // Refs for keyboard navigation
  const dyslexicRef = useRef<HTMLInputElement>(null);
  const contrastRef = useRef<HTMLInputElement>(null);
  const easyReadRef = useRef<HTMLInputElement>(null);
  const sizeSRef = useRef<HTMLButtonElement>(null);
  const sizeMRef = useRef<HTMLButtonElement>(null);
  const sizeLRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus management when opening
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isOpen) {
      timeoutId = setTimeout(() => {
        dyslexicRef.current?.focus();
      }, 100);
    }
    return () => clearTimeout(timeoutId);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent, current: string) => {
    const focusMap: Record<string, any> = {
      dyslexic: { up: closeBtnRef, down: contrastRef },
      contrast: { up: dyslexicRef, down: easyReadRef },
      easyRead: { up: contrastRef, down: settings.textSize === 'S' ? sizeSRef : settings.textSize === 'L' ? sizeLRef : sizeMRef },
      sizeS: { up: easyReadRef, right: sizeMRef, left: null },
      sizeM: { up: easyReadRef, right: sizeLRef, left: sizeSRef },
      sizeL: { up: easyReadRef, right: null, left: sizeMRef },
      close: { down: dyslexicRef }
    };

    if (e.key === 'Enter' || e.key === ' ') {
      if (current === 'dyslexic' || current === 'contrast' || current === 'easyRead') {
        e.preventDefault();
        toggleSetting(current as keyof typeof settings);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusMap[current]?.down?.current?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusMap[current]?.up?.current?.focus();
    } else if (e.key === 'ArrowLeft') {
      if (focusMap[current]?.left) {
        e.preventDefault();
        focusMap[current].left.current?.focus();
      }
    } else if (e.key === 'ArrowRight') {
      if (focusMap[current]?.right) {
        e.preventDefault();
        focusMap[current].right.current?.focus();
      }
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        aria-expanded={isOpen}
        className="fixed bottom-24 md:bottom-6 right-6 z-50 w-14 h-14 bg-[#3BB54A] text-white rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-[#3BB54A]/50"
        aria-label="Abrir panel de accesibilidad DUA"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="4.5" r="2.5"/>
          <path d="M15 8H9a2 2 0 0 0-2 2l-2 5a1 1 0 0 0 2 1l1.5-3V15l-2.5 7a1 1 0 0 0 2 1L12 17l4 6a1 1 0 0 0 2-1l-2.5-7v-2l1.5 3a1 1 0 0 0 2-1l-2-5a2 2 0 0 0-2-2z" />
        </svg>
      </motion.button>

      {/* Panel Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:justify-end sm:pr-6 sm:pb-24 pointer-events-none">
            {/* Backdrop for ALL screens to fix click-outside bug */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto"
            />

            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
              className="relative w-full sm:w-80 bg-fox-surface rounded-t-3xl sm:rounded-3xl shadow-2xl border border-fox-border overflow-hidden pointer-events-auto"
              role="dialog"
              aria-modal="true"
              aria-label="Panel de Accesibilidad DUA"
            >
              <div className="p-5 border-b border-fox-border flex justify-between items-center bg-[#3BB54A]/5">
                <h3 className="font-heading font-bold text-[#3BB54A] flex items-center gap-2 text-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="4.5" r="2.5"/>
                    <path d="M15 8H9a2 2 0 0 0-2 2l-2 5a1 1 0 0 0 2 1l1.5-3V15l-2.5 7a1 1 0 0 0 2 1L12 17l4 6a1 1 0 0 0 2-1l-2.5-7v-2l1.5 3a1 1 0 0 0 2-1l-2-5a2 2 0 0 0-2-2z" />
                  </svg> Accesibilidad DUA
                </h3>
                <button 
                  ref={closeBtnRef}
                  onKeyDown={(e) => handleKeyDown(e, 'close')}
                  onClick={() => setIsOpen(false)} 
                  className="text-fox-text-muted/70 hover:text-fox-text-muted bg-fox-surface rounded-full p-1.5 shadow-sm border border-fox-border focus:outline-none focus:ring-2 focus:ring-[#3BB54A] transition-colors"
                  aria-label="Cerrar panel"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Toggles */}
                <div className="space-y-4">
                  {/* Dyslexic Toggle */}
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-fox-bg rounded-lg text-fox-text-muted group-hover:bg-[#3BB54A]/10 group-hover:text-[#3BB54A] transition-colors"><Type size={18} /></div>
                      <div>
                        <p className="text-sm font-bold text-fox-text-main">Fuente OpenDyslexic</p>
                        <p className="text-xs text-fox-text-muted">Facilita la lectura</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={settings.dyslexic} 
                        onChange={() => toggleSetting('dyslexic')}
                        ref={dyslexicRef}
                        onKeyDown={(e) => handleKeyDown(e, 'dyslexic')}
                        aria-label="Activar fuente OpenDyslexic"
                      />
                      <div className="w-11 h-6 bg-fox-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-[#3BB54A] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-fox-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fox-surface after:border-fox-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3BB54A]"></div>
                    </label>
                  </div>

                  {/* Contrast Toggle */}
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-fox-bg rounded-lg text-fox-text-muted group-hover:bg-[#3BB54A]/10 group-hover:text-[#3BB54A] transition-colors"><Contrast size={18} /></div>
                      <div>
                        <p className="text-sm font-bold text-fox-text-main">Alto Contraste</p>
                        <p className="text-xs text-fox-text-muted">Mejora la visibilidad</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={settings.contrast} 
                        onChange={() => toggleSetting('contrast')}
                        ref={contrastRef}
                        onKeyDown={(e) => handleKeyDown(e, 'contrast')}
                        aria-label="Activar alto contraste"
                      />
                      <div className="w-11 h-6 bg-fox-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-[#3BB54A] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-fox-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fox-surface after:border-fox-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3BB54A]"></div>
                    </label>
                  </div>

                  {/* Easy Read Toggle */}
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-fox-bg rounded-lg text-fox-text-muted group-hover:bg-[#3BB54A]/10 group-hover:text-[#3BB54A] transition-colors"><BookOpen size={18} /></div>
                      <div>
                        <p className="text-sm font-bold text-fox-text-main">Lectura Fácil</p>
                        <p className="text-xs text-fox-text-muted">Simplifica textos complejos</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={settings.easyRead} 
                        onChange={() => toggleSetting('easyRead')}
                        ref={easyReadRef}
                        onKeyDown={(e) => handleKeyDown(e, 'easyRead')}
                        aria-label="Activar lectura fácil"
                      />
                      <div className="w-11 h-6 bg-fox-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-[#3BB54A] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-fox-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fox-surface after:border-fox-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3BB54A]"></div>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t border-fox-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Scaling size={16} className="text-fox-text-muted" />
                    <p className="text-sm font-bold text-fox-text-main">Tamaño de texto</p>
                  </div>
                  <div className="flex bg-fox-bg p-1 rounded-xl border border-fox-border" role="radiogroup" aria-label="Seleccionar tamaño de texto">
                    <button
                      ref={sizeSRef}
                      onKeyDown={(e) => handleKeyDown(e, 'sizeS')}
                      onClick={() => updateSettings({ textSize: 'S' })}
                      aria-checked={settings.textSize === 'S'}
                      role="radio"
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#3BB54A] ${
                        settings.textSize === 'S' 
                          ? 'bg-fox-surface text-[#3BB54A] shadow-sm' 
                          : 'text-fox-text-muted hover:text-fox-text-main'
                      }`}
                    >
                      A
                    </button>
                    <button
                      ref={sizeMRef}
                      onKeyDown={(e) => handleKeyDown(e, 'sizeM')}
                      onClick={() => updateSettings({ textSize: 'M' })}
                      aria-checked={settings.textSize === 'M'}
                      role="radio"
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#3BB54A] ${
                        settings.textSize === 'M' 
                          ? 'bg-fox-surface text-[#3BB54A] shadow-sm' 
                          : 'text-fox-text-muted hover:text-fox-text-main'
                      }`}
                    >
                      A+
                    </button>
                    <button
                      ref={sizeLRef}
                      onKeyDown={(e) => handleKeyDown(e, 'sizeL')}
                      onClick={() => updateSettings({ textSize: 'L' })}
                      aria-checked={settings.textSize === 'L'}
                      role="radio"
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#3BB54A] ${
                        settings.textSize === 'L' 
                          ? 'bg-fox-surface text-[#3BB54A] shadow-sm' 
                          : 'text-fox-text-muted hover:text-fox-text-main'
                      }`}
                    >
                      A++
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

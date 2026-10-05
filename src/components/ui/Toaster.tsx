import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

let toastCounter = 0;
type ToastType = 'success' | 'warning' | 'info' | 'error';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export const toast = {
  listeners: new Set<(t: Toast) => void>(),
  show(message: string, type: ToastType = 'info') {
    const newToast = { id: ++toastCounter, message, type };
    this.listeners.forEach(l => l(newToast));
  }
};

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (t: Toast) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== t.id));
      }, 5000);
    };
    toast.listeners.add(listener);
    return () => { toast.listeners.delete(listener); };
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  const getTypeStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-fox-green/10 border-fox-green/20 text-fox-green';
      case 'error':
        return 'bg-fox-red/10 border-fox-red/20 text-fox-red';
      case 'warning':
        return 'bg-fox-orange/10 border-fox-orange/20 text-fox-orange';
      case 'info':
      default:
        return 'bg-fox-purple/10 border-fox-purple/20 text-fox-purple';
    }
  };

  const getProgressColor = (type: ToastType) => {
     switch (type) {
      case 'success': return 'bg-fox-green';
      case 'error': return 'bg-fox-red';
      case 'warning': return 'bg-fox-orange';
      case 'info': default: return 'bg-fox-purple';
    }
  }

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none sm:top-6 sm:right-6">
      <AnimatePresence>
        {toasts.map(t => {
          const typeStyle = getTypeStyles(t.type);
          
          return (
            <motion.div
              layout
              key={t.id}
              initial={{ opacity: 0, y: -30, scale: 0.9, filter: 'blur(5px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(5px)', transition: { duration: 0.2 } }}
              className={`pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl border p-4 shadow-xl ring-1 ring-black/5 bg-white/95 backdrop-blur-xl ${typeStyle.replace(/bg-.*\/10/, '')} border-fox-border`}
            >
              <div className={`mt-0.5 flex-shrink-0 p-1.5 rounded-full ${typeStyle.split(' ')[0]}`}>
                {t.type === 'success' && <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />}
                {t.type === 'warning' && <AlertTriangle className="h-5 w-5" strokeWidth={2.5} />}
                {t.type === 'error' && <XCircle className="h-5 w-5" strokeWidth={2.5} />}
                {t.type === 'info' && <Info className="h-5 w-5" strokeWidth={2.5} />}
              </div>
              <div className="flex-1 text-sm font-bold text-fox-text-main pt-1.5 leading-snug">
                {t.message}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="ml-auto mt-1 flex-shrink-0 rounded-full p-1.5 text-fox-text-muted/60 hover:bg-fox-bg hover:text-fox-text-main focus:outline-none transition-colors"
                aria-label="Cerrar notificación"
              >
                <X className="h-4 w-4" />
              </button>
              
              {/* Progress Bar Animation */}
              <motion.div 
                 initial={{ width: '100%' }}
                 animate={{ width: '0%' }}
                 transition={{ duration: 4.8, ease: "linear" }}
                 className={`absolute bottom-0 left-0 h-[3px] opacity-20 ${getProgressColor(t.type)}`}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context';
import { BookOpen, Brain, Home, LogOut, Settings, TrendingUp, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { DashboardAlumno } from '../../views/alumno/DashboardAlumno';
import { EstudiaAlumno } from '../../views/alumno/EstudiaAlumno';
import { AulasAlumno } from '../../views/alumno/AulasAlumno';
import { ProgresoAlumno } from '../../views/alumno/ProgresoAlumno';
import { ConfiguracionAlumno } from '../../views/alumno/ConfiguracionAlumno';
import { MensajesAlumno } from '../../views/alumno/MensajesAlumno';
import { messagingStore } from '../../features/messaging/messagingStore';

export function AlumnoLayout() {
  const { view, setView, setRole } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(true);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(() => messagingStore.getUnreadCount('alumno'));

  useEffect(() => {
    const unsub = messagingStore.subscribe(() => {
      setUnreadMessagesCount(messagingStore.getUnreadCount('alumno'));
    });
    return unsub;
  }, []);

  const navItems = [
    { id: 'dashboard' as const, label: 'Mi Dashboard', icon: Home },
    { id: 'estudia' as const, label: 'Carpeta de Estudio', icon: Brain, badge: 'IA' },
    { id: 'aulas' as const, label: 'Mis Aulas', icon: BookOpen },
    { id: 'progreso' as const, label: 'Mi Progreso', icon: TrendingUp },
    { id: 'mensajes' as const, label: 'Mensajes', icon: MessageSquare, count: unreadMessagesCount },
    { id: 'config' as const, label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-fox-bg">
      {/* Sidebar */}
      <aside 
        className={`bg-fox-surface border-r border-fox-border flex-col hidden md:flex transition-all duration-300 relative z-20 ${
          isExpanded ? 'w-64' : 'w-20'
        }`}
      >
        <div className={`flex items-center ${isExpanded ? 'justify-between px-6' : 'justify-center px-4'} py-4 h-20`}>
          {isExpanded && (
            <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden">
              <img src="/logo.png" alt="FoxMind Logo" className="h-12 w-auto object-contain" />
            </div>
          )}
          {!isExpanded && (
            <img src="/logo.png" alt="FoxMind Logo" className="w-12 h-auto object-contain" title="FoxMind" />
          )}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-fox-text-muted/70 hover:bg-fox-border/50 hover:text-fox-text-muted transition-colors absolute -right-3 top-7 bg-fox-surface border border-fox-border shadow-sm z-30"
          >
            {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
        
        <nav className="flex-1 px-3 space-y-2 mt-4 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                title={!isExpanded ? item.label : undefined}
                className={`w-full flex items-center ${isExpanded ? 'justify-start px-4' : 'justify-center px-0'} py-3 rounded-xl text-sm font-bold transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-fox-orange text-white shadow-md shadow-fox-orange/20' 
                    : 'text-fox-text-muted hover:bg-fox-bg hover:text-fox-orange'
                }`}
              >
                <Icon size={20} className={`${isActive ? 'text-white' : 'text-fox-text-muted/70 group-hover:text-fox-orange'} transition-colors shrink-0`} />
                
                {isExpanded && (
                  <span className="ml-3 whitespace-nowrap">{item.label}</span>
                )}
                
                {isExpanded && item.badge && (
                  <span className={`ml-auto text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-fox-surface/20 text-white' : 'bg-fox-purple/10 text-fox-purple'
                  }`}>
                    {item.badge}
                  </span>
                )}

                {isExpanded && item.count !== undefined && item.count > 0 && (
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${
                    isActive ? 'bg-white text-fox-orange' : 'bg-fox-orange text-white animate-pulse'
                  }`}>
                    {item.count}
                  </span>
                )}

                {/* Collapsed unread dot indicator */}
                {!isExpanded && item.count !== undefined && item.count > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-fox-orange rounded-full ring-2 ring-fox-surface animate-ping" />
                )}

                {/* Tooltip for collapsed state */}
                {!isExpanded && (
                  <div className="absolute left-full ml-4 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-fox-border">
          <div className={`flex items-center ${isExpanded ? 'gap-3 px-2' : 'justify-center'} mb-2`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fox-orange to-orange-500 flex items-center justify-center text-white font-bold shadow-sm shrink-0">
              VR
            </div>
            {isExpanded && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-fox-text-main truncate">Valentina Rodríguez</p>
                <p className="text-xs text-fox-text-muted truncate">3° Año B</p>
              </div>
            )}
          </div>
          
          {isExpanded && (
            <div className="px-2 mb-4 flex flex-wrap gap-2">
               <div className="bg-fox-gold/10 text-fox-gold text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1 shadow-sm">
                  🔥 7 días
               </div>
               <div className="bg-fox-purple/10 text-fox-purple text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1 shadow-sm">
                  ✨ 2,450 XP
               </div>
            </div>
          )}

          <button 
            onClick={() => setRole('none')}
            title={!isExpanded ? "Cerrar sesión" : undefined}
            className={`w-full flex items-center ${isExpanded ? 'justify-start px-4' : 'justify-center px-0'} py-2.5 text-sm font-bold text-fox-text-muted hover:text-fox-red transition-colors rounded-xl hover:bg-red-50 group`}
          >
            <LogOut size={18} className="shrink-0 group-hover:text-fox-red transition-colors" />
            {isExpanded && <span className="ml-3 whitespace-nowrap">Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative pb-20 md:pb-0">
        <div className="md:hidden p-4 bg-fox-surface border-b flex justify-between items-center">
           <img src="/logo.png" alt="FoxMind Logo" className="h-10 w-auto object-contain" />
           <button onClick={() => setRole('none')} className="text-sm text-fox-orange font-medium">Cambiar rol</button>
        </div>
        <div className="p-4 md:p-8 max-w-7xl mx-auto h-full">
          {view === 'dashboard' && <DashboardAlumno />}
          {view === 'estudia' && <EstudiaAlumno />}
          {view === 'aulas' && <AulasAlumno />}
          {view === 'progreso' && <ProgresoAlumno />}
          {view === 'mensajes' && <MensajesAlumno />}
          {view === 'config' && <ConfiguracionAlumno />}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-fox-border shadow-[0_-4px_20px_rgba(0,0,0,0.05)] flex items-center justify-between px-6 p-4 z-40 pb-6">
         {navItems.slice(0, 5).map(item => {
            const Icon = item.icon;
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex flex-col items-center p-2 min-w-[44px] min-h-[44px] ${isActive ? 'text-fox-orange' : 'text-fox-text-muted/70'}`}
              >
                <Icon size={24} />
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              </button>
            );
          })}
      </nav>
    </div>
  );
}

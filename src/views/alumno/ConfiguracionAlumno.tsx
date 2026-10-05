import React, { useState } from 'react';
import { User, Bell, BrainCircuit, Shield, Camera, Save, CheckCircle2, Palette, Sun, Moon, Monitor, LayoutGrid, List, Type, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../../context';

type TabId = 'perfil' | 'notificaciones' | 'ia' | 'apariencia' | 'seguridad';

export function ConfiguracionAlumno() {
  const [activeTab, setActiveTab] = useState<TabId>('perfil');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { settings, updateSettings } = useAppContext();
  const theme = settings.theme;
  const setTheme = (val: string) => updateSettings({ theme: val });
  const density = settings.density;
  const setDensity = (val: string) => updateSettings({ density: val });
  const fontSize = settings.fontSize;
  const setFontSize = (val: string) => updateSettings({ fontSize: val });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1000);
  };

  const tabs = [
    { id: 'perfil', label: 'Perfil', icon: User },
    { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
    { id: 'ia', label: 'Preferencias IA', icon: BrainCircuit },
    { id: 'apariencia', label: 'Apariencia', icon: Palette },
    { id: 'seguridad', label: 'Seguridad', icon: Shield },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-20 md:pb-0">
      <header className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-fox-text-main flex items-center gap-3 flex-wrap">
              <span className="p-2 rounded-2xl bg-fox-purple/10 text-fox-purple border border-fox-purple/20 flex items-center justify-center shrink-0">
                <Settings className="w-6 h-6" />
              </span>
              <span>Configuración y Preferencias</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20 font-sans font-semibold">
                Perfil Estudiante
              </span>
            </h1>
            <p className="text-fox-text-muted mt-1.5 text-sm max-w-2xl leading-relaxed">
              Administrá tu perfil de estudiante, preferencias de estudio con Foxy, notificaciones de tareas y ajustes visuales.
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-fox-surface rounded-3xl shadow-sm border border-fox-border p-3 flex flex-row md:flex-col gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabId)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-fox-purple/10 text-fox-purple'
                      : 'text-fox-text-muted hover:bg-fox-bg hover:text-fox-text-main'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-fox-purple' : 'text-fox-text-muted/70'} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <div className="bg-fox-surface rounded-3xl shadow-sm border border-fox-border p-6 md:p-8 min-h-[500px]">
            
            {/* PERFIL */}
            {activeTab === 'perfil' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-fox-text-main mb-1">Información Personal</h2>
                  <p className="text-sm text-fox-text-muted">Actualiza tu foto y datos básicos.</p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-fox-purple/10 flex items-center justify-center text-fox-purple text-2xl font-bold border-4 border-fox-surface shadow-sm">
                      VR
                    </div>
                    <button className="absolute bottom-0 right-0 w-8 h-8 bg-fox-surface rounded-full border border-fox-border shadow-sm flex items-center justify-center text-fox-text-muted hover:text-fox-purple hover:border-fox-purple transition-colors">
                      <Camera size={14} />
                    </button>
                  </div>
                  <div>
                    <h3 className="font-bold text-fox-text-main">Foto de perfil</h3>
                    <p className="text-xs text-fox-text-muted mt-1">JPG, GIF o PNG. Máximo 2MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-fox-text-main/80">Nombre</label>
                    <input type="text" defaultValue="Valentina" readOnly className="w-full px-4 py-3 bg-fox-bg border border-fox-border rounded-xl outline-none transition-all opacity-70 cursor-not-allowed" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-fox-text-main/80">Apellido</label>
                    <input type="text" defaultValue="Rodríguez" readOnly className="w-full px-4 py-3 bg-fox-bg border border-fox-border rounded-xl outline-none transition-all opacity-70 cursor-not-allowed" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-fox-text-main/80">Correo Electrónico</label>
                    <input type="email" defaultValue="valentina.rodriguez@alumno.edu" readOnly className="w-full px-4 py-3 bg-fox-bg border border-fox-border rounded-xl outline-none transition-all opacity-70 cursor-not-allowed" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-fox-text-main/80">Intereses y Metas</label>
                    <textarea rows={3} defaultValue="Me encanta la literatura y la historia. Quiero mejorar en matemáticas este año." className="w-full px-4 py-3 bg-fox-bg border border-fox-border rounded-xl focus:ring-2 focus:ring-fox-purple/20 focus:border-fox-purple outline-none transition-all resize-none" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* NOTIFICACIONES */}
            {activeTab === 'notificaciones' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-fox-text-main mb-1">Notificaciones</h2>
                  <p className="text-sm text-fox-text-muted">Elige qué alertas deseas recibir y cómo.</p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-fox-bg rounded-2xl border border-fox-border">
                    <div>
                      <h4 className="font-bold text-fox-text-main text-sm">Recordatorios de Tareas</h4>
                      <p className="text-xs text-fox-text-muted mt-1">Recibe un aviso 24 horas antes del vencimiento de una tarea.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-fox-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-fox-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fox-surface after:border-fox-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fox-purple"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-fox-bg rounded-2xl border border-fox-border">
                    <div>
                      <h4 className="font-bold text-fox-text-main text-sm">Nuevos Materiales</h4>
                      <p className="text-xs text-fox-text-muted mt-1">Notificación cuando un profesor suba nuevo material de estudio.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-fox-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-fox-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fox-surface after:border-fox-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fox-purple"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-fox-bg rounded-2xl border border-fox-border">
                    <div>
                      <h4 className="font-bold text-fox-text-main text-sm">Sugerencias de Foxy</h4>
                      <p className="text-xs text-fox-text-muted mt-1">Permite que la IA te envíe recordatorios de repaso espaciado.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-fox-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-fox-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fox-surface after:border-fox-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fox-purple"></div>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PREFERENCIAS IA */}
            {activeTab === 'ia' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-fox-text-main mb-1 flex items-center gap-2">
                    Preferencias de IA
                    <span className="bg-fox-purple/10 text-fox-purple text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Foxy</span>
                  </h2>
                  <p className="text-sm text-fox-text-muted">Personaliza cómo interactúa tu tutor virtual contigo.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-fox-text-main/80">Estilo de Aprendizaje Preferido</label>
                    <select className="w-full px-4 py-3 bg-fox-bg border border-fox-border rounded-xl focus:ring-2 focus:ring-fox-purple/20 focus:border-fox-purple outline-none transition-all appearance-none cursor-pointer">
                      <option>Visual (Esquemas, mapas mentales)</option>
                      <option>Auditivo (Explicaciones narradas)</option>
                      <option>Lectura/Escritura (Textos detallados)</option>
                      <option>Kinestésico (Ejemplos prácticos)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-fox-purple/20 bg-fox-purple/5 rounded-2xl">
                    <div>
                      <h4 className="font-bold text-fox-text-main text-sm">Método Socrático Estricto</h4>
                      <p className="text-xs text-fox-text-muted mt-1">La IA nunca te dará la respuesta directa, siempre te guiará con preguntas.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-fox-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-fox-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fox-surface after:border-fox-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fox-purple"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-fox-bg rounded-2xl border border-fox-border">
                    <div>
                      <h4 className="font-bold text-fox-text-main text-sm">Resúmenes Automáticos</h4>
                      <p className="text-xs text-fox-text-muted mt-1">Generar un resumen al finalizar cada sesión de estudio con Foxy.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-fox-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-fox-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fox-surface after:border-fox-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fox-purple"></div>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {/* APARIENCIA Y ACCESIBILIDAD */}
            {activeTab === 'apariencia' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-fox-text-main mb-1">Apariencia y Accesibilidad</h2>
                  <p className="text-sm text-fox-text-muted">Personaliza la interfaz para que se adapte a tus necesidades visuales.</p>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-fox-text-main/80">Tema Visual</label>
                    <div className="grid grid-cols-3 gap-4">
                      <button 
                        onClick={() => setTheme('light')}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === 'light' ? 'border-fox-purple bg-fox-purple/5 text-fox-purple' : 'border-fox-border hover:border-fox-border text-fox-text-muted'}`}
                      >
                        <Sun size={24} />
                        <span className="text-sm font-bold">Claro</span>
                      </button>
                      <button 
                        onClick={() => setTheme('dark')}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === 'dark' ? 'border-fox-purple bg-fox-purple/5 text-fox-purple' : 'border-fox-border hover:border-fox-border text-fox-text-muted'}`}
                      >
                        <Moon size={24} />
                        <span className="text-sm font-bold">Oscuro</span>
                      </button>
                      <button 
                        onClick={() => setTheme('auto')}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === 'auto' ? 'border-fox-purple bg-fox-purple/5 text-fox-purple' : 'border-fox-border hover:border-fox-border text-fox-text-muted'}`}
                      >
                        <Monitor size={24} />
                        <span className="text-sm font-bold">Automático</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-fox-text-main/80">Densidad de Información</label>
                    <p className="text-xs text-fox-text-muted">Elige cómo se ven las listas de aulas y tareas.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setDensity('comoda')}
                        className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${density === 'comoda' ? 'border-fox-purple bg-fox-purple/5 text-fox-purple' : 'border-fox-border hover:border-fox-border text-fox-text-muted'}`}
                      >
                        <LayoutGrid size={20} />
                        <div className="text-left">
                          <span className="text-sm font-bold block">Cómoda</span>
                          <span className="text-xs opacity-70">Tarjetas grandes y espaciosas</span>
                        </div>
                      </button>
                      <button 
                        onClick={() => setDensity('compacta')}
                        className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${density === 'compacta' ? 'border-fox-purple bg-fox-purple/5 text-fox-purple' : 'border-fox-border hover:border-fox-border text-fox-text-muted'}`}
                      >
                        <List size={20} />
                        <div className="text-left">
                          <span className="text-sm font-bold block">Compacta</span>
                          <span className="text-xs opacity-70">Filas tipo tabla para ver más datos</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-fox-text-main/80">Tamaño de Fuente</label>
                    <div className="flex bg-fox-bg p-1 rounded-xl border border-fox-border">
                      {[
                        { id: 'pequeno', label: 'Pequeño' }, 
                        { id: 'normal', label: 'Normal' }, 
                        { id: 'grande', label: 'Grande' }
                      ].map((size) => (
                        <button
                          key={size.id}
                          onClick={() => setFontSize(size.id)}
                          className={`flex-1 py-2 text-sm font-bold capitalize rounded-lg transition-all ${fontSize === size.id ? 'bg-fox-surface shadow-sm text-fox-purple' : 'text-fox-text-muted hover:text-fox-text-main/80'}`}
                        >
                          {size.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-fox-border space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-fox-text-main mb-1 text-[#3BB54A] flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="4.5" r="2.5"/>
                          <path d="M15 8H9a2 2 0 0 0-2 2l-2 5a1 1 0 0 0 2 1l1.5-3V15l-2.5 7a1 1 0 0 0 2 1L12 17l4 6a1 1 0 0 0 2-1l-2.5-7v-2l1.5 3a1 1 0 0 0 2-1l-2-5a2 2 0 0 0-2-2z" />
                        </svg> Accesibilidad DUA
                      </h3>
                      <p className="text-sm text-fox-text-muted">Ajustes universales para tu comodidad visual.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Dyslexic toggle */}
                      <label className={`relative p-4 border-2 rounded-xl flex items-center justify-between cursor-pointer transition-all ${settings.dyslexic ? 'border-[#3BB54A] bg-[#3BB54A]/5' : 'border-fox-border hover:border-[#3BB54A]/50'}`}>
                        <div className="flex items-center gap-3">
                          <Type size={20} className={settings.dyslexic ? 'text-[#3BB54A]' : 'text-fox-text-muted'} />
                          <div>
                            <p className="text-sm font-bold text-fox-text-main">Fuente OpenDyslexic</p>
                            <p className="text-xs text-fox-text-muted">Facilita la lectura</p>
                          </div>
                        </div>
                        <input type="checkbox" className="sr-only" checked={settings.dyslexic} onChange={() => updateSettings({ dyslexic: !settings.dyslexic })} />
                        <div className={`w-11 h-6 rounded-full transition-all relative ${settings.dyslexic ? 'bg-[#3BB54A]' : 'bg-fox-border'}`}>
                          <div className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full transition-all ${settings.dyslexic ? 'translate-x-full' : ''}`} />
                        </div>
                      </label>

                      {/* Contrast toggle */}
                      <label className={`relative p-4 border-2 rounded-xl flex items-center justify-between cursor-pointer transition-all ${settings.contrast ? 'border-[#3BB54A] bg-[#3BB54A]/5' : 'border-fox-border hover:border-[#3BB54A]/50'}`}>
                        <div className="flex items-center gap-3">
                          <Sun size={20} className={settings.contrast ? 'text-[#3BB54A]' : 'text-fox-text-muted'} />
                          <div>
                            <p className="text-sm font-bold text-fox-text-main">Alto Contraste</p>
                            <p className="text-xs text-fox-text-muted">Mejora la visibilidad</p>
                          </div>
                        </div>
                        <input type="checkbox" className="sr-only" checked={settings.contrast} onChange={() => updateSettings({ contrast: !settings.contrast })} />
                        <div className={`w-11 h-6 rounded-full transition-all relative ${settings.contrast ? 'bg-[#3BB54A]' : 'bg-fox-border'}`}>
                          <div className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full transition-all ${settings.contrast ? 'translate-x-full' : ''}`} />
                        </div>
                      </label>

                      {/* Easy Read toggle */}
                      <label className={`relative p-4 border-2 rounded-xl flex items-center justify-between cursor-pointer transition-all ${settings.easyRead ? 'border-[#3BB54A] bg-[#3BB54A]/5' : 'border-fox-border hover:border-[#3BB54A]/50'}`}>
                        <div className="flex items-center gap-3">
                          <List size={20} className={settings.easyRead ? 'text-[#3BB54A]' : 'text-fox-text-muted'} />
                          <div>
                            <p className="text-sm font-bold text-fox-text-main">Lectura Fácil</p>
                            <p className="text-xs text-fox-text-muted">Aumenta el espaciado</p>
                          </div>
                        </div>
                        <input type="checkbox" className="sr-only" checked={settings.easyRead} onChange={() => updateSettings({ easyRead: !settings.easyRead })} />
                        <div className={`w-11 h-6 rounded-full transition-all relative ${settings.easyRead ? 'bg-[#3BB54A]' : 'bg-fox-border'}`}>
                          <div className={`absolute top-[2px] left-[2px] bg-white w-5 h-5 rounded-full transition-all ${settings.easyRead ? 'translate-x-full' : ''}`} />
                        </div>
                      </label>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* SEGURIDAD */}
            {activeTab === 'seguridad' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-fox-text-main mb-1">Seguridad</h2>
                  <p className="text-sm text-fox-text-muted">Protege tu cuenta y gestiona tus contraseñas.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-fox-text-main border-b border-fox-border pb-2">Cambiar Contraseña</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-fox-text-main/80 block mb-1">Contraseña Actual</label>
                        <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-fox-bg border border-fox-border rounded-xl focus:ring-2 focus:ring-fox-purple/20 focus:border-fox-purple outline-none transition-all" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-fox-text-main/80 block mb-1">Nueva Contraseña</label>
                          <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-fox-bg border border-fox-border rounded-xl focus:ring-2 focus:ring-fox-purple/20 focus:border-fox-purple outline-none transition-all" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-fox-text-main/80 block mb-1">Confirmar Nueva Contraseña</label>
                          <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-fox-bg border border-fox-border rounded-xl focus:ring-2 focus:ring-fox-purple/20 focus:border-fox-purple outline-none transition-all" />
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-fox-border/50 text-fox-text-main/80 font-bold text-sm rounded-xl hover:bg-fox-border transition-colors">
                        Actualizar Contraseña
                      </button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-fox-border">
                    <h3 className="text-sm font-bold text-red-600 mb-2">Zona de Peligro</h3>
                    <button className="px-4 py-2 border border-red-200 text-red-600 font-bold text-sm rounded-xl hover:bg-red-50 transition-colors">
                      Desactivar Cuenta
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ACTION BUTTONS */}
            <div className="mt-10 pt-6 border-t border-fox-border flex items-center justify-end gap-4">
              <AnimatePresence>
                {showSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-2 text-fox-green text-sm font-bold"
                  >
                    <CheckCircle2 size={18} />
                    Cambios guardados
                  </motion.div>
                )}
              </AnimatePresence>
              
              <button className="px-6 py-2.5 text-fox-text-muted font-bold text-sm hover:bg-fox-bg rounded-xl transition-colors">
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-fox-purple text-white font-bold text-sm rounded-xl hover:bg-fox-purple/90 transition-colors flex items-center gap-2 disabled:opacity-70 min-w-[140px] justify-center"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-fox-surface/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={18} />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

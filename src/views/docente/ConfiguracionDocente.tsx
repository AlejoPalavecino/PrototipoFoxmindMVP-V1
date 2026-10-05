import React, { useState, useRef } from 'react';
import { User, Bell, BrainCircuit, Shield, Camera, Save, CheckCircle2, Palette, Link as LinkIcon, Moon, Sun, Monitor, LayoutGrid, List, Type, Calendar, UploadCloud, DownloadCloud, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from '../../components/ui/Toaster';
import { useAppContext } from '../../context';

type TabId = 'perfil' | 'notificaciones' | 'ia' | 'apariencia' | 'integraciones' | 'seguridad';

export function ConfiguracionDocente() {
  const [activeTab, setActiveTab] = useState<TabId>('perfil');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // States: Perfil
  const [profile, setProfile] = useState({
    nombre: 'Laura',
    apellido: 'Martínez',
    email: 'laura.martinez@foxmind.edu',
    biografia: 'Docente de Literatura y Prácticas del Lenguaje. Apasionada por la inclusión y el Diseño Universal para el Aprendizaje.'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States: Notificaciones
  const [notifications, setNotifications] = useState({
    alertaAlumnos: true,
    entregasTareas: false,
    sugerenciasIA: true
  });

  // States: Inteligencia Artificial
  const [promptBase, setPromptBase] = useState('');
  const [autonomyLevel, setAutonomyLevel] = useState(2);
  const [adaptacionDUA, setAdaptacionDUA] = useState(true);
  const rubricaInputRef = useRef<HTMLInputElement>(null);

  // States: Apariencia
  const { settings, updateSettings } = useAppContext();
  const theme = settings.theme;
  const setTheme = (val: string) => updateSettings({ theme: val });
  const density = settings.density;
  const setDensity = (val: string) => updateSettings({ density: val });
  const fontSize = settings.fontSize;
  const setFontSize = (val: string) => updateSettings({ fontSize: val });

  // States: Integraciones
  const [exportFormat, setExportFormat] = useState('Excel (.xlsx)');

  // States: Seguridad
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      toast.show('Configuración guardada exitosamente', 'success');
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1000);
  };

  const tabs = [
    { id: 'perfil', label: 'Perfil', icon: User },
    { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
    { id: 'ia', label: 'Preferencias IA', icon: BrainCircuit },
    { id: 'apariencia', label: 'Apariencia', icon: Palette },
    { id: 'integraciones', label: 'Integraciones', icon: LinkIcon },
    { id: 'seguridad', label: 'Seguridad', icon: Shield },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-20 md:pb-0">
      <header className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-fox-text-main flex items-center gap-3 flex-wrap">
              <span className="p-2 rounded-2xl bg-fox-primary/10 text-fox-primary border border-fox-primary/20 flex items-center justify-center shrink-0">
                <Settings className="w-6 h-6" />
              </span>
              <span>Configuración y Preferencias</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 font-sans font-semibold">
                Perfil Docente
              </span>
            </h1>
            <p className="text-fox-text-muted mt-1.5 text-sm max-w-2xl leading-relaxed">
              Personalizá tu cuenta institucional, preferencias de alertas pedagógicas, nivel de asistencia de IA y accesibilidad.
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
                      ? 'bg-fox-primary/10 text-fox-primary'
                      : 'text-fox-text-muted hover:bg-fox-bg hover:text-fox-text-main'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-fox-primary' : 'text-fox-text-muted/70'} />
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
                    <div className="w-24 h-24 rounded-full bg-fox-primary/10 flex items-center justify-center text-fox-primary text-2xl font-bold border-4 border-fox-surface shadow-sm overflow-hidden">
                      {profile.nombre[0]}{profile.apellido[0] || ''}
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-8 h-8 bg-fox-surface rounded-full border border-fox-border shadow-sm flex items-center justify-center text-fox-text-muted hover:text-fox-primary hover:border-fox-primary transition-colors"
                    >
                      <Camera size={14} />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          toast.show('Foto de perfil actualizada', 'success');
                        }
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-fox-text-main">Foto de perfil</h3>
                    <p className="text-xs text-fox-text-muted mt-1">JPG, GIF o PNG. Máximo 2MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-fox-text-main/80">Nombre</label>
                    <input 
                      type="text" 
                      value={profile.nombre} 
                      readOnly
                      className="w-full px-4 py-3 bg-fox-bg border border-fox-border rounded-xl outline-none transition-all opacity-70 cursor-not-allowed" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-fox-text-main/80">Apellido</label>
                    <input 
                      type="text" 
                      value={profile.apellido} 
                      readOnly
                      className="w-full px-4 py-3 bg-fox-bg border border-fox-border rounded-xl outline-none transition-all opacity-70 cursor-not-allowed" 
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-fox-text-main/80">Correo Electrónico</label>
                    <input 
                      type="email" 
                      value={profile.email} 
                      readOnly
                      className="w-full px-4 py-3 bg-fox-bg border border-fox-border rounded-xl outline-none transition-all opacity-70 cursor-not-allowed" 
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-fox-text-main/80">Biografía / Presentación</label>
                    <textarea 
                      rows={3} 
                      value={profile.biografia} 
                      onChange={e => setProfile({...profile, biografia: e.target.value})}
                      className="w-full px-4 py-3 bg-fox-bg border border-fox-border rounded-xl focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all resize-none" 
                    />
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
                      <h4 className="font-bold text-fox-text-main text-sm">Alertas de Alumnos en Riesgo</h4>
                      <p className="text-xs text-fox-text-muted mt-1">Recibe un aviso cuando un alumno baje su rendimiento drásticamente.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={notifications.alertaAlumnos}
                        onChange={(e) => setNotifications(prev => ({ ...prev, alertaAlumnos: e.target.checked }))}
                      />
                      <div className="w-11 h-6 bg-fox-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-fox-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fox-surface after:border-fox-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fox-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-fox-bg rounded-2xl border border-fox-border">
                    <div>
                      <h4 className="font-bold text-fox-text-main text-sm">Entregas de Tareas</h4>
                      <p className="text-xs text-fox-text-muted mt-1">Notificación diaria con el resumen de tareas entregadas.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={notifications.entregasTareas}
                        onChange={(e) => setNotifications(prev => ({ ...prev, entregasTareas: e.target.checked }))}
                      />
                      <div className="w-11 h-6 bg-fox-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-fox-surface after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-fox-surface after:border-fox-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-fox-primary"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-fox-bg rounded-2xl border border-fox-border">
                    <div>
                      <h4 className="font-bold text-fox-text-main text-sm">Sugerencias del Copiloto IA</h4>
                      <p className="text-xs text-fox-text-muted mt-1">Permite que la IA te envíe ideas proactivas para tus clases.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={notifications.sugerenciasIA}
                        onChange={(e) => setNotifications(prev => ({ ...prev, sugerenciasIA: e.target.checked }))}
                      />
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
                    <span className="bg-fox-purple/10 text-fox-purple text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Copiloto</span>
                  </h2>
                  <p className="text-sm text-fox-text-muted">Personaliza cómo interactúa la Inteligencia Artificial contigo y tus alumnos.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-fox-text-main/80">Prompt Base Personalizado (System Prompt)</label>
                    <p className="text-xs text-fox-text-muted">Instrucciones permanentes para Foxy. Se aplicarán a todas tus interacciones.</p>
                    <textarea 
                      rows={3} 
                      value={promptBase}
                      onChange={(e) => setPromptBase(e.target.value)}
                      placeholder="Ej: Siempre usa ejemplos relacionados con la cultura argentina. Nunca des la respuesta directa, usa siempre el método socrático." 
                      className="w-full px-4 py-3 bg-fox-bg border border-fox-border rounded-xl focus:ring-2 focus:ring-fox-purple/20 focus:border-fox-purple outline-none transition-all resize-none" 
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <label className="text-sm font-bold text-fox-text-main/80">Nivel de Autonomía de Foxy</label>
                      <span className="text-xs font-bold text-fox-purple bg-fox-purple/10 px-2 py-1 rounded-lg">
                        {autonomyLevel === 1 ? 'Asistente Pasivo' : autonomyLevel === 2 ? 'Sugerencias' : 'Piloto Automático'}
                      </span>
                    </div>
                    <p className="text-xs text-fox-text-muted">Define cuánta iniciativa tiene la IA en tu día a día.</p>
                    <input 
                      type="range" 
                      min="1" 
                      max="3" 
                      value={autonomyLevel}
                      onChange={(e) => setAutonomyLevel(Number(e.target.value))}
                      className="w-full accent-fox-purple"
                    />
                    <div className="flex justify-between text-xs text-fox-text-muted/70 font-medium px-1">
                      <span>Solo a pedido</span>
                      <span>Proactivo</span>
                      <span>Autónomo</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-fox-text-main/80">Gestión de Rúbricas Base</label>
                    <p className="text-xs text-fox-text-muted">Sube tus criterios de evaluación estándar para que Foxy los use por defecto.</p>
                    <div 
                      onClick={() => rubricaInputRef.current?.click()}
                      className="border-2 border-dashed border-fox-border rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-fox-bg transition-colors cursor-pointer"
                    >
                      <UploadCloud size={24} className="text-fox-text-muted/70 mb-2" />
                      <p className="text-sm font-bold text-fox-text-main/80">Subir Rúbrica Institucional</p>
                      <p className="text-xs text-fox-text-muted mt-1">PDF, DOCX o Excel (Max 5MB)</p>
                    </div>
                    <input 
                      type="file" 
                      ref={rubricaInputRef} 
                      className="hidden" 
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          toast.show(`Rúbrica base adjuntada: ${e.target.files[0].name}`, 'success');
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border border-fox-purple/20 bg-fox-purple/5 rounded-2xl">
                    <div>
                      <h4 className="font-bold text-fox-text-main text-sm">Adaptación DUA Automática</h4>
                      <p className="text-xs text-fox-text-muted mt-1">La IA generará automáticamente versiones adaptadas (Dislexia, TDAH) de cada nueva actividad.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={adaptacionDUA}
                        onChange={(e) => setAdaptacionDUA(e.target.checked)}
                      />
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
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === 'light' ? 'border-fox-primary bg-fox-primary/5 text-fox-primary' : 'border-fox-border hover:border-fox-border text-fox-text-muted'}`}
                      >
                        <Sun size={24} />
                        <span className="text-sm font-bold">Claro</span>
                      </button>
                      <button 
                        onClick={() => setTheme('dark')}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === 'dark' ? 'border-fox-primary bg-fox-primary/5 text-fox-primary' : 'border-fox-border hover:border-fox-border text-fox-text-muted'}`}
                      >
                        <Moon size={24} />
                        <span className="text-sm font-bold">Oscuro</span>
                      </button>
                      <button 
                        onClick={() => setTheme('auto')}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${theme === 'auto' ? 'border-fox-primary bg-fox-primary/5 text-fox-primary' : 'border-fox-border hover:border-fox-border text-fox-text-muted'}`}
                      >
                        <Monitor size={24} />
                        <span className="text-sm font-bold">Automático</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold text-fox-text-main/80">Densidad de Información</label>
                    <p className="text-xs text-fox-text-muted">Elige cómo se ven las listas de aulas y alumnos.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setDensity('comoda')}
                        className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${density === 'comoda' ? 'border-fox-primary bg-fox-primary/5 text-fox-primary' : 'border-fox-border hover:border-fox-border text-fox-text-muted'}`}
                      >
                        <LayoutGrid size={20} />
                        <div className="text-left">
                          <span className="text-sm font-bold block">Cómoda</span>
                          <span className="text-xs opacity-70">Tarjetas grandes y espaciosas</span>
                        </div>
                      </button>
                      <button 
                        onClick={() => setDensity('compacta')}
                        className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${density === 'compacta' ? 'border-fox-primary bg-fox-primary/5 text-fox-primary' : 'border-fox-border hover:border-fox-border text-fox-text-muted'}`}
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
                          className={`flex-1 py-2 text-sm font-bold capitalize rounded-lg transition-all ${fontSize === size.id ? 'bg-fox-surface shadow-sm text-fox-primary' : 'text-fox-text-muted hover:text-fox-text-main/80'}`}
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

            {/* INTEGRACIONES */}
            {activeTab === 'integraciones' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-fox-text-main mb-1">Integraciones</h2>
                  <p className="text-sm text-fox-text-muted">Conecta FoxMind con las herramientas que ya utilizas en tu colegio.</p>
                </div>

                <div className="space-y-6">
                  <div className="p-5 border border-fox-border rounded-2xl flex items-center justify-between bg-fox-surface">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-fox-primary/10 text-fox-primary rounded-xl flex items-center justify-center">
                        <Calendar size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-fox-text-main">Sincronización de Calendarios</h4>
                        <p className="text-xs text-fox-text-muted mt-1">Conecta con Google Calendar o Outlook.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => toast.show('Iniciando flujo de conexión...', 'success')}
                      className="px-4 py-2 bg-fox-bg hover:bg-fox-border/50 text-fox-text-main/80 font-bold text-sm rounded-xl transition-colors border border-fox-border"
                    >
                      Conectar
                    </button>
                  </div>

                  <div className="p-5 border border-fox-border rounded-2xl flex items-center justify-between bg-fox-surface">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                        <User size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-fox-text-main">Importación de Alumnos</h4>
                        <p className="text-xs text-fox-text-muted mt-1">Sincroniza con Google Classroom o importa CSV.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => toast.show('Abriendo configuración de fuentes', 'success')}
                      className="px-4 py-2 bg-fox-bg hover:bg-fox-border/50 text-fox-text-main/80 font-bold text-sm rounded-xl transition-colors border border-fox-border"
                    >
                      Configurar
                    </button>
                  </div>

                  <div className="p-5 border border-fox-border rounded-2xl flex items-center justify-between bg-fox-surface">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                        <DownloadCloud size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-fox-text-main">Exportación de Notas</h4>
                        <p className="text-xs text-fox-text-muted mt-1">Configura el formato por defecto (Excel, CSV, PDF).</p>
                      </div>
                    </div>
                    <select 
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value)}
                      className="px-4 py-2 bg-fox-bg border border-fox-border rounded-xl text-sm font-bold text-fox-text-main/80 outline-none cursor-pointer"
                    >
                      <option>Excel (.xlsx)</option>
                      <option>CSV (.csv)</option>
                      <option>PDF (.pdf)</option>
                    </select>
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
                        <input 
                          type="password" 
                          value={passwords.current}
                          onChange={(e) => setPasswords(prev => ({...prev, current: e.target.value}))}
                          placeholder="••••••••" 
                          className="w-full px-4 py-2.5 bg-fox-bg border border-fox-border rounded-xl focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all" 
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-fox-text-main/80 block mb-1">Nueva Contraseña</label>
                          <input 
                            type="password" 
                            value={passwords.new}
                            onChange={(e) => setPasswords(prev => ({...prev, new: e.target.value}))}
                            placeholder="••••••••" 
                            className="w-full px-4 py-2.5 bg-fox-bg border border-fox-border rounded-xl focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all" 
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-fox-text-main/80 block mb-1">Confirmar Nueva Contraseña</label>
                          <input 
                            type="password" 
                            value={passwords.confirm}
                            onChange={(e) => setPasswords(prev => ({...prev, confirm: e.target.value}))}
                            placeholder="••••••••" 
                            className="w-full px-4 py-2.5 bg-fox-bg border border-fox-border rounded-xl focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all" 
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          if (passwords.new && passwords.new !== passwords.confirm) {
                            toast.show('Las contraseñas no coinciden', 'error');
                            return;
                          }
                          if (!passwords.current) {
                            toast.show('Debes ingresar tu contraseña actual', 'error');
                            return;
                          }
                          toast.show('Contraseña actualizada correctamente', 'success');
                          setPasswords({current: '', new: '', confirm: ''});
                        }}
                        className="px-4 py-2 bg-fox-border/50 text-fox-text-main/80 font-bold text-sm rounded-xl hover:bg-fox-border transition-colors"
                      >
                        Actualizar Contraseña
                      </button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-fox-border">
                    <h3 className="text-sm font-bold text-red-600 mb-2">Zona de Peligro</h3>
                    <button 
                      onClick={() => {
                        const confirm = window.confirm('¿Estás seguro de que deseas desactivar tu cuenta? Esta acción no se puede deshacer de forma inmediata.');
                        if (confirm) {
                          toast.show('Solicitud de desactivación enviada a soporte', 'error');
                        }
                      }}
                      className="px-4 py-2 border border-red-200 text-red-600 font-bold text-sm rounded-xl hover:bg-red-50 transition-colors"
                    >
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
                className="px-6 py-2.5 bg-fox-primary text-white font-bold text-sm rounded-xl hover:bg-fox-primary/90 transition-colors flex items-center gap-2 disabled:opacity-70 min-w-[140px] justify-center"
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

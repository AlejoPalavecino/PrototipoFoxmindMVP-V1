import React, { useState, useRef } from 'react';
import { 
  ChevronLeft, FileText, Clock, BrainCircuit, Sparkles, 
  CheckCircle2, AlertCircle, Download, UploadCloud, Paperclip, 
  BookOpen, Send, X, Volume2, Type, CheckSquare, Eye, RotateCcw, 
  Award, ArrowRight, Library, FileCheck, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from '../ui/Toaster';
import { StudentFoxyTutorDrawer } from './StudentFoxyTutorDrawer';

interface StudentActivityDetailProps {
  activity: any;
  onBack: () => void;
  subjectName?: string;
  courseName?: string;
  studentProfile?: {
    id: number;
    name: string;
    duaProfile?: string[];
  };
  onDeliver?: (submission: { attachedFile?: any; text?: string }) => void;
}

export function StudentActivityDetail({
  activity,
  onBack,
  subjectName = 'Literatura',
  courseName = '3° A',
  studentProfile = {
    id: 2,
    name: 'Sofía Herrera',
    duaProfile: ['Dislexia']
  },
  onDeliver
}: StudentActivityDetailProps) {
  const isDuaStudent = studentProfile.duaProfile && studentProfile.duaProfile.length > 0;
  const [isFoxyTutorOpen, setIsFoxyTutorOpen] = useState(false);

  // Accessibility States
  const [isDyslexiaFont, setIsDyslexiaFont] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);

  // Submission States
  const isInitiallyGraded = activity.status === 'Completada' || activity.grade !== undefined;
  const [deliveryStatus, setDeliveryStatus] = useState<'pending' | 'submitted' | 'graded'>(
    isInitiallyGraded ? 'graded' : 'pending'
  );
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; size: string; type: string }[]>(
    isInitiallyGraded ? [{ name: 'Ensayo_Vanguardias_Sofia.pdf', size: '1.4 MB', type: 'PDF' }] : []
  );
  const [studentComment, setStudentComment] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Related Library Items
  const relatedLibraryItems = [
    {
      id: 'lib-1',
      title: 'Antología de Manifiestos Vanguardistas',
      type: 'PDF',
      size: '2.8 MB',
      description: 'Textos completos de Huidobro, Borges y Guillermo de Torre.'
    },
    {
      id: 'lib-2',
      title: 'Guía Rápida de Citación APA 7',
      type: 'PDF',
      size: '850 KB',
      description: 'Modelos prácticos para citar poemas y fragmentos en ensayos.'
    }
  ];

  // DUA Step checklist
  const taskSteps = [
    'Paso 1: Leer el manifiesto seleccionado en la biblioteca.',
    'Paso 2: Anotar 2 o 3 ideas principales en un borrador.',
    'Paso 3: Redactar tu reflexión personal o grabar el audio.',
    'Paso 4: Adjuntar el archivo PDF/Word y presionar Entregar.'
  ];

  const handleFileUpload = (file: File) => {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
    
    const newFile = {
      name: file.name,
      size: `${sizeMb} MB`,
      type: ext
    };

    setAttachedFiles(prev => [...prev, newFile]);
    toast.show(`Archivo "${file.name}" adjuntado con éxito`, 'success');
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDeliverTask = () => {
    if (attachedFiles.length === 0 && !studentComment.trim()) {
      toast.show('Por favor adjunta un archivo o escribe una respuesta antes de entregar', 'error');
      return;
    }

    setDeliveryStatus('submitted');
    toast.show('🎉 ¡Actividad entregada con éxito! Tu docente recibirá la notificación.', 'success');
    if (onDeliver) {
      onDeliver({
        attachedFile: attachedFiles[0],
        text: studentComment
      });
    }
  };

  const handleToggleStep = (index: number) => {
    setCheckedSteps(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handlePlayTTS = () => {
    setIsPlayingAudio(true);
    toast.show('🔊 Reproduciendo consigna por voz...', 'info');
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 4000);
  };

  return (
    <div className={`fixed inset-0 z-40 bg-[#FBFDFF] overflow-y-auto flex flex-col ${isDyslexiaFont ? 'font-sans tracking-wide' : ''}`}>
      {/* Top Header */}
      <header className="bg-fox-surface border-b border-fox-border sticky top-0 z-20 shadow-2xs px-4 md:px-8 h-20 flex items-center justify-between shrink-0">
        <div className="flex-1 flex items-center justify-start gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-fox-text-muted hover:text-fox-primary transition-colors font-bold group cursor-pointer"
            title="Volver al Aula"
          >
            <div className="w-10 h-10 bg-fox-bg group-hover:bg-fox-primary/10 rounded-xl flex items-center justify-center transition-colors">
              <ChevronLeft size={20} className="group-hover:text-fox-primary transition-colors" />
            </div>
            <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">
              {subjectName} ({courseName})
            </span>
          </button>
        </div>

        {/* Center Title */}
        <div className="flex-[2] flex flex-col items-center justify-center min-w-0 px-4 text-center">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-fox-primary/10 text-fox-primary">
              {activity.type || 'Evaluación'}
            </span>
            <span className="text-xs font-medium text-fox-text-muted flex items-center gap-1">
              <Clock size={12} className="text-fox-orange" /> Vence: {activity.due || 'Pronto'}
            </span>
          </div>
          <h1 className="text-lg md:text-xl font-heading font-black text-fox-text-main truncate max-w-full">
            {activity.title}
          </h1>
        </div>

        {/* Foxy Socratic Tutor Action Button */}
        <div className="flex-1 flex items-center justify-end gap-2.5 shrink-0">
          <button
            onClick={() => setIsFoxyTutorOpen(true)}
            className="bg-fox-purple/10 text-fox-purple border border-fox-purple/20 hover:bg-fox-purple hover:text-white px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <BrainCircuit size={17} />
            <span className="hidden sm:inline">Consultar a Foxy</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6 flex-1">
        {/* DUA Accessibility Banner for Students */}
        {isDuaStudent && (
          <div className="bg-gradient-to-r from-fox-purple/10 via-fox-primary/5 to-fox-purple/5 border border-fox-purple/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-fox-purple text-white flex items-center justify-center shadow-2xs shrink-0">
                <Sparkles size={18} />
              </div>
              <div>
                <h4 className="font-heading font-extrabold text-fox-text-main text-xs sm:text-sm">
                  Modo Accesible DUA Activo ({studentProfile.duaProfile?.join(', ')})
                </h4>
                <p className="text-[11px] text-fox-text-muted">
                  Consigna optimizada para tu perfil de aprendizaje.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handlePlayTTS}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  isPlayingAudio
                    ? 'bg-fox-purple text-white border-fox-purple animate-pulse'
                    : 'bg-fox-surface text-fox-purple border-fox-purple/30 hover:bg-fox-purple/10'
                }`}
              >
                <Volume2 size={14} />
                <span>{isPlayingAudio ? 'Reproduciendo...' : 'Escuchar Consigna'}</span>
              </button>

              <button
                onClick={() => {
                  setIsDyslexiaFont(!isDyslexiaFont);
                  toast.show(isDyslexiaFont ? 'Tipografía estándar restaurada' : 'Tipografía de lectura fácil activada', 'info');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  isDyslexiaFont
                    ? 'bg-fox-primary text-white border-fox-primary'
                    : 'bg-fox-surface text-fox-text-main border-fox-border hover:bg-fox-bg'
                }`}
              >
                <Type size={14} />
                <span>Lectura Fácil</span>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Activity Details, Instructions, Library Materials */}
          <div className="lg:col-span-2 space-y-6">
            {/* Consigna Card */}
            <div className="bg-fox-surface border border-fox-border rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-fox-border/60 pb-3">
                <h3 className="font-heading font-extrabold text-fox-text-main text-base flex items-center gap-2">
                  <FileText size={18} className="text-fox-primary" /> Consigna de la Actividad
                </h3>
                <span className="text-xs font-bold text-fox-orange bg-fox-orange/10 px-2.5 py-0.5 rounded-full">
                  +150 XP al entregar
                </span>
              </div>

              <div className={`text-xs sm:text-sm text-fox-text-main/90 leading-relaxed whitespace-pre-wrap ${isDyslexiaFont ? 'text-[15px] leading-loose' : 'font-medium'}`}>
                {activity.description || 'Lee atentamente los materiales y realiza tu entrega antes de la fecha límite.'}
              </div>

              {/* DUA Interactive Step Checklist */}
              {isDuaStudent && (
                <div className="mt-4 pt-4 border-t border-fox-border/60 space-y-2.5">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-fox-purple flex items-center gap-1.5">
                    <CheckSquare size={14} /> Checklist de pasos sugeridos:
                  </p>
                  <div className="space-y-2">
                    {taskSteps.map((step, idx) => {
                      const isDone = checkedSteps.includes(idx);
                      return (
                        <div
                          key={idx}
                          onClick={() => handleToggleStep(idx)}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                            isDone
                              ? 'bg-fox-green/10 border-fox-green/30 text-fox-green'
                              : 'bg-fox-bg/60 border-fox-border text-fox-text-main hover:border-fox-purple/30'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                            isDone ? 'bg-fox-green text-white border-fox-green' : 'border-fox-border bg-fox-surface'
                          }`}>
                            {isDone && <Check size={13} />}
                          </div>
                          <span className={`text-xs font-semibold ${isDone ? 'line-through opacity-80' : ''}`}>
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Official Activity Attachments */}
              {activity.attachment && (
                <div className="pt-4 border-t border-fox-border/60">
                  <p className="text-xs font-bold text-fox-text-muted mb-2">Pautas y archivo adjunto del docente:</p>
                  <div className="bg-fox-bg border border-fox-border p-3.5 rounded-xl flex items-center justify-between gap-3 group hover:border-fox-primary/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
                        PDF
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-fox-text-main truncate">{activity.attachment.name}</p>
                        <p className="text-[11px] text-fox-text-muted">{activity.attachment.size} • Guía oficial</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toast.show('Descargando archivo adjunto...', 'info')}
                      className="px-3 py-1.5 bg-fox-surface hover:bg-fox-primary/10 text-fox-primary border border-fox-border rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <Download size={13} /> Descargar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Related Library Materials Card */}
            <div className="bg-fox-surface border border-fox-border rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-fox-border/60 pb-3">
                <h3 className="font-heading font-extrabold text-fox-text-main text-base flex items-center gap-2">
                  <Library size={18} className="text-fox-primary" /> Materiales Relacionados de la Biblioteca
                </h3>
                <span className="text-xs font-semibold text-fox-text-muted">
                  Lecturas recomendadas
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {relatedLibraryItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-fox-bg/60 border border-fox-border rounded-xl p-3.5 flex flex-col justify-between gap-2.5 hover:border-fox-primary/30 transition-all group"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-fox-primary/10 text-fox-primary">
                          {item.type}
                        </span>
                        <span className="text-[10px] text-fox-text-muted font-semibold">{item.size}</span>
                      </div>
                      <h4 className="font-bold text-fox-text-main text-xs group-hover:text-fox-primary transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-fox-text-muted mt-1 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    <button
                      onClick={() => toast.show(`Abriendo "${item.title}" desde la biblioteca...`, 'info')}
                      className="w-full py-1.5 bg-fox-surface hover:bg-fox-primary/10 text-fox-primary border border-fox-border rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <BookOpen size={13} /> Consultar Lectura
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Submission Card & Grades */}
          <div className="space-y-6">
            {/* Delivery Workspace Card */}
            <div className="bg-fox-surface border border-fox-border rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-fox-border/60 pb-3">
                <h3 className="font-heading font-extrabold text-fox-text-main text-base flex items-center gap-2">
                  <UploadCloud size={18} className="text-fox-primary" /> Tu Entrega
                </h3>
                {deliveryStatus === 'graded' ? (
                  <span className="bg-fox-green/10 text-fox-green border border-fox-green/20 text-xs font-black uppercase px-2.5 py-0.5 rounded-full">
                    Calificada
                  </span>
                ) : deliveryStatus === 'submitted' ? (
                  <span className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-black uppercase px-2.5 py-0.5 rounded-full">
                    Entregada
                  </span>
                ) : (
                  <span className="bg-fox-orange/10 text-fox-orange border border-fox-orange/20 text-xs font-black uppercase px-2.5 py-0.5 rounded-full">
                    Pendiente
                  </span>
                )}
              </div>

              {/* When already graded by teacher */}
              {deliveryStatus === 'graded' && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-fox-green/10 to-fox-green/5 border border-fox-green/20 rounded-2xl p-5 text-center">
                    <p className="text-[11px] font-black uppercase tracking-wider text-fox-green">
                      Calificación Final
                    </p>
                    <p className="text-4xl font-black text-fox-text-main mt-1">
                      {activity.grade || '9.5'} <span className="text-sm font-normal text-fox-text-muted">/ 10</span>
                    </p>
                  </div>

                  {activity.feedback && (
                    <div className="bg-fox-bg/60 border border-fox-border rounded-xl p-4 space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-fox-text-muted">
                        Devolución del Docente:
                      </p>
                      <p className="text-xs text-fox-text-main font-medium leading-relaxed">
                        "{activity.feedback}"
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-fox-bg/40 border border-fox-border rounded-xl flex items-center justify-between">
                    <span className="text-xs font-bold text-fox-text-muted">Archivo enviado:</span>
                    <span className="text-xs font-bold text-fox-primary">Ensayo_Vanguardias.pdf</span>
                  </div>
                </div>
              )}

              {/* When already submitted but pending grade */}
              {deliveryStatus === 'submitted' && (
                <div className="space-y-4">
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-center space-y-1">
                    <CheckCircle2 size={24} className="text-amber-600 mx-auto" />
                    <p className="text-xs font-bold text-fox-text-main">
                      Tu trabajo fue entregado
                    </p>
                    <p className="text-[11px] text-fox-text-muted">
                      El docente revisará tu entrega y recibirás la nota y comentarios aquí.
                    </p>
                  </div>

                  {attachedFiles.map((file, i) => (
                    <div key={i} className="p-3 bg-fox-bg border border-fox-border rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <FileText size={16} className="text-fox-primary shrink-0" />
                        <span className="text-xs font-bold text-fox-text-main truncate">{file.name}</span>
                      </div>
                      <span className="text-[10px] text-fox-text-muted shrink-0">{file.size}</span>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      setDeliveryStatus('pending');
                      toast.show('Entrega anulada. Puedes volver a subir tu archivo.', 'info');
                    }}
                    className="w-full py-2 border border-fox-border text-fox-text-muted hover:text-fox-text-main rounded-xl text-xs font-bold transition-colors"
                  >
                    Anular entrega para modificar
                  </button>
                </div>
              )}

              {/* When pending submission */}
              {deliveryStatus === 'pending' && (
                <div className="space-y-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    accept=".pdf,.docx,.doc,.txt,.epub"
                    className="hidden"
                  />

                  {/* Drag & Drop Area */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                      isDragging
                        ? 'border-fox-primary bg-fox-primary/5 scale-[1.01]'
                        : 'border-fox-border hover:border-fox-primary/50 bg-fox-bg/40'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-fox-primary/10 text-fox-primary flex items-center justify-center shadow-2xs">
                      <UploadCloud size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-fox-text-main">
                        Haz clic o arrastra tu archivo aquí
                      </p>
                      <p className="text-[10px] text-fox-text-muted mt-0.5">
                        Formatos aceptados: Word (.docx), PDF (.pdf), TXT (.txt)
                      </p>
                    </div>
                  </div>

                  {/* Attached Files List */}
                  {attachedFiles.length > 0 && (
                    <div className="space-y-2">
                      {attachedFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="bg-fox-bg border border-fox-border rounded-xl p-3 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-fox-primary/10 text-fox-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                              {file.type}
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-fox-text-main truncate">{file.name}</p>
                              <p className="text-[10px] text-fox-text-muted">{file.size}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setAttachedFiles(attachedFiles.filter((_, i) => i !== idx))}
                            className="p-1 text-fox-text-muted hover:text-rose-500 rounded transition-colors"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Optional Note for Teacher */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-fox-text-muted">
                      Comentario o nota para tu docente (opcional):
                    </label>
                    <textarea
                      value={studentComment}
                      onChange={(e) => setStudentComment(e.target.value)}
                      placeholder="Ej: Profe, adjunto el ensayo completo. Me enfoqué especialmente en el manifiesto de Huidobro..."
                      rows={3}
                      className="w-full bg-fox-bg/50 border border-fox-border rounded-xl p-3 text-xs text-fox-text-main font-medium focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleDeliverTask}
                    className="w-full py-3 bg-fox-primary hover:bg-fox-primary/90 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-fox-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send size={15} /> Entregar Actividad
                  </button>
                </div>
              )}
            </div>

            {/* Quick Socratic Prompt Widget */}
            <div className="bg-gradient-to-br from-fox-purple/10 to-fox-purple/5 border border-fox-purple/20 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-fox-purple text-white flex items-center justify-center">
                  <BrainCircuit size={16} />
                </div>
                <div>
                  <h4 className="font-heading font-extrabold text-fox-text-main text-xs">
                    ¿Bloqueado con la entrega?
                  </h4>
                  <p className="text-[11px] text-fox-purple font-bold">
                    Foxy te da pistas sin hacer la tarea por ti
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-fox-text-muted leading-relaxed font-medium">
                Consulta a Foxy para aclarar dudas sobre las pautas, estructurar tu texto o mejorar tus argumentos.
              </p>
              <button
                onClick={() => setIsFoxyTutorOpen(true)}
                className="w-full py-2 bg-fox-surface hover:bg-fox-purple/10 text-fox-purple border border-fox-purple/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={13} /> Abrir Tutor Socrático
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Socratic Tutor Drawer */}
      <StudentFoxyTutorDrawer
        isOpen={isFoxyTutorOpen}
        onClose={() => setIsFoxyTutorOpen(false)}
        activityTitle={activity.title}
        subjectName={subjectName}
        activityDescription={activity.description}
        duaProfile={studentProfile.duaProfile?.join(', ')}
      />
    </div>
  );
}

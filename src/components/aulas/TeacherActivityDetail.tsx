import React, { useState } from 'react';
import { 
  ChevronLeft, FileText, Clock, Bell, BrainCircuit, Sparkles, 
  CheckCircle2, AlertCircle, Search, Filter, Download, Eye, 
  Sliders, UserCheck, Users, ArrowUpDown, MoreVertical, Send, 
  BookOpen, CheckSquare, Square, Layers, Award, LayoutList, Paperclip,
  PenTool, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from '../ui/Toaster';
import { TeacherGradingDrawer } from './TeacherGradingDrawer';
import type { Submission } from '../../features/classrooms';

interface TeacherActivityDetailProps {
  activity: any;
  submissions: Submission[];
  setSubmissions: (subs: Submission[]) => void;
  onBack: () => void;
  subjectName?: string;
  courseName?: string;
}

export function TeacherActivityDetail({
  activity,
  submissions,
  setSubmissions,
  onBack,
  subjectName = 'Literatura',
  courseName = '3° A'
}: TeacherActivityDetailProps) {
  const [activeTab, setActiveTab] = useState<'entregas' | 'consigna'>('entregas');
  const [filterStatus, setFilterStatus] = useState<'all' | 'submitted' | 'graded' | 'missing' | 'dua'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<number[]>([]);
  
  // Grading Drawer State
  const [selectedSubmissionToGrade, setSelectedSubmissionToGrade] = useState<Submission | null>(null);

  // DUA Adaptation Modal State (Read-only confirmed adaptation view)
  const [studentToAdapt, setStudentToAdapt] = useState<any | null>(null);
  const [isAdaptModalOpen, setIsAdaptModalOpen] = useState(false);
  const [adaptedPromptText, setAdaptedPromptText] = useState('');

  // Metrics calculation
  const totalStudents = submissions.length;
  const submittedCount = submissions.filter(s => s.status === 'submitted').length;
  const gradedCount = submissions.filter(s => s.status === 'graded').length;
  const missingCount = submissions.filter(s => s.status === 'missing').length;
  const duaCount = submissions.filter(s => s.dua && s.dua.length > 0).length;

  const gradedSubmissions = submissions.filter(s => s.status === 'graded' && s.grade !== null);
  const avgGrade = gradedSubmissions.length > 0
    ? (gradedSubmissions.reduce((acc, curr) => acc + (curr.grade || 0), 0) / gradedSubmissions.length).toFixed(1)
    : '-';

  // Filtered submissions list
  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (sub.email && sub.email.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;

    if (filterStatus === 'submitted') return sub.status === 'submitted';
    if (filterStatus === 'graded') return sub.status === 'graded';
    if (filterStatus === 'missing') return sub.status === 'missing';
    if (filterStatus === 'dua') return sub.dua && sub.dua.length > 0;
    return true;
  });

  const handleNotifyPending = () => {
    toast.show('🔔 Recordatorio enviado a los alumnos con entregas pendientes', 'success');
  };

  const handleDownloadSubmissionFile = (sub: Submission, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const fileName = sub.attachedFile?.name || `Entrega_${sub.name.replace(/\s+/g, '_')}.pdf`;
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeType = ext === 'docx' || ext === 'doc'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : ext === 'txt'
      ? 'text/plain'
      : 'application/pdf';

    const fileContent = sub.content || `FoxMind LMS - Entrega Académica\nEstudiante: ${sub.name}\nActividad: ${activity.title}\nFecha: ${sub.date || 'Reciente'}\n\n=========================================\nCONTENIDO DEL TRABAJO:\n=========================================\n${sub.content || 'Documento adjunto en formato digital para evaluación pedagógica.'}`;
    
    const blob = new Blob([fileContent], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.show(`📥 Descargando entrega de ${sub.name}: "${fileName}"`, 'success');
  };

  const handleOpenAdaptModal = (student: any) => {
    setStudentToAdapt(student);
    setAdaptedPromptText(
      `CONSIGNA ADAPTADA DUA (CONFIRMADA AL CREAR LA ACTIVIDAD)\n\n` +
      `Estudiante: ${student.name.toUpperCase()}\nPerfil DUA: ${student.dua?.join(', ') || 'General'}\n\n` +
      `Orientaciones pedagógicas confirmadas:\n` +
      `1. Selección de texto simplificado: Elige UNO de los dos manifiestos trabajados en clase (Huidobro o De Torre).\n` +
      `2. Estructura guiada: Identifica en 3 puntos breves qué propone el autor para crear poesía con soporte de preguntas guía.\n` +
      `3. Modalidad de entrega multimodal: Redacción en párrafos breves o archivo adjunto en formato digital (Word, PDF, TXT).\n` +
      `4. Criterio de evaluación: Priorización de la comprensión de conceptos fundamentales sin penalización por aspectos formales de ortografía.`
    );
    setIsAdaptModalOpen(true);
  };

  const handleSaveGrading = (finalGrade: number, finalFeedback: string, breakdown: any[]) => {
    if (!selectedSubmissionToGrade) return;

    const updated = submissions.map(sub => 
      sub.studentId === selectedSubmissionToGrade.studentId
        ? {
            ...sub,
            status: 'graded' as const,
            grade: finalGrade,
            feedback: finalFeedback,
            rubricBreakdown: breakdown
          }
        : sub
    );

    setSubmissions(updated);
    toast.show(`Calificación (${finalGrade}) y devolución guardadas para ${selectedSubmissionToGrade.name}`, 'success');
    setSelectedSubmissionToGrade(null);
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#FBFDFF] overflow-y-auto flex flex-col">
      {/* Top Header Bar */}
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

        {/* Title Center */}
        <div className="flex-[2] flex flex-col items-center justify-center min-w-0 px-4 text-center">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-fox-primary/10 text-fox-primary">
              {activity.type || 'Evaluación'}
            </span>
            <span className="text-xs font-medium text-fox-text-muted flex items-center gap-1">
              <Clock size={12} className="text-fox-orange" /> Vence: {activity.due || 'Mañana'}
            </span>
          </div>
          <h1 className="text-lg md:text-xl font-heading font-black text-fox-text-main truncate max-w-full">
            {activity.title}
          </h1>
        </div>

        {/* Right Actions */}
        <div className="flex-1 flex items-center justify-end gap-2.5 shrink-0">
          <button
            onClick={handleNotifyPending}
            className="bg-fox-orange/10 text-fox-orange border border-fox-orange/20 hover:bg-fox-orange hover:text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Bell size={15} />
            <span className="hidden sm:inline">Recordar a Pendientes</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6 flex-1">
        {/* Navigation Tabs */}
        <div className="flex border-b border-fox-border bg-fox-surface rounded-2xl p-1.5 shadow-2xs max-w-md">
          <button
            onClick={() => setActiveTab('entregas')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'entregas'
                ? 'bg-fox-primary text-white shadow-xs'
                : 'text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            <LayoutList size={15} />
            <span>Estado de Entregas ({submissions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('consigna')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'consigna'
                ? 'bg-fox-primary text-white shadow-xs'
                : 'text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            <BookOpen size={15} />
            <span>Consigna, Rúbrica y DUA</span>
          </button>
        </div>

        {/* TAB 1: ESTADO DE ENTREGAS */}
        {activeTab === 'entregas' && (
          <div className="space-y-6">
            {/* Metric KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              <div className="bg-fox-surface border border-fox-border rounded-2xl p-4 shadow-2xs">
                <p className="text-[11px] font-bold text-fox-text-muted uppercase tracking-wider">Matriculados</p>
                <p className="text-2xl font-black text-fox-text-main mt-1">{totalStudents}</p>
                <p className="text-[10px] text-fox-text-muted mt-0.5">En el aula</p>
              </div>

              <div className="bg-fox-surface border border-fox-border rounded-2xl p-4 shadow-2xs">
                <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Por Corregir</p>
                <p className="text-2xl font-black text-amber-600 mt-1">{submittedCount}</p>
                <p className="text-[10px] text-fox-text-muted mt-0.5">Esperando revisión</p>
              </div>

              <div className="bg-fox-surface border border-fox-border rounded-2xl p-4 shadow-2xs">
                <p className="text-[11px] font-bold text-fox-green uppercase tracking-wider">Corregidas</p>
                <p className="text-2xl font-black text-fox-green mt-1">{gradedCount}</p>
                <p className="text-[10px] text-fox-text-muted mt-0.5">Con nota publicada</p>
              </div>

              <div className="bg-fox-surface border border-fox-border rounded-2xl p-4 shadow-2xs">
                <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Sin Entregar</p>
                <p className="text-2xl font-black text-rose-500 mt-1">{missingCount}</p>
                <p className="text-[10px] text-fox-text-muted mt-0.5">Pendientes de envío</p>
              </div>

              <div className="bg-fox-surface border border-fox-border rounded-2xl p-4 shadow-2xs col-span-2 sm:col-span-1">
                <p className="text-[11px] font-bold text-fox-purple uppercase tracking-wider">Promedio / DUA</p>
                <p className="text-2xl font-black text-fox-purple mt-1">{avgGrade} <span className="text-xs font-normal text-fox-text-muted">/ 10</span></p>
                <p className="text-[10px] text-fox-purple font-semibold mt-0.5">{duaCount} con adaptación DUA</p>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-fox-surface border border-fox-border rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fox-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar estudiante por nombre..."
                  className="w-full bg-fox-bg border border-fox-border rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'submitted', label: `Por Corregir (${submittedCount})` },
                  { id: 'graded', label: `Corregidos (${gradedCount})` },
                  { id: 'missing', label: `Sin Entregar (${missingCount})` },
                  { id: 'dua', label: `DUA (${duaCount})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterStatus(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      filterStatus === f.id
                        ? 'bg-fox-primary text-white shadow-2xs'
                        : 'bg-fox-bg text-fox-text-muted hover:text-fox-text-main border border-fox-border/60'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submissions List Table */}
            <div className="bg-fox-surface border border-fox-border rounded-2xl shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-fox-bg/60 border-b border-fox-border text-[11px] uppercase tracking-wider text-fox-text-muted font-bold">
                      <th className="p-4 pl-5">Estudiante</th>
                      <th className="p-4">Estado de Entrega</th>
                      <th className="p-4">Adaptación DUA</th>
                      <th className="p-4">Calificación</th>
                      <th className="p-4 pr-5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-fox-border/50">
                    {filteredSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-fox-text-muted text-sm font-medium">
                          No se encontraron estudiantes con el filtro seleccionado.
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((sub) => {
                        const hasDua = sub.dua && sub.dua.length > 0;
                        return (
                          <tr
                            key={sub.studentId}
                            className="hover:bg-fox-bg/50 transition-colors group"
                          >
                            <td className="p-4 pl-5">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-fox-primary/10 to-fox-purple/10 border border-fox-primary/15 flex items-center justify-center font-bold text-xs text-fox-primary shrink-0 shadow-2xs">
                                  {sub.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                  <p className="font-bold text-fox-text-main text-xs sm:text-sm group-hover:text-fox-primary transition-colors">
                                    {sub.name}
                                  </p>
                                  <p className="text-[11px] text-fox-text-muted font-medium">
                                    {sub.date ? `Entregó: ${sub.date}` : 'Sin fecha registrada'}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="p-4">
                              {sub.status === 'missing' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                  <AlertCircle size={13} /> Sin entregar
                                </span>
                              )}
                              {sub.status === 'submitted' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                  <Clock size={13} /> Por corregir
                                </span>
                              )}
                              {sub.status === 'graded' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-fox-green/10 text-fox-green border border-fox-green/20">
                                  <CheckCircle2 size={13} /> Corregida
                                </span>
                              )}
                            </td>

                            <td className="p-4">
                              {hasDua ? (
                                <button
                                  onClick={() => handleOpenAdaptModal(sub)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-fox-purple/10 text-fox-purple border border-fox-purple/20 hover:bg-fox-purple/20 transition-colors"
                                  title="Ver consigna adaptada DUA"
                                >
                                  <BrainCircuit size={13} /> DUA: {sub.dua.join(', ')}
                                </button>
                              ) : (
                                <span className="text-xs text-fox-text-muted font-medium">Estándar</span>
                              )}
                            </td>

                            <td className="p-4">
                              {sub.status === 'graded' && sub.grade !== null ? (
                                <span className="font-black text-fox-text-main text-sm">
                                  {sub.grade.toFixed(1)} <span className="text-xs font-normal text-fox-text-muted">/ 10</span>
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-fox-text-muted/60">—</span>
                              )}
                            </td>

                            <td className="p-4 pr-5 text-right">
                              {sub.status === 'missing' ? (
                                <button
                                  onClick={() => toast.show(`Recordatorio enviado a ${sub.name}`, 'info')}
                                  className="px-3 py-1.5 bg-fox-bg hover:bg-fox-border/50 text-fox-text-muted hover:text-fox-text-main rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1 border border-fox-border cursor-pointer"
                                >
                                  <Send size={13} /> Recordar
                                </button>
                              ) : (
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    onClick={(e) => handleDownloadSubmissionFile(sub, e)}
                                    className="p-2 bg-fox-bg hover:bg-fox-primary/10 text-fox-text-muted hover:text-fox-primary rounded-xl border border-fox-border hover:border-fox-primary/30 transition-all cursor-pointer"
                                    title={`Descargar archivo de ${sub.name}`}
                                  >
                                    <Download size={14} />
                                  </button>
                                  <button
                                    onClick={() => setSelectedSubmissionToGrade(sub)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                                      sub.status === 'submitted'
                                        ? 'bg-fox-primary hover:bg-fox-primary/90 text-white'
                                        : 'bg-fox-bg hover:bg-fox-primary/10 text-fox-primary border border-fox-primary/20'
                                    }`}
                                  >
                                    <PenTool size={13} />
                                    <span>{sub.status === 'submitted' ? 'Corregir entrega' : 'Ver corrección'}</span>
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONSIGNA, RÚBRICA Y DUA */}
        {activeTab === 'consigna' && (
          <div className="space-y-6">
            {/* General Instructions Card */}
            <div className="bg-fox-surface border border-fox-border rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-fox-border/60 pb-3">
                <h3 className="font-heading font-bold text-fox-text-main text-base flex items-center gap-2">
                  <FileText size={18} className="text-fox-primary" /> Consigna General
                </h3>
                <span className="text-xs font-bold text-fox-text-muted">
                  Asignada a toda el aula
                </span>
              </div>

              <div className="text-xs sm:text-sm text-fox-text-main/90 leading-relaxed whitespace-pre-wrap font-medium">
                {activity.description || 'Sin consigna cargada.'}
              </div>

              {/* Attachments */}
              {activity.attachment && (
                <div className="pt-3 border-t border-fox-border/60">
                  <p className="text-xs font-bold text-fox-text-muted mb-2">Archivo adjunto de la consigna:</p>
                  <div className="bg-fox-bg border border-fox-border p-3 rounded-xl flex items-center justify-between gap-3 max-w-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
                        PDF
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-fox-text-main truncate">{activity.attachment.name}</p>
                        <p className="text-[10px] text-fox-text-muted">{activity.attachment.size}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toast.show('Descargando archivo adjunto...', 'info')}
                      className="p-1.5 text-fox-text-muted hover:text-fox-primary transition-colors"
                    >
                      <Download size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Rubric Card */}
            <div className="bg-fox-surface border border-fox-border rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-fox-border/60 pb-3">
                <h3 className="font-heading font-bold text-fox-text-main text-base flex items-center gap-2">
                  <Sliders size={18} className="text-fox-primary" /> Rúbrica de Evaluación
                </h3>
                <span className="text-xs font-black text-fox-primary bg-fox-primary/10 px-2.5 py-0.5 rounded-full">
                  10 Puntos Totales
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {[
                  { title: 'Comprensión y Conceptos', pts: 4, desc: 'Identificación correcta de autores, manifiestos y principios literarios.' },
                  { title: 'Análisis y Argumentación', pts: 4, desc: 'Capacidad de contraste crítico y fundamentación con ejemplos pertinentes.' },
                  { title: 'Estructura y Coherencia', pts: 2, desc: 'Organización textual, claridad sintáctica y vocabulario disciplinar.' },
                ].map((crit, idx) => (
                  <div key={idx} className="bg-fox-bg/60 border border-fox-border rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-fox-text-main">{crit.title}</p>
                      <span className="text-xs font-black text-fox-primary">{crit.pts} pts</span>
                    </div>
                    <p className="text-[11px] text-fox-text-muted leading-relaxed font-medium">
                      {crit.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* DUA Adaptations Overview Card */}
            <div className="bg-fox-surface border border-fox-purple/20 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-fox-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-fox-purple/10 text-fox-purple flex items-center justify-center">
                    <BrainCircuit size={16} />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-fox-text-main text-base">
                      Adaptaciones DUA en esta Actividad
                    </h3>
                    <p className="text-[11px] text-fox-purple font-semibold">
                      {duaCount} alumnos con personalización activa
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {submissions.filter(s => s.dua && s.dua.length > 0).map((student) => (
                  <div
                    key={student.studentId}
                    className="bg-fox-purple/5 border border-fox-purple/20 rounded-xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-fox-purple text-white flex items-center justify-center font-bold text-xs">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-fox-text-main">{student.name}</p>
                        <p className="text-[10px] text-fox-purple font-black uppercase tracking-wider">
                          Perfil: {student.dua.join(', ')}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenAdaptModal(student)}
                      className="px-3 py-1.5 bg-fox-surface hover:bg-fox-purple/10 text-fox-purple border border-fox-purple/30 rounded-lg text-xs font-bold transition-colors"
                    >
                      Ver Consigna DUA
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* DUA Modal Preview (Read-only confirmed adaptation) */}
      <AnimatePresence>
        {isAdaptModalOpen && studentToAdapt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-fox-surface border border-fox-border rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-fox-border bg-fox-purple/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-fox-purple text-white flex items-center justify-center shadow-xs">
                    <BrainCircuit size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-black text-fox-text-main text-base">
                        Adaptación DUA Confirmada
                      </h3>
                      <span className="bg-fox-purple/10 text-fox-purple border border-fox-purple/20 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                        Solo Lectura
                      </span>
                    </div>
                    <p className="text-xs text-fox-purple font-semibold">
                      Para {studentToAdapt.name} • {studentToAdapt.dua?.join(', ')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAdaptModalOpen(false)}
                  className="p-1.5 text-fox-text-muted hover:text-fox-text-main rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                <div className="bg-fox-purple/5 border border-fox-purple/20 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs text-fox-purple font-bold">
                  <Sparkles size={16} className="shrink-0" />
                  <span>Esta actividad fue adaptada pedagógicamente y confirmada durante su creación.</span>
                </div>

                <div className="bg-[#FAFBFD] border border-fox-border/80 rounded-2xl p-5 shadow-2xs">
                  <div className="text-xs sm:text-sm font-medium text-fox-text-main/90 leading-relaxed whitespace-pre-wrap font-sans">
                    {adaptedPromptText}
                  </div>
                </div>

                <div className="bg-fox-bg border border-fox-border rounded-xl p-3 text-[11px] text-fox-text-muted font-medium flex items-center justify-between">
                  <span>Estado de aplicación: <strong>Activa para el estudiante</strong></span>
                  <span className="text-fox-green font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} /> Confirmada
                  </span>
                </div>
              </div>

              <div className="p-4 border-t border-fox-border bg-fox-surface flex justify-end gap-2">
                <button
                  onClick={() => setIsAdaptModalOpen(false)}
                  className="px-6 py-2.5 bg-fox-purple hover:bg-fox-purple/90 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Entendido / Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Grading Drawer */}
      <AnimatePresence>
        {selectedSubmissionToGrade && (
          <TeacherGradingDrawer
            submission={selectedSubmissionToGrade}
            activity={activity}
            onClose={() => setSelectedSubmissionToGrade(null)}
            onSave={handleSaveGrading}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

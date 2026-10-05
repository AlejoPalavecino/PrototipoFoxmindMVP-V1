import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Sparkles, 
  Upload, 
  Calendar, 
  Clock, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  X, 
  BrainCircuit, 
  Check, 
  BookOpen, 
  Folder, 
  Eye, 
  PenTool, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  ArrowLeft,
  FileCheck,
  FileCode,
  FileSpreadsheet,
  Zap,
  UserCheck,
  Info
} from 'lucide-react';
import { toast } from '../ui/Toaster';

export type ActivityType = 'Trabajo práctico' | 'Evaluación' | 'Quizz' | 'Repaso';

export interface LibraryItem {
  id: number;
  title: string;
  type: string;
  size: string;
  date: string;
  color: string;
  bg: string;
}

export interface StudentProfile {
  id: number;
  name: string;
  risk?: string;
  lastSeen?: string;
  dua: string[];
}

export interface CreatedActivityData {
  id: number;
  title: string;
  type: ActivityType;
  status: 'Activa' | 'Borrador';
  startDate: string;
  due: string;
  submissions: string;
  description: string;
  topic: string;
  longInstructions: { title: string; content: string }[];
  attachment?: { name: string; size: string; url: string; fromLibrary?: boolean };
  rubric: { criteria: string; points: number }[];
  duaAdaptations: { studentName: string; duaProfile: string; adaptedContent: string; confirmed: boolean }[];
  createdVia: 'ai' | 'upload';
}

interface CreateActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectName: string;
  courseName: string;
  curriculum: { id: number; unit: string; topics: string[]; status?: string; completedTopics?: string[] }[];
  libraryFiles: LibraryItem[];
  students: StudentProfile[];
  onAddLibraryFile: (file: LibraryItem) => void;
  onCreateActivity: (activity: CreatedActivityData) => void;
}

export const CreateActivityModal: React.FC<CreateActivityModalProps> = ({
  isOpen,
  onClose,
  subjectName,
  courseName,
  curriculum,
  libraryFiles,
  students,
  onAddLibraryFile,
  onCreateActivity,
}) => {
  // Navigation inside the wizard
  // step: 'select-mode' | 'ai-config' | 'ai-generating' | 'ai-review' | 'upload-config' | 'upload-processing' | 'dua-adaptation'
  const [step, setStep] = useState<
    'select-mode' | 'ai-config' | 'ai-generating' | 'ai-review' | 'upload-config' | 'upload-processing' | 'dua-adaptation'
  >('select-mode');

  const [activeCreationMode, setActiveCreationMode] = useState<'ai' | 'upload'>('ai');

  // Common Form Fields
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('Trabajo práctico');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  });
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  // Attached materials
  const [attachedMaterial, setAttachedMaterial] = useState<{
    name: string;
    size: string;
    type: string;
    fromLibrary?: boolean;
  } | null>(null);

  const [isLibrarySelectorOpen, setIsLibrarySelectorOpen] = useState(false);
  const [isUploadingNewMaterial, setIsUploadingNewMaterial] = useState(false);

  // Upload Activity File (PDF / Word)
  const [uploadedActivityDoc, setUploadedActivityDoc] = useState<{
    name: string;
    size: string;
    type: string;
    file?: File;
  } | null>(null);
  const [isDraggingDoc, setIsDraggingDoc] = useState(false);
  const activityFileInputRef = useRef<HTMLInputElement>(null);
  const materialFileInputRef = useRef<HTMLInputElement>(null);

  // Generated / Configured Content
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityRubric, setActivityRubric] = useState<{ criteria: string; points: number }[]>([
    { criteria: 'Comprensión conceptual y análisis', points: 4 },
    { criteria: 'Producción escrita y argumentación', points: 4 },
    { criteria: 'Ortografía, estructura y citas', points: 2 },
  ]);
  const [newRubricRow, setNewRubricRow] = useState({ criteria: '', points: '' });
  const [showAddRubricRow, setShowAddRubricRow] = useState(false);

  // DUA Adaptations
  const [duaAdaptations, setDuaAdaptations] = useState<
    { studentName: string; duaProfile: string; adaptedContent: string; confirmed: boolean }[]
  >([]);
  const [editingDuaIdx, setEditingDuaIdx] = useState<number | null>(null);

  // Reset modal state
  const resetForm = () => {
    setStep('select-mode');
    setActiveCreationMode('ai');
    setSelectedTopic('');
    setCustomTopic('');
    setActivityType('Trabajo práctico');
    setStartDate(new Date().toISOString().split('T')[0]);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setDueDate(nextWeek.toISOString().split('T')[0]);
    setAdditionalInstructions('');
    setAttachedMaterial(null);
    setUploadedActivityDoc(null);
    setActivityTitle('');
    setActivityDescription('');
    setActivityRubric([
      { criteria: 'Comprensión conceptual y análisis', points: 4 },
      { criteria: 'Producción escrita y argumentación', points: 4 },
      { criteria: 'Ortografía, estructura y citas', points: 2 },
    ]);
    setDuaAdaptations([]);
    setEditingDuaIdx(null);
    setIsLibrarySelectorOpen(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Find all available topics from curriculum
  const allCurriculumTopics = curriculum.flatMap(u =>
    u.topics.map(t => ({
      topic: t,
      unitTitle: u.unit,
      isCurrent: u.status === 'current'
    }))
  );

  // Students with DUA in this classroom
  const studentsWithDua = students.filter(s => s.dua && s.dua.length > 0);

  // Handle new material upload directly from this wizard and sync to library
  const handleMaterialUpload = (file: File) => {
    const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    const typeLabel = ext === 'DOCX' || ext === 'DOC' ? 'DOCX' : ext === 'PPTX' || ext === 'PPT' ? 'PPTX' : 'PDF';

    const newLibItem: LibraryItem = {
      id: Date.now(),
      title: file.name.replace(/\.[^/.]+$/, ""),
      type: typeLabel,
      size: sizeMb,
      date: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }),
      color: typeLabel === 'PDF' ? 'text-red-500' : typeLabel === 'PPTX' ? 'text-orange-500' : 'text-blue-500',
      bg: typeLabel === 'PDF' ? 'bg-red-100' : typeLabel === 'PPTX' ? 'bg-orange-100' : 'bg-blue-100'
    };

    onAddLibraryFile(newLibItem);
    setAttachedMaterial({
      name: file.name,
      size: sizeMb,
      type: typeLabel,
      fromLibrary: true
    });
    setIsUploadingNewMaterial(false);
    toast.show(`📚 "${file.name}" vinculado y añadido a la Biblioteca del aula`, 'success');
  };

  // Step 1 -> AI Generation
  const handleStartAIGeneration = () => {
    const effectiveTopic = customTopic.trim() || selectedTopic || allCurriculumTopics[0]?.topic || 'Literatura';
    if (!effectiveTopic) {
      toast.show('Por favor selecciona o ingresa un tema', 'warning');
      return;
    }

    setStep('ai-generating');

    // Simulate AI synthesis based on topic, activity type and instructions
    setTimeout(() => {
      let generatedTitle = '';
      let generatedDesc = '';

      if (activityType === 'Evaluación') {
        generatedTitle = `Evaluación Formativa: ${effectiveTopic}`;
        generatedDesc = `Desarrolla el siguiente examen comprensivo sobre ${effectiveTopic}.\n\n1. Análisis contextual y fundamentos del tema.\n2. Resolución de 3 casos prácticos con justificación teórica.\n3. Conclusión crítica argumentativa (extensión sugerida: 400 palabras).\n\n${additionalInstructions ? `Nota docente: ${additionalInstructions}` : 'Recuerda respaldar tus respuestas con el material de lectura.'}`;
      } else if (activityType === 'Quizz') {
        generatedTitle = `Cuestionario Rápido: ${effectiveTopic}`;
        generatedDesc = `Completa las 5 preguntas de selección múltiple y justificación breve sobre ${effectiveTopic}.\n\nEnfocado en afianzar los conceptos clave trabajados en las últimas clases.\n${additionalInstructions ? `Instrucciones extra: ${additionalInstructions}` : ''}`;
      } else if (activityType === 'Repaso') {
        generatedTitle = `Guía de Repaso y Afianzamiento: ${effectiveTopic}`;
        generatedDesc = `Actividad integradora para sintetizar los conceptos nodales de ${effectiveTopic}.\n\n- Elabora un mapa conceptual que sintetice los ejes trabajados.\n- Responde el cuadro comparativo con ejemplos específicos.\n\n${additionalInstructions ? `Pautas: ${additionalInstructions}` : ''}`;
      } else {
        generatedTitle = `Trabajo Práctico: Análisis y Aplicación de ${effectiveTopic}`;
        generatedDesc = `Lee atentamente las consignas y el material adjunto sobre ${effectiveTopic}.\n\n1. Realiza una síntesis crítica identificando los postulados centrales.\n2. Contrasta dos perspectivas trabajadas en clase mediante ejemplos textuales.\n3. Redacta una reflexión personal argumentada.\n\n${additionalInstructions ? `Indicaciones específicas: ${additionalInstructions}` : 'Presentar en formato legible respetando las fechas límites estipuladas.'}`;
      }

      setActivityTitle(generatedTitle);
      setActivityDescription(generatedDesc);
      setStep('ai-review');
    }, 1800);
  };

  // Upload Flow: File drop/selection
  const handleActivityDocUpload = (file: File) => {
    const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    setUploadedActivityDoc({
      name: file.name,
      size: sizeMb,
      type: ext,
      file
    });

    // Auto-fill title if empty
    if (!activityTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ").replace(/-/g, " ");
      setActivityTitle(cleanName);
    }
  };

  // Upload Flow -> Processing
  const handleStartUploadProcessing = () => {
    if (!uploadedActivityDoc) {
      toast.show('Por favor sube un archivo Word o PDF con las consignas', 'warning');
      return;
    }
    if (!activityTitle.trim()) {
      toast.show('Por favor asigna un título a la actividad', 'warning');
      return;
    }

    setStep('upload-processing');

    setTimeout(() => {
      setActivityDescription(`Consignas extraídas y procesadas a partir de ${uploadedActivityDoc.name}.\n\nLos alumnos encontrarán el documento oficial adjunto y deberán resolver los puntos establecidos.`);
      prepareDuaAdaptations();
    }, 1600);
  };

  // Prepare DUA adaptations for students who need it
  const prepareDuaAdaptations = () => {
    const effectiveTopic = customTopic.trim() || selectedTopic || 'el tema actual';
    
    // Build tailored DUA adapted activity versions based on students detected and the current activity description
    const generatedDua = (studentsWithDua.length > 0 ? studentsWithDua : [
      { id: 2, name: 'Sofía Herrera', dua: ['Dislexia'] },
      { id: 4, name: 'Ana Torres', dua: ['TDAH'] }
    ]).map(student => {
      const profile = student.dua[0] || 'DUA General';
      let content = '';

      if (profile === 'Dislexia') {
        content = `[CONSIGNA ADAPTADA - LECTURA FÁCIL]\n\nTema: ${effectiveTopic}\n\n1. Lee los textos clave con tranquilidad (puedes activar el lector de voz en cualquier momento con el botón de audio).\n2. Elige 2 ideas principales que más te hayan llamado la atención.\n3. Escribe un texto breve (3 a 5 párrafos cortos) explicando con tus palabras qué entendiste de cada idea.\n4. Incluye un ejemplo concreto para cada una.\n\n* Nota: La ortografía no descontará puntos; se evaluará tu comprensión y claridad de ideas.`;
      } else if (profile === 'TDAH') {
        content = `[CONSIGNA ADAPTADA - GUÍA PASO A PASO]\n\nTema: ${effectiveTopic}\n\n☑ Paso 1 (15 min): Lee el material adjunto y subraya con un color los conceptos principales.\n☑ Paso 2 (15 min): Completa el cuadro de síntesis con 3 características clave.\n☑ Paso 3 (20 min): Redacta tu reflexión final respondiendo a las 2 preguntas orientadoras.\n\n* Recomendación: Tómate una pausa activa de 5 minutos entre cada paso. Puedes entregar las respuestas por escrito o grabando un audio corto de 2 minutos.`;
      } else if (profile === 'Baja Visión') {
        content = `[CONSIGNA ADAPTADA - ALTO CONTRASTE Y LECTURA ASISTIDA]\n\nTema: ${effectiveTopic}\n\n1. Consigna habilitada en formato de texto accesible para lector de pantalla.\n2. Sintetiza los 3 ejes centrales trabajados sobre ${effectiveTopic}.\n3. Puedes responder mediante texto digital (formato libre sin límite de tamaño de fuente) o subir un archivo de audio con tu desarrollo.\n4. Se incluye soporte de descripción de imágenes en el material complementario.`;
      } else {
        content = `[CONSIGNA ADAPTADA - SOPORTE MULTIMODAL]\n\nTema: ${effectiveTopic}\n\n1. Revisa la guía introductoria sobre ${effectiveTopic}.\n2. Desarrolla las 3 preguntas clave trabajadas en clase.\n3. Formato de entrega flexible: ensayo escrito (300 palabras), mapa conceptual comentado o presentación en audio.\n4. Tienes un plazo flexible de entrega extendida.`;
      }

      return {
        studentName: student.name,
        duaProfile: profile,
        adaptedContent: content,
        confirmed: true
      };
    });

    setDuaAdaptations(generatedDua);
    setStep('dua-adaptation');
  };

  // Final confirmation
  const handleFinalSubmit = () => {
    if (!activityTitle.trim()) {
      toast.show('Ingresa un título para la actividad', 'warning');
      return;
    }

    const effectiveTopic = customTopic.trim() || selectedTopic || allCurriculumTopics[0]?.topic || 'Tema General';

    const newActivity: CreatedActivityData = {
      id: Date.now(),
      title: activityTitle,
      type: activityType,
      status: 'Activa',
      startDate,
      due: dueDate,
      submissions: `0/${students.length || 28}`,
      description: activityDescription,
      topic: effectiveTopic,
      longInstructions: [
        { title: 'Pautas de trabajo', content: activityDescription },
        { title: 'Criterios de evaluación', content: 'Revisa la rúbrica asociada para guiar la elaboración de tus respuestas.' }
      ],
      attachment: uploadedActivityDoc ? {
        name: uploadedActivityDoc.name,
        size: uploadedActivityDoc.size,
        url: '#'
      } : attachedMaterial ? {
        name: attachedMaterial.name,
        size: attachedMaterial.size,
        url: '#',
        fromLibrary: attachedMaterial.fromLibrary
      } : undefined,
      rubric: activityRubric,
      duaAdaptations,
      createdVia: activeCreationMode
    };

    onCreateActivity(newActivity);
    toast.show(
      `🎉 Actividad "${activityTitle}" creada con éxito ${duaAdaptations.length > 0 ? `(con ${duaAdaptations.length} adaptaciones DUA)` : ''}`,
      'success'
    );
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-fox-surface border border-fox-border rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 border-b border-fox-border/70 flex items-center justify-between bg-fox-bg/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-fox-primary/10 text-fox-primary flex items-center justify-center font-bold">
              {activeCreationMode === 'ai' ? <Sparkles size={20} /> : <Upload size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-extrabold text-fox-text-main text-lg sm:text-xl">
                  {step === 'select-mode'
                    ? 'Nueva Actividad'
                    : step === 'ai-config'
                    ? 'Generar Actividad con IA'
                    : step === 'upload-config'
                    ? 'Subir Actividad (PDF / Word)'
                    : step === 'ai-review'
                    ? 'Revisión y Ajuste de Actividad'
                    : step === 'dua-adaptation'
                    ? 'Adaptación DUA por Alumno'
                    : 'Procesando...'}
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-fox-border/60 text-fox-text-muted">
                  {subjectName} • {courseName}
                </span>
              </div>
              <p className="text-xs text-fox-text-muted mt-0.5">
                {step === 'select-mode' && 'Selecciona el método de creación de consignas para el aula'}
                {step === 'ai-config' && 'Configura los parámetros pedagógicos para la generación inteligente'}
                {step === 'upload-config' && 'Carga el archivo con las consignas y completa los datos de entrega'}
                {step === 'ai-review' && 'Verifica y edita la consigna, fechas y rúbrica antes de adaptar'}
                {step === 'dua-adaptation' && 'Personalización de accesibilidad según los perfiles detectados'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 text-fox-text-muted hover:text-fox-text-main hover:bg-fox-surface rounded-xl border border-fox-border transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 0: SELECTION OF CREATION MODE */}
          {step === 'select-mode' && (
            <div className="space-y-6 py-2">
              <div className="text-center max-w-lg mx-auto">
                <h4 className="font-heading font-extrabold text-fox-text-main text-xl sm:text-2xl">
                  ¿Cómo deseas crear esta actividad?
                </h4>
                <p className="text-xs sm:text-sm text-fox-text-muted mt-1.5 leading-relaxed">
                  Puedes generar una propuesta pedagógica completa con IA alineada a la currícula o subir directamente tu propio documento con consignas.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                {/* Option 1: AI Generation */}
                <div
                  onClick={() => {
                    setActiveCreationMode('ai');
                    setStep('ai-config');
                  }}
                  className="group bg-gradient-to-b from-fox-primary/5 via-fox-surface to-fox-surface border-2 border-fox-primary/30 hover:border-fox-primary hover:shadow-lg hover:shadow-fox-primary/10 rounded-3xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-fox-primary/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-fox-primary text-white flex items-center justify-center shadow-md shadow-fox-primary/20 group-hover:scale-105 transition-transform">
                        <Sparkles size={24} />
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-fox-primary/15 text-fox-primary border border-fox-primary/20">
                        Recomendado
                      </span>
                    </div>

                    <h5 className="font-heading font-bold text-fox-text-main text-lg group-hover:text-fox-primary transition-colors">
                      Crear con IA
                    </h5>
                    <p className="text-xs text-fox-text-muted mt-2 leading-relaxed">
                      Diseña consignas contextualizadas, fechas, objetivos pedagógicos y rúbricas automáticamente a partir de los temas del plan curricular.
                    </p>
                  </div>

                  <div className="pt-6 mt-4 border-t border-fox-border/60 flex items-center justify-between text-xs font-bold text-fox-primary">
                    <span>Configurar y generar</span>
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Option 2: Upload File (PDF / Word) */}
                <div
                  onClick={() => {
                    setActiveCreationMode('upload');
                    setStep('upload-config');
                  }}
                  className="group bg-fox-surface border-2 border-fox-border hover:border-fox-primary/60 hover:shadow-lg hover:shadow-fox-primary/5 rounded-3xl p-6 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-fox-bg border border-fox-border text-fox-text-main flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform group-hover:text-fox-primary group-hover:border-fox-primary/30">
                        <Upload size={24} />
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-fox-bg text-fox-text-muted border border-fox-border">
                        PDF / Word
                      </span>
                    </div>

                    <h5 className="font-heading font-bold text-fox-text-main text-lg group-hover:text-fox-primary transition-colors">
                      Subir Actividad
                    </h5>
                    <p className="text-xs text-fox-text-muted mt-2 leading-relaxed">
                      Sube directamente tu archivo en Word o PDF con las consignas preparadas. La IA lo indexará y generará las adaptaciones DUA correspondientes.
                    </p>
                  </div>

                  <div className="pt-6 mt-4 border-t border-fox-border/60 flex items-center justify-between text-xs font-bold text-fox-text-muted group-hover:text-fox-primary">
                    <span>Subir archivo y asignar</span>
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1A: AI CONFIGURATION FORM */}
          {step === 'ai-config' && (
            <div className="space-y-5">
              {/* Topic Selector */}
              <div>
                <label className="block text-xs font-bold text-fox-text-muted uppercase tracking-wider mb-2">
                  Tema de la Currícula o Contenido
                </label>
                <div className="space-y-2">
                  <select
                    value={selectedTopic}
                    onChange={(e) => {
                      setSelectedTopic(e.target.value);
                      if (e.target.value !== '__custom__') {
                        setCustomTopic('');
                      }
                    }}
                    className="w-full bg-fox-bg border border-fox-border rounded-2xl p-3 text-xs sm:text-sm font-bold text-fox-text-main focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all"
                  >
                    <option value="">-- Selecciona un tema del plan anual --</option>
                    {curriculum.map(unit => (
                      <optgroup key={unit.id} label={unit.unit}>
                        {unit.topics.map(topic => (
                          <option key={`${unit.id}-${topic}`} value={topic}>
                            {topic}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="__custom__">✍️ Escribir otro tema personalizado...</option>
                  </select>

                  {selectedTopic === '__custom__' && (
                    <input
                      type="text"
                      placeholder="Escribe el tema específico (ej. Narrativa y Memoria en el Cono Sur)..."
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      className="w-full bg-fox-bg border border-fox-primary rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-fox-text-main font-medium focus:ring-2 focus:ring-fox-primary/20 outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Activity Type Selection */}
              <div>
                <label className="block text-xs font-bold text-fox-text-muted uppercase tracking-wider mb-2">
                  Tipo de Actividad
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(['Trabajo práctico', 'Evaluación', 'Quizz', 'Repaso'] as ActivityType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setActivityType(type)}
                      className={`p-3 rounded-2xl border-2 text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                        activityType === type
                          ? 'border-fox-primary bg-fox-primary/10 text-fox-primary shadow-xs'
                          : 'border-fox-border bg-fox-bg text-fox-text-muted hover:border-fox-primary/30 hover:text-fox-text-main'
                      }`}
                    >
                      {type === 'Trabajo práctico' && <FileText size={18} />}
                      {type === 'Evaluación' && <FileCheck size={18} />}
                      {type === 'Quizz' && <Zap size={18} />}
                      {type === 'Repaso' && <Layers size={18} />}
                      <span>{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-fox-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar size={13} /> Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-fox-bg border border-fox-border rounded-xl p-2.5 text-xs sm:text-sm font-medium text-fox-text-main outline-none focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-fox-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock size={13} /> Fecha de Entrega
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-fox-bg border border-fox-border rounded-xl p-2.5 text-xs sm:text-sm font-medium text-fox-text-main outline-none focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary"
                  />
                </div>
              </div>

              {/* Additional Instructions */}
              <div>
                <label className="block text-xs font-bold text-fox-text-muted uppercase tracking-wider mb-2">
                  Instrucciones Adicionales para la IA (Opcional)
                </label>
                <textarea
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="Ej. Enfocarse en comprensión lectora con citas textuales breves, limitar a 500 palabras y sugerir preguntas reflexivas..."
                  className="w-full bg-fox-bg border border-fox-border rounded-2xl p-3.5 text-xs sm:text-sm text-fox-text-main placeholder:text-fox-text-muted focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none min-h-[85px] resize-y"
                />
              </div>

              {/* Theoretical Material / Library Association */}
              <div className="bg-fox-bg/60 border border-fox-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-fox-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Folder size={14} /> Material Teórico Asociado (Biblioteca)
                  </span>
                  <span className="text-[11px] font-semibold text-fox-primary">
                    {attachedMaterial ? '1 material vinculado' : 'Opcional'}
                  </span>
                </div>

                {attachedMaterial ? (
                  <div className="bg-fox-surface border border-fox-border rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-fox-primary/10 text-fox-primary flex items-center justify-center font-bold text-xs">
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-fox-text-main">
                          {attachedMaterial.name}
                        </p>
                        <span className="text-[10px] text-fox-text-muted font-medium">
                          {attachedMaterial.size} • Guardado en Biblioteca
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setAttachedMaterial(null)}
                      className="p-1.5 text-fox-text-muted hover:text-red-500 rounded-lg transition-colors"
                      title="Quitar material"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Link from classroom library */}
                    <button
                      type="button"
                      onClick={() => setIsLibrarySelectorOpen(true)}
                      className="p-3 border-2 border-dashed border-fox-border rounded-xl hover:border-fox-primary hover:bg-fox-primary/5 text-fox-text-muted hover:text-fox-primary transition-all flex items-center justify-center gap-2 text-xs font-bold cursor-pointer"
                    >
                      <BookOpen size={16} />
                      <span>Elegir de la Biblioteca</span>
                    </button>

                    {/* Upload new material directly (will save to library) */}
                    <button
                      type="button"
                      onClick={() => materialFileInputRef.current?.click()}
                      className="p-3 border-2 border-dashed border-fox-border rounded-xl hover:border-fox-primary hover:bg-fox-primary/5 text-fox-text-muted hover:text-fox-primary transition-all flex items-center justify-center gap-2 text-xs font-bold cursor-pointer"
                    >
                      <Upload size={16} />
                      <span>Subir Nuevo (Auto-biblioteca)</span>
                    </button>
                    <input
                      type="file"
                      ref={materialFileInputRef}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.pptx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleMaterialUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-between border-t border-fox-border">
                <button
                  type="button"
                  onClick={() => setStep('select-mode')}
                  className="px-4 py-2.5 rounded-xl border border-fox-border text-xs font-bold text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Volver
                </button>

                <button
                  type="button"
                  onClick={handleStartAIGeneration}
                  className="px-6 py-2.5 rounded-xl bg-fox-primary text-white text-xs sm:text-sm font-bold hover:bg-fox-primary/90 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles size={16} />
                  <span>Generar Actividad con IA</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 1B: UPLOAD ACTIVITY FILE (PDF/Word) FORM */}
          {step === 'upload-config' && (
            <div className="space-y-5">
              {/* Drag & Drop Document Area */}
              <div>
                <label className="block text-xs font-bold text-fox-text-muted uppercase tracking-wider mb-2">
                  Documento con las Consignas (PDF o Word)
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingDoc(true);
                  }}
                  onDragLeave={() => setIsDraggingDoc(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingDoc(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleActivityDocUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => activityFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                    isDraggingDoc
                      ? 'border-fox-primary bg-fox-primary/10'
                      : uploadedActivityDoc
                      ? 'border-emerald-400 bg-emerald-50/50'
                      : 'border-fox-border bg-fox-bg hover:border-fox-primary/50'
                  }`}
                >
                  <input
                    type="file"
                    ref={activityFileInputRef}
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleActivityDocUpload(e.target.files[0]);
                      }
                    }}
                  />

                  {uploadedActivityDoc ? (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 shadow-2xs">
                        <FileCheck size={26} />
                      </div>
                      <p className="text-sm font-bold text-fox-text-main">
                        {uploadedActivityDoc.name}
                      </p>
                      <span className="text-xs text-fox-text-muted mt-0.5">
                        {uploadedActivityDoc.size} • Haz clic para cambiar archivo
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-2xl bg-fox-surface border border-fox-border text-fox-primary flex items-center justify-center mb-3 shadow-2xs">
                        <Upload size={22} />
                      </div>
                      <p className="text-sm font-bold text-fox-text-main">
                        Arrastra aquí tu archivo Word o PDF
                      </p>
                      <span className="text-xs text-fox-text-muted mt-1">
                        o haz clic para examinar desde tu equipo (.pdf, .docx, .doc)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Title Field */}
              <div>
                <label className="block text-xs font-bold text-fox-text-muted uppercase tracking-wider mb-2">
                  Título de la Actividad
                </label>
                <input
                  type="text"
                  placeholder="Ej. Trabajo Práctico N° 3: Vanguardias Latinoamericanas"
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  className="w-full bg-fox-bg border border-fox-border rounded-xl p-3 text-xs sm:text-sm font-bold text-fox-text-main focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none"
                />
              </div>

              {/* Topic & Activity Type Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-fox-text-muted uppercase tracking-wider mb-2">
                    Tema Relacionado
                  </label>
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="w-full bg-fox-bg border border-fox-border rounded-xl p-2.5 text-xs sm:text-sm font-bold text-fox-text-main focus:ring-2 focus:ring-fox-primary/20 outline-none"
                  >
                    <option value="">-- Seleccionar tema --</option>
                    {curriculum.map(unit => (
                      <optgroup key={unit.id} label={unit.unit}>
                        {unit.topics.map(topic => (
                          <option key={`${unit.id}-${topic}`} value={topic}>
                            {topic}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-fox-text-muted uppercase tracking-wider mb-2">
                    Tipo de Actividad
                  </label>
                  <select
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value as ActivityType)}
                    className="w-full bg-fox-bg border border-fox-border rounded-xl p-2.5 text-xs sm:text-sm font-bold text-fox-text-main focus:ring-2 focus:ring-fox-primary/20 outline-none"
                  >
                    <option value="Trabajo práctico">Trabajo práctico</option>
                    <option value="Evaluación">Evaluación</option>
                    <option value="Quizz">Quizz</option>
                    <option value="Repaso">Repaso</option>
                  </select>
                </div>
              </div>

              {/* Dates Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-fox-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar size={13} /> Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-fox-bg border border-fox-border rounded-xl p-2.5 text-xs sm:text-sm font-medium text-fox-text-main outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-fox-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock size={13} /> Fecha de Entrega
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-fox-bg border border-fox-border rounded-xl p-2.5 text-xs sm:text-sm font-medium text-fox-text-main outline-none"
                  />
                </div>
              </div>

              {/* Theoretical Material Link */}
              <div className="bg-fox-bg/60 border border-fox-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-fox-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Folder size={14} /> Material Teórico Complementario (Opcional)
                  </span>
                </div>

                {attachedMaterial ? (
                  <div className="bg-fox-surface border border-fox-border rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-fox-primary/10 text-fox-primary flex items-center justify-center font-bold text-xs">
                        <FileText size={16} />
                      </div>
                      <span className="text-xs font-bold text-fox-text-main">
                        {attachedMaterial.name} ({attachedMaterial.size})
                      </span>
                    </div>
                    <button
                      onClick={() => setAttachedMaterial(null)}
                      className="text-fox-text-muted hover:text-red-500 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsLibrarySelectorOpen(true)}
                      className="flex-1 p-2.5 border border-fox-border rounded-xl bg-fox-surface hover:border-fox-primary text-fox-text-muted hover:text-fox-primary text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <BookOpen size={14} /> Elegir de Biblioteca
                    </button>
                    <button
                      type="button"
                      onClick={() => materialFileInputRef.current?.click()}
                      className="flex-1 p-2.5 border border-fox-border rounded-xl bg-fox-surface hover:border-fox-primary text-fox-text-muted hover:text-fox-primary text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Upload size={14} /> Subir Nuevo a Biblioteca
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-between border-t border-fox-border">
                <button
                  type="button"
                  onClick={() => setStep('select-mode')}
                  className="px-4 py-2.5 rounded-xl border border-fox-border text-xs font-bold text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Volver
                </button>

                <button
                  type="button"
                  onClick={handleStartUploadProcessing}
                  className="px-6 py-2.5 rounded-xl bg-fox-primary text-white text-xs sm:text-sm font-bold hover:bg-fox-primary/90 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <span>Procesar y Continuar a DUA</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP: AI GENERATING ANIMATION */}
          {step === 'ai-generating' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-fox-primary/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-fox-primary border-t-transparent rounded-full animate-spin" />
                <BrainCircuit size={32} className="absolute inset-0 m-auto text-fox-primary animate-pulse" />
              </div>

              <div>
                <h4 className="font-heading font-extrabold text-fox-text-main text-lg">
                  Diseñando Propuesta Pedagógica...
                </h4>
                <p className="text-xs text-fox-text-muted mt-1 max-w-sm">
                  La IA está analizando los contenidos curriculares y estructurando la consigna y rúbrica para {subjectName}.
                </p>
              </div>
            </div>
          )}

          {/* STEP: UPLOAD PROCESSING ANIMATION */}
          {step === 'upload-processing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-fox-primary/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-fox-primary border-t-transparent rounded-full animate-spin" />
                <FileCheck size={32} className="absolute inset-0 m-auto text-fox-primary animate-pulse" />
              </div>

              <div>
                <h4 className="font-heading font-extrabold text-fox-text-main text-lg">
                  Indexando Archivo y Analizando Accesibilidad...
                </h4>
                <p className="text-xs text-fox-text-muted mt-1 max-w-sm">
                  Extrayendo las consignas y verificando los perfiles de los alumnos del aula para detectar adaptaciones DUA.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: AI REVIEW / EDIT GENERATED ACTIVITY */}
          {step === 'ai-review' && (
            <div className="space-y-5">
              <div className="bg-fox-primary/10 border border-fox-primary/20 rounded-2xl p-4 flex items-start gap-3">
                <Sparkles size={18} className="text-fox-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm font-bold text-fox-text-main">
                    Actividad Generada con IA
                  </p>
                  <p className="text-xs text-fox-text-muted mt-0.5 leading-relaxed">
                    Revisa y modifica cualquier campo según consideres necesario antes de pasar a la revisión de adaptaciones DUA por alumno.
                  </p>
                </div>
              </div>

              {/* Editable Title */}
              <div>
                <label className="block text-xs font-bold text-fox-text-muted uppercase tracking-wider mb-2">
                  Título de la Actividad
                </label>
                <input
                  type="text"
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  className="w-full bg-fox-bg border border-fox-border rounded-xl p-3 text-sm font-bold text-fox-text-main focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none"
                />
              </div>

              {/* Editable Description */}
              <div>
                <label className="block text-xs font-bold text-fox-text-muted uppercase tracking-wider mb-2">
                  Consigna y Pautas Detalladas
                </label>
                <textarea
                  value={activityDescription}
                  onChange={(e) => setActivityDescription(e.target.value)}
                  className="w-full bg-fox-bg border border-fox-border rounded-2xl p-3.5 text-xs sm:text-sm text-fox-text-main focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none min-h-[140px] leading-relaxed resize-y font-sans"
                />
              </div>

              {/* Rubric Section */}
              <div className="bg-fox-bg/60 border border-fox-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xs font-bold text-fox-text-muted uppercase tracking-wider">
                      Rúbrica de Evaluación
                    </span>
                    <span className="text-[11px] text-fox-primary font-bold ml-2">
                      ({activityRubric.reduce((acc, r) => acc + r.points, 0)} pts totales)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddRubricRow(!showAddRubricRow)}
                    className="text-xs font-bold text-fox-primary hover:text-fox-primary/80 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} /> Añadir Criterio
                  </button>
                </div>

                <div className="space-y-2">
                  {activityRubric.map((rubric, idx) => (
                    <div
                      key={idx}
                      className="bg-fox-surface border border-fox-border rounded-xl p-2.5 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <input
                        type="text"
                        value={rubric.criteria}
                        onChange={(e) => {
                          const updated = [...activityRubric];
                          updated[idx].criteria = e.target.value;
                          setActivityRubric(updated);
                        }}
                        className="flex-1 bg-transparent text-xs sm:text-sm font-medium text-fox-text-main border-none focus:outline-none"
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          value={rubric.points}
                          onChange={(e) => {
                            const updated = [...activityRubric];
                            updated[idx].points = parseInt(e.target.value) || 0;
                            setActivityRubric(updated);
                          }}
                          className="w-14 bg-fox-bg border border-fox-border rounded-lg px-2 py-1 text-xs font-bold text-center text-fox-primary outline-none"
                        />
                        <span className="text-xs text-fox-text-muted font-bold">pts</span>
                        <button
                          type="button"
                          onClick={() => setActivityRubric(activityRubric.filter((_, i) => i !== idx))}
                          className="text-fox-text-muted hover:text-red-500 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {showAddRubricRow && (
                    <div className="bg-fox-primary/5 border border-fox-primary/20 rounded-xl p-3 flex gap-2">
                      <input
                        type="text"
                        placeholder="Nuevo criterio (ej. Presentación visual)"
                        value={newRubricRow.criteria}
                        onChange={(e) => setNewRubricRow({ ...newRubricRow, criteria: e.target.value })}
                        className="flex-1 bg-fox-surface border border-fox-border rounded-lg px-3 py-1.5 text-xs text-fox-text-main outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Pts"
                        value={newRubricRow.points}
                        onChange={(e) => setNewRubricRow({ ...newRubricRow, points: e.target.value })}
                        className="w-16 bg-fox-surface border border-fox-border rounded-lg px-2 py-1.5 text-xs text-center font-bold outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newRubricRow.criteria && newRubricRow.points) {
                            setActivityRubric([
                              ...activityRubric,
                              { criteria: newRubricRow.criteria, points: parseInt(newRubricRow.points) || 1 }
                            ]);
                            setNewRubricRow({ criteria: '', points: '' });
                            setShowAddRubricRow(false);
                          }
                        }}
                        className="bg-fox-primary text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-fox-primary/90"
                      >
                        Añadir
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-between border-t border-fox-border">
                <button
                  type="button"
                  onClick={() => setStep('ai-config')}
                  className="px-4 py-2.5 rounded-xl border border-fox-border text-xs font-bold text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Modificar Parámetros
                </button>

                <button
                  type="button"
                  onClick={prepareDuaAdaptations}
                  className="px-6 py-2.5 rounded-xl bg-fox-primary text-white text-xs sm:text-sm font-bold hover:bg-fox-primary/90 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <span>Continuar a Adaptaciones DUA</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DUA ALERT & STUDENT-BY-STUDENT ADAPTATION */}
          {step === 'dua-adaptation' && (
            <div className="space-y-5">
              {/* DUA Alert Banner */}
              {duaAdaptations.length > 0 ? (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                      <AlertCircle size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-heading font-extrabold text-amber-900 text-sm sm:text-base">
                          Alerta de Accesibilidad y DUA Detectada
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200/80 text-amber-800">
                          {duaAdaptations.length} Alumnos
                        </span>
                      </div>
                      <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
                        La IA ha generado adaptaciones metodológicas personalizadas para los alumnos que requieren ajustes en esta actividad.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 flex items-center gap-3">
                  <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-emerald-900 text-sm">
                      Aula sin perfiles específicos de adaptación requeridos
                    </h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Todos los alumnos recibirán la versión estándar con soporte general de lectura accesible.
                    </p>
                  </div>
                </div>
              )}

              {/* Student-by-Student Adaptations List */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-xs font-bold text-fox-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck size={14} /> Actividades Adaptadas por Estudiante
                  </span>
                  <span className="text-[11px] text-fox-primary font-bold">
                    Consignas personalizadas listas para asignar (puedes editarlas directamente)
                  </span>
                </div>

                {duaAdaptations.map((adaptation, idx) => {
                  const isEditing = editingDuaIdx === idx;

                  return (
                    <div
                      key={idx}
                      className="bg-fox-surface border-2 border-fox-orange/30 hover:border-fox-orange/60 rounded-2xl overflow-hidden shadow-xs transition-all"
                    >
                      {/* Student Card Header */}
                      <div
                        onClick={() => setEditingDuaIdx(isEditing ? null : idx)}
                        className="p-4 bg-fox-orange/5 border-b border-fox-orange/15 flex items-center justify-between cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-fox-orange/20 text-fox-orange font-black text-xs flex items-center justify-center">
                            {adaptation.studentName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs sm:text-sm font-bold text-fox-text-main">
                                {adaptation.studentName}
                              </p>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-fox-orange/15 text-fox-orange border border-fox-orange/20">
                                {adaptation.duaProfile}
                              </span>
                            </div>
                            <span className="text-[11px] text-fox-text-muted font-medium">
                              Versión adaptada por la IA para este alumno
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="flex items-center gap-1 text-xs font-bold text-fox-orange bg-fox-orange/10 hover:bg-fox-orange/20 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                          >
                            {isEditing ? (
                              <>
                                <span>Cerrar editor</span>
                                <ChevronUp size={14} />
                              </>
                            ) : (
                              <>
                                <PenTool size={13} />
                                <span>Modificar consigna</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Content / Editor */}
                      <div className="p-4 space-y-3 bg-fox-surface">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] font-bold text-fox-text-muted uppercase tracking-wider">
                                Modificar Actividad Adaptada para {adaptation.studentName}
                              </label>
                              <span className="text-[10px] text-fox-orange font-bold">Modo edición docente</span>
                            </div>
                            <textarea
                              value={adaptation.adaptedContent}
                              onChange={(e) => {
                                const updated = [...duaAdaptations];
                                updated[idx].adaptedContent = e.target.value;
                                setDuaAdaptations(updated);
                              }}
                              className="w-full bg-fox-bg border border-fox-orange/40 rounded-xl p-3 text-xs sm:text-sm text-fox-text-main focus:ring-2 focus:ring-fox-orange/20 outline-none min-h-[140px] font-sans leading-relaxed resize-y"
                            />
                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDuaIdx(null);
                                  toast.show(`Cambios en la consigna de ${adaptation.studentName} guardados`, 'success');
                                }}
                                className="px-4 py-1.5 bg-fox-orange text-white text-xs font-bold rounded-xl hover:bg-fox-orange/90 shadow-xs cursor-pointer"
                              >
                                Guardar cambios
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditingDuaIdx(idx)}
                            className="cursor-pointer group"
                          >
                            <div className="text-xs text-fox-text-main/90 font-sans whitespace-pre-wrap leading-relaxed bg-fox-bg/70 p-3.5 rounded-xl border border-fox-border/60 group-hover:border-fox-orange/40 transition-colors">
                              {adaptation.adaptedContent}
                            </div>
                            <p className="text-[10px] text-fox-text-muted mt-1.5 text-right font-medium">
                              👆 Clic sobre la consigna para editarla
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-between border-t border-fox-border">
                <button
                  type="button"
                  onClick={() => setStep(activeCreationMode === 'ai' ? 'ai-review' : 'upload-config')}
                  className="px-4 py-2.5 rounded-xl border border-fox-border text-xs font-bold text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} /> Volver a Revisión
                </button>

                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  className="px-6 py-2.5 rounded-xl bg-fox-primary text-white text-xs sm:text-sm font-bold hover:bg-fox-primary/90 transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>Confirmar y Asignar Actividad</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Nested Library Selector Modal */}
      <AnimatePresence>
        {isLibrarySelectorOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center z-[60] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-fox-surface border border-fox-border rounded-3xl p-6 shadow-2xl w-full max-w-md space-y-4"
            >
              <div className="flex items-center justify-between border-b border-fox-border pb-3">
                <h4 className="font-heading font-extrabold text-fox-text-main text-base flex items-center gap-2">
                  <BookOpen size={18} className="text-fox-primary" /> Biblioteca del Aula
                </h4>
                <button
                  onClick={() => setIsLibrarySelectorOpen(false)}
                  className="text-fox-text-muted hover:text-fox-text-main"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {libraryFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => {
                      setAttachedMaterial({
                        name: `${file.title}.${file.type.toLowerCase()}`,
                        size: file.size,
                        type: file.type,
                        fromLibrary: true
                      });
                      setIsLibrarySelectorOpen(false);
                      toast.show(`Material "${file.title}" vinculado`, 'success');
                    }}
                    className="p-3 bg-fox-bg hover:bg-fox-primary/5 hover:border-fox-primary/40 border border-fox-border rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${file.bg} ${file.color}`}>
                        <FileText size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-fox-text-main group-hover:text-fox-primary transition-colors">
                          {file.title}
                        </p>
                        <span className="text-[10px] text-fox-text-muted font-medium">
                          {file.type} • {file.size}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-fox-text-muted group-hover:text-fox-primary transition-transform group-hover:translate-x-0.5" />
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setIsLibrarySelectorOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-fox-border text-fox-text-muted hover:bg-fox-bg"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

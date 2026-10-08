import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, 
  Send, 
  Sparkles, 
  Paperclip, 
  Mic, 
  Layers, 
  Brain, 
  FileText, 
  Network, 
  Target, 
  Download, 
  Save, 
  Maximize2, 
  Plus, 
  BookOpen, 
  Clock, 
  X, 
  Check, 
  RotateCcw, 
  Copy, 
  Sliders, 
  ChevronRight,
  Eye,
  PanelRightClose,
  PanelRightOpen,
  Edit3
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from '../../../components/ui/Toaster';
import { StudyFolder } from '../../../types';
import { createStudyFlashcardResource } from '../../../features/study/application/studyFlashcardGeneration';
import { createStudyQuizResource } from '../../../features/study/application/studyQuizGeneration';
import { 
  StudentStudySession, 
  StudentStudyMessage, 
  StudentAgentMode, 
  StudyGeneratedResource, 
  StudyToolType 
} from './estudioTypes';

interface StudyChatWorkspaceProps {
  folder: StudyFolder;
  session: StudentStudySession;
  onUpdateSession: (updatedSession: StudentStudySession) => void;
  onOpenResource: (resource: StudyGeneratedResource) => void;
  onRequestCreateTool: (toolType?: StudyToolType) => void;
  onSaveResourceToLibrary: (resource: StudyGeneratedResource) => void;
}

const STUDENT_SLASH_COMMANDS = [
  { cmd: '/flashcards', label: 'Generar Mazo de Flashcards', desc: 'Tarjetas interactivas con Active Recall', type: 'flashcards' },
  { cmd: '/quiz', label: 'Quiz Rápido de 5 Preguntas', desc: 'Evaluación formativa con feedback socrático', type: 'quiz' },
  { cmd: '/resumen', label: 'Resumen Ejecutivo con Puntos Clave', desc: 'Síntesis didáctica estructurada', type: 'resumen' },
  { cmd: '/mapa', label: 'Mapa Conceptual Interactivo', desc: 'Grafo de nodos conceptuales interconectados', type: 'mapa' },
  { cmd: '/plan', label: 'Plan de Estudio para Parciales', desc: 'Cronograma con metas y fechas límite', type: 'plan' },
];

export const StudyChatWorkspace: React.FC<StudyChatWorkspaceProps> = ({
  folder,
  session,
  onUpdateSession,
  onOpenResource,
  onRequestCreateTool,
  onSaveResourceToLibrary
}) => {
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [agentMode, setAgentMode] = useState<StudentAgentMode>(session.mode || 'socratico');
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string; type: string } | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(true);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // Right Side Live Preview / Canvas State
  const [canvasDocument, setCanvasDocument] = useState<{
    title: string;
    type: 'notes' | 'flashcards' | 'quiz' | 'resumen' | 'mapa';
    content: string;
    resource?: StudyGeneratedResource;
  }>({
    title: 'Apuntes de Estudio & Notas en Vivo',
    type: 'notes',
    content: `# ${folder.name}\n\n**Área de Enfoque:** ${folder.focusArea || 'Estudio Integral'}\n\nAquí puedes tomar apuntes mientras dialogas con Foxy o ver en tiempo real los recursos generados.`
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages, isThinking]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    if (text.startsWith('/')) {
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  };

  const handleSelectSlashCommand = (cmd: string, type?: string) => {
    setShowSlashMenu(false);
    if (type) {
      onRequestCreateTool(type as StudyToolType);
    } else {
      handleSendMessage(cmd);
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query && !attachedFile) return;

    const userMsg: StudentStudyMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...session.messages, userMsg];
    onUpdateSession({
      ...session,
      messages: updatedMessages,
      updatedAt: 'Ahora'
    });

    setInputText('');
    setAttachedFile(null);
    setShowSlashMenu(false);
    setIsThinking(true);

    // AI Pedagogical Simulation
    setTimeout(() => {
      setIsThinking(false);
      const lowerQuery = query.toLowerCase();

      let aiResponseText = '';
      let generatedTool: StudyGeneratedResource | undefined = undefined;
      let suggestedActions: any[] = [];

      if (lowerQuery.includes('flashcard') || lowerQuery.includes('tarjeta') || lowerQuery.includes('/flashcards')) {
        const newDeckResource: StudyGeneratedResource = createStudyFlashcardResource(folder);

        aiResponseText = `🃏 ¡He generado un **Mazo de Flashcards** para tu estudio de **${folder.name}**!\n\nUtiliza el método de **Active Recall** (recuperación activa). Haz clic en la tarjeta para practicar en modo 3D con pistas pedagógicas.`;
        generatedTool = newDeckResource;
        suggestedActions = [
          { label: '🃏 Practicar Mazo Ahora', actionPrompt: 'Abrir mazo de flashcards', iconType: 'flashcards' },
          { label: '⚡ Tomar Quiz Rápido', actionPrompt: 'Hagamos un quiz de autoevaluación', iconType: 'quiz' }
        ];

        setCanvasDocument({
          title: newDeckResource.title,
          type: 'flashcards',
          content: `# ${newDeckResource.title}\n\n- **Tema:** ${newDeckResource.topic}\n- **Tarjetas generadas:** 3\n- **Estado:** Pendiente de práctica`,
          resource: newDeckResource
        });

        onSaveResourceToLibrary(newDeckResource);
      } else if (lowerQuery.includes('quiz') || lowerQuery.includes('evaluacion') || lowerQuery.includes('cuestionario') || lowerQuery.includes('/quiz')) {
        const newQuizResource: StudyGeneratedResource = createStudyQuizResource(folder);

        aiResponseText = `⚡ ¡He preparado un **Quiz Rápido de Autoevaluación** de **${folder.name}**!\n\nRespondé las preguntas y te iré dando explicaciones socráticas inmediatas para consolidar el tema antes de tu examen.`;
        generatedTool = newQuizResource;
        suggestedActions = [
          { label: '⚡ Iniciar Quiz Formativo', actionPrompt: 'Comenzar quiz interactivo', iconType: 'quiz' },
          { label: '🧠 Ver Mapa Conceptual', actionPrompt: 'Mostrame el mapa conceptual del tema', iconType: 'mapa' }
        ];

        setCanvasDocument({
          title: newQuizResource.title,
          type: 'quiz',
          content: `# ${newQuizResource.title}\n\n- **Preguntas:** 2\n- **Dificultad:** Intermedia\n- **Foco:** Comprensión analítica`,
          resource: newQuizResource
        });

        onSaveResourceToLibrary(newQuizResource);
      } else if (lowerQuery.includes('mapa') || lowerQuery.includes('red') || lowerQuery.includes('/mapa')) {
        const newMapResource: StudyGeneratedResource = {
          id: `res-map-${Date.now()}`,
          title: `Mapa Conceptual: ${folder.name}`,
          type: 'mapa',
          folderId: folder.id,
          folderName: folder.name,
          topic: folder.topics?.[0]?.name || folder.name,
          description: 'Esquema jerárquico interactivo con nodos interconectados.',
          createdAt: 'Justo ahora',
          fileSize: '5 nodos',
          fileFormat: 'CONCEPT_MAP',
          data: {
            conceptMap: {
              id: `map-${Date.now()}`,
              title: `Mapa Conceptual: ${folder.name}`,
              folderId: folder.id,
              folderName: folder.name,
              centralTopic: folder.name,
              createdAt: 'Hoy',
              summary: 'Interconexión de conceptos fundamentales, metodologías y casos prácticos.',
              nodes: [
                {
                  id: 'n-core',
                  label: folder.name,
                  description: 'Eje central de estudio y estructuración teórica.',
                  category: 'core',
                  connectedTo: ['n-fund', 'n-met']
                },
                {
                  id: 'n-fund',
                  label: 'Fundamentos & Orígenes',
                  description: 'Principios rectores y antecedentes históricos o matemáticos.',
                  category: 'branch',
                  connectedTo: ['n-sub1']
                },
                {
                  id: 'n-met',
                  label: 'Aplicación Práctica',
                  description: 'Resolución de problemas, ejercicios típicos y análisis crítico.',
                  category: 'branch',
                  connectedTo: ['n-sub2']
                },
                {
                  id: 'n-sub1',
                  label: 'Postulados Básicos',
                  description: 'Reglas y axiomas indispensables.',
                  category: 'subbranch'
                },
                {
                  id: 'n-sub2',
                  label: 'Ejemplos de Examen',
                  description: 'Casos resueltos y modelos de parcial.',
                  category: 'subbranch'
                }
              ]
            }
          }
        };

        aiResponseText = `🧠 He diseñado el **Mapa Conceptual Interactivo** de **${folder.name}**.\n\nPuedes hacer clic en cualquier nodo para explorar sus relaciones y guardar conceptos clave en tus apuntes.`;
        generatedTool = newMapResource;
        suggestedActions = [
          { label: '🧠 Abrir Mapa Conceptual', actionPrompt: 'Ver mapa conceptual interactivo', iconType: 'mapa' },
          { label: '📝 Generar Resumen', actionPrompt: 'Crear resumen ejecutivo', iconType: 'resumen' }
        ];

        setCanvasDocument({
          title: newMapResource.title,
          type: 'mapa',
          content: `# Mapa Conceptual: ${folder.name}\n\n- Eje Central: ${folder.name}\n- Ramas: Fundamentos, Aplicación Práctica\n- Nodos interactivos disponibles en el visor`,
          resource: newMapResource
        });

        onSaveResourceToLibrary(newMapResource);
      } else if (lowerQuery.includes('resumen') || lowerQuery.includes('sintesis') || lowerQuery.includes('/resumen')) {
        const newSummaryResource: StudyGeneratedResource = {
          id: `res-sum-${Date.now()}`,
          title: `Resumen Foxy: ${folder.name}`,
          type: 'resumen',
          folderId: folder.id,
          folderName: folder.name,
          topic: folder.topics?.[0]?.name || folder.name,
          description: 'Síntesis didáctica con puntos esenciales y glosario.',
          createdAt: 'Justo ahora',
          fileSize: '3 págs',
          fileFormat: 'MARKDOWN',
          data: {
            summary: {
              id: `sum-${Date.now()}`,
              title: `Resumen de Síntesis: ${folder.name}`,
              folderId: folder.id,
              folderName: folder.name,
              topic: folder.name,
              readTimeMinutes: 5,
              createdAt: 'Hoy',
              keyPoints: [
                `La clave de ${folder.name} reside en articular los conceptos con ejemplos prácticos.`,
                'Evitá memorizar de forma mecánica: entendé el "por qué" detrás de cada propiedad.',
                'Repasá este resumen en intervalos de 48 horas para maximizar la curva de retención.'
              ],
              contentMarkdown: `## 📚 Síntesis Didáctica: ${folder.name}\n\n### 1. Ideas Principales\nComprender este tema te permitirá abordar tanto preguntas de opción múltiple como ensayos de desarrollo extenso.\n\n### 2. Consejos para Exámenes\n- Definí con precisión los términos técnicos.\n- Citá ejemplos concretos cuando justifiques tus respuestas.\n- Realizá una lectura global antes de contestar.`,
              glossary: [
                { term: 'Concepto Central', definition: 'Núcleo temático sobre el que se estructuran las consignas de evaluación.' }
              ]
            }
          }
        };

        aiResponseText = `📝 He elaborado un **Resumen Ejecutivo con Puntos Clave** de **${folder.name}**.\n\nPuedes leerlo en el panel lateral, editarlo o exportarlo para tu repaso personal.`;
        generatedTool = newSummaryResource;
        suggestedActions = [
          { label: '🃏 Crear Flashcards del Resumen', actionPrompt: 'Generar flashcards de este resumen', iconType: 'flashcards' },
          { label: '⚡ Evaluarme con Quiz', actionPrompt: 'Tomarme un quiz sobre este resumen', iconType: 'quiz' }
        ];

        setCanvasDocument({
          title: newSummaryResource.title,
          type: 'resumen',
          content: newSummaryResource.data?.summary?.contentMarkdown || '',
          resource: newSummaryResource
        });

        onSaveResourceToLibrary(newSummaryResource);
      } else {
        // Socratic / Explanatory Answer
        if (agentMode === 'socratico') {
          aiResponseText = `🦊 **Análisis Socrático:**\n\nPara profundizar en tu consulta sobre **${query}**, pensemos juntos:\n\n1. ¿Cuál crees que es la causa principal o el punto de partida en este fenómeno?\n2. Si tuvieras que explicarle este concepto a un compañero en 2 oraciones, ¿qué palabras clave usarías?\n\n*Pruébame tu respuesta y te daré pistas para perfeccionarla antes del examen.*`;
        } else if (agentMode === 'explicador') {
          aiResponseText = `💡 **Explicación Fácil (ELI5):**\n\nImagina que **${folder.name}** es como armar un rompecabezas. Cada pieza representa una regla básica que encaja con la siguiente.\n\nEl secreto está en no apresurarse y seguir el orden lógico paso a paso. ¿Te gustaría que hagamos un ejemplo resuelto?`;
        } else if (agentMode === 'riguroso') {
          aiResponseText = `🏛️ **Modo Examen Riguroso:**\n\nEn una evaluación formal, se evaluará la precisión terminológica y la justificación metodológica.\n\nRespecto a tu consulta: asegúrate de enunciar la definición formal, contrastarla con contraejemplos y verificar las condiciones de validez. ¿Quieres ponerlo a prueba en un simulacro de 3 preguntas?`;
        } else {
          aiResponseText = `📋 **Síntesis Rápida:**\n\n- Punto 1: Identificación clara de la premisa.\n- Punto 2: Desarrollo lógico de las etapas.\n- Punto 3: Conclusión y verificación.\n\n¿Quieres que generemos un quiz o flashcards para afianzarlo?`;
        }

        suggestedActions = [
          { label: '🃏 Generar Flashcards', actionPrompt: 'Quiero un mazo de flashcards de esto', iconType: 'flashcards' },
          { label: '⚡ Quiz Rápido', actionPrompt: 'Tomarme un quiz de autoevaluación', iconType: 'quiz' },
          { label: '🧠 Mapa Conceptual', actionPrompt: 'Diseñame un mapa conceptual', iconType: 'mapa' }
        ];
      }

      const aiMsg: StudentStudyMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolGenerated: generatedTool,
        suggestedActions
      };

      const finalMessages = [...session.messages, userMsg, aiMsg];
      onUpdateSession({
        ...session,
        messages: finalMessages,
        updatedAt: 'Ahora'
      });
    }, 1100);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 relative h-full">
      {/* Left / Center Chat Column */}
      <div className="flex-1 flex flex-col bg-fox-surface border border-fox-border rounded-3xl shadow-xs overflow-hidden relative min-h-0">
        {/* Top Chat Agent Mode Selector Bar */}
        <div className="px-4 py-2.5 bg-fox-bg/60 border-b border-fox-border flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-fox-text-muted font-bold text-[11px] uppercase tracking-wider hidden sm:inline">
              Modo Tutor:
            </span>
            <div className="flex items-center gap-1 bg-fox-surface border border-fox-border rounded-xl p-0.5">
              <button
                onClick={() => setAgentMode('socratico')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  agentMode === 'socratico' ? 'bg-fox-purple text-white shadow-2xs' : 'text-fox-text-muted hover:text-fox-text-main'
                }`}
                title="Foxy te hace preguntas para que deduzcas la respuesta"
              >
                Socrático
              </button>
              <button
                onClick={() => setAgentMode('explicador')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  agentMode === 'explicador' ? 'bg-fox-purple text-white shadow-2xs' : 'text-fox-text-muted hover:text-fox-text-main'
                }`}
                title="Explicación sencilla con analogías cotidianas"
              >
                Fácil (ELI5)
              </button>
              <button
                onClick={() => setAgentMode('riguroso')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  agentMode === 'riguroso' ? 'bg-fox-purple text-white shadow-2xs' : 'text-fox-text-muted hover:text-fox-text-main'
                }`}
                title="Nivel de exigencia docente para parciales"
              >
                Examen
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCanvasOpen(!isCanvasOpen)}
              className="p-1.5 rounded-xl border border-fox-border bg-fox-surface text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg transition-colors flex items-center gap-1 text-xs font-bold"
              title={isCanvasOpen ? 'Ocultar panel lateral' : 'Mostrar panel lateral'}
            >
              {isCanvasOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
              <span className="hidden sm:inline">{isCanvasOpen ? 'Ocultar Apuntes' : 'Ver Apuntes'}</span>
            </button>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-gradient-to-b from-fox-surface to-fox-bg/30">
          {/* Quick Study Commands Header Bar */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 text-xs">
            <span className="text-[11px] font-bold text-fox-text-muted uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Sparkles size={12} className="text-fox-purple" /> Herramientas:
            </span>
            <button
              onClick={() => onRequestCreateTool('flashcards')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-fox-surface border border-fox-border hover:border-fox-purple/50 text-fox-text-main hover:text-fox-purple font-bold text-xs shadow-2xs whitespace-nowrap transition-all cursor-pointer"
            >
              <Layers size={13} className="text-fox-purple" />
              <span>Flashcards</span>
            </button>
            <button
              onClick={() => onRequestCreateTool('quiz')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-fox-surface border border-fox-border hover:border-fox-orange/50 text-fox-text-main hover:text-fox-orange font-bold text-xs shadow-2xs whitespace-nowrap transition-all cursor-pointer"
            >
              <Brain size={13} className="text-fox-orange" />
              <span>Quiz Rápido</span>
            </button>
            <button
              onClick={() => onRequestCreateTool('resumen')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-fox-surface border border-fox-border hover:border-emerald-500/50 text-fox-text-main hover:text-emerald-600 font-bold text-xs shadow-2xs whitespace-nowrap transition-all cursor-pointer"
            >
              <FileText size={13} className="text-emerald-600" />
              <span>Resumen</span>
            </button>
            <button
              onClick={() => onRequestCreateTool('mapa')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-fox-surface border border-fox-border hover:border-blue-500/50 text-fox-text-main hover:text-blue-600 font-bold text-xs shadow-2xs whitespace-nowrap transition-all cursor-pointer"
            >
              <Network size={13} className="text-blue-600" />
              <span>Mapa Conceptual</span>
            </button>
            <button
              onClick={() => onRequestCreateTool('plan')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-fox-surface border border-fox-border hover:border-rose-500/50 text-fox-text-main hover:text-rose-600 font-bold text-xs shadow-2xs whitespace-nowrap transition-all cursor-pointer"
            >
              <Target size={13} className="text-rose-500" />
              <span>Plan de Estudio</span>
            </button>
          </div>

          {/* Render Messages */}
          <AnimatePresence initial={false}>
            {session.messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-fox-purple/10 text-fox-purple border border-fox-purple/20 flex items-center justify-center font-bold shrink-0 mt-0.5">
                      <BrainCircuit size={18} />
                    </div>
                  )}

                  <div className={`space-y-3 max-w-[88%] sm:max-w-[80%] ${
                    isUser ? 'items-end' : 'items-start'
                  }`}>
                    {/* Message Bubble */}
                    <div className={`p-4 sm:p-5 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-2xs ${
                      isUser
                        ? 'bg-fox-purple text-white rounded-tr-sm'
                        : 'bg-fox-surface border border-fox-border text-fox-text-main rounded-tl-sm'
                    }`}>
                      <div className={`markdown-body ${isUser ? 'text-white font-medium' : 'text-fox-text-main'}`}>
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>

                      {/* Tool Artifact Widget Banner inside Chat */}
                      {msg.toolGenerated && (
                        <div className="mt-4 pt-3 border-t border-fox-border/60">
                          <div 
                            onClick={() => onOpenResource(msg.toolGenerated!)}
                            className="p-3.5 rounded-2xl bg-fox-bg border border-fox-border/80 hover:border-fox-purple/50 hover:bg-fox-purple/5 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-fox-surface border border-fox-border flex items-center justify-center font-bold text-fox-purple group-hover:scale-105 transition-transform shrink-0">
                                {msg.toolGenerated.type === 'flashcards' && <Layers size={18} />}
                                {msg.toolGenerated.type === 'quiz' && <Brain size={18} />}
                                {msg.toolGenerated.type === 'resumen' && <FileText size={18} />}
                                {msg.toolGenerated.type === 'mapa' && <Network size={18} />}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-heading font-bold text-xs text-fox-text-main truncate group-hover:text-fox-purple transition-colors">
                                  {msg.toolGenerated.title}
                                </h4>
                                <p className="text-[11px] text-fox-text-muted truncate mt-0.5">
                                  {msg.toolGenerated.description}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="px-3 py-1.5 bg-fox-purple text-white font-bold text-xs rounded-xl group-hover:bg-fox-purple/90 transition-colors shrink-0 flex items-center gap-1"
                            >
                              <span>Abrir</span>
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        </div>
                      )}

                      <div className={`text-[10px] mt-2 font-medium flex items-center justify-end gap-1 ${
                        isUser ? 'text-white/70' : 'text-fox-text-muted'
                      }`}>
                        <span>{msg.timestamp}</span>
                      </div>
                    </div>

                    {/* Suggested Action Pills */}
                    {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.suggestedActions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(action.actionPrompt)}
                            className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-fox-surface border border-fox-border hover:border-fox-purple/40 hover:bg-fox-purple/5 text-fox-text-muted hover:text-fox-purple transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{action.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {isThinking && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-xl bg-fox-purple/10 text-fox-purple border border-fox-purple/20 flex items-center justify-center font-bold">
                  <BrainCircuit size={18} className="animate-spin" />
                </div>
                <div className="p-4 rounded-2xl bg-fox-surface border border-fox-border text-xs text-fox-text-muted flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-fox-purple animate-ping"></div>
                  <span>Foxy está estructurando tu respuesta pedagógica...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar with Slash Commands & Voice */}
        <div className="p-3 sm:p-4 border-t border-fox-border bg-fox-surface/90 backdrop-blur-md relative shrink-0">
          {/* Slash Commands Dropdown Menu */}
          <AnimatePresence>
            {showSlashMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-4 mb-2 w-72 bg-fox-surface border border-fox-border rounded-2xl shadow-xl p-2 z-20 space-y-1"
              >
                <p className="text-[10px] font-black uppercase tracking-wider text-fox-text-muted px-2 py-1">
                  Comandos de Estudio con Foxy
                </p>
                {STUDENT_SLASH_COMMANDS.map((cmd) => (
                  <button
                    key={cmd.cmd}
                    onClick={() => handleSelectSlashCommand(cmd.cmd, cmd.type)}
                    className="w-full text-left p-2 rounded-xl hover:bg-fox-purple/10 text-xs text-fox-text-main flex flex-col transition-colors cursor-pointer"
                  >
                    <span className="font-bold text-fox-purple">{cmd.cmd} • {cmd.label}</span>
                    <span className="text-[10px] text-fox-text-muted">{cmd.desc}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2 bg-fox-bg border border-fox-border focus-within:border-fox-purple focus-within:ring-2 focus-within:ring-fox-purple/20 rounded-2xl p-2 transition-all"
          >
            {/* Attachments */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="p-2 text-fox-text-muted hover:text-fox-purple hover:bg-fox-purple/10 rounded-xl transition-colors"
                title="Adjuntar material"
              >
                <Paperclip size={18} />
              </button>

              <AnimatePresence>
                {showAttachMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-2 w-48 bg-fox-surface border border-fox-border rounded-2xl shadow-xl p-1.5 z-20 space-y-1"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        setAttachedFile({ name: 'Apuntes_Clase.pdf', size: '1.8 MB', type: 'PDF' });
                        toast.show('Apunte adjuntado al mensaje', 'info');
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-fox-bg text-xs font-bold text-fox-text-main flex items-center gap-2"
                    >
                      <FileText size={14} className="text-fox-purple" />
                      <span>Subir PDF / Apunte</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        setAttachedFile({ name: 'Foto_Pizarra.jpg', size: '2.4 MB', type: 'JPG' });
                        toast.show('Foto de pizarra adjuntada', 'info');
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-fox-bg text-xs font-bold text-fox-text-main flex items-center gap-2"
                    >
                      <Sparkles size={14} className="text-emerald-500" />
                      <span>Foto de Pizarra / Guía</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Textarea */}
            <div className="flex-1 min-w-0">
              {attachedFile && (
                <div className="flex items-center gap-2 mb-1.5 bg-fox-purple/10 text-fox-purple px-2.5 py-1 rounded-lg text-xs font-bold w-fit">
                  <FileText size={12} />
                  <span>{attachedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="hover:text-red-500 p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Escribe tu consulta o usa /flashcards, /quiz, /resumen..."
                rows={1}
                className="w-full bg-transparent text-xs sm:text-sm text-fox-text-main placeholder:text-fox-text-muted/60 focus:outline-none resize-none py-1.5 max-h-28"
              />
            </div>

            {/* Voice Input */}
            <button
              type="button"
              onClick={() => {
                setIsListening(!isListening);
                if (!isListening) {
                  toast.show('🎙️ Foxy te escucha... Di tu consulta en voz alta', 'info');
                  setTimeout(() => {
                    setInputText('¿Cómo puedo estructurar la respuesta del parcial para sacar 10?');
                    setIsListening(false);
                  }, 2500);
                }
              }}
              className={`p-2 rounded-xl transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-fox-text-muted hover:text-fox-purple hover:bg-fox-purple/10'
              }`}
              title="Dictar por voz a Foxy"
            >
              <Mic size={18} />
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() && !attachedFile}
              className="p-2.5 rounded-xl bg-fox-purple text-white hover:bg-fox-purple/90 font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs shrink-0 cursor-pointer"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* Right Collapsible Canvas / Notes Editor */}
      <AnimatePresence>
        {isCanvasOpen && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 340 }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.25 }}
            className="hidden lg:flex flex-col bg-fox-surface border border-fox-border rounded-3xl shadow-xs overflow-hidden shrink-0 h-full"
          >
            {/* Canvas Header */}
            <div className="p-4 border-b border-fox-border bg-fox-bg/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-fox-purple/10 text-fox-purple flex items-center justify-center font-bold shrink-0">
                  <Edit3 size={15} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-heading font-extrabold text-xs text-fox-text-main truncate">
                    {canvasDocument.title}
                  </h4>
                  <p className="text-[10px] text-fox-text-muted truncate">
                    Editor en vivo y notas de estudio
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(canvasDocument.content);
                    toast.show('Apuntes copiados al portapapeles', 'success');
                  }}
                  className="p-1.5 text-fox-text-muted hover:text-fox-text-main rounded-lg hover:bg-fox-bg"
                  title="Copiar texto"
                >
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => setIsCanvasOpen(false)}
                  className="p-1.5 text-fox-text-muted hover:text-fox-text-main rounded-lg hover:bg-fox-bg"
                  title="Cerrar panel"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Canvas Content / Live Markdown Editor */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <textarea
                value={canvasDocument.content}
                onChange={(e) => setCanvasDocument({ ...canvasDocument, content: e.target.value })}
                placeholder="Escribe tus apuntes de estudio aquí..."
                className="w-full h-full min-h-[300px] bg-transparent text-xs text-fox-text-main placeholder:text-fox-text-muted/60 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Canvas Footer Actions */}
            <div className="p-3 border-t border-fox-border bg-fox-bg/40 flex items-center justify-between gap-2">
              <button
                onClick={() => toast.show('Apunte guardado en tus notas de la carpeta', 'success')}
                className="flex-1 py-2 bg-fox-purple text-white font-bold text-xs rounded-xl hover:bg-fox-purple/90 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Save size={13} /> Guardar Apunte
              </button>
              {canvasDocument.resource && (
                <button
                  onClick={() => onOpenResource(canvasDocument.resource!)}
                  className="py-2 px-3 bg-fox-surface border border-fox-border hover:border-fox-purple text-fox-purple font-bold text-xs rounded-xl transition-colors flex items-center gap-1"
                  title="Abrir recurso en pantalla completa"
                >
                  <Maximize2 size={13} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

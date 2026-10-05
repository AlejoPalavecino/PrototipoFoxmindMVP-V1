import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Search, Users, User, Send, Sparkles, Shield, GraduationCap, Check, BookOpen, AlertCircle } from 'lucide-react';
import { Role } from '../../types';
import { messagingStore } from '../../features/messaging/messagingStore';
import { toast } from '../ui/Toaster';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: Role;
  onConversationCreated: (conversationId: string) => void;
}

const SCHOOL_DIRECTORY = [
  // Docentes
  { 
    id: 'docente-laura', 
    name: 'Prof. Laura Martínez', 
    role: 'docente' as const, 
    course: 'Literatura 3°A/B', 
    email: 'l.martinez@escuela.edu.ar', 
    details: 'Jefa de Departamento de Letras • Horario de consulta: 14:00 a 18:00 hs' 
  },
  { 
    id: 'docente-carlos', 
    name: 'Prof. Carlos Silva', 
    role: 'docente' as const, 
    course: 'Matemáticas 3°A/B', 
    email: 'c.silva@escuela.edu.ar', 
    details: 'Departamento de Ciencias Exactas • Horario de consulta: 10:00 a 14:00 hs' 
  },
  { 
    id: 'docente-gomez', 
    name: 'Prof. Daniel Gómez', 
    role: 'docente' as const, 
    course: 'Historia 3°A', 
    email: 'd.gomez@escuela.edu.ar', 
    details: 'Ciencias Sociales e Historia Contemporánea' 
  },
  { 
    id: 'docente-ruiz', 
    name: 'Profa. Claudia Ruiz', 
    role: 'docente' as const, 
    course: 'Ciencias Naturales 2°A / 3°A', 
    email: 'c.ruiz@escuela.edu.ar', 
    details: 'Laboratorio de Biología y Química' 
  },

  // Alumnos (Solo visibles para docentes)
  { 
    id: 'alumno-valentina', 
    name: 'Valentina Rodríguez', 
    role: 'alumno' as const, 
    course: '3° Año B (Literatura/Matemática)', 
    email: 'v.rodriguez@escuela.edu.ar', 
    details: 'Promedio 8.5 • Alumna Regular • Entrega en tiempo y forma' 
  },
  { 
    id: 'alumno-tomas', 
    name: 'Tomás Gómez', 
    role: 'alumno' as const, 
    course: '2° Año B / 3°A', 
    email: 't.gomez@escuela.edu.ar', 
    details: 'Perfil DUA: TDAH • Requiere consignas fraccionadas y recordatorios visuales' 
  },
  { 
    id: 'alumno-sofia', 
    name: 'Sofía Herrera', 
    role: 'alumno' as const, 
    course: '3° Año B', 
    email: 's.herrera@escuela.edu.ar', 
    details: 'Perfil DUA: Dislexia • Tipografía adaptada y soporte auditivo' 
  },
  { 
    id: 'alumno-lucas', 
    name: 'Lucas Díaz', 
    role: 'alumno' as const, 
    course: '3° Año A', 
    email: 'l.diaz@escuela.edu.ar', 
    details: 'Promedio 7.8 • Participativo en clase' 
  },
  { 
    id: 'alumno-marcos', 
    name: 'Marcos Pérez', 
    role: 'alumno' as const, 
    course: '3° Año A', 
    email: 'm.perez@escuela.edu.ar', 
    details: 'Sin entregas recientes • Alerta pedagógica activa' 
  },
  { 
    id: 'alumno-ana', 
    name: 'Ana Torres', 
    role: 'alumno' as const, 
    course: '3° Año A', 
    email: 'a.torres@escuela.edu.ar', 
    details: 'Promedio 9.0 • Destacada en producción escrita' 
  },

  // Equipo & Directivos (Visibles para todos)
  { 
    id: 'directivo-elena', 
    name: 'Directora Elena Valenzuela', 
    role: 'directivo' as const, 
    course: 'Dirección General y Coordinación', 
    email: 'direccion@escuela.edu.ar', 
    details: 'Equipo Directivo e Institucional' 
  },
  { 
    id: 'preceptor-juan', 
    name: 'Preceptor Juan Manuel', 
    role: 'preceptor' as const, 
    course: 'Preceptoría 3° Año', 
    email: 'preceptoria3@escuela.edu.ar', 
    details: 'Asistencias, Justificaciones médicas y Trámites escolares' 
  },
];

export function NewConversationModal({
  isOpen,
  onClose,
  currentRole,
  onConversationCreated,
}: NewConversationModalProps) {
  const effectiveRole: 'docente' | 'alumno' = currentRole === 'alumno' ? 'alumno' : 'docente';
  const isAlumno = effectiveRole === 'alumno';

  const [tab, setTab] = useState<'individual' | 'canal'>('individual');
  const [filterRole, setFilterRole] = useState<'todos' | 'alumno' | 'docente' | 'equipo'>('todos');
  const [search, setSearch] = useState('');
  
  // Selection
  const [selectedContact, setSelectedContact] = useState<typeof SCHOOL_DIRECTORY[0] | null>(null);
  const [selectedChannelMembers, setSelectedChannelMembers] = useState<string[]>([]);
  const [channelTitle, setChannelTitle] = useState('');
  
  // Message
  const [message, setMessage] = useState('');
  const [categoryTag, setCategoryTag] = useState<string>(isAlumno ? 'Duda TP' : 'Consulta');

  if (!isOpen) return null;

  const currentUserId = isAlumno ? 'alumno-valentina' : 'docente-laura';
  const currentUserName = isAlumno ? 'Valentina Rodríguez' : 'Prof. Laura Martínez';

  // Rule enforcement:
  // If user is Alumno, strictly exclude all students from directory.
  // Alumnos can ONLY message teachers, preceptoria, and directors.
  const baseDirectory = SCHOOL_DIRECTORY
    .filter(item => item.id !== currentUserId)
    .filter(item => {
      if (isAlumno) {
        // Exclude other students strictly
        return item.role !== 'alumno';
      }
      return true;
    });

  const filteredDirectory = baseDirectory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
                          item.course.toLowerCase().includes(search.toLowerCase()) ||
                          item.email.toLowerCase().includes(search.toLowerCase()) ||
                          item.details.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterRole === 'todos') return true;
    if (filterRole === 'alumno' && !isAlumno) return item.role === 'alumno';
    if (filterRole === 'docente') return item.role === 'docente';
    if (filterRole === 'equipo') return item.role === 'directivo' || item.role === 'preceptor';
    return true;
  });

  const handleGenerateFoxyDraft = () => {
    if (!selectedContact) {
      toast.show('Seleccioná un destinatario primero', 'error');
      return;
    }

    if (!isAlumno) {
      // Teacher generating message for student or colleague
      if (selectedContact.role === 'alumno') {
        const studentFirst = selectedContact.name.split(' ')[0];
        if (categoryTag === 'Duda TP') {
          setMessage(`Hola ${studentFirst}, estuve revisando las pautas del trabajo práctico. Te dejo algunas sugerencias para que puedas avanzar con la entrega y recordá que podés consultarme cualquier duda.`);
        } else if (categoryTag === 'Aviso') {
          setMessage(`Estimado/a ${studentFirst}: Te recuerdo que la fecha límite de entrega es este viernes a las 23:59 hs a través del Aula virtual. ¡Muchos éxitos!`);
        } else {
          setMessage(`Hola ${studentFirst}, te escribo para consultar cómo venís con los contenidos de la materia y si necesitás alguna adaptación o material de apoyo complementario.`);
        }
      } else {
        setMessage(`Estimado/a ${selectedContact.name}: Me comunico para coordinar los criterios pedagógicos y planificaciones del ciclo lectivo.`);
      }
    } else {
      // Student generating respectful message for teacher or staff
      const teacherName = selectedContact.name;
      if (categoryTag === 'Duda TP') {
        setMessage(`Hola ${teacherName}, quería consultarle una duda sobre la consigna del trabajo práctico: ¿el análisis debe incluir ejemplos del texto principal o podemos utilizar material complementario? Muchas gracias.`);
      } else if (categoryTag === 'Examen') {
        setMessage(`Hola ${teacherName}, le escribo para consultarle qué unidades y lecturas obligatorias entrarán en la próxima evaluación. ¡Muchas gracias!`);
      } else if (categoryTag === 'Material') {
        setMessage(`Hola ${teacherName}, estuve revisando los archivos del Aula y quería consultarle si la bibliografía complementaria ya se encuentra disponible para descargar.`);
      } else {
        setMessage(`Hola ${teacherName}, le escribo para consultarle sobre las devoluciones del trabajo entregado y coordinar posibles revisiones. Desde ya, muchas gracias.`);
      }
    }
    toast.show('Borrador pedagógico generado con Foxy', 'success');
  };

  const handleCreate = () => {
    if (tab === 'individual') {
      if (!selectedContact || !message.trim()) return;

      // School policy safety check
      if (isAlumno && selectedContact.role === 'alumno') {
        toast.show('Normativa escolar: Los alumnos solo pueden comunicarse con docentes y autoridades.', 'error');
        return;
      }

      // Check if conversation already exists
      const existing = messagingStore.getConversations().find(c => 
        c.type === 'direct' && 
        c.participants.some(p => p.id === selectedContact.id) &&
        c.participants.some(p => p.id === currentUserId)
      );

      if (existing) {
        messagingStore.sendMessage({
          conversationId: existing.id,
          senderId: currentUserId,
          senderName: currentUserName,
          senderRole: effectiveRole,
          text: message.trim(),
          categoryTag
        });
        toast.show(`Mensaje enviado a ${selectedContact.name}`, 'success');
        onConversationCreated(existing.id);
        onClose();
        return;
      }

      // Create new direct conversation
      const newConv = messagingStore.createConversation({
        title: selectedContact.name,
        type: 'direct',
        participants: [
          {
            id: selectedContact.id,
            name: selectedContact.name,
            role: selectedContact.role,
            course: selectedContact.course
          }
        ],
        initialMessage: message.trim(),
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: effectiveRole,
        categoryTag
      });

      toast.show(`Conversación iniciada con ${selectedContact.name}`, 'success');
      onConversationCreated(newConv.id);
      onClose();
    } else {
      // Channel creation (Only for teachers)
      if (isAlumno) return;
      if (!channelTitle.trim() || selectedChannelMembers.length === 0 || !message.trim()) return;

      const memberObjs = baseDirectory
        .filter(d => selectedChannelMembers.includes(d.id))
        .map(d => ({ id: d.id, name: d.name, role: d.role, course: d.course }));

      const newConv = messagingStore.createConversation({
        title: channelTitle.trim(),
        type: 'channel',
        participants: memberObjs,
        initialMessage: message.trim(),
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: effectiveRole,
        categoryTag: 'Aviso'
      });

      toast.show(`Canal "${channelTitle}" creado con éxito`, 'success');
      onConversationCreated(newConv.id);
      onClose();
    }
  };

  const toggleChannelMember = (id: string) => {
    setSelectedChannelMembers(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="bg-fox-surface border border-fox-border rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-fox-border bg-fox-bg/50 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-heading font-bold text-fox-text-main flex items-center gap-2">
              {isAlumno ? (
                <>
                  <GraduationCap className="text-fox-primary" size={22} />
                  Nueva Consulta a Docente
                </>
              ) : (
                <>
                  <User className="text-fox-primary" size={22} />
                  Nuevo Mensaje o Comunicado
                </>
              )}
            </h3>
            <p className="text-xs text-fox-text-muted mt-0.5">
              {isAlumno 
                ? 'Canal académico oficial para comunicarte con tus profesores y preceptoría.'
                : 'Envía mensajes directos a tus alumnos, colegas docentes o crea canales de aula.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* School Policy Banner for Students */}
        {isAlumno && (
          <div className="mx-6 mt-4 p-3.5 bg-fox-primary/5 border border-fox-primary/20 rounded-2xl flex items-start gap-3 text-xs text-fox-text-main">
            <div className="p-1.5 rounded-lg bg-fox-primary/10 text-fox-primary shrink-0 mt-0.5">
              <Shield size={16} />
            </div>
            <div>
              <p className="font-bold text-fox-primary">Normativa Escolar de Convivencia Digital</p>
              <p className="text-fox-text-muted mt-0.5 leading-relaxed">
                Por seguridad y resguardo pedagógico, los estudiantes únicamente pueden enviar mensajes a <strong>docentes titulares</strong> y al <strong>equipo escolar de preceptoría</strong>. Las dudas grupales pueden formularse en el canal del aula correspondiente.
              </p>
            </div>
          </div>
        )}

        {/* Modal Tabs (Only visible for teachers) */}
        {!isAlumno && (
          <div className="flex border-b border-fox-border bg-fox-surface px-6 pt-3 gap-4 shrink-0">
            <button
              onClick={() => setTab('individual')}
              className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                tab === 'individual'
                  ? 'border-fox-orange text-fox-orange'
                  : 'border-transparent text-fox-text-muted hover:text-fox-text-main'
              }`}
            >
              <User size={16} /> Mensaje Individual
            </button>
            <button
              onClick={() => setTab('canal')}
              className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                tab === 'canal'
                  ? 'border-fox-orange text-fox-orange'
                  : 'border-transparent text-fox-text-muted hover:text-fox-text-main'
              }`}
            >
              <Users size={16} /> Crear Canal Grupal de Aula
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {tab === 'individual' ? (
            <>
              {/* Directory Filter & Search */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted">
                    1. Selecciona el Destinatario {isAlumno ? '(Docente o Preceptor)' : ''}
                  </label>
                  <span className="text-[11px] font-semibold text-fox-text-muted">
                    {filteredDirectory.length} contactos disponibles
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fox-text-muted/60" size={16} />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder={isAlumno ? "Buscar docente por nombre o materia..." : "Buscar por nombre, curso o materia..."}
                      className="w-full bg-fox-bg border border-fox-border rounded-xl py-2 pl-9 pr-3 text-sm text-fox-text-main placeholder:text-fox-text-muted/60 focus:outline-none focus:ring-2 focus:ring-fox-primary/50"
                    />
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {isAlumno ? (
                    // Student filters
                    [
                      { id: 'todos', label: 'Todos los Profesores' },
                      { id: 'docente', label: 'Docentes Titulares' },
                      { id: 'equipo', label: 'Preceptoría y Dirección' }
                    ].map(tabItem => (
                      <button
                        key={tabItem.id}
                        onClick={() => setFilterRole(tabItem.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                          filterRole === tabItem.id
                            ? 'bg-fox-orange text-white shadow-sm'
                            : 'bg-fox-bg text-fox-text-muted hover:bg-fox-border/60 hover:text-fox-text-main border border-fox-border'
                        }`}
                      >
                        {tabItem.label}
                      </button>
                    ))
                  ) : (
                    // Teacher filters
                    [
                      { id: 'todos', label: 'Todos' },
                      { id: 'alumno', label: 'Alumnos de Mis Cursos' },
                      { id: 'docente', label: 'Colegas Docentes' },
                      { id: 'equipo', label: 'Directivos & Preceptoría' }
                    ].map(tabItem => (
                      <button
                        key={tabItem.id}
                        onClick={() => setFilterRole(tabItem.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                          filterRole === tabItem.id
                            ? 'bg-fox-orange text-white shadow-sm'
                            : 'bg-fox-bg text-fox-text-muted hover:bg-fox-border/60 hover:text-fox-text-main border border-fox-border'
                        }`}
                      >
                        {tabItem.label}
                      </button>
                    ))
                  )}
                </div>

                {/* Directory List */}
                <div className="max-h-52 overflow-y-auto border border-fox-border rounded-2xl bg-fox-bg/30 divide-y divide-fox-border/50">
                  {filteredDirectory.length > 0 ? (
                    filteredDirectory.map(contact => {
                      const isSelected = selectedContact?.id === contact.id;
                      return (
                        <button
                          key={contact.id}
                          onClick={() => setSelectedContact(contact)}
                          className={`w-full p-3 flex items-center justify-between text-left transition-colors ${
                            isSelected ? 'bg-fox-orange/10' : 'hover:bg-fox-bg'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              contact.role === 'docente' ? 'bg-fox-primary/15 text-fox-primary' :
                              contact.role === 'alumno' ? 'bg-fox-purple/15 text-fox-purple' :
                              'bg-fox-orange/15 text-fox-orange'
                            }`}>
                              {contact.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-fox-text-main truncate">{contact.name}</p>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                  contact.role === 'docente' ? 'bg-fox-primary/10 text-fox-primary' :
                                  contact.role === 'alumno' ? 'bg-fox-purple/10 text-fox-purple' :
                                  'bg-fox-orange/10 text-fox-orange'
                                }`}>
                                  {contact.role === 'docente' ? 'Docente' : contact.role === 'alumno' ? 'Alumno' : 'Institucional'}
                                </span>
                              </div>
                              <p className="text-xs text-fox-text-muted truncate mt-0.5">{contact.course} • {contact.details}</p>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-fox-orange text-white flex items-center justify-center shrink-0 ml-2 shadow-xs">
                              <Check size={14} />
                            </div>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-5 text-center text-xs text-fox-text-muted flex flex-col items-center gap-2">
                      <AlertCircle size={20} className="text-fox-text-muted/60" />
                      <span>No se encontraron contactos para este criterio de búsqueda.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tag & Message Input */}
              {selectedContact && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 pt-3 border-t border-fox-border"
                >
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted">
                      2. Tipo de Mensaje & Contenido
                    </label>
                    <button
                      onClick={handleGenerateFoxyDraft}
                      className="text-xs font-bold text-fox-orange flex items-center gap-1.5 hover:underline bg-fox-orange/10 px-2.5 py-1 rounded-lg border border-fox-orange/20"
                    >
                      <Sparkles size={13} /> Asistir con Foxy
                    </button>
                  </div>

                  {/* Category Pills */}
                  <div className="flex gap-2 flex-wrap">
                    {(isAlumno 
                      ? ['Duda TP', 'Consulta Clase', 'Examen', 'Material', 'Revisión'] 
                      : ['Consulta', 'Duda TP', 'Aviso', 'Examen', 'Institucional', 'Pauta DUA']
                    ).map(tag => (
                      <button
                        key={tag}
                        onClick={() => setCategoryTag(tag)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          categoryTag === tag
                            ? 'bg-fox-orange text-white shadow-xs'
                            : 'bg-fox-bg text-fox-text-muted border border-fox-border hover:text-fox-text-main'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={
                      isAlumno
                        ? `Escribe tu consulta respetuosa para ${selectedContact.name}...`
                        : `Escribe el mensaje para ${selectedContact.name}...`
                    }
                    rows={4}
                    className="w-full bg-fox-bg border border-fox-border rounded-2xl p-3.5 text-sm text-fox-text-main placeholder:text-fox-text-muted/60 focus:outline-none focus:ring-2 focus:ring-fox-orange/50 resize-none font-medium leading-relaxed"
                  />
                </motion.div>
              )}
            </>
          ) : (
            <>
              {/* Channel Creation Fields (Docente Only) */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-1.5">
                    Nombre del Canal de Aula
                  </label>
                  <input
                    type="text"
                    value={channelTitle}
                    onChange={e => setChannelTitle(e.target.value)}
                    placeholder="Ej: Canal 3°B — Literatura y Lengua Española"
                    className="w-full bg-fox-bg border border-fox-border rounded-xl py-2.5 px-3.5 text-sm text-fox-text-main focus:outline-none focus:ring-2 focus:ring-fox-primary/50 font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted">
                      Seleccionar Integrantes ({selectedChannelMembers.length} alumnos/docentes)
                    </label>
                    <button
                      onClick={() => {
                        const allIds = baseDirectory.map(d => d.id);
                        setSelectedChannelMembers(prev => prev.length === allIds.length ? [] : allIds);
                      }}
                      className="text-xs font-bold text-fox-primary hover:underline"
                    >
                      {selectedChannelMembers.length === baseDirectory.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </button>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto border border-fox-border rounded-2xl bg-fox-bg/30 divide-y divide-fox-border/50">
                    {baseDirectory.map(contact => {
                      const isChecked = selectedChannelMembers.includes(contact.id);
                      return (
                        <div
                          key={contact.id}
                          onClick={() => toggleChannelMember(contact.id)}
                          className="p-3 flex items-center justify-between cursor-pointer hover:bg-fox-bg transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-fox-surface border border-fox-border flex items-center justify-center font-bold text-xs text-fox-text-main">
                              {contact.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-fox-text-main">{contact.name}</p>
                              <p className="text-xs text-fox-text-muted">{contact.course}</p>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-fox-primary focus:ring-fox-primary"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-1.5">
                    Primer Mensaje / Pautas de Convivencia
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Estimados alumnos: Bienvenidos al canal de consultas de la materia..."
                    rows={3}
                    className="w-full bg-fox-bg border border-fox-border rounded-2xl p-3 text-sm text-fox-text-main placeholder:text-fox-text-muted/60 focus:outline-none focus:ring-2 focus:ring-fox-primary/50 resize-none font-medium"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-fox-border bg-fox-bg/50 flex justify-between items-center shrink-0">
          <div className="text-xs text-fox-text-muted">
            {isAlumno ? (
              <span className="flex items-center gap-1.5 text-fox-primary font-semibold">
                <Shield size={14} /> Canal cifrado y supervisado escolar
              </span>
            ) : (
              <span>Mensajería interna institucional FoxMind</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-sm font-bold text-fox-text-muted hover:bg-fox-bg hover:text-fox-text-main transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={
                tab === 'individual'
                  ? !selectedContact || !message.trim()
                  : !channelTitle.trim() || selectedChannelMembers.length === 0 || !message.trim()
              }
              className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                (tab === 'individual' && selectedContact && message.trim()) ||
                (tab === 'canal' && channelTitle.trim() && selectedChannelMembers.length > 0 && message.trim())
                  ? 'bg-fox-orange text-white hover:bg-fox-orange/90 shadow-md active:scale-98'
                  : 'bg-fox-border text-fox-text-muted/50 cursor-not-allowed'
              }`}
            >
              <Send size={15} /> {tab === 'individual' ? (isAlumno ? 'Enviar Consulta' : 'Enviar Mensaje') : 'Crear Canal'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

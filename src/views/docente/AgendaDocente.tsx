import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  Plus, Clock, RefreshCw, Filter, Moon, Sun, Calendar,
  CalendarRange, Layers, BookOpen
} from 'lucide-react';
import { useAppContext } from '../../context';
import { toast } from '../../components/ui/Toaster';
import { motion } from 'motion/react';
import { 
  startOfWeek, addWeeks, subWeeks, format, addDays, subDays, 
  startOfMonth, endOfMonth, endOfWeek, eachDayOfInterval, 
  addMonths, subMonths, isSameDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

import { 
  CalendarEvent, 
  AgendaEventModal, 
  colorMap, 
  EventColor, 
  format24hTime 
} from './agenda/AgendaEventModal';
import { CalendarioEscolarPanel } from './agenda/CalendarioEscolarPanel';
import { AgendaFoxyAssistant } from './agenda/AgendaFoxyAssistant';
import { DayViewGrid } from './agenda/DayViewGrid';
import { WeekViewGrid } from './agenda/WeekViewGrid';
import { MonthViewGrid } from './agenda/MonthViewGrid';

const subjectColors: Record<string, EventColor> = {
  'Literatura 3°A': 'blue',
  'Historia 2°B': 'orange',
  'Matemáticas 1°C': 'green',
  'Reunión / Otro': 'purple',
  'General / Institucional': 'pink'
};
const availableSubjects = Object.keys(subjectColors);

// Initial mock events
const getInitialEvents = (): CalendarEvent[] => {
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 1 });
  
  return [
    { 
      id: '1', 
      title: 'Literatura 3°A — Análisis de Poesía', 
      type: 'Clase',
      startHour: 8, 
      duration: 1.5, 
      date: format(addDays(start, 0), 'yyyy-MM-dd'), 
      color: 'blue', 
      subject: 'Literatura 3°A', 
      location: 'Aula 12',
      notes: 'Llevar copias impresas de Vicente Huidobro y rúbricas DUA.'
    },
    { 
      id: '2', 
      title: 'Historia 2°B — Revolución de Mayo', 
      type: 'Clase',
      startHour: 10, 
      duration: 1.5, 
      date: format(addDays(start, 0), 'yyyy-MM-dd'), 
      color: 'orange', 
      subject: 'Historia 2°B', 
      location: 'Aula 05' 
    },
    { 
      id: '3', 
      title: 'Matemáticas 3°B — Ecuaciones', 
      type: 'Clase',
      startHour: 14, 
      duration: 1.5, 
      date: format(addDays(start, 3), 'yyyy-MM-dd'), 
      color: 'green', 
      subject: 'Matemáticas 1°C', 
      location: 'Aula 08' 
    },
    { 
      id: '4', 
      title: 'Reunión de Departamento Pedagógico', 
      type: 'Reunión',
      startHour: 9, 
      duration: 1.5, 
      date: format(addDays(start, 4), 'yyyy-MM-dd'), 
      color: 'purple', 
      subject: 'Reunión / Otro', 
      location: 'Sala de Profesores' 
    },
    { 
      id: '5', 
      title: 'Tutoría DUA de Refuerzo', 
      type: 'Tutoría',
      startHour: 17, 
      duration: 1, 
      date: format(addDays(start, 2), 'yyyy-MM-dd'), 
      color: 'orange', 
      subject: 'Literatura 3°A', 
      location: 'Aula 03',
      notes: 'Repaso con grupo de apoyo para estudiantes con adecuación.'
    },
    { 
      id: '6', 
      title: 'Planificación Matutina', 
      type: 'Clase',
      startHour: 7, 
      duration: 1, 
      date: format(addDays(start, 1), 'yyyy-MM-dd'), 
      color: 'pink', 
      subject: 'General / Institucional', 
      location: 'Biblioteca' 
    },
    // Tareas integradas
    { 
      id: 't1', 
      title: 'Ensayo: Vanguardias Literarias', 
      type: 'Tarea',
      startHour: 18, 
      duration: 0.5, 
      date: format(addDays(start, 1), 'yyyy-MM-dd'), 
      color: 'green', 
      subject: 'Literatura 3°A', 
      isTask: true 
    },
    { 
      id: 't2', 
      title: 'Foro: El Boom Latinoamericano', 
      type: 'Tarea',
      startHour: 18, 
      duration: 0.5, 
      date: format(addDays(start, 3), 'yyyy-MM-dd'), 
      color: 'green', 
      subject: 'Literatura 3°A', 
      isTask: true 
    },
  ];
};

export function AgendaDocente() {
  const { setView } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'day' | 'week' | 'month'>('week');
  const [events, setEvents] = useState<CalendarEvent[]>(getInitialEvents());
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  // Standard School hours (7:00 to 18:30) vs 24hs toggle
  const [timeRangeMode, setTimeRangeMode] = useState<'24hs' | 'school'>('school');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Partial<CalendarEvent>>({});

  // Week View Calculations
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Month View Calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: startDate, end: endDate });
  const monthWeeksCount = Math.ceil(monthDays.length / 7);

  const handlePrev = () => {
    if (viewType === 'day') setCurrentDate(subDays(currentDate, 1));
    else if (viewType === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };
  
  const handleNext = () => {
    if (viewType === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (viewType === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };
  
  const handleToday = () => setCurrentDate(new Date());

  const headerText = useMemo(() => {
    if (viewType === 'day') {
      return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: es });
    }
    if (viewType === 'week') {
      return `${format(weekDays[0], 'd')} - ${format(weekDays[6], "d 'de' MMMM yyyy", { locale: es })}`;
    }
    return format(currentDate, "MMMM yyyy", { locale: es });
  }, [viewType, currentDate, weekDays]);

  const filteredEvents = useMemo(() => {
    if (activeFilters.length === 0) return events;
    return events.filter(e => e.subject && activeFilters.includes(e.subject));
  }, [events, activeFilters]);

  const toggleFilter = (subject: string) => {
    setActiveFilters(prev => 
      prev.includes(subject) ? prev.filter(f => f !== subject) : [...prev, subject]
    );
  };

  const openAddModal = (dateStr?: string, hour?: number) => {
    setSelectedEvent({ 
      title: '', 
      type: 'Clase',
      date: dateStr || format(currentDate, 'yyyy-MM-dd'), 
      endDate: dateStr || format(currentDate, 'yyyy-MM-dd'),
      startHour: hour !== undefined ? hour : 8, 
      duration: 1.5, 
      isAllDay: false,
      repeat: 'none',
      color: 'blue', 
      subject: availableSubjects[0],
      location: '' 
    });
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const openEditModal = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.isTask) {
      setView('aulas', { 
        openTask: true, 
        subject: event.subject || 'Literatura 3°A', 
        taskTitle: event.title 
      });
      return;
    }
    setSelectedEvent(event);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleSaveEvent = (eventData: Partial<CalendarEvent>) => {
    if (isEditMode && selectedEvent.id) {
      setEvents(events.map(ev => ev.id === selectedEvent.id ? { ...ev, ...eventData } as CalendarEvent : ev));
      toast.show('✅ Evento actualizado en agenda', 'success');
    } else {
      const newEv: CalendarEvent = {
        id: Date.now().toString(),
        title: eventData.title || 'Sin título',
        type: eventData.type || 'Clase',
        startHour: Number(eventData.startHour !== undefined ? eventData.startHour : 8),
        duration: Number(eventData.duration || 1),
        date: eventData.date || format(currentDate, 'yyyy-MM-dd'),
        endDate: eventData.endDate || eventData.date,
        isAllDay: eventData.isAllDay,
        repeat: eventData.repeat || 'none',
        subject: eventData.subject || availableSubjects[0],
        color: eventData.color || 'blue',
        location: eventData.location,
        notes: eventData.notes
      };
      setEvents(prev => [...prev, newEv]);
      toast.show('✅ Evento añadido a tu agenda', 'success');
    }
    setIsModalOpen(false);
  };

  const handleDeleteEvent = () => {
    if (selectedEvent.id) {
      setEvents(events.filter(ev => ev.id !== selectedEvent.id));
      toast.show('🗑️ Evento eliminado', 'info');
      setIsModalOpen(false);
    }
  };

  const handleAddFromExternal = (evToAdd: Omit<CalendarEvent, 'id'>) => {
    const newEv: CalendarEvent = {
      ...evToAdd,
      id: Date.now().toString()
    };
    setEvents(prev => [...prev, newEv]);
  };

  const handleDragEnd = (eventParams: DragEndEvent) => {
    const { active, over } = eventParams;
    if (!over || !active.id) return;
    
    const overIdParts = String(over.id).split('-slot-');
    if (overIdParts.length === 2) {
      const targetDate = overIdParts[0];
      const targetHour = parseFloat(overIdParts[1]);

      setEvents(prev => prev.map(ev => {
        if (ev.id === active.id) {
          const safeHour = Math.min(Math.max(0, targetHour), 24 - (ev.duration || 1));
          return { ...ev, date: targetDate, startHour: safeHour };
        }
        return ev;
      }));
      toast.show('📅 Evento reprogramado correctamente', 'success');
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col pb-20 md:pb-6 relative"
    >
      {/* Top Header */}
      <header className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-fox-text-main flex items-center gap-3">
              <span className="p-2 rounded-2xl bg-fox-orange/10 text-fox-orange border border-fox-orange/20 flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </span>
              <span>Agenda y Planificación Docente</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-sans font-semibold">
                Jornada Escolar
              </span>
            </h2>
            <p className="text-fox-text-muted mt-1.5 text-sm max-w-2xl leading-relaxed">
              Planificá tus clases, tutorías y evaluaciones en la jornada de 07:00 a 18:30 hs con sincronización por aula y enfoque pedagógico DUA.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* View Switcher: Día / Semana / Mes */}
            <div className="flex bg-fox-surface rounded-2xl border border-fox-border p-1 shadow-2xs">
              <button 
                onClick={() => setViewType('day')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  viewType === 'day' ? 'bg-fox-orange text-white shadow-2xs' : 'text-fox-text-muted hover:text-fox-text-main'
                }`}
              >
                Día
              </button>
              <button 
                onClick={() => setViewType('week')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  viewType === 'week' ? 'bg-fox-orange text-white shadow-2xs' : 'text-fox-text-muted hover:text-fox-text-main'
                }`}
              >
                Semana
              </button>
              <button 
                onClick={() => setViewType('month')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  viewType === 'month' ? 'bg-fox-orange text-white shadow-2xs' : 'text-fox-text-muted hover:text-fox-text-main'
                }`}
              >
                Mes
              </button>
            </div>

            {/* Add Event Button */}
            <button 
              onClick={() => openAddModal()}
              className="bg-fox-orange text-white px-4 py-2 rounded-2xl text-xs font-bold hover:bg-fox-orange/90 transition-all flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-[1.02]"
              id="btn-nuevo-evento-agenda"
            >
              <Plus size={16} />
              <span>Nuevo Evento</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <div className="flex items-center gap-1.5 text-xs text-fox-text-muted font-bold mr-1 shrink-0">
            <Filter size={14} /> Filtrar Aulas:
          </div>
          {availableSubjects.map(subject => {
            const isActive = activeFilters.includes(subject);
            const baseColor = subjectColors[subject] || 'blue';
            const colors = colorMap[baseColor] || colorMap.blue;
            
            return (
              <button
                key={subject}
                onClick={() => toggleFilter(subject)}
                className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                  isActive 
                    ? `${colors.bg} ${colors.border} ${colors.text} shadow-2xs border-2` 
                    : `bg-fox-surface border-fox-border text-fox-text-muted hover:border-fox-border/80`
                }`}
              >
                {subject}
              </button>
            );
          })}
          {activeFilters.length > 0 && (
            <button
              onClick={() => setActiveFilters([])}
              className="text-[11px] font-bold text-fox-orange hover:underline px-2"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </header>

      {/* Main Calendar View Section */}
      <div className="flex flex-col gap-6 flex-1 min-h-0">
        <div className="flex-1 bg-fox-surface rounded-3xl shadow-sm border border-fox-border overflow-hidden flex flex-col min-h-[600px]">
          {/* Calendar Navigation Bar */}
          <div className="flex items-center justify-between p-4 px-6 border-b border-fox-border bg-fox-bg/40">
            <div className="flex items-center gap-3">
              <button 
                onClick={handlePrev} 
                className="p-2 bg-fox-surface border border-fox-border hover:bg-fox-bg rounded-xl shadow-2xs transition-colors"
                title="Anterior"
              >
                <ChevronLeft size={16} className="text-fox-text-muted" />
              </button>
              <h3 className="font-heading font-bold text-base md:text-lg text-fox-text-main capitalize">
                {headerText}
              </h3>
              <button 
                onClick={handleNext} 
                className="p-2 bg-fox-surface border border-fox-border hover:bg-fox-bg rounded-xl shadow-2xs transition-colors"
                title="Siguiente"
              >
                <ChevronRight size={16} className="text-fox-text-muted" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleToday} 
                className="text-xs font-bold bg-fox-surface border border-fox-border px-3 py-1.5 rounded-xl hover:bg-fox-bg text-fox-primary transition-colors"
              >
                Ir a Hoy
              </button>
            </div>
          </div>
          
          {/* Calendar View Renderers */}
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex-1 relative overflow-hidden flex flex-col">
              {viewType === 'day' ? (
                <DayViewGrid
                  currentDate={currentDate}
                  onDateChange={setCurrentDate}
                  events={filteredEvents}
                  timeRangeMode={timeRangeMode}
                  onOpenAddModal={openAddModal}
                  onOpenEditModal={openEditModal}
                  onNavigateToAula={(subject) => setView('aulas', { subject })}
                />
              ) : viewType === 'week' ? (
                <WeekViewGrid
                  weekDays={weekDays}
                  events={filteredEvents}
                  timeRangeMode={timeRangeMode}
                  onOpenAddModal={openAddModal}
                  onOpenEditModal={openEditModal}
                />
              ) : (
                <MonthViewGrid
                  monthDays={monthDays}
                  monthWeeksCount={monthWeeksCount}
                  currentDate={currentDate}
                  events={filteredEvents}
                  onOpenAddModal={openAddModal}
                  onOpenEditModal={openEditModal}
                  onSelectDayView={(day) => {
                    setCurrentDate(day);
                    setViewType('day');
                  }}
                />
              )}
            </div>
          </DndContext>
        </div>

        {/* Bottom Section: Official School Calendar Panel */}
        <div className="w-full">
          <CalendarioEscolarPanel 
            onImportToAgenda={handleAddFromExternal}
            existingEvents={events}
          />
        </div>
      </div>

      {/* Modern Event Modal */}
      <AgendaEventModal
        isOpen={isModalOpen}
        isEdit={isEditMode}
        event={selectedEvent}
        availableSubjects={availableSubjects}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />

      {/* Floating / Expandable Foxy Assistant for Agenda */}
      <AgendaFoxyAssistant
        events={events}
        onAddEvent={handleAddFromExternal}
        onOptimizeSchedule={(optEvents) => setEvents(optEvents)}
      />
    </motion.div>
  );
}

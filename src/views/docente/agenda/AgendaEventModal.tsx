import React, { useState, useEffect } from 'react';
import { 
  X, Calendar as CalendarIcon, Clock, MapPin, AlignLeft, 
  Trash2, CheckCircle2, RefreshCw, BookOpen, GraduationCap, 
  Users, CheckSquare, Bell, UserCheck, Sparkles, FileText, 
  Layers, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from '../../../components/ui/Toaster';
import { format, parseISO, isAfter, isBefore } from 'date-fns';

export type EventColor = 'blue' | 'orange' | 'purple' | 'green' | 'red' | 'pink' | 'yellow';

export interface CalendarEvent {
  id: string;
  title: string;
  type?: string;
  startHour: number; // 0 to 23.5
  duration: number; // in hours
  date: string; // 'YYYY-MM-DD'
  endDate?: string;
  isAllDay?: boolean;
  repeat?: 'none' | 'daily' | 'weekly' | 'weekdays' | 'monthly' | 'yearly';
  color: EventColor;
  location?: string;
  isTask?: boolean;
  subject?: string;
  notes?: string;
}

export const colorMap: Record<EventColor, { bg: string; border: string; text: string; hex: string; name: string }> = {
  blue: { bg: 'bg-fox-primary/10', border: 'border-fox-primary', text: 'text-fox-primary', hex: '#2563eb', name: 'Azul' },
  orange: { bg: 'bg-fox-orange/10', border: 'border-fox-orange', text: 'text-fox-orange', hex: '#f97316', name: 'Naranja' },
  purple: { bg: 'bg-fox-purple/10', border: 'border-fox-purple', text: 'text-fox-purple', hex: '#a855f7', name: 'Púrpura' },
  green: { bg: 'bg-fox-green/10', border: 'border-fox-green', text: 'text-fox-green', hex: '#22c55e', name: 'Verde' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500', text: 'text-red-500', hex: '#ef4444', name: 'Rojo' },
  pink: { bg: 'bg-pink-500/10', border: 'border-pink-500', text: 'text-pink-500', hex: '#ec4899', name: 'Rosa' },
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500', text: 'text-yellow-600', hex: '#eab308', name: 'Amarillo' },
};

export const eventTypesList = [
  { id: 'Clase', label: 'Clase', icon: BookOpen, color: 'blue' as EventColor, desc: 'Dictado de materia' },
  { id: 'Examen', label: 'Examen / Prueba', icon: GraduationCap, color: 'red' as EventColor, desc: 'Evaluación de alumnos' },
  { id: 'Tarea', label: 'Entrega de Tarea', icon: CheckSquare, color: 'green' as EventColor, desc: 'Trabajo práctico' },
  { id: 'Reunión', label: 'Reunión', icon: Users, color: 'purple' as EventColor, desc: 'Personal o directivos' },
  { id: 'Tutoría', label: 'Tutoría DUA', icon: UserCheck, color: 'orange' as EventColor, desc: 'Apoyo individual/grupal' },
  { id: 'Recordatorio', label: 'Recordatorio', icon: Bell, color: 'yellow' as EventColor, desc: 'Aviso personal' },
  { id: 'Acto', label: 'Acto / Evento', icon: Sparkles, color: 'pink' as EventColor, desc: 'Institucional' },
];

export const repeatOptions = [
  { id: 'none', label: 'No se repite', desc: 'Una sola vez' },
  { id: 'daily', label: 'Todos los días', desc: 'Lunes a Domingo' },
  { id: 'weekdays', label: 'Días de semana', desc: 'Lunes a Viernes' },
  { id: 'weekly', label: 'Todas las semanas', desc: 'El mismo día semanal' },
  { id: 'monthly', label: 'Todos los meses', desc: 'Mismo día del mes' },
  { id: 'yearly', label: 'Todos los años', desc: 'Anual' },
];

export const format24hTime = (hour: number) => {
  const h = Math.floor(hour);
  const m = Math.round((hour % 1) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Generates time options for 24 hours in 30 minute steps (00:00 to 23:30)
export const all24HourSlots = Array.from({ length: 48 }, (_, i) => i * 0.5);

interface AgendaEventModalProps {
  isOpen: boolean;
  isEdit: boolean;
  event: Partial<CalendarEvent>;
  availableSubjects: string[];
  onClose: () => void;
  onSave: (event: Partial<CalendarEvent>) => void;
  onDelete?: () => void;
}

export function AgendaEventModal({
  isOpen,
  isEdit,
  event,
  availableSubjects,
  onClose,
  onSave,
  onDelete
}: AgendaEventModalProps) {
  const [formData, setFormData] = useState<Partial<CalendarEvent>>({
    title: '',
    type: 'Clase',
    date: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    startHour: 8,
    duration: 1.5,
    isAllDay: false,
    repeat: 'none',
    color: 'blue',
    subject: availableSubjects[0] || 'Literatura 3°A',
    location: '',
    notes: ''
  });

  useEffect(() => {
    if (event) {
      setFormData({
        ...event,
        title: event.title || '',
        type: event.type || 'Clase',
        date: event.date || format(new Date(), 'yyyy-MM-dd'),
        endDate: event.endDate || event.date || format(new Date(), 'yyyy-MM-dd'),
        startHour: event.startHour !== undefined ? event.startHour : 8,
        duration: event.duration || 1.5,
        isAllDay: event.isAllDay || false,
        repeat: event.repeat || 'none',
        color: event.color || 'blue',
        subject: event.subject || availableSubjects[0] || 'Literatura 3°A',
        location: event.location || '',
        notes: event.notes || ''
      });
    }
  }, [event, availableSubjects]);

  if (!isOpen) return null;

  const endHour = (formData.startHour || 8) + (formData.duration || 1);

  const handleStartHourChange = (newStart: number) => {
    let currentDuration = formData.duration || 1;
    // ensure end time is within 24h
    if (newStart + currentDuration > 24) {
      currentDuration = Math.max(0.5, 24 - newStart);
    }
    setFormData(prev => ({ ...prev, startHour: newStart, duration: currentDuration }));
  };

  const handleEndHourChange = (newEnd: number) => {
    const start = formData.startHour || 0;
    if (newEnd <= start) {
      toast.show('El horario de fin debe ser posterior al inicio', 'warning');
      return;
    }
    setFormData(prev => ({ ...prev, duration: newEnd - start }));
  };

  const handleDurationPreset = (hoursToAdd: number) => {
    const start = formData.startHour || 8;
    if (start + hoursToAdd > 24) {
      setFormData(prev => ({ ...prev, duration: 24 - start }));
    } else {
      setFormData(prev => ({ ...prev, duration: hoursToAdd }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      toast.show('Por favor ingresa un título para el evento', 'warning');
      return;
    }
    onSave(formData);
  };

  const selectedTypeObj = eventTypesList.find(t => t.id === formData.type) || eventTypesList[0];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-fox-surface border border-fox-border rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-fox-border flex justify-between items-center bg-fox-bg/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${colorMap[formData.color || 'blue'].bg} ${colorMap[formData.color || 'blue'].text} border ${colorMap[formData.color || 'blue'].border}`}>
              <CalendarIcon size={20} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-fox-text-main text-lg">
                {isEdit ? 'Editar Evento en Agenda' : 'Nuevo Evento en Agenda'}
              </h3>
              <p className="text-xs text-fox-text-muted">Horarios 24hs y sincronización con aulas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-fox-text-muted hover:text-fox-text-main p-2 rounded-full hover:bg-fox-border/40 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2">
              Título del evento o clase *
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full text-base font-bold bg-fox-bg border border-fox-border rounded-2xl px-4 py-3 text-fox-text-main placeholder:text-fox-text-muted/50 focus:outline-none focus:ring-2 focus:ring-fox-orange/30 focus:border-fox-orange transition-all"
              placeholder="Ej: Clase de Literatura 3°A — Análisis de Poesía"
              autoFocus
            />
          </div>

          {/* 1. SELECCIÓN DE TIPO DE EVENTO CON DISEÑO MEJORADO */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2 flex items-center justify-between">
              <span>Tipo de evento</span>
              <span className="text-[11px] font-normal text-fox-text-muted lowercase">selecciona una categoría</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {eventTypesList.map(type => {
                const IconComponent = type.icon;
                const isSelected = formData.type === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        type: type.id,
                        color: prev.color === 'blue' || isSelected ? type.color : prev.color
                      }));
                    }}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 transition-all relative ${
                      isSelected
                        ? `${colorMap[type.color].bg} ${colorMap[type.color].border} border-2 shadow-sm scale-[1.02]`
                        : 'bg-fox-bg border-fox-border hover:border-fox-border/80 text-fox-text-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white shadow-xs' : 'bg-fox-surface'}`}>
                        <IconComponent size={16} className={isSelected ? colorMap[type.color].text : 'text-fox-text-muted'} />
                      </div>
                      {isSelected && <CheckCircle2 size={14} className={colorMap[type.color].text} />}
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${isSelected ? 'text-fox-text-main' : 'text-fox-text-main/80'}`}>
                        {type.label}
                      </p>
                      <p className="text-[10px] text-fox-text-muted truncate mt-0.5">{type.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. MEJORADA UX DE FECHAS Y HORARIOS (24hs, Desde / Hasta, Presets de duración) */}
          <div className="bg-fox-bg/80 border border-fox-border rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-fox-border/70 pb-3">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-fox-orange" />
                <span className="text-xs font-bold uppercase tracking-wider text-fox-text-main">
                  Fecha y Horario (Formato 24hs)
                </span>
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-fox-text-muted mb-1.5">
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={formData.date || ''}
                  onChange={e => {
                    const newDate = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      date: newDate,
                      endDate: prev.endDate && isBefore(parseISO(prev.endDate), parseISO(newDate)) ? newDate : prev.endDate || newDate
                    }));
                  }}
                  className="w-full bg-fox-surface border border-fox-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-fox-text-main focus:outline-none focus:border-fox-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-fox-text-muted mb-1.5">
                  Fecha de fin
                </label>
                <input
                  type="date"
                  value={formData.endDate || formData.date || ''}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  min={formData.date}
                  className="w-full bg-fox-surface border border-fox-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-fox-text-main focus:outline-none focus:border-fox-orange"
                />
              </div>
            </div>

            {/* Time Pickers */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Start time */}
                <div>
                  <label className="block text-xs font-medium text-fox-text-muted mb-1.5 flex items-center justify-between">
                    <span>Hora de inicio (24hs)</span>
                    <span className="text-[10px] text-fox-orange font-bold">
                      {format24hTime(formData.startHour || 8)} hs
                    </span>
                  </label>
                  <select
                    value={formData.startHour || 8}
                    onChange={e => handleStartHourChange(Number(e.target.value))}
                    className="w-full bg-fox-surface border border-fox-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-fox-text-main focus:outline-none focus:border-fox-orange cursor-pointer"
                  >
                    {all24HourSlots.map(h => (
                      <option key={h} value={h}>
                        {format24hTime(h)} hs {h >= 0 && h < 7 ? '🌙 (Madrugada)' : h >= 7 && h < 13 ? '☀️ (Mañana)' : h >= 13 && h < 20 ? '🌤️ (Tarde)' : '🌘 (Noche)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* End time */}
                <div>
                  <label className="block text-xs font-medium text-fox-text-muted mb-1.5 flex items-center justify-between">
                    <span>Hora de finalización</span>
                    <span className="text-[10px] text-fox-primary font-bold">
                      {format24hTime(endHour)} hs
                    </span>
                  </label>
                  <select
                    value={endHour}
                    onChange={e => handleEndHourChange(Number(e.target.value))}
                    className="w-full bg-fox-surface border border-fox-border rounded-xl px-3.5 py-2.5 text-xs font-bold text-fox-text-main focus:outline-none focus:border-fox-orange cursor-pointer"
                  >
                    {all24HourSlots.filter(h => h > (formData.startHour || 0)).map(h => (
                      <option key={h} value={h}>
                        {format24hTime(h)} hs ({Math.round((h - (formData.startHour || 0)) * 60)} min)
                      </option>
                    ))}
                    <option value={24}>24:00 hs (Fin del día)</option>
                  </select>
                </div>
              </div>

              {/* Duration Presets */}
              <div>
                <label className="block text-[11px] font-medium text-fox-text-muted mb-1.5">
                  Duración rápida:
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { label: '40 min (Módulo)', hours: 40 / 60 },
                    { label: '80 min (Doble módulo)', hours: 80 / 60 },
                    { label: '1 hora', hours: 1 },
                    { label: '1h 30m', hours: 1.5 },
                    { label: '2 horas', hours: 2 },
                    { label: '3 horas', hours: 3 }
                  ].map(preset => {
                    const isSelected = Math.abs((formData.duration || 1) - preset.hours) < 0.05;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => handleDurationPreset(preset.hours)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-fox-orange text-white border-fox-orange shadow-xs font-bold'
                            : 'bg-fox-surface border-fox-border text-fox-text-muted hover:border-fox-orange/40 hover:text-fox-text-main'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 3. SELECCIÓN DE REPETICIÓN CON DISEÑO MEJORADO */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <RefreshCw size={14} className="text-fox-orange" /> Repetición del evento
              </span>
              <span className="text-[11px] font-normal text-fox-text-muted lowercase">frecuencia periódica</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {repeatOptions.map(option => {
                const isSelected = (formData.repeat || 'none') === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, repeat: option.id as any })}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                      isSelected
                        ? 'bg-fox-orange/10 border-fox-orange text-fox-orange font-bold border-2 shadow-xs'
                        : 'bg-fox-bg border-fox-border text-fox-text-muted hover:border-fox-border/80'
                    }`}
                  >
                    <span className="text-xs">{option.label}</span>
                    <span className="text-[10px] text-fox-text-muted font-normal">{option.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aula y Ubicación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2 flex items-center gap-1.5">
                <BookOpen size={14} /> Asignar a Aula / Materia
              </label>
              <select
                value={formData.subject || availableSubjects[0]}
                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-2.5 text-xs font-bold text-fox-text-main focus:outline-none focus:border-fox-orange cursor-pointer"
              >
                {availableSubjects.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
                <option value="General / Institucional">General / Institucional</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2 flex items-center gap-1.5">
                <MapPin size={14} /> Ubicación o Enlace
              </label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-2.5 text-xs font-medium text-fox-text-main placeholder:text-fox-text-muted/60 focus:outline-none focus:border-fox-orange"
                placeholder="Ej: Aula 12 / Laboratorio / Google Meet"
              />
            </div>
          </div>

          {/* Selector de Color */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2">
              Color de identificación
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {(Object.keys(colorMap) as EventColor[]).map(c => {
                const isSelected = formData.color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c })}
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${
                      isSelected
                        ? 'scale-110 ring-3 ring-offset-2 ring-fox-text-main/20 shadow-md'
                        : 'opacity-70 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{ backgroundColor: colorMap[c].hex }}
                    title={colorMap[c].name}
                  >
                    {isSelected && <CheckCircle2 size={16} className="text-white drop-shadow-sm" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notas / Observaciones */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2 flex items-center gap-1.5">
              <FileText size={14} /> Notas o consignas pedagógicas (Opcional)
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-2.5 text-xs text-fox-text-main placeholder:text-fox-text-muted/60 focus:outline-none focus:border-fox-orange resize-none"
              placeholder="Recordatorios de materiales DUA, fotocopias, temas a evaluar..."
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-5 border-t border-fox-border bg-fox-bg/50 flex items-center justify-between gap-3 shrink-0">
          {isEdit && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="p-2.5 border border-red-200 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-colors flex items-center gap-2 text-xs"
              title="Eliminar evento de la agenda"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Eliminar</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-fox-border text-fox-text-muted hover:text-fox-text-main rounded-2xl font-bold text-xs hover:bg-fox-bg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2.5 bg-fox-orange text-white rounded-2xl font-bold text-xs hover:bg-fox-orange/90 transition-all shadow-md flex items-center gap-2"
            >
              {isEdit ? 'Actualizar Evento' : 'Guardar en Agenda'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

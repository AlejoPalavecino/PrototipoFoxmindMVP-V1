import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Check, Plus, Search, Tag, School, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from '../../../components/ui/Toaster';
import { CalendarEvent } from './AgendaEventModal';

export interface OfficialSchoolEvent {
  id: string;
  title: string;
  category: 'feriado' | 'academico' | 'institucional' | 'evaluacion';
  categoryLabel: string;
  categoryColor: 'purple' | 'orange' | 'blue' | 'green' | 'red';
  startDate: string;
  endDate?: string;
  description: string;
  isAllDay: boolean;
  audience: string;
}

export const mockOfficialSchoolEvents: OfficialSchoolEvent[] = [
  {
    id: 'esc-1',
    title: 'Receso Escolar de Invierno',
    category: 'feriado',
    categoryLabel: 'Receso Oficial',
    categoryColor: 'purple',
    startDate: '2026-07-13',
    endDate: '2026-07-24',
    description: 'Vacaciones de invierno para todos los niveles escolares secundarios.',
    isAllDay: true,
    audience: 'Toda la comunidad'
  },
  {
    id: 'esc-2',
    title: 'Cierre de Calificaciones — 1° Cuatrimestre',
    category: 'academico',
    categoryLabel: 'Límite Notas',
    categoryColor: 'orange',
    startDate: '2026-06-30',
    description: 'Fecha límite de carga de planillas trimestrales al sistema institucional.',
    isAllDay: true,
    audience: 'Docentes'
  },
  {
    id: 'esc-3',
    title: 'Jornada Pedagógica Institucional DUA',
    category: 'institucional',
    categoryLabel: 'Capacitación DUA',
    categoryColor: 'blue',
    startDate: '2026-06-15',
    description: 'Taller docente sobre diversificación de instrumentos evaluativos accesibles.',
    isAllDay: false,
    audience: 'Docentes y Directivos'
  },
  {
    id: 'esc-4',
    title: 'Entrega de Informes y Boletines a Familias',
    category: 'academico',
    categoryLabel: 'Reunión Familias',
    categoryColor: 'green',
    startDate: '2026-07-06',
    description: 'Encuentros presenciales y virtuales con tutores para devolución formativa.',
    isAllDay: false,
    audience: 'Familias y Docentes'
  },
  {
    id: 'esc-5',
    title: 'Mesas de Examen Previas y Libres',
    category: 'evaluacion',
    categoryLabel: 'Mesas Exámenes',
    categoryColor: 'red',
    startDate: '2026-08-03',
    endDate: '2026-08-07',
    description: 'Comisiones evaluadoras de materias adeudadas.',
    isAllDay: true,
    audience: 'Alumnos y Tribunal Docente'
  },
  {
    id: 'esc-6',
    title: 'Acto del Día de la Independencia',
    category: 'institucional',
    categoryLabel: 'Acto Patrio',
    categoryColor: 'blue',
    startDate: '2026-07-08',
    description: 'Acto escolar con participación de los cursos 3°A y 2°B.',
    isAllDay: false,
    audience: 'Comunidad Educativa'
  }
];

interface CalendarioEscolarPanelProps {
  onImportToAgenda: (event: Omit<CalendarEvent, 'id'>) => void;
  existingEvents: CalendarEvent[];
}

export function CalendarioEscolarPanel({ onImportToAgenda, existingEvents }: CalendarioEscolarPanelProps) {
  const [filterCategory, setFilterCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [importedIds, setImportedIds] = useState<string[]>([]);

  const filteredEvents = mockOfficialSchoolEvents.filter(ev => {
    const matchesCat = filterCategory === 'todos' || ev.category === filterCategory;
    const matchesSearch = ev.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ev.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleImport = (schoolEv: OfficialSchoolEvent) => {
    onImportToAgenda({
      title: `[Oficial] ${schoolEv.title}`,
      type: schoolEv.category === 'evaluacion' ? 'Examen' : schoolEv.category === 'feriado' ? 'Recordatorio' : 'Acto',
      startHour: 8,
      duration: 2,
      date: schoolEv.startDate,
      endDate: schoolEv.endDate || schoolEv.startDate,
      isAllDay: schoolEv.isAllDay,
      repeat: 'none',
      color: schoolEv.categoryColor === 'purple' ? 'purple' : schoolEv.categoryColor === 'orange' ? 'orange' : schoolEv.categoryColor === 'green' ? 'green' : 'blue',
      subject: 'General / Institucional',
      location: 'Colegio / Sede Oficial',
      notes: schoolEv.description
    });
    setImportedIds(prev => [...prev, schoolEv.id]);
    toast.show(`📅 "${schoolEv.title}" agregado a tu agenda`, 'success');
  };

  const badgeColorClass = {
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    red: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <div className="bg-fox-surface rounded-3xl shadow-sm border border-fox-border p-6 flex flex-col gap-4">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-fox-border">
        <div>
          <h3 className="font-heading font-bold text-fox-text-main flex items-center gap-2 text-base">
            <School size={20} className="text-fox-orange" /> Calendario Oficial Escolar
          </h3>
          <p className="text-xs text-fox-text-muted mt-0.5">
            Próximos eventos, feriados y resoluciones académicas oficiales
          </p>
        </div>
        <span className="text-[11px] font-bold px-3 py-1 bg-green-500/10 text-green-600 rounded-full border border-green-500/20 flex items-center gap-1.5 w-fit">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Sincronizado con Dirección
        </span>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fox-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar eventos escolares oficiales..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-fox-bg border border-fox-border rounded-xl focus:outline-none focus:border-fox-orange"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'academico', label: 'Académico' },
            { id: 'feriado', label: 'Feriados' },
            { id: 'institucional', label: 'Jornadas' },
            { id: 'evaluacion', label: 'Exámenes' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterCategory === cat.id
                  ? 'bg-fox-orange text-white shadow-xs'
                  : 'bg-fox-bg border border-fox-border text-fox-text-muted hover:text-fox-text-main'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Event Cards List */}
      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-xs text-fox-text-muted">
            No se encontraron eventos con los filtros actuales.
          </div>
        ) : (
          filteredEvents.map(ev => {
            const isImported = importedIds.includes(ev.id) || existingEvents.some(e => e.title.includes(ev.title));
            return (
              <div
                key={ev.id}
                className="p-4 bg-fox-bg rounded-2xl border border-fox-border hover:border-fox-orange/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeColorClass[ev.categoryColor]}`}>
                      {ev.categoryLabel}
                    </span>
                    <span className="text-[11px] text-fox-text-muted flex items-center gap-1 font-medium">
                      <Clock size={11} className="text-fox-orange" />
                      {ev.startDate} {ev.endDate ? `hasta ${ev.endDate}` : ''}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-fox-text-main leading-tight">{ev.title}</h4>
                  <p className="text-[11px] text-fox-text-muted leading-relaxed line-clamp-2">
                    {ev.description}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                  <button
                    onClick={() => handleImport(ev)}
                    disabled={isImported}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                      isImported
                        ? 'bg-green-500/10 text-green-600 border border-green-500/20 cursor-default'
                        : 'bg-fox-surface border border-fox-border hover:border-fox-orange hover:bg-fox-orange hover:text-white text-fox-text-main'
                    }`}
                  >
                    {isImported ? (
                      <>
                        <Check size={13} /> En mi agenda
                      </>
                    ) : (
                      <>
                        <Plus size={13} /> Agregar a mi agenda
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

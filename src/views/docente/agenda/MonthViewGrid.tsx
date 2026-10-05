import React from 'react';
import { format, isSameMonth, isToday } from 'date-fns';
import { CalendarEvent, colorMap, format24hTime } from './AgendaEventModal';
import { CheckCircle2, Plus } from 'lucide-react';

interface MonthViewGridProps {
  monthDays: Date[];
  monthWeeksCount: number;
  currentDate: Date;
  events: CalendarEvent[];
  onOpenAddModal: (dateStr: string) => void;
  onOpenEditModal: (event: CalendarEvent, e: React.MouseEvent) => void;
  onSelectDayView?: (date: Date) => void;
}

export function MonthViewGrid({
  monthDays,
  monthWeeksCount,
  currentDate,
  events,
  onOpenAddModal,
  onOpenEditModal,
  onSelectDayView
}: MonthViewGridProps) {
  return (
    <div className="h-full flex flex-col min-h-[620px] bg-fox-surface select-none">
      {/* Weekday labels */}
      <div className="grid grid-cols-7 border-b border-fox-border bg-fox-bg/70 py-2.5">
        {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => (
          <div key={day} className="text-center font-heading font-bold text-xs text-fox-text-muted capitalize">
            {day}
          </div>
        ))}
      </div>

      {/* Month Grid */}
      <div 
        className="flex-1 grid grid-cols-7 divide-x divide-y divide-fox-border bg-fox-surface"
        style={{
          gridTemplateRows: `repeat(${monthWeeksCount}, minmax(110px, 1fr))`
        }}
      >
        {monthDays.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);
          const dayEvents = events.filter(e => e.date === dateStr);

          return (
            <div 
              key={dateStr} 
              onClick={() => onOpenAddModal(dateStr)}
              className={`p-2 flex flex-col gap-1 cursor-pointer transition-colors relative min-h-[110px] group ${
                !isCurrentMonth ? 'bg-fox-bg/40 opacity-40' : 'bg-fox-surface hover:bg-fox-bg/60'
              } ${isTodayDate ? 'ring-2 ring-inset ring-fox-orange/40 bg-fox-orange/5' : ''}`}
            >
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectDayView) onSelectDayView(day);
                    }}
                    title="Ver detalle del día"
                    className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full hover:ring-2 hover:ring-fox-orange/50 transition-all ${
                      isTodayDate 
                        ? 'bg-fox-orange text-white shadow-2xs' 
                        : isCurrentMonth ? 'text-fox-text-main hover:bg-fox-border' : 'text-fox-text-muted'
                    }`}
                  >
                    {format(day, 'd')}
                  </button>
                  {isTodayDate && (
                    <span className="text-[9px] font-extrabold text-fox-orange uppercase tracking-wider">
                      Hoy
                    </span>
                  )}
                </div>

                {dayEvents.length > 0 && (
                  <span className="text-[10px] text-fox-text-muted font-bold px-1.5 py-0.5 rounded-md bg-fox-bg border border-fox-border/60">
                    {dayEvents.length} {dayEvents.length === 1 ? 'actividad' : 'actividades'}
                  </span>
                )}
              </div>

              {/* Events list in cell */}
              <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar max-h-[85px]">
                {dayEvents.map(event => {
                  const colors = colorMap[event.color] || colorMap.blue;
                  return (
                    <div 
                      key={event.id}
                      onClick={(e) => onOpenEditModal(event, e)}
                      className={`text-[11px] px-2 py-1 rounded-lg truncate ${colors.bg} ${colors.text} border-l-2 ${colors.border} font-medium flex items-center gap-1 cursor-pointer hover:brightness-95 shadow-2xs transition-transform hover:scale-[1.01]`}
                      title={`${event.title} (${format24hTime(event.startHour)} hs)`}
                    >
                      {event.isTask && <CheckCircle2 size={10} className="shrink-0" />}
                      {!event.isTask && (
                        <span className="opacity-80 font-bold shrink-0 text-[10px]">
                          {format24hTime(event.startHour)}
                        </span>
                      )}
                      <span className="truncate flex-1 font-bold">{event.title}</span>
                    </div>
                  );
                })}
              </div>

              {/* Hover quick add button */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1 right-1">
                <span className="p-1 rounded-md bg-fox-surface border border-fox-border text-fox-orange shadow-2xs flex items-center justify-center">
                  <Plus size={10} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

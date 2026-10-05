import React, { useRef, useState, useEffect } from 'react';
import { 
  Clock, MapPin, CheckCircle2, RefreshCw, Moon, Sun, 
  ChevronDown, ChevronUp, Sparkles, Plus, BookOpen, 
  GraduationCap, Users, UserCheck, CheckSquare, Bell, 
  FileText, ArrowRight, Calendar as CalendarIcon, ExternalLink,
  ChevronLeft, ChevronRight, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isSameDay, addDays, subDays, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

import { CalendarEvent, colorMap, format24hTime } from './AgendaEventModal';
import { computeEventPositions, getDayMetrics, PositionedEvent } from './agendaUtils';

interface DayViewGridProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  events: CalendarEvent[];
  timeRangeMode: '24hs' | 'school';
  onOpenAddModal: (dateStr: string, hour: number) => void;
  onOpenEditModal: (event: CalendarEvent, e: React.MouseEvent) => void;
  onNavigateToAula?: (subject: string) => void;
}

export function DayViewGrid({
  currentDate,
  onDateChange,
  events,
  timeRangeMode,
  onOpenAddModal,
  onOpenEditModal,
  onNavigateToAula
}: DayViewGridProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [expandNightHours, setExpandNightHours] = useState(false);
  const dateStr = format(currentDate, 'yyyy-MM-dd');

  // Strip of 7 days centered on currentDate
  const dayStrip = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(subDays(currentDate, 3), i));
  }, [currentDate]);

  // Day metrics
  const metrics = getDayMetrics(events, dateStr);

  // Night events check
  const nightEventsCount = events.filter(e => {
    if (e.date !== dateStr || e.isAllDay || e.isTask) return false;
    return e.startHour >= 0 && e.startHour < 7;
  }).length;

  // Visible hours
  const visibleHours = React.useMemo(() => {
    if (timeRangeMode === 'school') {
      return Array.from({ length: 12 }, (_, i) => i + 7); // 7 to 18 (covers 7:00 to 18:30)
    }
    if (expandNightHours || nightEventsCount > 0) {
      return Array.from({ length: 24 }, (_, i) => i); // 0 to 23
    }
    return Array.from({ length: 17 }, (_, i) => i + 7); // 7 to 23
  }, [timeRangeMode, expandNightHours, nightEventsCount]);

  const minHour = visibleHours[0];
  const maxHour = visibleHours[visibleHours.length - 1] + 1;

  const scrollToHour = (targetHour: number) => {
    if (scrollContainerRef.current) {
      const offset = (targetHour - minHour) * 75; // 75px per hour in Day view for extra comfort
      scrollContainerRef.current.scrollTo({
        top: Math.max(0, offset),
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      const targetInitial = timeRangeMode === 'school' ? 7 : 8;
      const offset = (targetInitial - minHour) * 75;
      scrollContainerRef.current.scrollTop = Math.max(0, offset);
    }
  }, [minHour, timeRangeMode, dateStr]);

  // Positioned events for today
  const positionedEvents = computeEventPositions(
    events.filter(e => e.date === dateStr),
    minHour,
    75
  );

  const allDayAndTasks = events.filter(e => e.date === dateStr && (e.isAllDay || e.isTask));

  const now = new Date();
  const currentHourDecimal = now.getHours() + now.getMinutes() / 60;
  const isNowInRange = isToday(currentDate) && currentHourDecimal >= minHour && currentHourDecimal <= maxHour;

  return (
    <div className="flex flex-col h-full bg-fox-surface select-none">
      {/* 1. Top Horizontal Day Navigator Strip */}
      <div className="p-3 bg-fox-bg/70 border-b border-fox-border flex items-center justify-between gap-2 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => onDateChange(subDays(currentDate, 1))}
          className="p-2 bg-fox-surface border border-fox-border hover:bg-fox-bg rounded-xl shadow-2xs transition-colors shrink-0"
          title="Día anterior"
        >
          <ChevronLeft size={16} className="text-fox-text-muted" />
        </button>

        {/* 7 Days selector chips */}
        <div className="flex items-center gap-1.5 flex-1 justify-center min-w-0">
          {dayStrip.map((dayDate) => {
            const isSelected = isSameDay(dayDate, currentDate);
            const isTodayDay = isToday(dayDate);
            const thisDateStr = format(dayDate, 'yyyy-MM-dd');
            const dayEventsCount = events.filter(e => e.date === thisDateStr).length;

            return (
              <button
                key={dayDate.toISOString()}
                onClick={() => onDateChange(dayDate)}
                className={`px-3 py-2 rounded-2xl flex flex-col items-center min-w-[62px] transition-all border ${
                  isSelected
                    ? 'bg-fox-orange text-white border-fox-orange shadow-md scale-105 font-bold'
                    : 'bg-fox-surface border-fox-border text-fox-text-muted hover:border-fox-border/90 hover:bg-fox-bg'
                }`}
              >
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? 'text-white/90' : 'text-fox-text-muted'}`}>
                  {format(dayDate, 'EEE', { locale: es })}
                </span>
                <span className={`text-sm font-extrabold ${isSelected ? 'text-white' : isTodayDay ? 'text-fox-orange' : 'text-fox-text-main'}`}>
                  {format(dayDate, 'd')}
                </span>
                {dayEventsCount > 0 && (
                  <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-fox-orange'}`} />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onDateChange(addDays(currentDate, 1))}
          className="p-2 bg-fox-surface border border-fox-border hover:bg-fox-bg rounded-xl shadow-2xs transition-colors shrink-0"
          title="Día siguiente"
        >
          <ChevronRight size={16} className="text-fox-text-muted" />
        </button>
      </div>

      {/* 2. Daily Summary Dashboard Banner */}
      <div className="px-4 py-3 bg-fox-bg/40 border-b border-fox-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-fox-surface p-2.5 rounded-2xl border border-fox-border flex items-center gap-2.5 shadow-2xs">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <BookOpen size={16} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-fox-text-muted uppercase">Clases Hoy</p>
            <p className="font-extrabold text-fox-text-main text-sm">
              {metrics.classesCount} <span className="text-[11px] font-medium text-fox-text-muted">({metrics.totalTeachingHours}hs)</span>
            </p>
          </div>
        </div>

        <div className="bg-fox-surface p-2.5 rounded-2xl border border-fox-border flex items-center gap-2.5 shadow-2xs">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
            <Users size={16} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-fox-text-muted uppercase">Reuniones / DUA</p>
            <p className="font-extrabold text-fox-text-main text-sm">
              {metrics.meetingsCount} <span className="text-[11px] font-medium text-fox-text-muted">eventos</span>
            </p>
          </div>
        </div>

        <div className="bg-fox-surface p-2.5 rounded-2xl border border-fox-border flex items-center gap-2.5 shadow-2xs">
          <div className="p-2 rounded-xl bg-green-500/10 text-green-600 border border-green-500/20">
            <CheckSquare size={16} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-fox-text-muted uppercase">Tareas / Entregas</p>
            <p className="font-extrabold text-fox-text-main text-sm">
              {metrics.tasksCount} <span className="text-[11px] font-medium text-fox-text-muted">activas</span>
            </p>
          </div>
        </div>

        <div className="bg-fox-surface p-2.5 rounded-2xl border border-fox-border flex items-center gap-2.5 shadow-2xs">
          <div className="p-2 rounded-xl bg-fox-orange/10 text-fox-orange border border-fox-orange/20">
            <Zap size={16} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-fox-text-muted uppercase">Total Agenda</p>
            <p className="font-extrabold text-fox-orange text-sm">
              {metrics.totalEventsCount} <span className="text-[11px] font-medium text-fox-text-muted">ítems</span>
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Day Canvas (75px per hour) */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative"
      >
        <div 
          className="grid grid-cols-[80px_1fr] relative"
          style={{ height: `${visibleHours.length * 75}px` }}
        >
          {/* Left Time Column */}
          <div className="flex flex-col border-r border-fox-border bg-fox-bg/70 select-none z-20">
            {visibleHours.map(hour => {
              const isNight = hour < 7 || hour >= 22;
              return (
                <div 
                  key={hour}
                  className="h-[75px] border-b border-fox-border/60 pr-3 pt-2 text-right text-xs font-bold text-fox-text-muted flex flex-col justify-start items-end"
                >
                  <span className="flex items-center gap-1 leading-none">
                    {isNight && <Moon size={10} className="opacity-50 text-purple-400" />}
                    {format24hTime(hour)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Horizontal Grid Guidelines */}
          <div className="absolute top-0 left-[80px] right-0 bottom-0 pointer-events-none z-0">
            {visibleHours.map((hour, idx) => (
              <React.Fragment key={hour}>
                <div 
                  className="absolute w-full border-t border-fox-border/60"
                  style={{ top: `${idx * 75}px` }}
                />
                <div 
                  className="absolute w-full border-t border-dashed border-fox-border/25"
                  style={{ top: `${idx * 75 + 37.5}px` }}
                />
              </React.Fragment>
            ))}
          </div>

          {/* Day Content Area */}
          <div 
            className="relative"
            style={{ height: `${visibleHours.length * 75}px` }}
          >
            {/* Clickable slots for creating events */}
            {visibleHours.map((hour, idx) => (
              <div
                key={hour}
                className="absolute w-full h-[75px] cursor-pointer group hover:bg-fox-orange/5 transition-colors border-b border-fox-border/10"
                style={{ top: `${idx * 75}px` }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickY = e.clientY - rect.top;
                  const finalHour = clickY >= 37.5 ? hour + 0.5 : hour;
                  onOpenAddModal(dateStr, finalHour);
                }}
              >
                <div className="hidden group-hover:flex items-center justify-between px-4 py-1.5 rounded-xl bg-fox-surface/90 border border-fox-orange/30 text-xs font-bold text-fox-orange shadow-xs pointer-events-none absolute inset-x-4 top-2 z-10">
                  <span className="flex items-center gap-1.5">
                    <Plus size={14} /> Crear clase o actividad a las {format24hTime(hour)} hs
                  </span>
                  <span className="text-[10px] font-normal text-fox-text-muted uppercase">Clic para programar</span>
                </div>
              </div>
            ))}

            {/* Current Time Line */}
            {isNowInRange && (
              <div 
                className="absolute left-0 right-0 border-t-2 border-red-500 z-25 pointer-events-none shadow-xs"
                style={{ top: `${(currentHourDecimal - minHour) * 75}px` }}
              >
                <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full shadow-md animate-ping opacity-75" />
                <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full shadow-md" />
                <span className="absolute left-3 -top-2.5 px-2 py-0.5 rounded-full bg-red-500 text-white font-bold text-[10px] shadow-sm">
                  Ahora {format24hTime(currentHourDecimal)} hs
                </span>
              </div>
            )}

            {/* Positioned Events for this day */}
            <AnimatePresence>
              {positionedEvents.map((pos) => {
                const { event, topPx, heightPx, widthPercent, leftPercent } = pos;
                const colors = colorMap[event.color] || colorMap.blue;
                const endHour = event.startHour + (event.duration || 1);

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    onClick={(e) => onOpenEditModal(event, e)}
                    style={{
                      top: `${topPx}px`,
                      height: `${heightPx}px`,
                      width: `calc(${widthPercent}% - 12px)`,
                      left: `calc(${leftPercent}% + 6px)`,
                    }}
                    className={`absolute ${colors.bg} border-l-4 ${colors.border} p-3 rounded-2xl shadow-xs hover:shadow-lg hover:ring-2 hover:ring-fox-border transition-all cursor-pointer overflow-hidden z-15 group`}
                  >
                    <div className="flex flex-col justify-between h-full">
                      {/* Top bar in card */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            {event.type && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] bg-white/80 dark:bg-black/20 uppercase font-extrabold tracking-wider text-fox-text-main shadow-2xs">
                                {event.type}
                              </span>
                            )}
                            <h4 className={`font-bold text-sm leading-tight ${colors.text} truncate`}>
                              {event.title}
                            </h4>
                            {event.repeat && event.repeat !== 'none' && (
                              <RefreshCw size={11} className="text-fox-text-muted shrink-0" />
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0 text-xs font-bold text-fox-text-main bg-white/60 dark:bg-black/20 px-2 py-0.5 rounded-lg">
                            <Clock size={11} className="text-fox-orange" />
                            <span>{format24hTime(event.startHour)} - {format24hTime(endHour)}</span>
                            <span className="text-[10px] text-fox-text-muted">({Math.round((event.duration || 1) * 60)}m)</span>
                          </div>
                        </div>

                        {/* Middle info */}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-fox-text-muted flex-wrap">
                          {event.subject && (
                            <span className="flex items-center gap-1 font-semibold text-fox-text-main">
                              <BookOpen size={12} className="text-fox-primary" /> {event.subject}
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} /> {event.location}
                            </span>
                          )}
                        </div>

                        {/* Notes preview if available */}
                        {event.notes && heightPx > 90 && (
                          <p className="text-xs text-fox-text-muted/90 mt-2 line-clamp-2 italic bg-white/40 dark:bg-black/10 p-2 rounded-xl border border-black/5">
                            "{event.notes}"
                          </p>
                        )}
                      </div>

                      {/* Bottom action hint */}
                      {heightPx > 80 && (
                        <div className="flex items-center justify-between pt-2 border-t border-black/5 mt-auto text-[11px] text-fox-text-muted">
                          <span className="group-hover:text-fox-orange font-medium flex items-center gap-1">
                            Ver detalles / Editar <ArrowRight size={11} />
                          </span>
                          {event.subject && onNavigateToAula && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToAula(event.subject!);
                              }}
                              className="text-fox-primary font-bold hover:underline flex items-center gap-1"
                            >
                              Ir al Aula <ExternalLink size={10} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

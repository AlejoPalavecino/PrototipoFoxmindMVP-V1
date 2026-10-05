import React, { useRef, useState, useEffect } from 'react';
import { 
  Clock, MapPin, CheckCircle2, RefreshCw, Moon, Sun, 
  ChevronDown, ChevronUp, Sparkles, Plus, AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isSameDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

import { CalendarEvent, colorMap, format24hTime } from './AgendaEventModal';
import { computeEventPositions, PositionedEvent } from './agendaUtils';

function DroppableSlot({ id, rectProps }: { id: string; rectProps?: any }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div 
      ref={setNodeRef} 
      className={`absolute w-full h-[60px] transition-colors pointer-events-auto ${
        isOver ? 'bg-fox-orange/20 ring-2 ring-fox-orange/40 z-10' : 'bg-transparent z-0'
      }`} 
      {...rectProps} 
    />
  );
}

function DraggableEventCard({ 
  positioned, 
  onOpen 
}: { 
  positioned: PositionedEvent; 
  onOpen: (ev: CalendarEvent, e: React.MouseEvent) => void; 
}) {
  const { event, topPx, heightPx, widthPercent, leftPercent } = positioned;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    disabled: event.isTask
  });
  
  const colors = colorMap[event.color] || colorMap.blue;
  const style: React.CSSProperties = {
    top: `${topPx}px`,
    height: `${heightPx}px`,
    width: `calc(${widthPercent}% - 6px)`,
    left: `calc(${leftPercent}% + 3px)`,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 10,
  };

  return (
    <div 
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (transform && (Math.abs(transform.x) > 5 || Math.abs(transform.y) > 5)) return;
        onOpen(event, e);
      }}
      style={style}
      className={`absolute ${colors.bg} border-l-[3.5px] ${colors.border} p-2 rounded-r-xl rounded-l-xs shadow-xs hover:shadow-md hover:ring-1 hover:ring-fox-border transition-all cursor-${event.isTask ? 'pointer' : 'grab'} active:cursor-grabbing overflow-hidden group select-none`}
    >
      <div className="flex items-start gap-1 h-full min-w-0">
        {event.isTask && <CheckCircle2 size={12} className={`mt-0.5 ${colors.text} shrink-0`} />}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full pointer-events-none">
          <div>
            <p className={`font-bold text-[11px] sm:text-xs leading-snug ${colors.text} truncate flex items-center gap-1`}>
              {event.title}
              {event.repeat && event.repeat !== 'none' && <RefreshCw size={9} className="shrink-0 opacity-70" />}
            </p>
            
            {heightPx > 40 && (
              <p className="text-[10px] text-fox-text-muted mt-0.5 flex items-center gap-1 font-medium truncate opacity-90">
                <Clock size={9} className="shrink-0" />
                {format24hTime(event.startHour)} - {format24hTime(event.startHour + (event.duration || 1))}
                {event.location && (
                  <span className="truncate opacity-75">• {event.location}</span>
                )}
              </p>
            )}
          </div>

          {heightPx > 65 && event.subject && (
            <div className="flex items-center gap-1 mt-auto pt-1">
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-white/70 dark:bg-black/20 rounded-md text-fox-text-muted truncate max-w-full">
                {event.subject}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface WeekViewGridProps {
  weekDays: Date[];
  events: CalendarEvent[];
  timeRangeMode: '24hs' | 'school';
  onOpenAddModal: (dateStr: string, hour: number) => void;
  onOpenEditModal: (event: CalendarEvent, e: React.MouseEvent) => void;
}

export function WeekViewGrid({
  weekDays,
  events,
  timeRangeMode,
  onOpenAddModal,
  onOpenEditModal,
}: WeekViewGridProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [expandNightHours, setExpandNightHours] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState<{ date: string; hour: number } | null>(null);

  // Determine hours array
  const nightHours = [0, 1, 2, 3, 4, 5, 6];
  const dayHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
  
  // Has events in night hours?
  const nightEventsCount = events.filter(e => {
    const start = e.startHour;
    return !e.isAllDay && !e.isTask && start >= 0 && start < 7;
  }).length;

  // Visible hours based on collapse state and mode
  const visibleHours = React.useMemo(() => {
    if (timeRangeMode === 'school') {
      return Array.from({ length: 12 }, (_, i) => i + 7); // 7 to 18 (covers 7:00 to 18:30)
    }
    if (expandNightHours || nightEventsCount > 0) {
      return Array.from({ length: 24 }, (_, i) => i); // 0 to 23
    }
    // Collapsed night mode: start from 7 to 23
    return Array.from({ length: 17 }, (_, i) => i + 7); // 7 to 23
  }, [timeRangeMode, expandNightHours, nightEventsCount]);

  const minHour = visibleHours[0];
  const maxHour = visibleHours[visibleHours.length - 1] + 1;

  // Scroll smoothly to hour
  const scrollToHour = (targetHour: number) => {
    if (scrollContainerRef.current) {
      const offset = (targetHour - minHour) * 60;
      scrollContainerRef.current.scrollTo({
        top: Math.max(0, offset),
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    // Initial jump to 07:00 in school mode or 08:00 in 24hs mode
    if (scrollContainerRef.current) {
      const targetInitial = timeRangeMode === 'school' ? 7 : 8;
      const offset = (targetInitial - minHour) * 60;
      scrollContainerRef.current.scrollTop = Math.max(0, offset);
    }
  }, [minHour, timeRangeMode]);

  // Current time marker
  const now = new Date();
  const currentHourDecimal = now.getHours() + now.getMinutes() / 60;
  const isNowInRange = currentHourDecimal >= minHour && currentHourDecimal <= maxHour;

  return (
    <div className="flex flex-col h-full bg-fox-surface select-none">
      {/* Main Scrollable Canvas with Sticky Headers */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-auto relative min-h-[500px]"
      >
        <div className="min-w-[820px] relative">
          {/* 1. Sticky Days Header Row */}
          <div className="sticky top-0 z-30 grid grid-cols-[68px_repeat(7,1fr)] bg-fox-surface/95 backdrop-blur-md border-b border-fox-border shadow-xs">
            {/* Time corner box */}
            <div className="p-2.5 border-r border-fox-border flex flex-col items-center justify-center text-[10px] font-bold text-fox-text-muted uppercase">
              <span>GMT-3</span>
              <span className="text-[9px] opacity-70">24hs</span>
            </div>

            {/* 7 Day header cells */}
            {weekDays.map((dayDate, idx) => {
              const isCurrentDay = isSameDay(dayDate, new Date());
              const dayName = format(dayDate, 'EEEE', { locale: es });
              const isWeekend = idx >= 5;

              return (
                <div 
                  key={dayDate.toISOString()}
                  className={`p-2.5 text-center border-r border-fox-border last:border-r-0 flex flex-col items-center justify-center transition-colors ${
                    isCurrentDay 
                      ? 'bg-fox-orange/10 text-fox-orange' 
                      : isWeekend 
                        ? 'bg-fox-bg/40 text-fox-text-muted' 
                        : 'bg-fox-surface text-fox-text-main'
                  }`}
                >
                  <span className="text-[11px] font-heading font-bold uppercase tracking-wider truncate max-w-full">
                    {dayName}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span 
                      className={`text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center ${
                        isCurrentDay ? 'bg-fox-orange text-white shadow-2xs' : 'text-fox-text-main'
                      }`}
                    >
                      {format(dayDate, 'd')}
                    </span>
                    <span className="text-[10px] text-fox-text-muted">
                      {format(dayDate, 'MMM', { locale: es })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. Hourly Grid Body */}
          <div 
            className="grid grid-cols-[68px_repeat(7,1fr)] relative"
            style={{ height: `${visibleHours.length * 60}px` }}
          >
            {/* Left Hours Timeline Column */}
            <div className="flex flex-col border-r border-fox-border bg-fox-bg/70 select-none z-20">
              {visibleHours.map(hour => {
                const isNight = hour < 7 || hour >= 22;
                return (
                  <div 
                    key={hour}
                    className="h-[60px] border-b border-fox-border/60 pr-2 pt-1 text-right text-[11px] font-bold text-fox-text-muted/90 flex flex-col justify-start items-end"
                  >
                    <span className="flex items-center gap-1 leading-none">
                      {isNight && <Moon size={9} className="opacity-50 text-purple-400" />}
                      {format24hTime(hour)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Horizontal Grid Guidelines */}
            <div className="absolute top-0 left-[68px] right-0 bottom-0 pointer-events-none z-0">
              {visibleHours.map((hour, idx) => (
                <React.Fragment key={hour}>
                  {/* Full hour solid line */}
                  <div 
                    className="absolute w-full border-t border-fox-border/60"
                    style={{ top: `${idx * 60}px` }}
                  />
                  {/* Half hour dashed line */}
                  <div 
                    className="absolute w-full border-t border-dashed border-fox-border/25"
                    style={{ top: `${idx * 60 + 30}px` }}
                  />
                </React.Fragment>
              ))}
            </div>

            {/* 7 Columns for the week */}
            {weekDays.map((dayDate, dayIdx) => {
              const dateStr = format(dayDate, 'yyyy-MM-dd');
              const isCurrentDay = isSameDay(dayDate, new Date());
              const isWeekend = dayIdx >= 5;

              // Compute non-overlapping layout positions for this date
              const positionedEvents = computeEventPositions(
                events.filter(e => e.date === dateStr),
                minHour,
                60
              );

              return (
                <div
                  key={dateStr}
                  className={`relative border-r border-fox-border last:border-r-0 transition-colors ${
                    isCurrentDay ? 'bg-fox-orange/[0.03]' : isWeekend ? 'bg-fox-bg/25' : ''
                  }`}
                  style={{ height: `${visibleHours.length * 60}px` }}
                >
                  {/* Droppable hour slots */}
                  {visibleHours.map((hour, idx) => (
                    <div
                      key={hour}
                      className="absolute w-full h-[60px] cursor-pointer group hover:bg-fox-orange/5 transition-colors"
                      style={{ top: `${idx * 60}px` }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickY = e.clientY - rect.top;
                        const finalHour = clickY >= 30 ? hour + 0.5 : hour;
                        onOpenAddModal(dateStr, finalHour);
                      }}
                    >
                      {/* Droppable slot target for dnd */}
                      <DroppableSlot id={`${dateStr}-slot-${hour}`} />

                      {/* Ghost add button on hover */}
                      <div className="hidden group-hover:flex items-center justify-center gap-1 absolute inset-x-2 top-2 py-1 rounded-lg bg-fox-surface/90 border border-fox-orange/30 text-[10px] font-bold text-fox-orange shadow-xs pointer-events-none z-10">
                        <Plus size={11} /> Agregar a las {format24hTime(hour)}
                      </div>
                    </div>
                  ))}

                  {/* Red Current Time Line on Current Day */}
                  {isCurrentDay && isNowInRange && (
                    <div 
                      className="absolute left-0 right-0 border-t-2 border-red-500 z-25 pointer-events-none shadow-xs"
                      style={{ top: `${(currentHourDecimal - minHour) * 60}px` }}
                    >
                      <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full shadow-md animate-ping opacity-75" />
                      <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full shadow-md" />
                    </div>
                  )}

                  {/* Render positioned event cards */}
                  <AnimatePresence>
                    {positionedEvents.map(pos => (
                      <DraggableEventCard
                        key={pos.event.id}
                        positioned={pos}
                        onOpen={onOpenEditModal}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

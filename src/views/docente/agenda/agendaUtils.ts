import { CalendarEvent } from './AgendaEventModal';

export interface PositionedEvent {
  event: CalendarEvent;
  colIndex: number;
  totalCols: number;
  topPx: number;
  heightPx: number;
  widthPercent: number;
  leftPercent: number;
}

/**
 * Calculates non-colliding side-by-side layout positions for overlapping events
 * on a single date, similar to Google Calendar.
 */
export function computeEventPositions(
  events: CalendarEvent[],
  minHour: number,
  hourHeightPx: number = 60
): PositionedEvent[] {
  // All events with startHour are rendered on the grid timeline
  const timedEvents = events.filter(e => e.startHour !== undefined);

  if (timedEvents.length === 0) return [];

  // Sort by start hour ascending, then longest duration first
  const sorted = [...timedEvents].sort((a, b) => {
    if (a.startHour !== b.startHour) {
      return a.startHour - b.startHour;
    }
    return (b.duration || 1) - (a.duration || 1);
  });

  // Build overlap clusters
  const clusters: CalendarEvent[][] = [];
  let currentCluster: CalendarEvent[] = [];
  let clusterEnd = -1;

  for (const ev of sorted) {
    const evStart = ev.startHour;
    const evEnd = ev.startHour + (ev.duration || 1);

    if (currentCluster.length === 0) {
      currentCluster.push(ev);
      clusterEnd = evEnd;
    } else if (evStart < clusterEnd) {
      // Overlaps with current cluster
      currentCluster.push(ev);
      clusterEnd = Math.max(clusterEnd, evEnd);
    } else {
      // New cluster
      clusters.push(currentCluster);
      currentCluster = [ev];
      clusterEnd = evEnd;
    }
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const result: PositionedEvent[] = [];

  // Assign column slots in each cluster using greedy coloring
  for (const cluster of clusters) {
    const columns: CalendarEvent[][] = [];

    for (const ev of cluster) {
      let placed = false;
      const evStart = ev.startHour;

      for (let col = 0; col < columns.length; col++) {
        const lastInCol = columns[col][columns[col].length - 1];
        const lastEnd = lastInCol.startHour + (lastInCol.duration || 1);

        if (evStart >= lastEnd) {
          columns[col].push(ev);
          placed = true;
          break;
        }
      }

      if (!placed) {
        columns.push([ev]);
      }
    }

    const totalCols = columns.length;

    for (let col = 0; col < columns.length; col++) {
      for (const ev of columns[col]) {
        const topPx = (ev.startHour - minHour) * hourHeightPx;
        const heightPx = Math.max(28, (ev.duration || 1) * hourHeightPx);
        const widthPercent = 100 / totalCols;
        const leftPercent = col * widthPercent;

        result.push({
          event: ev,
          colIndex: col,
          totalCols,
          topPx,
          heightPx,
          widthPercent,
          leftPercent
        });
      }
    }
  }

  return result;
}

/**
 * Calculates summary metrics for a given day's schedule
 */
export function getDayMetrics(events: CalendarEvent[], dateStr: string) {
  const dayEvents = events.filter(e => e.date === dateStr);
  const classes = dayEvents.filter(e => e.type === 'Clase' || (!e.type && !e.isTask));
  const exams = dayEvents.filter(e => e.type === 'Examen');
  const tasks = dayEvents.filter(e => e.isTask || e.type === 'Tarea');
  const meetings = dayEvents.filter(e => e.type === 'Reunión' || e.type === 'Tutoría');
  
  const totalTeachingHours = classes.reduce((sum, e) => sum + (e.duration || 1), 0);
  const totalEventsCount = dayEvents.length;

  return {
    totalEventsCount,
    classesCount: classes.length,
    examsCount: exams.length,
    tasksCount: tasks.length,
    meetingsCount: meetings.length,
    totalTeachingHours: Number(totalTeachingHours.toFixed(1)),
    dayEvents
  };
}

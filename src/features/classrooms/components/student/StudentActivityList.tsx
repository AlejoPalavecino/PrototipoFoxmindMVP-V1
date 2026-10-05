import { FileText, LayoutList, Clock, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import type { StudentActivity } from '../../model/Activity';

interface StudentActivityListProps {
  activities: StudentActivity[];
  onSelect: (activity: StudentActivity) => void;
}

export function StudentActivityList({ activities, onSelect }: StudentActivityListProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-heading font-extrabold text-fox-text-main text-lg">
          Actividades del Curso
        </h3>
        <span className="text-xs font-bold text-fox-text-muted">
          {activities.filter(a => a.status === 'Pendiente').length} pendientes de entrega
        </span>
      </div>

      <div className="space-y-3.5">
        {activities.map(act => (
          <div
            key={act.id}
            onClick={() => onSelect(act)}
            className="p-5 border border-fox-border rounded-2xl hover:border-fox-primary/40 hover:shadow-md transition-all bg-fox-surface group cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl shrink-0 ${
                act.status === 'Completada'
                  ? 'bg-fox-green/10 text-fox-green border border-fox-green/20'
                  : act.status === 'Entregada'
                  ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                  : 'bg-fox-orange/10 text-fox-orange border border-fox-orange/20'
              }`}>
                <FileText size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="font-heading font-bold text-fox-text-main text-base group-hover:text-fox-primary transition-colors">
                    {act.title}
                  </h4>
                  <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full ${
                    act.status === 'Completada'
                      ? 'bg-fox-green/10 text-fox-green border border-fox-green/20'
                      : act.status === 'Entregada'
                      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      : 'bg-fox-orange/10 text-fox-orange border border-fox-orange/20'
                  }`}>
                    {act.status}
                  </span>
                </div>
                <p className="text-xs text-fox-text-muted font-medium line-clamp-1 mb-2">
                  {act.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-fox-text-muted font-medium">
                  <span className="flex items-center gap-1.5"><LayoutList size={13}/> {act.type}</span>
                  <span className="flex items-center gap-1.5"><Clock size={13}/> Vence: {act.due}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-5 md:border-l md:border-fox-border md:pl-6 shrink-0 justify-between md:justify-end">
              {act.status === 'Completada' ? (
                <div className="text-left md:text-right">
                  <p className="text-[10px] font-extrabold text-fox-text-muted uppercase tracking-wider">Calificación</p>
                  <p className="font-heading font-black text-fox-green text-lg">{act.grade} / 10</p>
                </div>
              ) : act.status === 'Entregada' ? (
                <div className="text-left md:text-right">
                  <p className="text-[10px] font-extrabold text-fox-text-muted uppercase tracking-wider">Estado</p>
                  <p className="font-heading font-bold text-amber-600 text-sm">En revisión</p>
                </div>
              ) : (
                <div className="text-left md:text-right">
                  <p className="text-[10px] font-extrabold text-fox-text-muted uppercase tracking-wider">Estado</p>
                  <p className="font-heading font-bold text-fox-orange text-sm">Por entregar</p>
                </div>
              )}

              <button className="bg-fox-bg hover:bg-fox-primary/10 hover:text-fox-primary text-fox-text-main px-4 py-2 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 border border-fox-border group-hover:border-fox-primary/30 cursor-pointer">
                <span>{act.status === 'Completada' ? 'Ver devolución' : act.status === 'Entregada' ? 'Ver entrega' : 'Realizar entrega'}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

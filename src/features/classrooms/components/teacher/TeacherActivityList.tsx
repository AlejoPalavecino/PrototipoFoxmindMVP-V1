import { Plus, FileText, Sparkles, LayoutList, Clock, ChevronRight } from 'lucide-react';
import type { Activity } from '../../model/Activity';

interface TeacherActivityListProps {
  activities: Activity[];
  onSelect: (activity: Activity) => void;
  onCreate: () => void;
}

export function TeacherActivityList({ activities, onSelect, onCreate }: TeacherActivityListProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2">
        <div>
          <h3 className="font-heading font-bold text-fox-text-main text-lg">Actividades y Evaluaciones</h3>
          <p className="text-xs text-fox-text-muted">Gestiona las consignas asignadas, rúbricas y adaptaciones DUA.</p>
        </div>
        <button
          onClick={onCreate}
          className="bg-fox-primary hover:bg-fox-primary/90 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2"
        >
          <Plus size={16} />
          <span>Nueva Actividad</span>
        </button>
      </div>

      {activities.map(act => (
        <div key={act.id} onClick={() => onSelect(act)} className="p-5 border border-fox-border rounded-2xl hover:border-fox-primary/30 hover:shadow-md transition-all bg-fox-surface group cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${act.status === 'Activa' ? 'bg-fox-primary/10 text-fox-primary' : 'bg-fox-border/50 text-fox-text-muted'}`}>
              <FileText size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4 className="font-bold text-fox-text-main text-lg group-hover:text-fox-primary transition-colors">{act.title}</h4>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${act.status === 'Activa' ? 'bg-fox-green/10 text-fox-green' : 'bg-fox-border/50 text-fox-text-muted'}`}>
                  {act.status}
                </span>
                {act.duaAdaptations && act.duaAdaptations.length > 0 && (
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-fox-orange/10 text-fox-orange border border-fox-orange/20 flex items-center gap-1">
                    <Sparkles size={10} /> DUA ({act.duaAdaptations.length})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-fox-text-muted font-medium">
                <span className="flex items-center gap-1"><LayoutList size={14}/> {act.type}</span>
                <span className="flex items-center gap-1"><Clock size={14}/> Vence: {act.due}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 md:border-l md:border-fox-border md:pl-6">
            <div className="text-center">
              <p className="text-xs font-bold text-fox-text-muted/70 uppercase tracking-wider mb-1">Entregas</p>
              <p className="font-bold text-fox-text-main text-lg">{act.submissions}</p>
            </div>
            <button className="bg-fox-bg hover:bg-fox-border/50 text-fox-text-main/80 px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2">
              Ver detalle <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

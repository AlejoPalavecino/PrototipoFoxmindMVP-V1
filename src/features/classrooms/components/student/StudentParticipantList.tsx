import React from 'react';
import { Search, LayoutGrid, List, Clock } from 'lucide-react';
import type { StudentParticipant, ParticipantViewMode } from '../../model/ClassroomParticipant';

interface StudentParticipantListProps {
  students: StudentParticipant[];
  studentSearchTerm: string;
  alumnosViewMode: ParticipantViewMode;
  onSearchChange: (value: string) => void;
  onViewModeChange: (mode: ParticipantViewMode) => void;
}

export function StudentParticipantList({ students, studentSearchTerm, alumnosViewMode, onSearchChange, onViewModeChange }: StudentParticipantListProps) {
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fox-text-muted/70" />
          <input
            type="text"
            value={studentSearchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar compañero por nombre..."
            className="w-full bg-fox-bg border border-fox-border rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-fox-bg p-1 rounded-xl border border-fox-border">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${alumnosViewMode === 'grid' ? 'bg-fox-surface shadow-2xs text-fox-primary' : 'text-fox-text-muted hover:text-fox-text-main'}`}
            >
              <LayoutGrid size={17} />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${alumnosViewMode === 'list' ? 'bg-fox-surface shadow-2xs text-fox-primary' : 'text-fox-text-muted hover:text-fox-text-main'}`}
            >
              <List size={17} />
            </button>
          </div>
        </div>
      </div>

      {alumnosViewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students
            .map(student => (
            <div
              key={student.id}
              className="bg-fox-surface border border-fox-border rounded-2xl p-4 hover:shadow-md hover:border-fox-primary/30 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fox-primary/10 to-fox-purple/10 text-fox-primary font-bold text-xs flex items-center justify-center border border-fox-primary/20">
                  {student.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <p className="font-heading font-bold text-fox-text-main text-xs sm:text-sm">{student.name}</p>
                  <p className="text-[11px] text-fox-text-muted flex items-center gap-1 mt-0.5">
                    <Clock size={11} /> {student.lastSeen}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-fox-border rounded-2xl overflow-hidden shadow-2xs bg-fox-surface">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-fox-bg border-b border-fox-border text-[11px] uppercase tracking-wider text-fox-text-muted font-extrabold">
                <th className="p-3.5 pl-5">Compañero</th>
                <th className="p-3.5 pr-5 text-right">Última Actividad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fox-border/50">
              {students
                .map(student => (
                <tr key={student.id} className="hover:bg-fox-bg/50 transition-colors">
                  <td className="p-3.5 pl-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-fox-primary/10 text-fox-primary font-bold text-xs flex items-center justify-center">
                        {student.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <span className="font-bold text-fox-text-main text-xs">{student.name}</span>
                    </div>
                  </td>
                  <td className="p-3.5 pr-5 text-right text-xs text-fox-text-muted font-medium">{student.lastSeen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

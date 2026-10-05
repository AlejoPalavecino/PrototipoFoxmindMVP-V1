import React from 'react';
import { Search, LayoutGrid, List, FileText, Plus, Clock, Eye } from 'lucide-react';
import type { TeacherParticipant, ParticipantViewMode } from '../../model/ClassroomParticipant';

interface TeacherParticipantListProps {
  students: TeacherParticipant[];
  studentSearchTerm: string;
  alumnosViewMode: ParticipantViewMode;
  onSearchChange: (value: string) => void;
  onViewModeChange: (mode: ParticipantViewMode) => void;
  onSelect: (student: TeacherParticipant) => void;
  onGenerateReports: () => void;
  onInvite: () => void;
}

export function TeacherParticipantList({ students, studentSearchTerm, alumnosViewMode, onSearchChange, onViewModeChange, onSelect, onGenerateReports, onInvite }: TeacherParticipantListProps) {
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-fox-text-muted/70" />
          <input
            type="text"
            value={studentSearchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar alumno por nombre..."
            className="w-full bg-fox-bg border border-fox-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-fox-bg p-1 rounded-xl border border-fox-border">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-lg transition-colors ${alumnosViewMode === 'grid' ? 'bg-fox-surface shadow-sm text-fox-primary' : 'text-fox-text-muted hover:text-fox-text-main'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-lg transition-colors ${alumnosViewMode === 'list' ? 'bg-fox-surface shadow-sm text-fox-primary' : 'text-fox-text-muted hover:text-fox-text-main'}`}
            >
              <List size={18} />
            </button>
          </div>
          <button
            onClick={onGenerateReports}
            className="flex-1 sm:flex-none justify-center bg-fox-purple text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-fox-purple/90 transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
          >
            <FileText size={18} /> Reportes
          </button>
          <button
            onClick={onInvite}
            className="flex-1 sm:flex-none justify-center bg-fox-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-fox-primary/90 transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={18} /> Invitar
          </button>
        </div>
      </div>

      {alumnosViewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {students
            .map(student => (
            <div
              key={student.id}
              className="bg-fox-surface border border-fox-border rounded-3xl p-5 hover:shadow-lg hover:border-fox-primary/30 transition-all duration-300 cursor-pointer group flex flex-col hover:-translate-y-1 relative overflow-hidden"
              onClick={() => onSelect(student)}
            >
              {/* Decorative gradient background */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-fox-primary/5 rounded-full blur-2xl transform translate-x-8 -translate-y-8 group-hover:bg-fox-primary/10 transition-colors pointer-events-none"></div>

              <div className="flex justify-between items-start mb-5 relative z-10">
                <div className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fox-primary/10 to-fox-purple/10 flex items-center justify-center font-extrabold text-fox-primary shadow-sm border border-fox-primary/10">
                    {student.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-bold text-fox-text-main group-hover:text-fox-primary transition-colors line-clamp-1">{student.name}</h4>
                    <p className="text-xs text-fox-text-muted font-medium flex items-center gap-1 mt-0.5"><Clock size={12} className="opacity-70"/> {student.lastSeen}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-extrabold shadow-sm ${
                  student.risk === 'ALTO' ? 'bg-red-50 text-red-600 ring-1 ring-red-500/30' :
                  student.risk === 'MEDIO' ? 'bg-yellow-50 text-yellow-600 ring-1 ring-yellow-500/30' :
                  'bg-green-50 text-green-600 ring-1 ring-green-500/30'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    student.risk === 'ALTO' ? 'bg-red-500 animate-pulse' :
                    student.risk === 'MEDIO' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  {student.risk}
                </span>
              </div>

              <div className="bg-fox-bg rounded-2xl p-3 border border-fox-border/60 mt-auto relative z-10 group-hover:bg-white transition-colors">
                <p className="text-[9px] font-extrabold text-fox-text-muted uppercase tracking-widest mb-2">Perfil de Aprendizaje (DUA)</p>
                {student.dua.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {student.dua.map(d => (
                      <span key={d} className="bg-fox-green/10 text-fox-green border border-fox-green/20 hover:border-fox-green/40 hover:bg-fox-green/20 transition-colors text-[10px] font-bold px-2 py-1 rounded-lg">{d}</span>
                    ))}
                  </div>
                ) : <span className="text-fox-text-muted/50 text-xs italic font-medium">Sin perfil específico</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-fox-border rounded-2xl overflow-hidden shadow-sm bg-fox-surface">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-fox-bg border-b border-fox-border text-xs uppercase tracking-wider text-fox-text-muted font-bold">
                <th className="p-4 pl-6">Alumno</th>
                <th className="p-4">Riesgo</th>
                <th className="p-4">Perfil DUA</th>
                <th className="p-4">Última Actividad</th>
                <th className="p-4 text-right pr-6">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-fox-border/50">
              {students
                .map(student => (
                <tr key={student.id} className="hover:bg-fox-bg/50 transition-colors cursor-pointer" onClick={() => onSelect(student)}>
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fox-primary/5 to-fox-purple/5 border border-fox-primary/10 flex items-center justify-center font-bold text-fox-primary shadow-sm">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="font-bold text-fox-text-main">{student.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] tracking-wider uppercase font-extrabold ${
                      student.risk === 'ALTO' ? 'bg-red-50 text-red-600 ring-1 ring-red-500/30' :
                      student.risk === 'MEDIO' ? 'bg-yellow-50 text-yellow-600 ring-1 ring-yellow-500/30' :
                      'bg-green-50 text-green-600 ring-1 ring-green-500/30'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        student.risk === 'ALTO' ? 'bg-red-500 animate-pulse' :
                        student.risk === 'MEDIO' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                      {student.risk}
                    </span>
                  </td>
                  <td className="p-4">
                    {student.dua.length > 0 ? (
                      <div className="flex gap-1.5 flex-wrap">
                        {student.dua.map(d => (
                          <span key={d} className="bg-fox-green/10 text-fox-green border border-fox-green/20 text-[10px] font-bold px-2 py-1 rounded-md">{d}</span>
                        ))}
                      </div>
                    ) : <span className="text-fox-text-muted/70 text-sm">-</span>}
                  </td>
                  <td className="p-4 text-xs font-medium text-fox-text-muted">{student.lastSeen}</td>
                  <td className="p-4 text-right pr-6">
                    <button
                      onClick={(e) => { e.stopPropagation(); onSelect(student); }}
                      className="p-2 text-fox-text-muted/70 hover:text-fox-primary hover:bg-fox-primary/10 rounded-lg transition-colors inline-flex"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

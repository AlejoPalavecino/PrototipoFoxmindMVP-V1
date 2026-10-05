import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Search, Filter, Clock, Award, Brain, CheckCircle, FileText, Calendar } from 'lucide-react';
import { ActivityHistoryItem } from './progresoTypes';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ActivityHistoryItem[];
}

export function HistoryModal({ isOpen, onClose, history }: HistoryModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  if (!isOpen) return null;

  const filteredHistory = history.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || item.type === selectedType;
    const matchesSubject = selectedSubject === 'all' || item.subject === selectedSubject;
    return matchesSearch && matchesType && matchesSubject;
  });

  const getTypeIcon = (type: ActivityHistoryItem['type']) => {
    switch (type) {
      case 'quiz':
        return <Brain size={16} className="text-fox-orange" />;
      case 'active_recall':
        return <Award size={16} className="text-fox-purple" />;
      case 'tarea_entregada':
        return <FileText size={16} className="text-fox-blue" />;
      case 'repaso_foxy':
        return <CheckCircle size={16} className="text-fox-green" />;
      default:
        return <Clock size={16} className="text-fox-text-muted" />;
    }
  };

  const getTypeName = (type: ActivityHistoryItem['type']) => {
    switch (type) {
      case 'quiz':
        return 'Quiz Rápido';
      case 'active_recall':
        return 'Active Recall';
      case 'tarea_entregada':
        return 'Tarea Entregada';
      case 'repaso_foxy':
        return 'Tutoría Foxy';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-fox-surface border border-fox-border rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-fox-border bg-fox-bg/50 flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-fox-text-main text-lg flex items-center gap-2">
              <Calendar size={20} className="text-fox-primary" /> Historial Completo de Progreso
            </h3>
            <p className="text-xs text-fox-text-muted mt-0.5">
              Registro auditado de repasos, evaluaciones y experiencia acumulada
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-fox-border text-fox-text-muted hover:text-fox-text-main transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filters Bar */}
        <div className="p-4 border-b border-fox-border bg-fox-surface flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fox-text-muted" />
            <input
              type="text"
              placeholder="Buscar por tema o materia..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-fox-bg border border-fox-border rounded-xl focus:outline-none focus:border-fox-primary text-fox-text-main placeholder:text-fox-text-muted"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="text-xs font-bold bg-fox-bg border border-fox-border rounded-xl px-3 py-2 text-fox-text-main focus:outline-none focus:border-fox-primary"
            >
              <option value="all">Todas las materias</option>
              <option value="Literatura">Literatura</option>
              <option value="Matemáticas">Matemáticas</option>
              <option value="Historia">Historia</option>
              <option value="Ciencias">Ciencias</option>
            </select>

            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="text-xs font-bold bg-fox-bg border border-fox-border rounded-xl px-3 py-2 text-fox-text-main focus:outline-none focus:border-fox-primary"
            >
              <option value="all">Todos los tipos</option>
              <option value="quiz">Quizzes</option>
              <option value="active_recall">Active Recall</option>
              <option value="tarea_entregada">Tareas</option>
              <option value="repaso_foxy">Tutorías Foxy</option>
            </select>
          </div>
        </div>

        {/* List Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {filteredHistory.length > 0 ? (
            filteredHistory.map(item => (
              <div
                key={item.id}
                className="p-4 bg-fox-bg/60 border border-fox-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-fox-primary/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-fox-surface border border-fox-border mt-0.5 shrink-0">
                    {getTypeIcon(item.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-fox-text-main">{item.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-fox-surface border border-fox-border text-fox-text-muted">
                        {item.subject}
                      </span>
                      <span className="text-[10px] font-semibold text-fox-text-muted">
                        {getTypeName(item.type)}
                      </span>
                    </div>
                    {item.feedback && (
                      <p className="text-xs text-fox-text-muted mt-1 leading-relaxed">
                        {item.feedback}
                      </p>
                    )}
                    <div className="text-[11px] text-fox-text-muted mt-2 flex items-center gap-3">
                      <span>{item.date} a las {item.time}</span>
                      <span>•</span>
                      <span>Duración: {item.duration}</span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-fox-border/50 shrink-0">
                  {item.score && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-fox-surface border border-fox-border text-fox-primary">
                      {item.score}
                    </span>
                  )}
                  <span className="text-xs font-bold text-fox-gold mt-1 flex items-center gap-1">
                    <Award size={13} /> +{item.xpEarned} XP
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-fox-text-muted text-sm">
              No se encontraron actividades con los filtros seleccionados.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-fox-border bg-fox-bg/50 flex items-center justify-between">
          <span className="text-xs text-fox-text-muted font-medium">
            Mostrando {filteredHistory.length} de {history.length} actividades
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-fox-surface border border-fox-border text-fox-text-main hover:bg-fox-bg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

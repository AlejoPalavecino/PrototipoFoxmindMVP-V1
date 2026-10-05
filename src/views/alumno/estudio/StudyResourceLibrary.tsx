import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FolderOpen, 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  FileText, 
  Brain, 
  Layers, 
  Network, 
  BookOpen, 
  Sparkles, 
  Download, 
  Eye, 
  Plus, 
  CheckCircle2, 
  X,
  Play,
  RotateCcw
} from 'lucide-react';
import { toast } from '../../../components/ui/Toaster';
import { StudyGeneratedResource, StudyToolType } from './estudioTypes';

interface StudyResourceLibraryProps {
  resources: StudyGeneratedResource[];
  folderId?: string;
  folderName?: string;
  onOpenResource: (resource: StudyGeneratedResource) => void;
  onRequestCreateTool: (type?: StudyToolType) => void;
}

export const StudyResourceLibrary: React.FC<StudyResourceLibraryProps> = ({
  resources,
  folderId,
  folderName,
  onOpenResource,
  onRequestCreateTool
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categories = [
    { id: 'all', label: 'Todos los recursos', icon: FolderOpen },
    { id: 'flashcards', label: 'Flashcards', icon: Layers, color: 'text-fox-purple' },
    { id: 'quiz', label: 'Quizzes & Pruebas', icon: Brain, color: 'text-fox-orange' },
    { id: 'resumen', label: 'Resúmenes & Síntesis', icon: FileText, color: 'text-emerald-600' },
    { id: 'mapa', label: 'Mapas Conceptuales', icon: Network, color: 'text-blue-600' },
  ];

  const filtered = resources.filter(res => {
    const matchesFolder = !folderId || res.folderId === folderId;
    const matchesType = selectedType === 'all' || res.type === selectedType;
    const matchesSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          res.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          res.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFolder && matchesType && matchesSearch;
  });

  const getIconForType = (type: string) => {
    switch (type) {
      case 'flashcards': return <Layers className="text-fox-purple" size={20} />;
      case 'quiz': return <Brain className="text-fox-orange" size={20} />;
      case 'resumen': return <FileText className="text-emerald-600" size={20} />;
      case 'mapa': return <Network className="text-blue-600" size={20} />;
      default: return <BookOpen className="text-fox-primary" size={20} />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header Banner */}
      <div className="bg-fox-surface border border-fox-border rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-fox-purple/10 text-fox-purple border border-fox-purple/20 flex items-center justify-center font-bold">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="font-heading font-extrabold text-fox-text-main text-lg sm:text-xl">
              Biblioteca de Recursos de Estudio
            </h2>
            <p className="text-xs text-fox-text-muted mt-0.5">
              {folderName ? `Materiales generados por Foxy para ${folderName}` : 'Colección de flashcards, quizzes, mapas y resúmenes con IA'}
            </p>
          </div>
        </div>

        <button
          onClick={() => onRequestCreateTool()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-fox-purple text-white hover:bg-fox-purple/90 font-bold text-xs shadow-sm hover:shadow-md transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Generar Nueva Herramienta</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fox-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por tema, concepto o título..."
            className="w-full bg-fox-surface border border-fox-border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-fox-text-main placeholder:text-fox-text-muted/60 focus:ring-2 focus:ring-fox-purple/20 focus:border-fox-purple outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fox-text-muted hover:text-fox-text-main p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-fox-surface border border-fox-border rounded-2xl p-1 shrink-0 self-end md:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-xl text-xs transition-colors ${
              viewMode === 'grid' ? 'bg-fox-bg text-fox-purple font-bold shadow-2xs' : 'text-fox-text-muted hover:text-fox-text-main'
            }`}
            title="Vista Cuadrícula"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-xl text-xs transition-colors ${
              viewMode === 'list' ? 'bg-fox-bg text-fox-purple font-bold shadow-2xs' : 'text-fox-text-muted hover:text-fox-text-main'
            }`}
            title="Vista Lista"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 text-xs">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedType === cat.id;
          const count = cat.id === 'all' 
            ? resources.length 
            : resources.filter(r => r.type === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedType(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-fox-purple text-white shadow-xs'
                  : 'bg-fox-surface border border-fox-border text-fox-text-muted hover:text-fox-text-main hover:border-fox-border/80'
              }`}
            >
              <Icon size={14} className={isSelected ? 'text-white' : cat.color} />
              <span>{cat.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                isSelected ? 'bg-white/20 text-white' : 'bg-fox-bg text-fox-text-muted'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Resources Render */}
      {filtered.length === 0 ? (
        <div className="bg-fox-surface border border-dashed border-fox-border rounded-3xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-fox-bg border border-fox-border flex items-center justify-center text-fox-text-muted mx-auto">
            <Sparkles size={24} />
          </div>
          <div>
            <h4 className="font-heading font-bold text-fox-text-main text-base">
              No hay recursos generados con estos filtros
            </h4>
            <p className="text-xs text-fox-text-muted mt-1 max-w-sm mx-auto">
              Pedile a Foxy en el chat crear un quiz, flashcards o mapa conceptual para tus temas de estudio.
            </p>
          </div>
          <button
            onClick={() => onRequestCreateTool()}
            className="px-5 py-2.5 bg-fox-purple text-white font-bold text-xs rounded-2xl shadow-xs hover:bg-fox-purple/90 transition-all cursor-pointer"
          >
            Generar herramienta con Foxy
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((res) => (
            <motion.div
              key={res.id}
              whileHover={{ y: -3 }}
              className="bg-fox-surface border border-fox-border/80 rounded-3xl p-5 shadow-xs hover:shadow-md hover:border-fox-purple/40 transition-all flex flex-col justify-between group cursor-pointer"
              onClick={() => onOpenResource(res)}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-fox-bg border border-fox-border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {getIconForType(res.type)}
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-fox-bg text-fox-text-muted border border-fox-border">
                    {res.fileFormat || res.type}
                  </span>
                </div>

                <div>
                  <h4 className="font-heading font-bold text-fox-text-main text-sm line-clamp-2 group-hover:text-fox-purple transition-colors">
                    {res.title}
                  </h4>
                  <p className="text-xs text-fox-text-muted mt-1 line-clamp-2 leading-relaxed">
                    {res.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-fox-border/60 flex items-center justify-between">
                <div className="text-[11px] font-medium text-fox-text-muted">
                  <span>{res.fileSize || res.topic}</span>
                  <span className="mx-1.5">•</span>
                  <span>{res.createdAt}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-fox-purple group-hover:translate-x-1 transition-transform">
                  <span>Practicar</span>
                  <Play size={12} className="fill-fox-purple" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* List Mode */
        <div className="space-y-3">
          {filtered.map((res) => (
            <div
              key={res.id}
              onClick={() => onOpenResource(res)}
              className="bg-fox-surface border border-fox-border rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-fox-purple/40 transition-all flex items-center justify-between gap-4 cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-fox-bg border border-fox-border flex items-center justify-center shrink-0">
                  {getIconForType(res.type)}
                </div>
                <div className="min-w-0">
                  <h4 className="font-heading font-bold text-fox-text-main text-sm truncate group-hover:text-fox-purple transition-colors">
                    {res.title}
                  </h4>
                  <p className="text-xs text-fox-text-muted truncate mt-0.5">
                    {res.topic} • {res.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <span className="text-[11px] text-fox-text-muted hidden sm:inline-block">
                  {res.createdAt}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenResource(res);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-fox-purple/10 text-fox-purple hover:bg-fox-purple hover:text-white font-bold text-xs transition-colors"
                >
                  <Play size={12} className="fill-current" />
                  <span>Abrir</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

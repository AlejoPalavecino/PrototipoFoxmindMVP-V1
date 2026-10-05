import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FolderOpen, 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  FileText, 
  Presentation, 
  Network, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  CheckCircle2, 
  Download, 
  Eye, 
  Send, 
  Plus, 
  Sparkles,
  BookOpen,
  Calendar,
  X
} from 'lucide-react';
import { toast } from '../../../components/ui/Toaster';
import { CopilotoResource, ResourceCategory } from './copilotoTypes';
import { CopilotoConceptMapModal } from './CopilotoConceptMapModal';
import { CopilotoPresentationModal } from './CopilotoPresentationModal';
import { CopilotoActivityAssignModal } from './CopilotoActivityAssignModal';

interface CopilotoResourceLibraryProps {
  resources: CopilotoResource[];
  onOpenResourceInEditor?: (resource: CopilotoResource) => void;
  onAssignResourceToAula?: (resource: CopilotoResource) => void;
}

export const CopilotoResourceLibrary: React.FC<CopilotoResourceLibraryProps> = ({
  resources,
  onOpenResourceInEditor,
  onAssignResourceToAula,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAula, setSelectedAula] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals for preview
  const [previewConceptMap, setPreviewConceptMap] = useState<CopilotoResource | null>(null);
  const [previewPresentation, setPreviewPresentation] = useState<CopilotoResource | null>(null);
  const [previewImage, setPreviewImage] = useState<CopilotoResource | null>(null);
  const [previewDocument, setPreviewDocument] = useState<CopilotoResource | null>(null);
  const [assigningResource, setAssigningResource] = useState<CopilotoResource | null>(null);

  const categories = [
    { id: 'all', label: 'Todos', icon: FolderOpen },
    { id: 'document', label: 'Documentos & Informes', icon: FileText },
    { id: 'presentation', label: 'Presentaciones', icon: Presentation },
    { id: 'concept_map', label: 'Mapas Conceptuales', icon: Network },
    { id: 'image', label: 'Imágenes & Diagramas', icon: ImageIcon },
    { id: 'rubric', label: 'Rúbricas & Criterios', icon: FileSpreadsheet },
    { id: 'quiz', label: 'Quizzes', icon: CheckCircle2 },
  ];

  const aulasList = Array.from(new Set(resources.map(r => r.aulaName))).filter(Boolean);

  const filtered = resources.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          res.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          res.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedType === 'all' || res.type === selectedType;
    const matchesAula = selectedAula === 'all' || res.aulaName === selectedAula;
    return matchesSearch && matchesType && matchesAula;
  });

  const handlePreviewResource = (res: CopilotoResource) => {
    if (res.type === 'concept_map') {
      setPreviewConceptMap(res);
    } else if (res.type === 'presentation') {
      setPreviewPresentation(res);
    } else if (res.type === 'image') {
      setPreviewImage(res);
    } else {
      setPreviewDocument(res);
    }
  };

  const handleDownload = (res: CopilotoResource) => {
    toast.show(`Descargando archivo: "${res.title}.${res.fileFormat.toLowerCase()}" (${res.fileSize})`, 'success');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Top Banner & Stats */}
      <div className="bg-fox-surface border border-fox-border rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-fox-primary/10 text-fox-primary flex items-center justify-center font-bold">
              <FolderOpen size={20} />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-fox-text-main text-lg sm:text-xl">
                Repositorio de Recursos Pedagógicos Generados
              </h2>
              <p className="text-xs sm:text-sm text-fox-text-muted mt-0.5">
                Accede, edita, proyecta y asigna las presentaciones, mapas conceptuales, rúbricas e informes creados con Foxy IA.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-fox-primary bg-fox-primary/10 px-3 py-1.5 rounded-xl">
            {resources.length} recursos creados
          </span>
          <div className="flex bg-fox-bg p-1 rounded-xl border border-fox-border">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-fox-surface text-fox-primary shadow-2xs font-bold' : 'text-fox-text-muted'
              }`}
              title="Cuadrícula"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-fox-surface text-fox-primary shadow-2xs font-bold' : 'text-fox-text-muted'
              }`}
              title="Lista"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fox-text-muted/70" />
          <input
            type="text"
            placeholder="Buscar por título, materia o etiqueta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-fox-surface border border-fox-border rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-fox-text-main focus:border-fox-primary outline-none transition-all shadow-2xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fox-text-muted hover:text-fox-text-main"
            >
              ✕
            </button>
          )}
        </div>

        {/* Aula Filter Select */}
        <div className="flex items-center gap-2">
          <select
            value={selectedAula}
            onChange={(e) => setSelectedAula(e.target.value)}
            className="bg-fox-surface border border-fox-border rounded-xl px-3 py-2 text-xs text-fox-text-main outline-none focus:border-fox-primary font-medium"
          >
            <option value="all">Todas las Aulas</option>
            {aulasList.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Pills Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedType === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedType(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-fox-primary text-white shadow-xs'
                  : 'bg-fox-surface border border-fox-border text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg'
              }`}
            >
              <Icon size={14} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Resources Content Rendering */}
      {filtered.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filtered.map((res) => {
              const typeColors = {
                document: { bg: 'bg-blue-100', text: 'text-blue-700', icon: FileText },
                presentation: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Presentation },
                concept_map: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Network },
                image: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: ImageIcon },
                rubric: { bg: 'bg-rose-100', text: 'text-rose-700', icon: FileSpreadsheet },
                quiz: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: CheckCircle2 },
              }[res.type] || { bg: 'bg-fox-bg', text: 'text-fox-primary', icon: FileText };

              const Icon = typeColors.icon;

              return (
                <motion.div
                  key={res.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-fox-surface border border-fox-border rounded-3xl p-5 hover:shadow-md hover:border-fox-primary/40 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className={`p-3 rounded-2xl ${typeColors.bg} ${typeColors.text} shadow-2xs group-hover:scale-105 transition-transform`}>
                        <Icon size={22} />
                      </div>

                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-fox-bg border border-fox-border text-fox-text-muted">
                        {res.fileFormat} • {res.fileSize}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-heading font-bold text-sm sm:text-base text-fox-text-main group-hover:text-fox-primary transition-colors line-clamp-2">
                        {res.title}
                      </h4>
                      <p className="text-xs text-fox-text-muted line-clamp-2 mt-1 leading-relaxed">
                        {res.description}
                      </p>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {res.tags.map((t, tidx) => (
                        <span key={tidx} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-fox-bg border border-fox-border text-fox-text-muted">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-fox-border/60 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-fox-text-muted">
                      <BookOpen size={12} className="text-fox-primary" />
                      <span className="truncate max-w-[110px]">{res.aulaName}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handlePreviewResource(res)}
                        className="px-2.5 py-1.5 rounded-xl border border-fox-border hover:border-fox-primary/40 text-fox-text-muted hover:text-fox-primary hover:bg-fox-bg transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Ver / Proyectar"
                      >
                        <Eye size={13} />
                        <span>Ver</span>
                      </button>

                      <button
                        onClick={() => setAssigningResource(res)}
                        className="px-2.5 py-1.5 rounded-xl bg-fox-primary text-white hover:bg-fox-primary/90 transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Asignar como actividad al aula"
                      >
                        <Send size={12} />
                        <span className="hidden sm:inline">Asignar</span>
                      </button>

                      <button
                        onClick={() => handleDownload(res)}
                        className="p-1.5 rounded-xl text-fox-text-muted hover:text-fox-primary hover:bg-fox-bg transition-colors"
                        title="Descargar archivo"
                      >
                        <Download size={15} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-fox-surface border border-fox-border rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-fox-bg/80 border-b border-fox-border text-[11px] uppercase tracking-wider text-fox-text-muted font-bold">
                  <th className="p-3.5 pl-6">Recurso Pedagógico</th>
                  <th className="p-3.5 hidden sm:table-cell">Aula Destino</th>
                  <th className="p-3.5 hidden md:table-cell">Tipo / Formato</th>
                  <th className="p-3.5 hidden md:table-cell">Fecha</th>
                  <th className="p-3.5 pr-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fox-border/60 text-xs">
                {filtered.map((res) => (
                  <tr key={res.id} className="hover:bg-fox-bg/50 transition-colors">
                    <td className="p-3.5 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-fox-primary/10 text-fox-primary shrink-0">
                          {res.type === 'presentation' ? <Presentation size={16} /> :
                           res.type === 'concept_map' ? <Network size={16} /> :
                           res.type === 'image' ? <ImageIcon size={16} /> :
                           <FileText size={16} />}
                        </div>
                        <div>
                          <p className="font-bold text-fox-text-main hover:text-fox-primary transition-colors cursor-pointer" onClick={() => handlePreviewResource(res)}>
                            {res.title}
                          </p>
                          <span className="sm:hidden text-[10px] text-fox-text-muted">{res.aulaName} • {res.fileFormat}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 hidden sm:table-cell text-fox-text-muted font-medium">
                      {res.aulaName}
                    </td>
                    <td className="p-3.5 hidden md:table-cell text-fox-text-muted">
                      <span className="font-bold">{res.fileFormat}</span> ({res.fileSize})
                    </td>
                    <td className="p-3.5 hidden md:table-cell text-fox-text-muted">
                      {res.createdAt}
                    </td>
                    <td className="p-3.5 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handlePreviewResource(res)}
                          className="px-2.5 py-1.5 rounded-lg border border-fox-border text-fox-text-muted hover:text-fox-primary transition-colors font-bold text-xs flex items-center gap-1"
                        >
                          <Eye size={13} />
                          <span>Ver</span>
                        </button>
                        <button
                          onClick={() => setAssigningResource(res)}
                          className="px-2.5 py-1.5 rounded-lg bg-fox-primary text-white hover:bg-fox-primary/90 transition-colors font-bold text-xs flex items-center gap-1"
                        >
                          <Send size={12} />
                          <span>Asignar</span>
                        </button>
                        <button
                          onClick={() => handleDownload(res)}
                          className="p-1.5 rounded-lg text-fox-text-muted hover:text-fox-primary transition-colors"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="text-center py-16 bg-fox-surface border-2 border-dashed border-fox-border rounded-3xl p-6">
          <div className="w-14 h-14 bg-fox-bg rounded-2xl flex items-center justify-center mx-auto mb-3 text-fox-text-muted">
            <FolderOpen size={28} />
          </div>
          <h4 className="font-heading font-bold text-fox-text-main text-base mb-1">
            No se encontraron recursos
          </h4>
          <p className="text-xs sm:text-sm text-fox-text-muted max-w-sm mx-auto">
            Prueba ajustando el término de búsqueda o seleccionando otra categoría de recursos.
          </p>
        </div>
      )}

      {/* Concept Map Modal */}
      {previewConceptMap && previewConceptMap.conceptMapData && (
        <CopilotoConceptMapModal
          isOpen={!!previewConceptMap}
          onClose={() => setPreviewConceptMap(null)}
          title={previewConceptMap.title}
          centralTopic={previewConceptMap.conceptMapData.centralTopic}
          nodes={previewConceptMap.conceptMapData.nodes}
          onAssignToAula={() => {
            const res = previewConceptMap;
            setPreviewConceptMap(null);
            setAssigningResource(res);
          }}
        />
      )}

      {/* Presentation Modal */}
      {previewPresentation && previewPresentation.slidesData && (
        <CopilotoPresentationModal
          isOpen={!!previewPresentation}
          onClose={() => setPreviewPresentation(null)}
          title={previewPresentation.title}
          slides={previewPresentation.slidesData}
          onAssignToAula={() => {
            const res = previewPresentation;
            setPreviewPresentation(null);
            setAssigningResource(res);
          }}
        />
      )}

      {/* Image / Infographic Lightbox Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-fox-surface border border-fox-border rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-fox-border pb-3">
              <h3 className="font-heading font-bold text-fox-text-main text-base sm:text-lg">
                {previewImage.title}
              </h3>
              <button onClick={() => setPreviewImage(null)} className="p-1 rounded-lg hover:bg-fox-bg">
                <X size={18} />
              </button>
            </div>

            {previewImage.thumbnail && (
              <div className="rounded-2xl overflow-hidden max-h-96 border border-fox-border bg-black/10 flex items-center justify-center">
                <img src={previewImage.thumbnail} alt={previewImage.title} className="w-full object-cover max-h-96" />
              </div>
            )}

            {previewImage.contentMarkdown && (
              <div className="bg-fox-bg p-4 rounded-2xl text-xs text-fox-text-main leading-relaxed">
                {previewImage.contentMarkdown}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  const res = previewImage;
                  setPreviewImage(null);
                  setAssigningResource(res);
                }}
                className="px-4 py-2 bg-fox-primary text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Send size={14} /> Asignar al Aula
              </button>
              <button
                onClick={() => handleDownload(previewImage)}
                className="px-4 py-2 border border-fox-border rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Download size={14} /> Descargar PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDocument && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-fox-surface border border-fox-border rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-fox-border flex items-center justify-between bg-fox-bg/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-fox-primary/10 text-fox-primary rounded-xl">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-fox-text-main text-base sm:text-lg">
                    {previewDocument.title}
                  </h3>
                  <p className="text-xs text-fox-text-muted">{previewDocument.aulaName} • Formato {previewDocument.fileFormat}</p>
                </div>
              </div>
              <button onClick={() => setPreviewDocument(null)} className="p-1 rounded-lg hover:bg-fox-bg">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto font-sans text-xs sm:text-sm text-fox-text-main leading-relaxed space-y-3 prose prose-slate max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm bg-fox-bg p-4 rounded-2xl border border-fox-border">
                {previewDocument.contentMarkdown || previewDocument.description}
              </pre>
            </div>

            <div className="p-4 border-t border-fox-border bg-fox-bg/80 flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  if (onOpenResourceInEditor) {
                    onOpenResourceInEditor(previewDocument);
                  }
                  setPreviewDocument(null);
                }}
                className="text-xs font-bold text-fox-primary hover:underline"
              >
                Abrir en Editor de Documentos →
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const res = previewDocument;
                    setPreviewDocument(null);
                    setAssigningResource(res);
                  }}
                  className="px-4 py-2 bg-fox-primary text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Send size={14} /> Asignar al Aula
                </button>
                <button
                  onClick={() => handleDownload(previewDocument)}
                  className="p-2 border border-fox-border rounded-xl text-fox-text-muted hover:text-fox-text-main"
                  title="Descargar archivo"
                >
                  <Download size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Assign Modal */}
      {assigningResource && (
        <CopilotoActivityAssignModal
          isOpen={!!assigningResource}
          onClose={() => setAssigningResource(null)}
          initialTitle={assigningResource.title}
          initialDescription={assigningResource.description}
          initialAulaId={assigningResource.aulaId}
          initialContentMarkdown={assigningResource.contentMarkdown}
        />
      )}
    </div>
  );
};

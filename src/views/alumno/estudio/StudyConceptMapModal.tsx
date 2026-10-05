import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Network, 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  Sparkles, 
  Layers, 
  BookOpen, 
  Info,
  Maximize2,
  CheckCircle2
} from 'lucide-react';
import { toast } from '../../../components/ui/Toaster';
import { StudyConceptMap, StudyConceptNode } from './estudioTypes';

interface StudyConceptMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  conceptMap: StudyConceptMap;
}

export const StudyConceptMapModal: React.FC<StudyConceptMapModalProps> = ({
  isOpen,
  onClose,
  conceptMap
}) => {
  const [selectedNode, setSelectedNode] = useState<StudyConceptNode | null>(conceptMap.nodes[0] || null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [filterCat, setFilterCat] = useState<'all' | 'branch' | 'subbranch'>('all');

  if (!isOpen) return null;

  const coreNode = conceptMap.nodes.find(n => n.category === 'core') || conceptMap.nodes[0];
  const branchNodes = conceptMap.nodes.filter(n => n.category === 'branch');
  const subbranchNodes = conceptMap.nodes.filter(n => n.category === 'subbranch' || n.category === 'detail');

  const filteredNodes = filterCat === 'all' 
    ? conceptMap.nodes 
    : conceptMap.nodes.filter(n => n.category === filterCat || n.category === 'core');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-fox-surface border border-fox-border rounded-3xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden relative"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-fox-border bg-fox-bg/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Network size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-extrabold text-fox-text-main text-base sm:text-lg truncate max-w-md">
                  {conceptMap.title}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/15 text-blue-600 border border-blue-500/20">
                  Mapa Conceptual Interactivo
                </span>
              </div>
              <p className="text-xs text-fox-text-muted">
                {conceptMap.folderName} • Haz clic en los nodos para explorar definiciones y relaciones.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toast.show('Descargando mapa conceptual en alta calidad (.PNG / .PDF)...', 'success')}
              className="p-2 text-fox-text-muted hover:text-fox-text-main rounded-xl border border-fox-border hover:bg-fox-bg transition-colors"
              title="Descargar diagrama"
            >
              <Download size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-fox-text-muted hover:text-fox-text-main rounded-xl border border-fox-border hover:bg-fox-bg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body Layout: Interactive Canvas + Detail Panel */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          {/* Main Visual Node Canvas */}
          <div className="flex-1 bg-fox-bg/40 p-6 overflow-auto relative flex flex-col justify-between">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 z-10">
              <div className="flex items-center gap-1 bg-fox-surface border border-fox-border rounded-xl p-1 shadow-2xs">
                <button
                  onClick={() => setFilterCat('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterCat === 'all' ? 'bg-blue-600 text-white shadow-2xs' : 'text-fox-text-muted hover:text-fox-text-main'
                  }`}
                >
                  Todos ({conceptMap.nodes.length})
                </button>
                <button
                  onClick={() => setFilterCat('branch')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterCat === 'branch' ? 'bg-blue-600 text-white shadow-2xs' : 'text-fox-text-muted hover:text-fox-text-main'
                  }`}
                >
                  Ramas Principales ({branchNodes.length})
                </button>
                <button
                  onClick={() => setFilterCat('subbranch')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filterCat === 'subbranch' ? 'bg-blue-600 text-white shadow-2xs' : 'text-fox-text-muted hover:text-fox-text-main'
                  }`}
                >
                  Subconceptos ({subbranchNodes.length})
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-fox-surface border border-fox-border rounded-xl p-1 shadow-2xs">
                <button
                  onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.1))}
                  className="p-1.5 text-fox-text-muted hover:text-fox-text-main rounded-lg hover:bg-fox-bg"
                  title="Alejar"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-xs font-bold px-2 text-fox-text-muted">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel(prev => Math.min(1.4, prev + 0.1))}
                  className="p-1.5 text-fox-text-muted hover:text-fox-text-main rounded-lg hover:bg-fox-bg"
                  title="Acercar"
                >
                  <ZoomIn size={16} />
                </button>
              </div>
            </div>

            {/* Visual Node Graph Network Container */}
            <div 
              className="flex-1 my-6 flex flex-col items-center justify-center transition-transform duration-200"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {/* Core Central Node */}
              <div className="mb-6 flex flex-col items-center">
                <motion.div
                  onClick={() => setSelectedNode(coreNode)}
                  whileHover={{ scale: 1.04 }}
                  className={`px-6 py-4 rounded-3xl border-2 shadow-lg cursor-pointer transition-all flex items-center gap-3 ${
                    selectedNode?.id === coreNode.id
                      ? 'border-blue-600 bg-blue-600 text-white ring-4 ring-blue-500/20'
                      : 'border-blue-500/30 bg-blue-500/10 text-blue-700 hover:border-blue-500'
                  }`}
                >
                  <Network size={22} className={selectedNode?.id === coreNode.id ? 'text-white' : 'text-blue-600'} />
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Núcleo Central</p>
                    <h4 className="font-heading font-extrabold text-base sm:text-lg">{coreNode.label}</h4>
                  </div>
                </motion.div>
                <div className="w-0.5 h-8 bg-blue-300"></div>
              </div>

              {/* Branch Nodes Layer */}
              <div className="flex flex-wrap items-center justify-center gap-4 max-w-2xl">
                {branchNodes.map((branch) => {
                  const isSelected = selectedNode?.id === branch.id;
                  return (
                    <motion.div
                      key={branch.id}
                      onClick={() => setSelectedNode(branch)}
                      whileHover={{ scale: 1.03 }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs max-w-[200px] text-center ${
                        isSelected
                          ? 'border-fox-purple bg-fox-purple text-white ring-4 ring-fox-purple/20'
                          : 'border-fox-border bg-fox-surface hover:border-fox-purple/50 text-fox-text-main'
                      }`}
                    >
                      <span className={`text-[9px] font-bold uppercase tracking-wider block mb-1 ${
                        isSelected ? 'text-white/80' : 'text-fox-text-muted'
                      }`}>
                        Rama Principal
                      </span>
                      <h5 className="font-bold text-xs sm:text-sm line-clamp-2">{branch.label}</h5>
                    </motion.div>
                  );
                })}
              </div>

              {/* Subbranch Nodes Layer */}
              {subbranchNodes.length > 0 && filterCat !== 'branch' && (
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3 max-w-3xl">
                  {subbranchNodes.map((sub) => {
                    const isSelected = selectedNode?.id === sub.id;
                    return (
                      <motion.div
                        key={sub.id}
                        onClick={() => setSelectedNode(sub)}
                        whileHover={{ scale: 1.02 }}
                        className={`px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                            : 'border-fox-border/80 bg-fox-bg hover:border-emerald-500/50 text-fox-text-main'
                        }`}
                      >
                        {sub.label}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom summary indicator */}
            <div className="text-center text-xs text-fox-text-muted shrink-0">
              💡 {conceptMap.summary}
            </div>
          </div>

          {/* Right Explanation / Inspector Drawer */}
          <div className="w-full lg:w-80 bg-fox-surface border-t lg:border-t-0 lg:border-l border-fox-border p-5 flex flex-col justify-between overflow-y-auto">
            {selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                    <Info size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-fox-text-muted">
                      Inspector de Concepto
                    </span>
                    <h4 className="font-heading font-extrabold text-sm text-fox-text-main line-clamp-1">
                      {selectedNode.label}
                    </h4>
                  </div>
                </div>

                <div className="bg-fox-bg border border-fox-border rounded-2xl p-4 space-y-2">
                  <span className="text-[10px] font-bold text-fox-text-muted uppercase">Definición Pedagógica:</span>
                  <p className="text-xs text-fox-text-main leading-relaxed">
                    {selectedNode.description}
                  </p>
                </div>

                {selectedNode.connectedTo && selectedNode.connectedTo.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-fox-text-muted uppercase">Conexiones Directas:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedNode.connectedTo.map((targetId) => {
                        const target = conceptMap.nodes.find(n => n.id === targetId);
                        if (!target) return null;
                        return (
                          <button
                            key={targetId}
                            onClick={() => setSelectedNode(target)}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-fox-bg border border-fox-border hover:border-blue-400 hover:text-blue-600 text-fox-text-main font-medium transition-all"
                          >
                            🔗 {target.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-fox-text-muted text-xs">
                Seleccioná un nodo del grafo para ver su definición.
              </div>
            )}

            <div className="pt-4 border-t border-fox-border">
              <button
                onClick={() => toast.show('Añadido a tus notas personales de estudio', 'success')}
                className="w-full py-2.5 bg-fox-bg border border-fox-border hover:border-blue-400 text-fox-text-main hover:text-blue-600 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <BookOpen size={14} /> Guardar nodo en mis apuntes
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

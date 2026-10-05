import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Network, 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Info, 
  Check, 
  Send,
  Layers,
  Sparkles,
  Share2
} from 'lucide-react';
import { toast } from '../../../components/ui/Toaster';
import { ConceptNode } from './copilotoTypes';

interface CopilotoConceptMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  centralTopic: string;
  nodes: ConceptNode[];
  onAssignToAula?: () => void;
}

export const CopilotoConceptMapModal: React.FC<CopilotoConceptMapModalProps> = ({
  isOpen,
  onClose,
  title,
  centralTopic,
  nodes,
  onAssignToAula,
}) => {
  const [selectedNode, setSelectedNode] = useState<ConceptNode | null>(nodes[0] || null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [filterCategory, setFilterCategory] = useState<'all' | 'branch' | 'subbranch'>('all');

  if (!isOpen) return null;

  const coreNode = nodes.find(n => n.category === 'core') || nodes[0];
  const branchNodes = nodes.filter(n => n.category === 'branch');
  const subbranchNodes = nodes.filter(n => n.category === 'subbranch' || n.category === 'detail');

  const filteredNodes = filterCategory === 'all' 
    ? nodes 
    : nodes.filter(n => n.category === filterCategory || n.category === 'core');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-fox-surface border border-fox-border rounded-3xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden relative"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-fox-border bg-fox-bg/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-fox-purple/10 text-fox-purple flex items-center justify-center font-bold">
              <Network size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-extrabold text-fox-text-main text-base sm:text-lg truncate max-w-md">
                  {title}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-fox-purple/15 text-fox-purple border border-fox-purple/20">
                  Mapa Conceptual Interactivo
                </span>
              </div>
              <p className="text-xs text-fox-text-muted">
                Haz clic en cualquier nodo para explorar su definición pedagógica y conexiones.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onAssignToAula && (
              <button
                onClick={onAssignToAula}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-fox-primary text-white text-xs font-bold hover:bg-fox-primary/90 transition-all shadow-xs"
              >
                <Send size={14} /> Asignar al Aula
              </button>
            )}
            <button
              onClick={() => toast.show('Descargando mapa conceptual en alta resolución (.PNG/.PDF)...', 'success')}
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

        {/* Workspace Canvas & Inspector */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          
          {/* Main Visual Node Graph Area */}
          <div className="flex-1 bg-gradient-to-br from-fox-bg via-fox-surface/50 to-fox-purple/5 p-6 overflow-auto flex items-center justify-center relative select-none">
            
            {/* Canvas Controls Floating */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-fox-surface/90 backdrop-blur-md p-1.5 rounded-2xl border border-fox-border shadow-md">
              <button
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.15, 1.6))}
                className="p-1.5 text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg rounded-lg"
                title="Acercar"
              >
                <ZoomIn size={16} />
              </button>
              <span className="text-[11px] font-bold text-fox-text-muted px-1">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.15, 0.7))}
                className="p-1.5 text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg rounded-lg"
                title="Alejar"
              >
                <ZoomOut size={16} />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="p-1.5 text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg rounded-lg text-xs font-bold"
                title="Restablecer"
              >
                100%
              </button>
            </div>

            {/* Visual Node Diagram Tree */}
            <div 
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center', transition: 'transform 0.2s ease-out' }}
              className="flex flex-col items-center gap-8 max-w-3xl w-full py-8"
            >
              {/* Level 1: Core Node */}
              {coreNode && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setSelectedNode(coreNode)}
                  className={`p-5 rounded-3xl cursor-pointer transition-all border-2 text-center shadow-lg relative ${
                    selectedNode?.id === coreNode.id 
                      ? 'bg-fox-purple text-white border-white ring-4 ring-fox-purple/20' 
                      : 'bg-fox-surface text-fox-text-main border-fox-purple/40 hover:border-fox-purple'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Sparkles size={16} className={selectedNode?.id === coreNode.id ? 'text-fox-gold' : 'text-fox-purple'} />
                    <span className="text-[10px] uppercase font-black tracking-widest opacity-80">Eje Central</span>
                  </div>
                  <h4 className="text-base sm:text-lg font-heading font-black">
                    {coreNode.label}
                  </h4>
                </motion.div>
              )}

              {/* Connecting line */}
              <div className="w-0.5 h-6 bg-fox-purple/30 -my-4" />

              {/* Level 2: Primary Branches */}
              <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                {branchNodes.map(node => (
                  <motion.div
                    key={node.id}
                    whileHover={{ scale: 1.04 }}
                    onClick={() => setSelectedNode(node)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all border text-center shadow-sm max-w-[220px] flex-1 min-w-[160px] ${
                      selectedNode?.id === node.id 
                        ? 'bg-fox-primary text-white border-white ring-4 ring-fox-primary/20' 
                        : 'bg-fox-surface text-fox-text-main border-fox-border hover:border-fox-primary/50'
                    }`}
                  >
                    <span className="text-[9px] uppercase font-extrabold tracking-wider opacity-75 block mb-0.5">
                      Rama Principal
                    </span>
                    <h5 className="text-xs sm:text-sm font-bold leading-tight">
                      {node.label}
                    </h5>
                  </motion.div>
                ))}
              </div>

              {/* Connecting line */}
              <div className="w-0.5 h-6 bg-fox-primary/20 -my-4" />

              {/* Level 3: Sub-branches & Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
                {subbranchNodes.map(node => (
                  <motion.div
                    key={node.id}
                    whileHover={{ scale: 1.03 }}
                    onClick={() => setSelectedNode(node)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border text-left text-xs shadow-xs ${
                      selectedNode?.id === node.id 
                        ? 'bg-emerald-600 text-white border-white ring-4 ring-emerald-500/20' 
                        : 'bg-fox-surface/90 text-fox-text-main border-fox-border hover:border-emerald-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: node.color || '#10b981' }} />
                      <span className="text-[9px] uppercase font-bold opacity-70">
                        {node.category === 'detail' ? 'Detalle' : 'Sub-concepto'}
                      </span>
                    </div>
                    <p className="font-bold leading-snug">
                      {node.label}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Inspector: Node Details */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-fox-border bg-fox-surface p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
            {selectedNode ? (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-fox-purple/10 text-fox-purple font-bold">
                    <Info size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-fox-text-muted">
                      Nodo Seleccionado
                    </span>
                    <h4 className="font-heading font-extrabold text-fox-text-main text-base">
                      {selectedNode.label}
                    </h4>
                  </div>
                </div>

                <div className="bg-fox-bg border border-fox-border rounded-2xl p-4 space-y-2">
                  <span className="text-[11px] font-bold text-fox-purple uppercase tracking-wider">
                    Definición Didáctica
                  </span>
                  <p className="text-xs sm:text-sm text-fox-text-main/90 leading-relaxed">
                    {selectedNode.description || 'Concepto clave estructurante articulado en la secuencia pedagógica para facilitar el anclaje de conocimientos previos.'}
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-fox-border/60">
                    <span className="text-fox-text-muted font-medium">Categoría Jerárquica:</span>
                    <span className="font-bold text-fox-text-main capitalize">{selectedNode.category}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-fox-border/60">
                    <span className="text-fox-text-muted font-medium">Conexiones Activas:</span>
                    <span className="font-bold text-fox-purple">
                      {selectedNode.category === 'core' ? branchNodes.length : 3} nodos
                    </span>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs leading-relaxed">
                  💡 <strong>Tip para el aula:</strong> Puedes proyectar este mapa en la pizarra y pedir a los estudiantes que asocien ejemplos cotidianos a cada rama.
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-fox-text-muted text-xs">
                Selecciona un nodo del diagrama para ver su descripción pedagógica.
              </div>
            )}

            <div className="pt-4 mt-4 border-t border-fox-border space-y-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Mapa Conceptual: ${title}\nEje Central: ${centralTopic}\nNodos:\n${nodes.map(n => `- ${n.label}: ${n.description}`).join('\n')}`);
                  toast.show('Estructura del mapa copiada al portapapeles', 'info');
                }}
                className="w-full py-2.5 rounded-xl border border-fox-border hover:bg-fox-bg text-xs font-bold text-fox-text-main transition-colors flex items-center justify-center gap-1.5"
              >
                <Share2 size={14} /> Copiar Estructura
              </button>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
};

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Upload, 
  FileText, 
  LayoutList, 
  Download, 
  Eye, 
  Plus, 
  Filter, 
  LayoutGrid, 
  List, 
  FolderOpen, 
  Check, 
  Sparkles,
  FileSpreadsheet,
  FileCheck,
  X
} from 'lucide-react';
import { toast } from '../ui/Toaster';

export interface LibraryFile {
  id: string | number;
  title: string;
  type: 'PDF' | 'PPTX' | 'DOCX' | 'XLSX';
  size: string;
  date: string;
  category: string;
  author: string;
  color: string;
  bg: string;
  url?: string;
  downloadsCount?: number;
}

const defaultLibraryFiles: LibraryFile[] = [
  {
    id: 1,
    title: 'Manifiestos de Vanguardia: Non Serviam y Hélices',
    type: 'PDF',
    size: '3.4 MB',
    date: '12 Ago 2026',
    category: 'Lecturas Obligatorias',
    author: 'Profa. Martínez',
    color: 'text-rose-700',
    bg: 'bg-rose-100',
    downloadsCount: 26
  },
  {
    id: 2,
    title: 'Guía Metodológica: Redacción de Ensayos Académicos',
    type: 'PDF',
    size: '1.8 MB',
    date: '08 Ago 2026',
    category: 'Guías de Trabajo',
    author: 'Profa. Martínez',
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    downloadsCount: 24
  },
  {
    id: 3,
    title: 'Presentación: Del Modernismo a la Experimentación Lírica',
    type: 'PPTX',
    size: '14.2 MB',
    date: '03 Ago 2026',
    category: 'Clases y Diapositivas',
    author: 'Profa. Martínez',
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    downloadsCount: 22
  },
  {
    id: 4,
    title: 'Antología Poética: Rubén Darío, Huidobro y Vallejo',
    type: 'PDF',
    size: '5.1 MB',
    date: '28 Jul 2026',
    category: 'Lecturas Obligatorias',
    author: 'Profa. Martínez',
    color: 'text-emerald-700',
    bg: 'bg-emerald-100',
    downloadsCount: 28
  },
  {
    id: 5,
    title: 'Rúbrica de Evaluación Formativa y Criterios DUA',
    type: 'PDF',
    size: '850 KB',
    date: '20 Jul 2026',
    category: 'Evaluaciones y Rúbricas',
    author: 'Profa. Martínez',
    color: 'text-purple-700',
    bg: 'bg-purple-100',
    downloadsCount: 27
  },
  {
    id: 6,
    title: 'Cuadro Sinóptico: Movimientos Literarios del Siglo XX',
    type: 'PDF',
    size: '1.2 MB',
    date: '15 Jul 2026',
    category: 'Guías de Trabajo',
    author: 'Profa. Martínez',
    color: 'text-indigo-700',
    bg: 'bg-indigo-100',
    downloadsCount: 25
  }
];

interface ClassroomBibliotecaTabProps {
  role: 'docente' | 'alumno';
  subjectName: string;
}

export const ClassroomBibliotecaTab: React.FC<ClassroomBibliotecaTabProps> = ({
  role,
  subjectName
}) => {
  const [files, setFiles] = useState<LibraryFile[]>(defaultLibraryFiles);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Upload modal state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Lecturas Obligatorias');
  const [selectedFileName, setSelectedFileName] = useState('');

  const categories = ['Todos', 'Lecturas Obligatorias', 'Guías de Trabajo', 'Clases y Diapositivas', 'Evaluaciones y Rúbricas'];

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          file.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUploadFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.show('Por favor ingresa el título del material', 'error');
      return;
    }

    const newFile: LibraryFile = {
      id: Date.now(),
      title: newTitle.trim(),
      type: selectedFileName.endsWith('.pptx') ? 'PPTX' : 'PDF',
      size: '2.8 MB',
      date: 'Hoy',
      category: newCategory,
      author: 'Profa. Martínez',
      color: newCategory.includes('Lectura') ? 'text-rose-700' : 'text-blue-700',
      bg: newCategory.includes('Lectura') ? 'bg-rose-100' : 'bg-blue-100',
      downloadsCount: 0
    };

    setFiles([newFile, ...files]);
    setIsUploadModalOpen(false);
    setNewTitle('');
    setSelectedFileName('');
    toast.show('Material subido y compartido en la Biblioteca del Aula', 'success');
  };

  const handleDownload = (file: LibraryFile) => {
    toast.show(`Descargando archivo: "${file.title}" (${file.size})`, 'info');
  };

  const handlePreview = (file: LibraryFile) => {
    toast.show(`Abriendo visor de lectura para: "${file.title}"`, 'info');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Top Header & Search Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-fox-surface border border-fox-border rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-extrabold text-fox-text-main text-lg sm:text-xl">
              Biblioteca y Repositorio de Recursos
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-fox-primary/10 text-fox-primary">
              {files.length} archivos
            </span>
          </div>
          <p className="text-xs sm:text-sm text-fox-text-muted mt-0.5">
            {role === 'docente'
              ? 'Materiales teóricos, lecturas digitalizadas y guías pedagógicas compartidas con los alumnos.'
              : 'Accede a las lecturas oficiales, guías de estudio y diapositivas de clase.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {role === 'docente' && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              id="btn-upload-library-material"
              className="px-4 py-2.5 bg-fox-primary hover:bg-fox-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Upload size={16} />
              <span>Subir Material</span>
            </button>
          )}

          <div className="flex bg-fox-bg p-1 rounded-xl border border-fox-border shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-fox-surface shadow-2xs text-fox-primary' : 'text-fox-text-muted hover:text-fox-text-main'
              }`}
              title="Vista en cuadrícula"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-fox-surface shadow-2xs text-fox-primary' : 'text-fox-text-muted hover:text-fox-text-main'
              }`}
              title="Vista en lista"
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
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fox-text-muted/60" />
          <input
            type="text"
            placeholder="Buscar por título o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-fox-surface border border-fox-border rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-fox-text-main focus:border-fox-primary focus:ring-1 focus:ring-fox-primary outline-none transition-all shadow-2xs"
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

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-fox-primary text-white shadow-xs'
                  : 'bg-fox-surface border border-fox-border text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content Rendering */}
      {filteredFiles.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredFiles.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-fox-surface border border-fox-border rounded-2xl p-5 hover:shadow-md hover:border-fox-primary/40 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className={`p-3 rounded-2xl ${file.bg} ${file.color} shadow-2xs group-hover:scale-105 transition-transform`}>
                      {file.type === 'PDF' ? (
                        <FileText size={24} />
                      ) : (
                        <LayoutList size={24} />
                      )}
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-fox-bg border border-fox-border text-fox-text-muted">
                      {file.type}
                    </span>
                  </div>

                  <h4 className="font-heading font-bold text-sm sm:text-base text-fox-text-main group-hover:text-fox-primary transition-colors line-clamp-2 mb-1.5">
                    {file.title}
                  </h4>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-fox-text-muted">
                    <span className="font-semibold text-fox-primary">{file.category}</span>
                    <span>•</span>
                    <span>{file.size}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-fox-border/60 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-fox-text-muted">
                    Subido: {file.date}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePreview(file)}
                      className="p-2 text-fox-text-muted hover:text-fox-primary hover:bg-fox-bg rounded-lg transition-colors"
                      title="Previsualizar documento"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-2 text-fox-text-muted hover:text-fox-primary hover:bg-fox-bg rounded-lg transition-colors"
                      title="Descargar archivo"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-fox-surface border border-fox-border rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-fox-bg/80 border-b border-fox-border text-[11px] uppercase tracking-wider text-fox-text-muted font-bold">
                  <th className="p-3.5 pl-6">Nombre del Material</th>
                  <th className="p-3.5 hidden sm:table-cell">Categoría</th>
                  <th className="p-3.5 hidden md:table-cell">Tamaño</th>
                  <th className="p-3.5 hidden md:table-cell">Fecha</th>
                  <th className="p-3.5 pr-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fox-border/60 text-xs">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-fox-bg/50 transition-colors">
                    <td className="p-3.5 pl-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${file.bg} ${file.color}`}>
                          {file.type === 'PDF' ? <FileText size={18} /> : <LayoutList size={18} />}
                        </div>
                        <div>
                          <p className="font-bold text-fox-text-main hover:text-fox-primary transition-colors cursor-pointer" onClick={() => handlePreview(file)}>
                            {file.title}
                          </p>
                          <span className="sm:hidden text-[10px] text-fox-text-muted">{file.category} • {file.size}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 hidden sm:table-cell text-fox-text-muted font-medium">
                      {file.category}
                    </td>
                    <td className="p-3.5 hidden md:table-cell text-fox-text-muted">
                      {file.size}
                    </td>
                    <td className="p-3.5 hidden md:table-cell text-fox-text-muted">
                      {file.date}
                    </td>
                    <td className="p-3.5 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handlePreview(file)}
                          className="px-2.5 py-1.5 rounded-lg border border-fox-border hover:border-fox-primary/30 text-fox-text-muted hover:text-fox-primary transition-colors font-bold text-xs flex items-center gap-1"
                        >
                          <Eye size={14} />
                          <span className="hidden sm:inline">Ver</span>
                        </button>
                        <button
                          onClick={() => handleDownload(file)}
                          className="px-2.5 py-1.5 rounded-lg bg-fox-primary/10 hover:bg-fox-primary text-fox-primary hover:text-white transition-colors font-bold text-xs flex items-center gap-1"
                        >
                          <Download size={14} />
                          <span className="hidden sm:inline">Descargar</span>
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
        <div className="text-center py-16 bg-fox-surface border-2 border-dashed border-fox-border rounded-2xl p-6">
          <div className="w-14 h-14 bg-fox-bg rounded-2xl flex items-center justify-center mx-auto mb-3 text-fox-text-muted">
            <FolderOpen size={28} />
          </div>
          <h4 className="font-heading font-bold text-fox-text-main text-base mb-1">
            No se encontraron materiales
          </h4>
          <p className="text-xs sm:text-sm text-fox-text-muted max-w-sm mx-auto">
            Prueba ajustando el término de búsqueda o seleccionando otra categoría.
          </p>
        </div>
      )}

      {/* Upload Material Modal for Teacher */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-fox-surface border border-fox-border rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-fox-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-fox-primary/10 text-fox-primary rounded-xl">
                    <Upload size={20} />
                  </div>
                  <h3 className="font-heading font-bold text-fox-text-main text-lg">
                    Subir Material a la Biblioteca
                  </h3>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="text-fox-text-muted hover:text-fox-text-main p-1 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUploadFile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-fox-text-main mb-1.5">
                    Título o Nombre del Recurso *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Guía de Análisis Textual - Vanguardias"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-fox-bg border border-fox-border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-fox-text-main focus:border-fox-primary focus:ring-1 focus:ring-fox-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-fox-text-main mb-1.5">
                    Categoría
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-fox-bg border border-fox-border rounded-xl px-4 py-2.5 text-xs sm:text-sm text-fox-text-main focus:border-fox-primary outline-none"
                  >
                    <option value="Lecturas Obligatorias">Lecturas Obligatorias</option>
                    <option value="Guías de Trabajo">Guías de Trabajo</option>
                    <option value="Clases y Diapositivas">Clases y Diapositivas</option>
                    <option value="Evaluaciones y Rúbricas">Evaluaciones y Rúbricas</option>
                  </select>
                </div>

                {/* Drag and Drop Box */}
                <div>
                  <label className="block text-xs font-bold text-fox-text-main mb-1.5">
                    Archivo adjunto (PDF, PPTX, DOCX)
                  </label>
                  <div
                    onClick={() => setSelectedFileName('Guia_Vanguardias_Material_2026.pdf')}
                    className="border-2 border-dashed border-fox-border hover:border-fox-primary/50 bg-fox-bg/60 rounded-2xl p-6 text-center cursor-pointer transition-colors"
                  >
                    <div className="w-10 h-10 bg-fox-surface rounded-xl flex items-center justify-center mx-auto mb-2 text-fox-primary shadow-2xs">
                      <FileCheck size={20} />
                    </div>
                    {selectedFileName ? (
                      <p className="text-xs font-bold text-emerald-700">
                        ✓ Archivo seleccionado: {selectedFileName}
                      </p>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-fox-text-main">
                          Arrastra o haz clic para seleccionar archivo
                        </p>
                        <p className="text-[11px] text-fox-text-muted mt-1">
                          Formatos aceptados: PDF, PPTX, DOCX hasta 25 MB
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-fox-border">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-fox-border text-fox-text-main text-xs font-bold hover:bg-fox-bg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-fox-primary hover:bg-fox-primary/90 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <Upload size={14} />
                    <span>Guardar y Publicar</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

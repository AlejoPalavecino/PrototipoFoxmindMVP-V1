import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, BrainCircuit, CheckCircle2, FileText, Plus, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { aulaColorPalette } from '../../data/classroomCreationFixtures';
import type { TeacherClassroomCreation } from '../../hooks/useTeacherClassroomCreation';

export function TeacherClassroomCreateFlow({ creation }: { creation: TeacherClassroomCreation }) {
  const {
    isModalOpen, setIsModalOpen, creationStep, setCreationStep,
    studyPlanFile, setStudyPlanFile, isDraggingFile, setIsDraggingFile,
    fileInputRef, newAulaForm, setNewAulaForm, isFormComplete,
    handleFileUpload, handleFileDrop, handleAnalyze, handleCreateClassroom
  } = creation;

  return (
    <AnimatePresence>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-fox-surface rounded-3xl shadow-2xl border border-fox-border w-full max-w-xl overflow-hidden max-h-[92vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-fox-border flex justify-between items-center bg-fox-bg/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-fox-primary/10 text-fox-primary border border-fox-primary/20 flex items-center justify-center shrink-0">
                  {creationStep === 'review' ? <Sparkles size={20} /> : <BookOpen size={20} />}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-fox-text-main text-lg leading-tight">
                    {creationStep === 'form' && 'Crear Nueva Aula'}
                    {creationStep === 'analyzing' && 'Analizando Plan de Estudios'}
                    {creationStep === 'review' && 'Estructura Curricular Detectada'}
                    {creationStep === 'creating' && 'Configurando Aula'}
                  </h3>
                  <p className="text-xs text-fox-text-muted mt-0.5">
                    {creationStep === 'form' && 'Paso 1 de 2: Información inicial y archivo'}
                    {creationStep === 'analyzing' && 'La IA de Foxy está procesando el contenido'}
                    {creationStep === 'review' && 'Paso 2 de 2: Revisión y ajuste de temas'}
                    {creationStep === 'creating' && 'Guardando aula y vinculando currícula'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-fox-text-muted hover:text-fox-text-main bg-fox-surface rounded-full p-2 shadow-2xs border border-fox-border transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 h-full max-h-full space-y-6">
              {creationStep === 'form' && (
                <div className="space-y-5">
                  {/* 1. Nombre de materia */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2">
                      Nombre de la Materia <span className="text-fox-orange">*</span>
                    </label>
                    <input
                      type="text"
                      value={newAulaForm.subject}
                      onChange={e => setNewAulaForm({...newAulaForm, subject: e.target.value})}
                      className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-3 text-sm font-medium text-fox-text-main placeholder:text-fox-text-muted/50 focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all"
                      placeholder="Ej: Biología General, Literatura Latinoamericana, Física II"
                    />
                  </div>

                  {/* 2. Año y División */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2">
                        Año escolar <span className="text-fox-orange">*</span>
                      </label>
                      <select
                        value={newAulaForm.year}
                        onChange={e => setNewAulaForm({...newAulaForm, year: e.target.value})}
                        className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-3 text-sm font-medium text-fox-text-main focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all cursor-pointer"
                      >
                        <option value="" disabled>Seleccione el año</option>
                        <option value="1° Año">1° Año</option>
                        <option value="2° Año">2° Año</option>
                        <option value="3° Año">3° Año</option>
                        <option value="4° Año">4° Año</option>
                        <option value="5° Año">5° Año</option>
                        <option value="6° Año">6° Año</option>
                        <option value="7° Año">7° Año (Técnica)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2">
                        División / Comisión <span className="text-fox-orange">*</span>
                      </label>
                      <select
                        value={newAulaForm.division}
                        onChange={e => setNewAulaForm({...newAulaForm, division: e.target.value})}
                        className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-3 text-sm font-medium text-fox-text-main focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all cursor-pointer"
                      >
                        <option value="" disabled>Seleccione la división</option>
                        <option value="División A">División A</option>
                        <option value="División B">División B</option>
                        <option value="División C">División C</option>
                        <option value="División D">División D</option>
                        <option value="División E">División E</option>
                        <option value="Única">División Única</option>
                      </select>
                    </div>
                  </div>

                  {/* 3. Observación para el aula en general */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2 flex items-center justify-between">
                      <span>Observaciones para el aula (Opcional)</span>
                      <span className="text-[11px] font-normal normal-case text-fox-text-muted/70">Equipamiento, notas o régimen</span>
                    </label>
                    <textarea
                      value={newAulaForm.observation}
                      onChange={e => setNewAulaForm({...newAulaForm, observation: e.target.value})}
                      className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-2.5 text-sm font-medium text-fox-text-main placeholder:text-fox-text-muted/50 focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all resize-none h-20"
                      placeholder="Ej: Aula 14 con proyector multimedia. Alumnos con perfiles DUA asignados para seguimiento pedagógico..."
                    />
                  </div>

                  {/* 4. Color de la viñeta (reutilizando estilo Agenda) */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2.5 flex items-center justify-between">
                      <span>Color de identificación</span>
                      <span className="text-xs font-bold text-fox-text-main">
                        {aulaColorPalette.find(c => c.id === newAulaForm.color)?.label}
                      </span>
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      {aulaColorPalette.map(c => {
                        const isSelected = newAulaForm.color === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setNewAulaForm({...newAulaForm, color: c.id})}
                            className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? 'scale-110 ring-3 ring-offset-2 ring-fox-text-main/20 shadow-md'
                                : 'opacity-70 hover:opacity-100 hover:scale-105'
                            }`}
                            style={{ backgroundColor: c.hex }}
                            title={c.label}
                          >
                            {isSelected && <CheckCircle2 size={16} className="text-white drop-shadow-sm" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 5. Cargar Plan de Estudios */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2">
                      Plan de Estudios <span className="text-fox-orange">*</span>
                    </label>

                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />

                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                      onDragLeave={() => setIsDraggingFile(false)}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all cursor-pointer group ${
                        isDraggingFile
                          ? 'border-fox-primary bg-fox-primary/10 scale-[1.01]'
                          : studyPlanFile
                            ? 'border-fox-primary/50 bg-fox-primary/5'
                            : 'border-fox-border bg-fox-bg/40 hover:bg-fox-primary/5 hover:border-fox-primary/40'
                      }`}
                    >
                      {studyPlanFile ? (
                        <div className="flex items-center justify-between p-2">
                          <div className="flex items-center gap-3 text-left">
                            <div className="w-12 h-12 bg-fox-primary/10 border border-fox-primary/20 rounded-2xl flex items-center justify-center text-fox-primary shrink-0">
                              <FileText size={22} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-fox-text-main line-clamp-1">{studyPlanFile.name}</p>
                              <p className="text-xs text-fox-text-muted flex items-center gap-1.5 mt-0.5">
                                <span>{studyPlanFile.size}</span>
                                <span>•</span>
                                <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                                  <CheckCircle2 size={12} /> Listo para procesar
                                </span>
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStudyPlanFile(null);
                            }}
                            className="text-xs font-bold text-fox-text-muted hover:text-red-500 bg-fox-surface px-3 py-1.5 rounded-xl border border-fox-border transition-colors cursor-pointer"
                          >
                            Cambiar
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 bg-fox-bg border border-fox-border group-hover:bg-fox-primary/10 group-hover:border-fox-primary/20 group-hover:text-fox-primary rounded-2xl flex items-center justify-center mx-auto mb-2.5 transition-all text-fox-text-muted">
                            <Upload size={22} />
                          </div>
                          <p className="text-sm font-bold text-fox-text-main">
                            Arrastrá el archivo del plan de estudios
                          </p>
                          <p className="text-xs text-fox-text-muted mt-1">
                            o hacé clic para explorar en tu equipo (PDF, DOCX o TXT)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button: Analizar Plan */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleAnalyze}
                      disabled={!isFormComplete}
                      className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
                        isFormComplete
                          ? 'bg-fox-primary text-white hover:bg-fox-primary/90 cursor-pointer shadow-fox-primary/20'
                          : 'bg-fox-border text-fox-text-muted cursor-not-allowed opacity-60'
                      }`}
                    >
                      <BrainCircuit size={18} />
                      <span>Analizar Plan de Estudios con IA</span>
                    </button>
                    {!isFormComplete && (
                      <p className="text-[11px] text-center text-fox-text-muted mt-2">
                        Completa el nombre, año, división y carga el archivo para habilitar el análisis.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* State: Analyzing with AI */}
              {creationStep === 'analyzing' && (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 border-4 border-fox-orange/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-fox-orange border-t-transparent rounded-full animate-spin"></div>
                    <BrainCircuit size={32} className="absolute inset-0 m-auto text-fox-orange animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-fox-text-main text-lg mb-1.5">
                      Foxy está analizando el plan de estudios
                    </h4>
                    <p className="text-xs text-fox-text-muted max-w-sm mx-auto leading-relaxed">
                      Extrayendo unidades temáticas, contenidos pedagógicos y sugiriendo subtemas estructurados...
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-fox-bg border border-fox-border rounded-xl px-3 py-1.5 text-xs text-fox-text-muted">
                    <FileText size={14} className="text-fox-primary" />
                    <span className="font-medium truncate max-w-[200px]">{studyPlanFile?.name}</span>
                  </div>
                </div>
              )}

              {/* State: Creating Classroom */}
              {creationStep === 'creating' && (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 border-4 border-fox-green/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-fox-green border-t-transparent rounded-full animate-spin"></div>
                    <CheckCircle2 size={32} className="absolute inset-0 m-auto text-fox-green animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-fox-text-main text-lg mb-1.5">
                      Creando el Aula y configurando la currícula
                    </h4>
                    <p className="text-xs text-fox-text-muted max-w-sm mx-auto leading-relaxed">
                      Guardando las unidades y subtemas personalizados para {newAulaForm.subject}...
                    </p>
                  </div>
                </div>
              )}

              {/* State: Review and Edit AI-parsed curriculum */}
              {creationStep === 'review' && (
                <div className="space-y-5">
                  {/* Banner informativo */}
                  <div className="bg-fox-purple/10 border border-fox-purple/20 rounded-2xl p-4 flex gap-3.5 text-fox-purple items-start">
                    <Sparkles size={22} className="shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-fox-purple">
                        Plan Curricular Extraído
                      </h5>
                      <p className="text-xs text-fox-purple/90 mt-1 leading-relaxed">
                        Foxy detectó las siguientes unidades y temas. Puedes editar títulos, renombrar, agregar o eliminar según tus necesidades antes de confirmar.
                      </p>
                    </div>
                  </div>

                  {/* Resumen del aula */}
                  <div className="bg-fox-bg/60 border border-fox-border rounded-2xl p-3.5 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${aulaColorPalette.find(c => c.id === newAulaForm.color)?.bgClass}`}></span>
                      <strong className="text-fox-text-main font-bold">{newAulaForm.subject}</strong>
                      <span className="text-fox-text-muted font-medium">({newAulaForm.year} - {newAulaForm.division})</span>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-fox-surface border border-fox-border text-fox-text-muted">
                      {newAulaForm.topics.length} unidades
                    </span>
                  </div>

                  {/* Lista interactiva de Unidades */}
                  <div className="space-y-4">
                    {newAulaForm.topics.map((unit, unitIdx) => (
                      <div key={unit.id || unitIdx} className="bg-fox-surface border border-fox-border rounded-2xl p-4 shadow-2xs hover:border-fox-border/80 transition-all">
                        {/* Header de Unidad */}
                        <div className="flex gap-3 items-center mb-3">
                          <span className="bg-fox-bg border border-fox-border w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black text-fox-text-main shrink-0">
                            {unitIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={unit.name}
                            onChange={e => {
                              const updated = [...newAulaForm.topics];
                              updated[unitIdx].name = e.target.value;
                              setNewAulaForm({...newAulaForm, topics: updated});
                            }}
                            placeholder="Nombre de la unidad..."
                            className="flex-1 bg-fox-bg border border-fox-border rounded-xl px-3 py-1.5 text-xs font-bold text-fox-text-main focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = newAulaForm.topics.filter((_, idx) => idx !== unitIdx);
                              setNewAulaForm({...newAulaForm, topics: updated});
                            }}
                            className="text-fox-text-muted hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-xl transition-colors cursor-pointer"
                            title="Eliminar unidad"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Subtemas */}
                        <div className="pl-9 pr-1 space-y-2">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-fox-text-muted">
                            Temas y Subtemas:
                          </div>
                          {unit.subtopics.map((subtopic, subIdx) => (
                            <div key={subIdx} className="flex gap-2 items-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-fox-primary shrink-0"></div>
                              <input
                                type="text"
                                value={subtopic}
                                onChange={e => {
                                  const updated = [...newAulaForm.topics];
                                  updated[unitIdx].subtopics[subIdx] = e.target.value;
                                  setNewAulaForm({...newAulaForm, topics: updated});
                                }}
                                placeholder="Descripción del subtema..."
                                className="flex-1 bg-fox-bg/50 border border-fox-border/60 hover:border-fox-border focus:border-fox-primary rounded-lg px-2.5 py-1 text-xs text-fox-text-main focus:outline-none transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...newAulaForm.topics];
                                  updated[unitIdx].subtopics = updated[unitIdx].subtopics.filter((_, idx) => idx !== subIdx);
                                  setNewAulaForm({...newAulaForm, topics: updated});
                                }}
                                className="text-fox-text-muted/50 hover:text-red-500 p-1 transition-colors cursor-pointer"
                                title="Eliminar subtema"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...newAulaForm.topics];
                              updated[unitIdx].subtopics.push('Nuevo tema de estudio');
                              setNewAulaForm({...newAulaForm, topics: updated});
                            }}
                            className="flex items-center gap-1 text-[11px] font-bold text-fox-primary hover:text-fox-primary/80 transition-colors pt-1 cursor-pointer"
                          >
                            <Plus size={12} /> Agregar tema
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Botón Añadir Unidad */}
                    <button
                      type="button"
                      onClick={() => {
                        setNewAulaForm({
                          ...newAulaForm,
                          topics: [
                            ...newAulaForm.topics,
                            {
                              id: `u-${Date.now()}`,
                              name: `Unidad ${newAulaForm.topics.length + 1}: Nueva Unidad Temática`,
                              subtopics: ['Tema inicial 1', 'Tema inicial 2']
                            }
                          ]
                        });
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-fox-border hover:border-fox-primary hover:bg-fox-primary/5 text-fox-text-muted hover:text-fox-primary rounded-2xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <Plus size={16} /> Añadir otra Unidad
                    </button>
                  </div>

                  {/* Acciones Finales */}
                  <div className="pt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setCreationStep('form')}
                      className="flex-1 px-4 py-3 border border-fox-border text-fox-text-main rounded-2xl font-bold text-xs hover:bg-fox-bg transition-colors cursor-pointer"
                    >
                      Modificar Datos
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateClassroom}
                      className="flex-[2] py-3 bg-fox-primary text-white rounded-2xl font-bold text-xs hover:bg-fox-primary/90 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 size={16} /> Confirmar y Crear Aula
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

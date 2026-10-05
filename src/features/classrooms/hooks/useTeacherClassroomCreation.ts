import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { toast } from '../../../components/ui/Toaster';
import { analyzeClassroomPlan, createClassroomForm, createTeacherClassroom, describeStudyPlanFile, validateClassroomForm } from '../application/classroomCreation';
import { analysisDelayMs, creationDelayMs } from '../data/classroomCreationFixtures';
import type { ClassroomCreationResult, ClassroomCreationStep, StudyPlanFile } from '../model/ClassroomCreation';

// Mount in the page, not the conditionally rendered list/modal. As before, closing
// or switching to detail does not cancel timers or discard the form/drag state.
export function useTeacherClassroomCreation(onCreate: (result: ClassroomCreationResult) => void) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creationStep, setCreationStep] = useState<ClassroomCreationStep>('form');
  const [studyPlanFile, setStudyPlanFile] = useState<StudyPlanFile | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newAulaForm, setNewAulaForm] = useState(createClassroomForm);

  const handleOpenModal = () => {
    setNewAulaForm(createClassroomForm());
    setStudyPlanFile(null);
    setCreationStep('form');
    setIsModalOpen(true);
  };

  const handleFileUpload = (file: File) => {
    setStudyPlanFile(describeStudyPlanFile(file));
    toast.show(`📄 Archivo "${file.name}" cargado`, 'success');
  };

  const handleFileDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const isFormComplete = validateClassroomForm(newAulaForm, studyPlanFile) === null;
  const handleAnalyze = () => {
    const warning = validateClassroomForm(newAulaForm, studyPlanFile);
    if (warning) {
      toast.show(warning, 'warning');
      return;
    }
    setCreationStep('analyzing');
    setTimeout(() => {
      // Use the invocation's subject, while retaining the latest form fields.
      setNewAulaForm(prev => ({
        ...prev,
        topics: analyzeClassroomPlan(newAulaForm.subject, Date.now)
      }));
      setCreationStep('review');
    }, analysisDelayMs);
  };

  const handleCreateClassroom = () => {
    setCreationStep('creating');
    setTimeout(() => {
      // Keep the invocation's form and page callback/list snapshot, not a ref.
      const result = createTeacherClassroom(newAulaForm, Date.now);
      onCreate(result);
      toast.show(`✨ Aula de ${result.classroom.subject} (${result.classroom.course}) creada con éxito`, 'success');
      setIsModalOpen(false);
    }, creationDelayMs);
  };

  return {
    isModalOpen, setIsModalOpen, creationStep, setCreationStep,
    studyPlanFile, setStudyPlanFile, isDraggingFile, setIsDraggingFile,
    fileInputRef, newAulaForm, setNewAulaForm, isFormComplete,
    handleOpenModal, handleFileUpload, handleFileDrop, handleAnalyze, handleCreateClassroom
  };
}

export type TeacherClassroomCreation = ReturnType<typeof useTeacherClassroomCreation>;

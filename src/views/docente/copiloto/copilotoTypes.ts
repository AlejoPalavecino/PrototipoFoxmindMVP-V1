export type AgentType = 'general' | 'planificador' | 'evaluador' | 'adaptador' | 'creativo';
export type ToneType = 'empatico' | 'academico' | 'creativo' | 'directo' | 'socratico';

export interface CopilotoMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  agentType?: AgentType;
  attachedFile?: {
    name: string;
    size: string;
    type: string;
    url?: string;
  };
  generatedArtifact?: {
    id: string;
    title: string;
    type: 'document' | 'presentation' | 'concept_map' | 'image' | 'quiz' | 'rubric' | 'activity';
    previewSummary?: string;
  };
  suggestedActions?: {
    label: string;
    actionPrompt: string;
    iconType?: 'activity' | 'refine' | 'export' | 'dua';
  }[];
}

export interface CopilotoSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  aulaId: string; // e.g. 'c1' | 'c3' | 'c4' | 'none'
  aulaName: string;
  agentType: AgentType;
  tone: ToneType;
  messagesCount: number;
  isPinned?: boolean;
  messages: CopilotoMessage[];
}

export type ResourceCategory = 'document' | 'presentation' | 'concept_map' | 'image' | 'quiz' | 'rubric';

export interface SlideItem {
  id: number;
  title: string;
  subtitle?: string;
  bullets: string[];
  notes?: string;
  visualTag?: string;
}

export interface ConceptNode {
  id: string;
  label: string;
  category: 'core' | 'branch' | 'subbranch' | 'detail';
  description?: string;
  parentId?: string;
  connections?: string[];
  color?: string;
}

export interface CopilotoResource {
  id: string;
  title: string;
  type: ResourceCategory;
  categoryLabel: string;
  aulaId: string;
  aulaName: string;
  createdAt: string;
  description: string;
  tags: string[];
  thumbnail?: string;
  // Specific data for each type
  contentMarkdown?: string; // For documents/rubrics
  slidesData?: SlideItem[]; // For presentations
  conceptMapData?: {
    centralTopic: string;
    nodes: ConceptNode[];
  };
  quizQuestions?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
  fileFormat: string; // 'PDF' | 'PPTX' | 'DOCX' | 'PNG' | 'JSON'
  fileSize: string;
}

export interface AulaContextFile {
  id: string;
  name: string;
  type: string;
  size: string;
  category: string;
  uploadDate: string;
  activeInContext: boolean;
}

export interface AulaContextKnowledge {
  aulaId: string;
  subject: string;
  course: string;
  color: string;
  files: AulaContextFile[];
  curriculumUnits: {
    unit: string;
    status: 'completed' | 'current' | 'pending';
    topics: string[];
  }[];
  duaStudents: {
    name: string;
    dua: string[];
    recommendationNote?: string;
  }[];
}

export interface CopilotoRecommendation {
  id: string;
  title: string;
  description: string;
  badge: string;
  category: 'urgent' | 'dua' | 'didactic' | 'planning';
  aulaId: string;
  aulaName: string;
  promptText: string;
  actionLabel: string;
  impactLevel: 'Alto' | 'Medio' | 'Recomendado';
}

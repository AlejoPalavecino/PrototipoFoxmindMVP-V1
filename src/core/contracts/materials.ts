

export interface FileState {
  id: string;
  name: string;
  ready: boolean;
  upload: string;
  validation: string;
  scan: string;
  rejectionCode: string | null;
}

export interface Material {
  supersededBy?:string|null;
  body?: string | null;
  resourceUse?: 'STUDY' | 'RECOMMENDED' | 'COMPLEMENTARY';
  contentKind?: 'TEXT' | 'FILE';
  id: string;
  title: string;
  fileId: string;
  fileName: string;
  extension: string;
  sizeBytes: string;
  unitId: string | null;
  topicId: string | null;
  ready: boolean;
  previewable: boolean;
  linked: boolean;
  deleted: boolean;
  deletionPending: boolean;
}

export interface ChatAttachment {
  id: string;
  name: string;
  sizeBytes: number;
  savedToFolder: boolean;
}

export interface ChatAttachmentScope {
  ownerId: string;
  conversationId: string;
  folderId?: string;
}

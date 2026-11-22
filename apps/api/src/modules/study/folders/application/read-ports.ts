export interface StudyReminderQueries {
    tick: () => Promise<void>;
    list(request: unknown): Promise<{
        items: {
            id: string;
            title: string;
            folderId: string;
            startsAt: string;
            createdAt: string;
            readAt: string | null;
            href: string;
        }[];
        unreadCount: number;
    }>;
    read(request: unknown, id: string): Promise<{
        read: boolean;
    }>;
    close(): Promise<void>;
}
export interface StudyUploadOperations {
    begin(request: unknown, folder: string, input: unknown): Promise<{
        id: string;
        name: string;
        sizeBytes: number;
        ready: boolean;
        upload: string;
        validation: string;
        scan: string;
        rejectionCode: string | null;
    }>;
    status(request: unknown, folder: string, id: string): Promise<{
        id: string;
        name: string;
        sizeBytes: number;
        ready: boolean;
        upload: string;
        validation: string;
        scan: string;
        rejectionCode: string | null;
    }>;
    receive(request: unknown, folder: string, id: string, input: unknown): Promise<{
        id: string;
        name: string;
        sizeBytes: number;
        ready: boolean;
        upload: string;
        validation: string;
        scan: string;
        rejectionCode: string | null;
    }>;
    /** Authenticates and authorizes a pending upload before its body is read; returns the declared size. */
    authorizeReceive(request: unknown, folder: string, id: string): Promise<{
        expectedBytes: number;
    }>;
    read(request: unknown, folder: string, id: string): Promise<{
        bytes: Uint8Array;
        mime: string;
        name: string;
    }>;
}

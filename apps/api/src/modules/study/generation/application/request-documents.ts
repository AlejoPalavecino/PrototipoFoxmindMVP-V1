import { studyFail } from '../../../../../../../src/core/domain/study/folders.ts';
import type { StudyDocumentRead, StudyQuery, StudySource, StudyOptions } from '../../application/contracts.ts';
import type { PreparedStudyOperation } from './protocol.ts';

/** Scope bytes to this operation. Every subsequent lookup must still pass the live custody checks. */
export function createRequestDocuments(files: StudyOptions['files']) {
    const prepare = files?.prepareRead;
    const pending = new Map<string, { source: StudySource; read: StudyDocumentRead }>();
    const loaded = new Map<string, Awaited<ReturnType<StudyDocumentRead['load']>>>();
    let sealed = false;

    async function readSource(tx: StudyQuery, source: StudySource) {
        const read = await prepare!(tx, source);
        const key = JSON.stringify([source.ownerId, source.folderId, source.classroomId, source.conversationId,
            source.origin, source.id, source.version, source.fileId, read.version]);
        const result = loaded.get(key);
        if (result) return result;
        if (sealed) studyFail('SOURCE_UNAVAILABLE');
        pending.set(key, { source, read });
        return { text: '' };
    }

    return {
        files: prepare ? { ...files!, readSource } : files,
        async load(operation: PreparedStudyOperation) {
            sealed = true;
            if (!pending.size) return;
            for (const [key, { source, read }] of pending) {
                const content = await read.load();
                Object.assign(source, content);
                loaded.set(key, content);
            }
            // Feedback history eligibility depends on the same readable sources that the provider receives.
            if (operation.mode === 'feedback') operation.input = operation.buildInput();
            else if (operation.mode === 'generate') operation.input.sources = operation.sources.filter(source => source.text.trim() || source.document);
            pending.clear();
        },
    };
}

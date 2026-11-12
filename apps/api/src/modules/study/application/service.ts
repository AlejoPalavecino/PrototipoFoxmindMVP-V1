import { studyFail, studyId, studyObject, studyRevision, validateFolder, type FolderFields } from '../../../../../../src/core/domain/study/folders.ts';
import { CLASSROOM_COVER_KEYS } from '../../../../../../src/core/domain/classrooms/cover.ts';
import { projectFolderSummary,type StudySummaryRow,projectFolder, type FolderRow, type StudyState, type StudyQuery } from './contracts.ts';
import { runCommand, publicState } from './commands.ts';
import type { StudyApplicationPorts } from './ports.ts';
// Operational UTF-8 budget for the complete persisted JSON, receipts included.
// Leaves headroom below the existing 4 MiB HTTP proxy response limit; it is not
// a production storage quota. Resources are rejected atomically, never truncated.
export const STUDY_FOLDER_STATE_MAX_BYTES = 3_000_000;
function serializeState(state: StudyState): string {
    const json = JSON.stringify(state);
    if (new TextEncoder().encode(json).byteLength > STUDY_FOLDER_STATE_MAX_BYTES) studyFail('QUOTA_EXCEEDED');
    return json;
}
export function createStudyService(options: StudyApplicationPorts) {
    const run = options.uow.run.bind(options.uow);
    const load = options.folders.load.bind(options.folders);
    const save = (tx: StudyQuery, row: FolderRow) => options.folders.save(tx, row, serializeState(row.state));
    let activePreviews = 0;
    async function validateFiles(tx: StudyQuery, owner: string, id: string, fields: FolderFields) { await options.verifyLink(tx, owner, fields.linkedClassroomId); if (fields.planFileId) {
        if (!options.files)
            studyFail('FILE_NOT_READY');
        await options.files.assertOwn(tx, owner, id, fields.planFileId, 'plan');
    } }
    async function generatedCommand(request: unknown, id: string, p: Record<string, unknown>) {
        const requestId = studyId(p.requestId), hash = options.digest(JSON.stringify({ ...p, revision: undefined }));
        const sentinel = {};
        let captured: unknown;
        const operation = { mode: 'generate' as 'generate' | 'feedback' };
        const prepared = await run(request, true, async (tx, owner) => {
            const r = await load(tx, owner, id, true), prior = r.state.receipts[requestId];
            if (prior) {
                if (prior.hash !== hash)
                    studyFail('CONFLICT');
                if (prior.pendingAt && Date.now() - Date.parse(prior.pendingAt) > 600000 && (prior.result as {
                    status?: string;
                })?.status === 'PENDING') {
                    prior.result = { status: 'FAILED', requestId, reason: 'INTERRUPTED' };
                    return { complete: { folder: projectFolder(await save(tx, r)), result: prior.result } };
                }
                return { complete: { folder: projectFolder(r), result: prior.result } };
            }
            if (studyRevision(p.revision) !== String(r.revision) || r.status === 'ARCHIVED')
                studyFail('CONFLICT');
            if (Object.keys(r.state.receipts).length >= 2000)
                studyFail('QUOTA_EXCEEDED');
            try {
                const result = await runCommand(tx, structuredClone(r), p, { ...options, generate: async (input) => { captured = input; throw sentinel; }, feedback: async (input) => { captured = input; operation.mode = 'feedback'; throw sentinel; } });
                return { complete: { folder: projectFolder(r), result } };
            }
            catch (e) {
                if (e !== sentinel)
                    throw e;
            }
            r.state.receipts[requestId] = { hash, result: { status: 'PENDING', requestId }, pendingAt: new Date().toISOString() };
            const saved = await save(tx, r);
            return { revision: String(saved.revision), ownerId: owner };
        });
        if (prepared.complete)
            return prepared.complete;
        const inputHash = (v: unknown) => options.digest(JSON.stringify(v));
        try {
            const authorize = async () => run(request, true, async (tx, owner) => { const r = await load(tx, owner, id, true); if (String(r.revision) !== prepared.revision || r.status === 'ARCHIVED')
                studyFail('CONFLICT'); try {
                await runCommand(tx, structuredClone(r), p, { ...options, generate: async (input) => { if (inputHash(input) !== inputHash(captured))
                        studyFail('SOURCE_UNAVAILABLE'); throw sentinel; }, feedback: async (input) => { if (inputHash(input) !== inputHash(captured))
                        studyFail('SOURCE_UNAVAILABLE'); throw sentinel; } });
            }
            catch (e) {
                if (e !== sentinel)
                    throw e;
            } });
            await authorize();
            const generated = operation.mode === 'feedback' ? await options.feedback?.(captured as Parameters<NonNullable<StudyApplicationPorts['feedback']>>[0], { ownerId: prepared.ownerId!, requestId, authorize }) : await options.generate?.(captured, { ownerId: prepared.ownerId!, requestId, authorize });
            if (generated === undefined)
                studyFail('AI_UNAVAILABLE');
            return await run(request, true, async (tx, owner) => {
                const r = await load(tx, owner, id, true);
                if (String(r.revision) !== prepared.revision || r.status === 'ARCHIVED')
                    studyFail('CONFLICT');
                const replay = async (input: unknown) => { if (inputHash(input) !== inputHash(captured))
                    studyFail('SOURCE_UNAVAILABLE'); return generated; };
                const result = await runCommand(tx, r, p, { ...options, generate: replay, feedback: replay });
                r.state.receipts[requestId] = { hash, result };
                return { folder: projectFolder(await save(tx, r)), result };
            });
        }
        catch (error) {
            try {
                await run(request, true, async (tx, owner) => { const r = await load(tx, owner, id, true); if (r.state.receipts[requestId]?.hash === hash) {
                    r.state.receipts[requestId] = { hash, result: { status: 'FAILED' } };
                    await save(tx, r);
                } });
            }
            catch { /* Preserve provider or authorization failure. */ }
            throw error;
        }
    }
    return {
        async authorizeFolder(request: unknown, id: string, write: boolean) { return run(request, write, async (tx, owner) => { const r = await load(tx, owner, id, write); if (write && r.status === 'ARCHIVED')
            studyFail('CONFLICT'); return { ownerId: owner, status: r.status, revision: String(r.revision) }; }); },
        async list(request: unknown) { return run(request, false, async (tx, owner) => ({ items: (await options.folders.list(tx, owner)).map(projectFolderSummary), classrooms: await options.linkedClassrooms(tx, owner), covers: CLASSROOM_COVER_KEYS.map(key => ({ key, label: key, color: '#e99e5a' })) })); },
        async create(request: unknown, input: unknown) {
            return run(request, true, async (tx, owner) => {
                const p = { ...studyObject(input) }, status = p.status ?? 'DRAFT';
                delete p.status;
                if (!['DRAFT', 'ACTIVE'].includes(String(status)))
                    studyFail('INVALID_INPUT');
                const fields = validateFolder(p, status === 'ACTIVE'), id = options.newId();
                await validateFiles(tx, owner, id, fields);
                const count = await options.folders.count(tx, owner);
                if (Number(count) >= 200)
                    studyFail('QUOTA_EXCEEDED');
                const state: StudyState = { version: 1, fields, materials: [], conversations: [], creations: [], practices: [], exams: [], memory: {}, receipts: {} };
                const row = await options.folders.create(tx, id, owner, String(status), serializeState(state));
                return { folder: projectFolder(row!) };
            });
        },
        async get(request: unknown, id: string) {
            return run(request, false, async (tx, owner) => {
                const r = await load(tx, owner, id, false), sources = await options.sources(tx, r, options);
                const attachments = await options.files?.chatSources?.(tx, owner, r.id);
                return { folder: projectFolder(r), sources: sources.map(({ text: _, ...s }) => s), ...publicState(r.state, sources, attachments) };
            });
        },
        async previewDocx(request: unknown, id: string, sourceId: string) {
            const sourceKey = studyId(sourceId);
            if (activePreviews >= 2) studyFail('SERVICE_UNAVAILABLE');
            activePreviews++;
            try {
                return await run(request, false, async (tx, owner) => {
                    const folder = await load(tx, owner, id, false);
                    const source = (await options.sources(tx, folder, options)).find(item => item.id === sourceKey && item.available);
                    if (!source) studyFail('FORBIDDEN');
                    if (source.extension !== 'docx' || !options.files?.previewDocx) studyFail('PREVIEW_UNAVAILABLE');
                    const text = await options.files.previewDocx(tx, { ...source, ownerId: owner, folderId: folder.id,
                        classroomId: folder.state.fields.linkedClassroomId ?? undefined });
                    const latest = await load(tx, owner, id, false);
                    const stillAvailable = (await options.sources(tx, latest, options)).some(item =>
                        item.id === sourceKey && item.available && item.fileId === source.fileId && item.version === source.version);
                    if (!stillAvailable) studyFail('FORBIDDEN');
                    return { text };
                });
            } finally { activePreviews--; }
        },
        async patch(request: unknown, id: string, input: unknown) { return run(request, true, async (tx, owner) => { const p = { ...studyObject(input) }, r = await load(tx, owner, id, true); if (studyRevision(p.revision) !== String(r.revision))
            studyFail('CONFLICT'); delete p.revision; const status = p.status ?? r.status; delete p.status; if ((r.status === 'ACTIVE' && status === 'DRAFT') || !['DRAFT', 'ACTIVE', 'ARCHIVED', 'DELETED'].includes(String(status)) || (r.status === 'ARCHIVED' && status !== 'ACTIVE'))
            studyFail('CONFLICT'); if (status === 'DELETED')
            studyFail('INVALID_INPUT'); r.state.fields = validateFolder({ ...r.state.fields, ...p }, status === 'ACTIVE'); await validateFiles(tx, owner, id, r.state.fields); r.status = status as FolderRow['status']; if (status === 'ARCHIVED')
            await options.agenda?.cancel(tx, owner, id); return { folder: projectFolder(await save(tx, r)) }; }); },
        async command(request: unknown, id: string, input: unknown) { const command = studyObject(input); if (['CHAT', 'GENERATE', 'RETRY_FEEDBACK'].includes(String(command.action)))
            return generatedCommand(request, id, command); return run(request, true, async (tx, owner) => { const p = command, r = await load(tx, owner, id, true), requestId = studyId(p.requestId), hash = options.digest(JSON.stringify({ ...p, revision: undefined })); const prior = r.state.receipts[requestId]; if (prior) {
            if (prior.hash !== hash)
                studyFail('CONFLICT');
            return { folder: projectFolder(r), result: prior.result };
        } if (studyRevision(p.revision) !== String(r.revision))
            studyFail('CONFLICT'); if (r.status === 'ARCHIVED' && !['REACTIVATE', 'DELETE'].includes(String(p.action)))
            studyFail('CONFLICT'); if (Object.keys(r.state.receipts).length >= 2000)
            studyFail('QUOTA_EXCEEDED'); const result = await runCommand(tx, r, p, options); r.state.receipts[requestId] = { hash, result }; return { folder: projectFolder(await save(tx, r)), result }; }); },
    };
}
export type StudyService = ReturnType<typeof createStudyService>;



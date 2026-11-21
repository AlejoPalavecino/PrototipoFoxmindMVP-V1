import { prepareStudyOperation, reserveStudyOperation, validatePreparedStudyOperation, executePreparedStudyOperation, applyPreparedStudyOperation } from '../../generation/public.ts';
import { isAiBudgetRejectionCode, readAiMonthlyQuotaRejection } from '../../../../../../../src/core/contracts/ai-quota.ts';
import { studyFail, studyId, studyObject, studyRevision, validateFolder, type FolderFields } from '../../../../../../../src/core/domain/study/folders.ts';
import { CLASSROOM_COVER_KEYS } from '../../../../../../../src/core/domain/classrooms/cover.ts';
import { STUDY_GENERATION_PENDING_MS, projectFolderSummary, projectFolder } from '../../domain/state.ts';
import type { StudySummaryRow, FolderRow, StudyState, StudyQuery } from '../../application/contracts.ts';
import { runCommand, publicState } from './commands.ts';
import { createRequestDocuments } from '../../generation/public.ts';
import type { StudyApplicationPorts } from '../../application/ports.ts';
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
    async function validateFiles(tx: StudyQuery, owner: string, id: string, fields: FolderFields, verifyLink = true) { if (verifyLink) await options.verifyLink(tx, owner, fields.linkedClassroomId); if (fields.planFileId) {
        if (!options.files)
            studyFail('FILE_NOT_READY');
        await options.files.assertOwn(tx, owner, id, fields.planFileId, 'plan');
    } }
    async function cancelGeneration(request: unknown, id: string, data: Record<string, unknown>) {
        if (Object.keys(data).some(key=>!['action','targetRequestId'].includes(key))) studyFail('INVALID_INPUT');
        const requestId = studyId(data.targetRequestId);
        return run(request,true,async(tx,owner)=>{
            const row = await load(tx,owner,id,true), receipt = row.state.receipts[requestId];
            if (!receipt) studyFail('CONFLICT');
            const status = (receipt.result as {status?: string})?.status;
            if (status === 'CANCELLED') return {folder:projectFolder(row),result:receipt.result};
            if (status !== 'PENDING' || !receipt.pendingAt) return {folder:projectFolder(row),result:{status:'ALREADY_FINISHED',requestId}};
            receipt.result = {status:'CANCELLED',requestId};
            delete receipt.pendingAt;
            return {folder:projectFolder(await save(tx,row)),result:receipt.result};
        });
    }
    async function generatedCommand(request: unknown, id: string, p: Record<string, unknown>) {
        const timing = options.createTimings?.(p.action === 'RETRY_FEEDBACK' ? 'feedback' : p.action === 'CHAT' ? 'chat' : 'tool');
        const preparationStarted = timing?.now() ?? 0;
        const prepareTiming = (error?: unknown) => timing?.stage('prepare', timing.now() - preparationStarted, error);
        const documents = createRequestDocuments(options.files);
        const contextPorts = { sources: options.sources, files: documents.files };
        const requestId = studyId(p.requestId), hash = options.digest(JSON.stringify({ ...p, revision: undefined }));
        const prepared = await run(request, true, async (tx, owner) => {
            const r = await load(tx, owner, id, true), prior = r.state.receipts[requestId];
            if (prior) {
                if (prior.hash !== hash)
                    studyFail('CONFLICT');
                if (prior.pendingAt && Date.now() - Date.parse(prior.pendingAt) > STUDY_GENERATION_PENDING_MS && (prior.result as {
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
            const candidate = structuredClone(r);
            const operation = await prepareStudyOperation(tx, candidate, p, contextPorts);
            if (operation.mode === 'image' && !options.images?.generate) studyFail('AI_UNAVAILABLE');
            reserveStudyOperation(candidate, operation, options);
            // Commit the real generation request with its receipt before leaving the transaction.
            // Preparation and reservation cannot create a resource or an assistant result card.
            r.state.conversations = candidate.state.conversations;
            // The new folder revision already supersedes older in-flight inputs. Close their
            // receipts now so a late failure cannot advance the revision of this reservation.
            for (const [previousId, receipt] of Object.entries(r.state.receipts)) {
                if ((receipt.result as { status?: string })?.status !== 'PENDING') continue;
                const expired = receipt.pendingAt && Date.now() - Date.parse(receipt.pendingAt) > STUDY_GENERATION_PENDING_MS;
                receipt.result = { status: 'FAILED', requestId: previousId, ...(expired ? { reason: 'INTERRUPTED' } : {}) };
                delete receipt.pendingAt;
            }
            r.state.receipts[requestId] = { hash, result: { status: 'PENDING', requestId }, pendingAt: new Date().toISOString() };
            const saved = await save(tx, r);
            return { revision: String(saved.revision), ownerId: owner, folderId: saved.id, operation };
        }).catch(error => {
            prepareTiming(error ?? null);
            throw error;
        });
        if (prepared.complete)
            return prepared.complete;
        let ready = false, persisting = false;
        try {
            await documents.load(prepared.operation);
            const authorize = async () => run(request, true, async (tx, owner) => {
                const row = await load(tx, owner, id, true);
                if (String(row.revision) !== prepared.revision || row.status === 'ARCHIVED') studyFail('CONFLICT');
                if (prepared.operation.mode === 'image' && (row.state.receipts[requestId]?.result as { status?: string })?.status !== 'PENDING')
                    studyFail('CONFLICT');
                await validatePreparedStudyOperation(tx, row, p, prepared.operation, contextPorts, options.digest);
            });
            await authorize();
            ready = true;
            prepareTiming();
            const generated = await executePreparedStudyOperation(prepared.operation, options,
                { ownerId: prepared.ownerId, requestId, folderId: prepared.folderId, authorize });
            persisting = true;
            const persist = () => run(request, true, async (tx, owner) => {
                const r = await load(tx, owner, id, true);
                const receipt = r.state.receipts[requestId];
                if ((receipt?.result as {status?:string})?.status === 'CANCELLED') return {folder:projectFolder(r),result:receipt!.result};
                if (String(r.revision) !== prepared.revision || r.status === 'ARCHIVED')
                    studyFail('CONFLICT');
                const current = await validatePreparedStudyOperation(tx, r, p, prepared.operation, contextPorts, options.digest);
                const result = await applyPreparedStudyOperation(tx, r, current, generated, options);
                r.state.receipts[requestId] = { hash, result };
                return { folder: projectFolder(await save(tx, r)), result };
            });
            return await (timing?.measure('persist', persist, ({ result }) => {
                const status = (result as { status?: string } | undefined)?.status;
                if (status === 'CANCELLED' || status === 'FAILED') return { code: status === 'CANCELLED' ? 'CANCELLED' : 'AI_UNAVAILABLE' };
            }) ?? persist());
        }
        catch (error) {
            if (!ready) prepareTiming(error ?? null);
            try {
                const close = () => run(request, true, async (tx, owner) => { const r = await load(tx, owner, id, true);
                const receipt = r.state.receipts[requestId];
                if ((receipt?.result as {status?:string})?.status === 'CANCELLED') return {folder:projectFolder(r),result:receipt!.result};
                if (receipt?.hash === hash && (receipt.result as { status?: string })?.status === 'PENDING') {
                    const failure = error as { code?: unknown; quota?: unknown } | null;
                    const code = failure?.code;
                    const errorCode = isAiBudgetRejectionCode(code) ? code : undefined;
                    const quota = errorCode === 'AI_MONTHLY_BUDGET_EXCEEDED' ? readAiMonthlyQuotaRejection(failure?.quota) : undefined;
                    r.state.receipts[requestId] = { hash, result: { status: 'FAILED', ...(errorCode ? { errorCode } : {}), ...(quota ? { quota } : {}) } };
                    await save(tx, r);
                } });
                const cancelled = await (ready && !persisting && timing
                    ? timing.measure('persist', close, result => result ? { code: 'CANCELLED' } : error ?? null)
                    : close());
                if (cancelled) return cancelled;
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
                const scheduled = r.state.exams.length ? await options.agenda?.scheduled?.(tx, owner, r.id) : undefined;
                return { folder: projectFolder(r), sources: sources.map(({ text: _, ...s }) => s), ...publicState(r.state, sources, attachments),
                    ...(scheduled ? { scheduledReviewSessions: scheduled } : {}),
                    ...(options.images?.generate ? { imageGenerationAvailable: true } : {}) };
            });
        },
        async image(request: unknown, id: string, imageId: string) {
            const key = studyId(imageId);
            return run(request, false, async (tx, owner) => {
                const row = await load(tx, owner, id, false);
                if (!row.state.creations.some(item => item.id === key && item.kind === 'IMAGE'))
                    studyFail('FORBIDDEN');
                const raster = await options.images?.read(tx, owner, row.id, key);
                if (!raster) studyFail('FORBIDDEN');
                return raster;
            });
        },
        async previewDocx(request: unknown, id: string, sourceId: string) {
            const sourceKey = studyId(sourceId);
            if (activePreviews >= 2) studyFail('SERVICE_UNAVAILABLE');
            activePreviews++;
            try {
                const locate = async (tx: StudyQuery, owner: string) => {
                    const folder = await load(tx, owner, id, false);
                    const source = (await options.sources(tx, folder, options)).find(item => item.id === sourceKey && item.available);
                    if (!source) studyFail('FORBIDDEN');
                    if (source.extension !== 'docx') studyFail('PREVIEW_UNAVAILABLE');
                    return { ...source, ownerId: owner, folderId: folder.id, classroomId: folder.state.fields.linkedClassroomId ?? undefined };
                };
                const prepare = options.files?.prepareRead;
                const preview = options.files?.previewDocx;
                if (!prepare && !preview) studyFail('PREVIEW_UNAVAILABLE');
                const original = await run(request, false, async (tx, owner) => {
                    const source = await locate(tx, owner);
                    const read = prepare ? await prepare(tx, source, true) : undefined;
                    return { source, read, text: read ? undefined : await preview!(tx, source) };
                });
                const text = original.read ? (await original.read.load()).text : original.text!;
                return await run(request, false, async (tx, owner) => {
                    const source = await locate(tx, owner);
                    if (source.fileId !== original.source.fileId || source.version !== original.source.version ||
                        source.classroomId !== original.source.classroomId) studyFail('FORBIDDEN');
                    if (prepare && (await prepare(tx, source, true)).version !== original.read?.version) studyFail('FORBIDDEN');
                    return { text };
                });
            } finally { activePreviews--; }
        },
        async patch(request: unknown, id: string, input: unknown) { return run(request, true, async (tx, owner) => { const p = { ...studyObject(input) }, r = await load(tx, owner, id, true); if (studyRevision(p.revision) !== String(r.revision))
            studyFail('CONFLICT'); delete p.revision; const status = p.status ?? r.status; delete p.status; if ((r.status === 'ACTIVE' && status === 'DRAFT') || !['DRAFT', 'ACTIVE', 'ARCHIVED', 'DELETED'].includes(String(status)) || (r.status === 'ARCHIVED' && status !== 'ACTIVE'))
            studyFail('CONFLICT'); if (status === 'DELETED')
            studyFail('INVALID_INPUT'); r.state.fields = validateFolder({ ...r.state.fields, ...p }, status === 'ACTIVE', !!r.state.planOrigin); if (status !== 'DRAFT') delete r.state.fields.wizardStep; await validateFiles(tx, owner, id, r.state.fields, Object.hasOwn(p, 'linkedClassroomId')); r.status = status as FolderRow['status']; if (status === 'ARCHIVED')
            await options.agenda?.cancel(tx, owner, id); return { folder: projectFolder(await save(tx, r)) }; }); },
        async command(request: unknown, id: string, input: unknown) { const command = studyObject(input); if (command.action === 'CANCEL_GENERATION') return cancelGeneration(request,id,command); if (['CHAT', 'GENERATE', 'RETRY_FEEDBACK'].includes(String(command.action)))
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



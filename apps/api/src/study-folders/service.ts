import { randomUUID, createHash } from 'node:crypto';
import { studyFail, studyId, studyObject, studyRevision, validateFolder, type FolderFields } from '../../../../src/core/domain/study-folders.ts';
import { CLASSROOM_COVER_KEYS } from '../../../../src/core/domain/classroom-cover.ts';
import { linkedClassrooms, verifyLink, folderSources } from './sources.ts';
import { projectFolderSummary,type StudySummaryRow,projectFolder, type FolderRow, type StudyState, type StudyOptions, type StudyQuery } from './types.ts';
import { runCommand, publicState } from './commands.ts';
// Operational UTF-8 budget for the complete persisted JSON, receipts included.
// Leaves headroom below the existing 4 MiB HTTP proxy response limit; it is not
// a production storage quota. Resources are rejected atomically, never truncated.
export const STUDY_FOLDER_STATE_MAX_BYTES = 3_000_000;
function serializeState(state: StudyState): string {
    const json = JSON.stringify(state);
    if (Buffer.byteLength(json, 'utf8') > STUDY_FOLDER_STATE_MAX_BYTES) studyFail('QUOTA_EXCEEDED');
    return json;
}
export function createStudyService(options: StudyOptions) {
    async function run<T>(request: unknown, write: boolean, op: (tx: StudyQuery, owner: string) => Promise<T>): Promise<T> {
        return options.database.$transaction(async (raw) => {
            const tx: StudyQuery = { query: (sql, ...v) => raw.$queryRawUnsafe(sql, ...v) };
            const owner = studyId(await options.authenticate(tx, request, write));
            const [actor] = await tx.query<{
                account_role: string;
                email_verified_at: Date | null;
            }>(`SELECT account_role,email_verified_at FROM users WHERE id=$1::uuid ${write ? 'FOR UPDATE' : 'FOR SHARE'}`, owner);
            if (actor?.account_role !== 'student' || !actor.email_verified_at)
                studyFail('FORBIDDEN');
            if (await options.authenticate(tx, request, write) !== owner)
                studyFail('FORBIDDEN');
            const result = await op(tx, owner);
            if (await options.authenticate(tx, request, write) !== owner)
                studyFail('FORBIDDEN');
            return result;
        }, { maxWait: 3000, timeout: 30000 });
    }
    async function load(tx: StudyQuery, owner: string, id: unknown, write: boolean) { const [r] = await tx.query<FolderRow>(`SELECT * FROM study_folders WHERE id=$1::uuid AND owner_id=$2::uuid AND status<>'DELETED' ${write ? 'FOR UPDATE' : ''}`, studyId(id), owner); if (!r)
        studyFail('FORBIDDEN'); return r; }
    async function save(tx: StudyQuery, r: FolderRow) { const json=serializeState(r.state); const [saved] = await tx.query<FolderRow>(`UPDATE study_folders SET state=$3::jsonb,status=$4,revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid AND owner_id=$2::uuid RETURNING *`, r.id, r.owner_id, json, r.status); if (!saved)
        studyFail('CONFLICT'); return saved; }
    async function validateFiles(tx: StudyQuery, owner: string, id: string, fields: FolderFields) { await verifyLink(tx, owner, fields.linkedClassroomId); if (fields.planFileId) {
        if (!options.files)
            studyFail('FILE_NOT_READY');
        await options.files.assertOwn(tx, owner, id, fields.planFileId, 'plan');
    } }
    async function generatedCommand(request: unknown, id: string, p: Record<string, unknown>) {
        const requestId = studyId(p.requestId), hash = createHash('sha256').update(JSON.stringify({ ...p, revision: undefined })).digest('hex');
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
        const inputHash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
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
            const generated = operation.mode === 'feedback' ? await options.feedback?.(captured as Parameters<NonNullable<StudyOptions['feedback']>>[0], { ownerId: prepared.ownerId!, requestId, authorize }) : await options.generate?.(captured, { ownerId: prepared.ownerId!, requestId, authorize });
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
        async list(request: unknown) { return run(request, false, async (tx, owner) => ({ items: (await tx.query<StudySummaryRow>(`SELECT id,owner_id,status,revision,created_at,updated_at,(state->'fields')-'units' AS fields FROM study_folders WHERE owner_id=$1::uuid AND status<>'DELETED' ORDER BY updated_at DESC,id`, owner)).map(projectFolderSummary), classrooms: await linkedClassrooms(tx, owner), covers: CLASSROOM_COVER_KEYS.map(key => ({ key, label: key, color: '#e99e5a' })) })); },
        async create(request: unknown, input: unknown) {
            return run(request, true, async (tx, owner) => {
                const p = { ...studyObject(input) }, status = p.status ?? 'DRAFT';
                delete p.status;
                if (!['DRAFT', 'ACTIVE'].includes(String(status)))
                    studyFail('INVALID_INPUT');
                const fields = validateFolder(p, status === 'ACTIVE'), id = randomUUID();
                await validateFiles(tx, owner, id, fields);
                const [{ count }] = await tx.query<{
                    count: bigint;
                }>(`SELECT count(*) AS count FROM study_folders WHERE owner_id=$1::uuid AND status<>'DELETED'`, owner);
                if (Number(count) >= 200)
                    studyFail('QUOTA_EXCEEDED');
                const state: StudyState = { version: 1, fields, materials: [], conversations: [], creations: [], practices: [], exams: [], memory: {}, receipts: {} };
                const [row] = await tx.query<FolderRow>(`INSERT INTO study_folders(id,owner_id,status,state) VALUES($1::uuid,$2::uuid,$3,$4::jsonb) RETURNING *`, id, owner, status, serializeState(state));
                return { folder: projectFolder(row!) };
            });
        },
        async get(request: unknown, id: string) { return run(request, false, async (tx, owner) => { const r = await load(tx, owner, id, false); const sources = await folderSources(tx, r, options); return { folder: projectFolder(r), sources: sources.map(({ text: _, ...s }) => s), ...publicState(r.state, sources) }; }); },
        async patch(request: unknown, id: string, input: unknown) { return run(request, true, async (tx, owner) => { const p = { ...studyObject(input) }, r = await load(tx, owner, id, true); if (studyRevision(p.revision) !== String(r.revision))
            studyFail('CONFLICT'); delete p.revision; const status = p.status ?? r.status; delete p.status; if ((r.status === 'ACTIVE' && status === 'DRAFT') || !['DRAFT', 'ACTIVE', 'ARCHIVED', 'DELETED'].includes(String(status)) || (r.status === 'ARCHIVED' && status !== 'ACTIVE'))
            studyFail('CONFLICT'); if (status === 'DELETED')
            studyFail('INVALID_INPUT'); r.state.fields = validateFolder({ ...r.state.fields, ...p }, status === 'ACTIVE'); await validateFiles(tx, owner, id, r.state.fields); r.status = status as FolderRow['status']; if (status === 'ARCHIVED')
            await options.agenda?.cancel(tx, owner, id); return { folder: projectFolder(await save(tx, r)) }; }); },
        async command(request: unknown, id: string, input: unknown) { const command = studyObject(input); if (['CHAT', 'GENERATE', 'RETRY_FEEDBACK'].includes(String(command.action)))
            return generatedCommand(request, id, command); return run(request, true, async (tx, owner) => { const p = command, r = await load(tx, owner, id, true), requestId = studyId(p.requestId), hash = createHash('sha256').update(JSON.stringify({ ...p, revision: undefined })).digest('hex'); const prior = r.state.receipts[requestId]; if (prior) {
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



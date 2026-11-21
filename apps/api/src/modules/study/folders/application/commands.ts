import { validateStudyCommand } from '../../domain/command-policy.ts';
import { isAiBudgetRejectionCode, readAiMonthlyQuotaRejection } from '../../../../../../../src/core/contracts/ai-quota.ts';
import type { StudyCommandPorts } from '../../application/ports.ts';
import { studyFail, studyId, validateFolder } from '../../../../../../../src/core/domain/study/folders.ts';
import { studyResourceMarkdown } from '../../../../../../../src/core/domain/study/resource-markdown.ts';
import { STUDY_GENERATION_PENDING_MS } from '../../domain/state.ts';
import type { FolderRow, StudyState, StudyQuery, StudySource, StudyGenerationIntent, StudyGenerationView } from '../../application/contracts.ts';
import { refsAvailable, runSourcesCommand } from '../../sources/public.ts';
import { practiceView, runPracticesCommand } from '../../practices/public.ts';
import { runConversationsCommand } from '../../conversations/public.ts';
import { runReviewsCommand } from '../../reviews/public.ts';
import { runGenerationCommand } from '../../generation/public.ts';
function generationView(intent: StudyGenerationIntent, state: StudyState): StudyGenerationView {
    const receipt = state.receipts[intent.requestId], result = receipt?.result as Record<string, unknown> | undefined;
    if (result?.status === 'PENDING' && receipt?.pendingAt && Date.now() - Date.parse(receipt.pendingAt) > STUDY_GENERATION_PENDING_MS)
        return { ...intent, status: 'FAILED', reason: 'INTERRUPTED' };
    if (result?.status === 'PENDING' || result?.status === 'CANCELLED') return { ...intent, status: result.status };
    if (result?.status === 'INSUFFICIENT') return { ...intent, status: 'INSUFFICIENT', missingInformation: result.missingInformation as string[] };
    if (result?.creation || result?.practice || result?.exam) return { ...intent, status: 'COMPLETE' };
    if (isAiBudgetRejectionCode(result?.errorCode)) {
        const quota = result.errorCode === 'AI_MONTHLY_BUDGET_EXCEEDED' ? readAiMonthlyQuotaRejection(result.quota) : undefined;
        return { ...intent, status: 'FAILED', errorCode: result.errorCode, ...(quota ? { quota } : {}) };
    }
    return { ...intent, status: 'FAILED', ...(result?.reason === 'INTERRUPTED' ? { reason: 'INTERRUPTED' as const } : {}) };
}
export function publicState(state: StudyState, sources: StudySource[], attachments: StudySource[] = []) {
    return { conversations: state.conversations.map(c => {
        const allowed = [...sources, ...attachments.filter(source => source.conversationId === c.id)];
        const turns = c.turns.map(({ attachmentIds: _, ...turn }) =>
            ({ ...turn, ...(turn.generation ? { generation: generationView(turn.generation as StudyGenerationIntent, state) } : {}), sourceUnavailable: !refsAvailable(turn, allowed) }));
        return { ...c, turns, sourceUnavailable: turns.some(turn => turn.sourceUnavailable) };
    }), creations: state.creations.map(c => ({
        ...c,
        markdown: c.revision === 1 && typeof c.markdown === 'string' ? studyResourceMarkdown(c.markdown) : c.markdown,
        sourceUnavailable: !refsAvailable(c, [...sources, ...attachments.filter(source => c.conversationId && source.conversationId === c.conversationId)]),
    })),
    practices: state.practices.map(practiceView), exams: state.exams, memory: state.memory };
}
async function validatePlan(tx: StudyQuery, row: FolderRow, options: StudyCommandPorts) {
    const fields = validateFolder(row.state.fields, true, !!row.state.planOrigin);
    if (fields.planFileId) {
        if (!options.files) studyFail('FILE_NOT_READY');
        await options.files.assertOwn(tx, row.owner_id, row.id, fields.planFileId, 'plan');
    }
    row.state.fields = fields;
}
export async function runCommand(tx: StudyQuery, r: FolderRow, p: Record<string, unknown>, options: StudyCommandPorts): Promise<unknown> {
    const action = String(p.action), s = r.state, topics = s.fields.units.flatMap(u => u.topics);
    validateStudyCommand(r, p);
    if (action === 'IMPORT_CLASSROOM_PLAN') {
        const classroomId = p.classroomId === undefined ? s.fields.linkedClassroomId : studyId(p.classroomId);
        if (r.status !== 'DRAFT' || !classroomId || s.planOrigin?.classroomId === classroomId) studyFail('CONFLICT');
        const source = await options.importPlan(tx, r.owner_id, classroomId);
        if (!source) studyFail('FORBIDDEN');
        const units = source.units.map(unit => ({ id: options.newId(), title: unit.title,
            topics: unit.topics.map(topic => ({ id: options.newId(), title: topic.title })) }));
        s.fields = validateFolder({ ...s.fields, linkedClassroomId: classroomId, units }, false);
        s.planOrigin = { classroomId, classroomRevision: source.revision };
        return { units: s.fields.units };
    }
    if (action === 'CONFIRM_FOLDER') {
        await validatePlan(tx, r, options);
        r.status = 'ACTIVE';
        return {};
    }
    if (action === 'ARCHIVE' || action === 'DELETE' || action === 'REACTIVATE') {
        if (action === 'DELETE' && p.confirmed !== true)
            studyFail('INVALID_INPUT');
        r.status = action === 'DELETE' ? 'DELETED' : action === 'ARCHIVE' ? 'ARCHIVED' : 'ACTIVE';
        if (r.status === 'ACTIVE') {
            await validatePlan(tx, r, options);
        } else
            await options.agenda?.cancel(tx, r.owner_id, r.id);
        return {};
    }
    if (['ADD_MATERIAL', 'EDIT_MATERIAL', 'REMOVE_MATERIAL'].includes(action)) return runSourcesCommand(tx, r, p, options);
    if (['NEW_CONVERSATION', 'RENAME_CONVERSATION'].includes(action)) return runConversationsCommand(tx, r, p, options);
    if (['NEW_ATTEMPT', 'SAVE_ANSWERS', 'CONFIRM_PRACTICE_ANSWER', 'FINALIZE_PRACTICE', 'RETRY_FEEDBACK'].includes(action)) return runPracticesCommand(tx, r, p, options);
    if (['PLAN_EXAM', 'EDIT_EXAM', 'CONFIRM_AGENDA'].includes(action)) return runReviewsCommand(tx, r, p, options);
    return runGenerationCommand(tx, r, p, options);
}

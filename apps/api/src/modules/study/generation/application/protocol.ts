import type { StudyResult } from '../../../../../../../src/core/domain/study/engine.ts';
import { studyFail } from '../../../../../../../src/core/domain/study/folders.ts';
import type { StudyCommandPorts, StudyProviderPort } from '../../application/ports.ts';
import type { FolderRow, StudyQuery, StudyFeedbackResult, StudyImageRaster } from '../../application/contracts.ts';
import { validateStudyCommand } from '../../domain/command-policy.ts';
import { preparePracticeFeedback, applyPracticeFeedback, type PreparedPracticeFeedback } from '../../practices/public.ts';
import { prepareStudyGeneration, reserveStudyGeneration, applyStudyGeneration, type PreparedStudyGeneration } from './study-generation.ts';
import { prepareStudyImage, reserveStudyImage, applyStudyImage, type PreparedStudyImage } from './study-image.ts';

export type PreparedStudyOperation = PreparedStudyGeneration | PreparedPracticeFeedback | PreparedStudyImage;
export type GeneratedStudyOutput = { mode: 'generate'; value: StudyResult } | { mode: 'feedback'; value: StudyFeedbackResult } | { mode: 'image'; value: StudyImageRaster };
type ContextPorts = Pick<StudyCommandPorts, 'sources' | 'files'>;
type Authorization = { ownerId: string; requestId: string; folderId: string; authorize?: () => Promise<void> };

/** Prepare authorized input only: no provider, receipt, ID allocation or resource mutation. */
export async function prepareStudyOperation(tx: StudyQuery, row: FolderRow, command: Record<string, unknown>, ports: ContextPorts): Promise<PreparedStudyOperation> {
    validateStudyCommand(row, command);
    if (command.action === 'RETRY_FEEDBACK') return preparePracticeFeedback(tx, row, command, ports);
    if (command.action === 'GENERATE' && command.kind === 'IMAGE') return prepareStudyImage(row, command);
    if (command.action === 'CHAT' || command.action === 'GENERATE') return prepareStudyGeneration(tx, row, command, ports);
    studyFail('INVALID_INPUT');
}

/** Persist only the user intent with PENDING; the caller owns its transaction and receipt. */
export function reserveStudyOperation(row: FolderRow, plan: PreparedStudyOperation, ports: Pick<StudyCommandPorts, 'newId'>): void {
    if (plan.mode === 'generate') reserveStudyGeneration(row, plan, ports);
    if (plan.mode === 'image') reserveStudyImage(row, plan, ports);
}

/** Reauthorize the source snapshot without replaying a command or applying effects. */
export async function validatePreparedStudyOperation(tx: StudyQuery, row: FolderRow, command: Record<string, unknown>, previous: PreparedStudyOperation,
    ports: ContextPorts, digest: (text: string) => string): Promise<PreparedStudyOperation> {
    const current = await prepareStudyOperation(tx, row, command, ports);
    const hash = (input: PreparedStudyOperation['input']) => digest(JSON.stringify(input));
    if (current.mode !== previous.mode || hash(current.input) !== hash(previous.input)) studyFail('SOURCE_UNAVAILABLE');
    return current;
}

/** Called only outside a folder UoW, after its durable intent and authorization have completed. */
export async function executePreparedStudyOperation(plan: PreparedStudyOperation, provider: StudyProviderPort, context: Authorization): Promise<GeneratedStudyOutput> {
    if (plan.mode === 'image') {
        const value = await provider.images?.generate?.(plan.input, context);
        if (value === undefined) studyFail('AI_UNAVAILABLE');
        return { mode: 'image', value };
    }
    if (plan.mode === 'feedback') {
        const value = await provider.feedback?.(plan.input, context);
        if (value === undefined) studyFail('AI_UNAVAILABLE');
        return { mode: 'feedback', value };
    }
    const value = await provider.generate?.(plan.input, context);
    if (value === undefined) studyFail('AI_UNAVAILABLE');
    return { mode: 'generate', value };
}

/** Caller checks revision/cancellation, validates, then saves artifact and terminal receipt in the same UoW. */
export async function applyPreparedStudyOperation(tx: StudyQuery, row: FolderRow, plan: PreparedStudyOperation, output: GeneratedStudyOutput,
    ports: Pick<StudyCommandPorts, 'newId' | 'sources' | 'files' | 'images'>) {
    if (plan.mode === 'image' && output.mode === 'image') return applyStudyImage(tx, row, plan, output.value, ports);
    if (plan.mode === 'generate' && output.mode === 'generate') return applyStudyGeneration(tx, row, plan, output.value, ports);
    if (plan.mode === 'feedback' && output.mode === 'feedback') return applyPracticeFeedback(row, plan, output.value);
    studyFail('SOURCE_UNAVAILABLE');
}

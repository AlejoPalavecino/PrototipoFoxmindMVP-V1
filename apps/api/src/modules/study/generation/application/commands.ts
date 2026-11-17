import type { StudyCommandPorts } from '../../application/ports.ts';
import type { FolderRow, StudyQuery } from '../../application/contracts.ts';
import { studyFail, studyId, studyText } from '../../../../../../../src/core/domain/study/folders.ts';
export async function runGenerationCommand(tx: StudyQuery, r: FolderRow, p: Record<string, unknown>, options: StudyCommandPorts): Promise<unknown> {
    const action = String(p.action), s = r.state;
    if (action === 'EDIT_CREATION') {
        const c = s.creations.find(c => c.id === studyId(p.creationId));
        if (!c)
            studyFail('FORBIDDEN');
        c.title = studyText(p.title);
        c.markdown = studyText(p.body, 80000);
        c.revision = Number(c.revision ?? 1) + 1;
        return { creation: c };
    }
    studyFail('INVALID_INPUT');
}

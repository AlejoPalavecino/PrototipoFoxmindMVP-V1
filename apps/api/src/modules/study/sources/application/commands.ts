import type { StudyCommandPorts } from '../../application/ports.ts';
import type { FolderRow, StudyQuery } from '../../application/contracts.ts';
import { STUDY_MATERIAL_LIMIT, studyFail, studyId, studyText } from '../../../../../../../src/core/domain/study/folders.ts';
import { selectTopics } from '../domain/topics.ts';
export async function runSourcesCommand(tx: StudyQuery, r: FolderRow, p: Record<string, unknown>, options: StudyCommandPorts): Promise<unknown> {
    const action = String(p.action), s = r.state, topics = s.fields.units.flatMap(u => u.topics);
    if (action === 'ADD_MATERIAL') {
        if (s.materials.length >= STUDY_MATERIAL_LIMIT)
            studyFail('QUOTA_EXCEEDED');
        const fileId = studyId(p.fileId);
        if (!options.files)
            studyFail('FILE_NOT_READY');
        await options.files.assertOwn(tx, r.owner_id, r.id, fileId, 'material');
        if (s.materials.some(m => m.fileId === fileId))
            studyFail('CONFLICT');
        const topicIds = selectTopics(p.topicIds, topics).map(t => t.id);
        const material = { id: options.newId(), fileId, title: studyText(p.title), topicIds };
        s.materials.push(material);
        return { material };
    }
    if(action==='EDIT_MATERIAL'){const material=s.materials.find(m=>m.id===studyId(p.materialId));if(!material)studyFail('FORBIDDEN');material.title=studyText(p.title);material.topicIds=selectTopics(p.topicIds,topics).map(t=>t.id);return {material};}
    if (action === 'REMOVE_MATERIAL') {
        const id = studyId(p.materialId);
        if (!s.materials.some(m => m.id === id))
            studyFail('FORBIDDEN');
        s.materials = s.materials.filter(m => m.id !== id);
        return {};
    }
    studyFail('INVALID_INPUT');
}

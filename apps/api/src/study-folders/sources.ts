import { studyFail } from '../../../../src/core/domain/study-folders.ts';
import type { StudyQuery, StudySource, FolderRow, StudyOptions } from './types.ts';
export async function linkedClassrooms(tx: StudyQuery, owner: string) { return tx.query<{
    id: string;
    name: string;
    academicYear: number;
}>(`SELECT c.id,c.name,c.academic_year AS "academicYear" FROM classrooms c JOIN enrollments e ON e.classroom_id=c.id AND e.student_id=$1::uuid JOIN membership_periods p ON p.enrollment_id=e.id AND p.ended_at IS NULL ORDER BY c.name,c.id`, owner); }
export async function verifyLink(tx: StudyQuery, owner: string, id: string | null) { if (id && !(await linkedClassrooms(tx, owner)).some(c => c.id === id))
    studyFail('FORBIDDEN'); }
export async function folderSources(tx: StudyQuery, row: FolderRow, options: StudyOptions): Promise<StudySource[]> {
    const out: StudySource[] = [];
    if (row.state.fields.planFileId && options.files) {
        try {
            const fileId = row.state.fields.planFileId;
            await options.files.assertOwn(tx, row.owner_id, row.id, fileId, 'plan');
            out.push({id:fileId,version:fileId,title:'Plan de estudio',kind:'PLAN',readable:true,origin:'OWN',fileId,text:'',available:true});
        } catch { /* A revoked plan remains unavailable as context. */ }
    }
    for (const m of row.state.materials) {
        try {
            if (!options.files)
                continue;
            await options.files.assertOwn(tx, row.owner_id, row.id, m.fileId, 'material');
            const [upload] = await tx.query<{extension:string}>('SELECT extension FROM study_folder_uploads WHERE id=$1::uuid AND owner_id=$2::uuid AND folder_id=$3::uuid',m.fileId,row.owner_id,row.id);
            out.push({ id: m.id, version: m.fileId, title: m.title,kind:'MATERIAL',readable:upload ? ['pdf','docx'].includes(upload.extension) : true, origin: 'OWN', fileId: m.fileId, text: '', available: true });
        }
        catch { /* Revoked or quarantined bytes are unavailable. */ }
    }
    const classroomId = row.state.fields.linkedClassroomId;
    if (classroomId && (await linkedClassrooms(tx, row.owner_id)).some(c => c.id === classroomId)) {
        const materials = await tx.query<{
            id: string;
            title: string;
            file_id: string;
            body: string | null;
            extension: string;
            updated_at: Date;
        }>(`SELECT m.id,m.title,m.file_id,m.body,m.updated_at,f.extension FROM materials m JOIN files f ON f.id=m.file_id WHERE m.classroom_id=$1::uuid AND m.deleted_at IS NULL AND f.blob_deleted_at IS NULL AND f.validation_status='APPROVED' AND f.scan_status='CLEAN' AND NOT EXISTS(SELECT 1 FROM material_revisions r WHERE r.previous_id=m.id) ORDER BY m.created_at,m.id`, classroomId);
        out.push(...materials.map(m => ({ id: m.id, version: m.id, title: m.title,kind:'MATERIAL' as const,readable:!!m.body?.trim()||['pdf','docx'].includes(m.extension), origin: 'CLASSROOM' as const, fileId: m.file_id, text: m.body ?? '', available: true })));
    }
    return out;
}

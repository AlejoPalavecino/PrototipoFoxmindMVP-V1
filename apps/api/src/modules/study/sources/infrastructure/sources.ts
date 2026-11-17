import { DOCUMENT_MAX_BYTES, isDocumentExtension } from '../../../../../../../src/core/domain/documents/document-formats.ts';
import { studyFail } from '../../../../../../../src/core/domain/study/folders.ts';
import type { StudyQuery, StudySource, FolderRow, StudyOptions } from '../../application/contracts.ts';
export async function linkedClassrooms(tx: StudyQuery, owner: string) { return tx.query<{
    id: string;
    name: string;
    academicYear: number;
    archived: boolean;
}>(`SELECT c.id,c.name,c.academic_year AS "academicYear",c.archived_at IS NOT NULL AS archived FROM classrooms c JOIN enrollments e ON e.classroom_id=c.id AND e.student_id=$1::uuid JOIN membership_periods p ON p.enrollment_id=e.id AND p.ended_at IS NULL ORDER BY c.name,c.id`, owner); }
export async function importClassroomPlan(tx: StudyQuery, owner: string, id: string) {
    const [room] = await tx.query<{ revision: bigint }>(`SELECT c.revision FROM classrooms c
        JOIN enrollments e ON e.classroom_id=c.id AND e.student_id=$1::uuid
        JOIN membership_periods p ON p.enrollment_id=e.id AND p.ended_at IS NULL
        WHERE c.id=$2::uuid FOR SHARE OF c,p`, owner, id);
    if (!room) return null;
    const units = await tx.query<{ id: string; title: string }>(`SELECT id,name AS title FROM units
        WHERE classroom_id=$1::uuid ORDER BY position,id LIMIT 101`, id);
    if (units.length > 100) studyFail('AI_INPUT_LIMIT');
    const topics = await tx.query<{ id: string; unit_id: string; title: string }>(`SELECT id,unit_id,name AS title FROM topics
        WHERE classroom_id=$1::uuid ORDER BY position,id LIMIT 20001`, id);
    if (topics.length > 20000) studyFail('AI_INPUT_LIMIT');
    return { revision: String(room.revision), units: units.map(unit => ({ ...unit,
        topics: topics.filter(topic => topic.unit_id === unit.id).map(({ id, title }) => ({ id, title })),
    })) };
}
export async function verifyLink(tx: StudyQuery, owner: string, id: string | null) { if (id && !(await linkedClassrooms(tx, owner)).some(c => c.id === id))
    studyFail('FORBIDDEN'); }
export async function folderSources(tx: StudyQuery, row: FolderRow, options: StudyOptions): Promise<StudySource[]> {
    const out: StudySource[] = [];
    if (row.state.fields.planFileId && options.files) {
        try {
            const fileId = row.state.fields.planFileId;
            await options.files.assertOwn(tx, row.owner_id, row.id, fileId, 'plan');
            const [upload] = await tx.query<{extension: string}>('SELECT extension FROM study_folder_uploads WHERE id=$1::uuid AND owner_id=$2::uuid AND folder_id=$3::uuid', fileId, row.owner_id, row.id);
            out.push({id:fileId,version:fileId,title:'Plan de estudio',kind:'PLAN',readable:true,origin:'OWN',fileId,text:'',available:true,extension:upload?.extension});
        } catch { /* A revoked plan remains unavailable as context. */ }
    }
    for (const m of row.state.materials) {
        try {
            if (!options.files)
                continue;
            await options.files.assertOwn(tx, row.owner_id, row.id, m.fileId, 'material');
            const [upload] = await tx.query<{extension:string; size_bytes: bigint; from_chat_copy:boolean}>(`SELECT extension,size_bytes,
                EXISTS(SELECT 1 FROM chat_attachments a WHERE a.id=u.id AND a.owner_id=u.owner_id AND a.folder_id=u.folder_id) AS from_chat_copy
                FROM study_folder_uploads u WHERE id=$1::uuid AND owner_id=$2::uuid AND folder_id=$3::uuid`,m.fileId,row.owner_id,row.id);
            out.push({ id: m.id, version: m.fileId, title: m.title,kind:'MATERIAL',readable:upload ? isDocumentExtension(upload.extension) && upload.size_bytes <= BigInt(DOCUMENT_MAX_BYTES) : true,
                origin: 'OWN', fileId: m.fileId, text: '', available: true, extension: upload?.extension, ...(upload?.from_chat_copy ? { fromChatCopy: true } : {}) });
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
            size_bytes: bigint;
            updated_at: Date;
        }>(`SELECT m.id,m.title,m.file_id,m.body,m.updated_at,f.extension,f.size_bytes FROM materials m JOIN files f ON f.id=m.file_id WHERE m.classroom_id=$1::uuid AND m.deleted_at IS NULL AND f.blob_deleted_at IS NULL AND f.validation_status='APPROVED' AND f.scan_status='CLEAN' AND NOT EXISTS(SELECT 1 FROM material_revisions r WHERE r.previous_id=m.id) ORDER BY m.created_at,m.id`, classroomId);
        out.push(...materials.map(m => ({ id: m.id, version: m.id, title: m.title,kind:'MATERIAL' as const,readable:!!m.body?.trim()||(isDocumentExtension(m.extension)&& m.size_bytes <= BigInt(DOCUMENT_MAX_BYTES)), origin: 'CLASSROOM' as const, fileId: m.file_id, text: m.body ?? '', available: true, extension: m.extension })));
    }
    return out;
}

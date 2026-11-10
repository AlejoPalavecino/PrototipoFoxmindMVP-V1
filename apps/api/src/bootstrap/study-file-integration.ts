import {createHash} from 'node:crypto';
import { inspectContent } from '../modules/files/infrastructure/content.ts';
import { parseActivityDocument } from '../modules/files/infrastructure/activity-document.ts';
import type { FileService } from '../modules/files/infrastructure/service.ts';
import { createStudyFiles } from '../modules/study/infrastructure/folders/uploads/service.ts';
import { studyFileError, studyFileReady } from '../modules/study/infrastructure/folders/uploads/upload-policy.ts';
import type { StudyUploadRow, StudyFilePorts } from '../modules/study/infrastructure/folders/uploads/types.ts';
import type { StudyOptions, StudySource } from '../modules/study/application/contracts.ts';

export function createStudyFileIntegration(files:FileService,options:Pick<StudyFilePorts,'database'|'authenticate'|'quotaBytes'>) {
  const uploads=createStudyFiles({...options,storage:files.storage,inspect:inspectContent,scan:bytes=>files.scanner.scan(bytes)});
  const port:NonNullable<StudyOptions['files']>={
    async assertOwn(tx,ownerId,folderId,fileId,purpose) {
      const [row]=await tx.query<StudyUploadRow>('SELECT * FROM study_folder_uploads WHERE id=$1::uuid AND folder_id=$2::uuid AND owner_id=$3::uuid AND purpose=$4',fileId,folderId,ownerId,purpose);
      if(!row||!studyFileReady(row))return studyFileError('FILE_NOT_READY');
    },
    async readText(tx,source) {return (await read(tx,source)).text;},
    async readSource(tx,source) {return read(tx,source);},
  };
  async function read(tx:Parameters<NonNullable<StudyOptions['files']>['assertOwn']>[0],source:StudySource) {
    if(!source.available||!source.fileId)return {text:source.text};
    if(!source.ownerId||!source.folderId)return studyFileError('FORBIDDEN');
    const [folder]=await tx.query<{status:string;classroom_id:string|null}>(`SELECT status,state->'fields'->>'linkedClassroomId' AS classroom_id FROM study_folders WHERE id=$1::uuid AND owner_id=$2::uuid`,source.folderId,source.ownerId);
    if(!folder||folder.status==='DELETED')return studyFileError('FORBIDDEN');
    let row:{storage_key:string;extension:string;size_bytes:bigint;digest:string|null;phase?:string;validated_digest:string|null;scanned_digest:string|null}|undefined;
    if(source.origin==='OWN') {
      [row]=await tx.query<StudyUploadRow>('SELECT * FROM study_folder_uploads WHERE id=$1::uuid AND owner_id=$2::uuid AND folder_id=$3::uuid',source.fileId,source.ownerId,source.folderId);
      if(!row||!studyFileReady(row as StudyUploadRow))return studyFileError('FILE_NOT_READY');
    }else{
      if(!source.classroomId||folder.classroom_id!==source.classroomId)return studyFileError('FORBIDDEN');
      [row]=await tx.query<{storage_key:string;extension:string;size_bytes:bigint;digest:string;validated_digest:string;scanned_digest:string}>(`SELECT f.storage_key,f.extension,f.size_bytes,c.digest,c.validated_digest,c.scanned_digest FROM files f
        JOIN uploads u ON u.file_id=f.id JOIN file_custodies c ON c.file_id=f.id
        JOIN materials m ON m.file_id=f.id AND m.id=$2::uuid AND m.classroom_id=$3::uuid
        WHERE f.id=$1::uuid AND m.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM material_revisions mr WHERE mr.previous_id=m.id)
        AND EXISTS(SELECT 1 FROM enrollments e JOIN membership_periods p ON p.enrollment_id=e.id AND p.ended_at IS NULL WHERE e.student_id=$4::uuid AND e.classroom_id=m.classroom_id)
        AND u.status='COMPLETED' AND c.phase='ready' AND c.purpose='material' AND c.digest=c.validated_digest AND c.digest=c.scanned_digest
        AND f.validation_status='APPROVED' AND f.scan_status='CLEAN' AND f.blob_deleted_at IS NULL`,source.fileId,source.id,source.classroomId,source.ownerId);
      if(!row||row.digest!==row.validated_digest||row.digest!==row.scanned_digest)return studyFileError('FILE_NOT_READY');
    }
    if(!['pdf','docx'].includes(row.extension))return {text:source.text};
    const bytes=await files.storage.get(row.storage_key,Number(row.size_bytes));
    if(bytes.length!==Number(row.size_bytes)||createHash('sha256').update(bytes).digest('hex')!==row.digest)return studyFileError('FILE_NOT_READY');
    const parsed=await parseActivityDocument(bytes,row.extension as 'pdf'|'docx',AbortSignal.timeout(5000));
    return {text:parsed.document.kind==='text'?parsed.document.text:source.text,document:parsed.document};
  }
  // The folder service authorizes the exact source/version both before and after generation.
  return {uploads,port,readSource:read};
}

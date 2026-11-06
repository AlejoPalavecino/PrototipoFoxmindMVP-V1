import { createLibraryMaterialPublisher } from './library-publication.ts';
import type { ClassroomFileOperations } from './classroom-file.ts';
import type { ClassroomCore } from './core.ts';
import { revision } from './revision.ts';
import { fail, object, text, uuid } from './policy.ts';
import type { Transaction } from './contracts.ts';
import {createHash} from 'node:crypto';
import {createTextDocument} from '../../../../src/core/domain/text-document.ts';
function materialText(value: unknown): string | null {
  if(value===null||value===undefined)return null;
  if(typeof value!=='string'||[...value].length>20000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value))return fail('INVALID_INPUT');
  return value||null;
}

/** Material identity and file bytes are permanent; organization may change independently of activity links. */
export class LibraryService {
  private readonly run: ClassroomCore['run'];
  private readonly classroom: ClassroomCore['classroom'];
  private readonly publisher: ReturnType<typeof createLibraryMaterialPublisher>;
  private readonly advanceRevision: ClassroomFileOperations['advanceRevision'];
  private readonly readyFile: ClassroomFileOperations['readyClassroomFile'];
  constructor(context: Pick<ClassroomCore, 'run' | 'classroom'>, dependencies: Pick<ClassroomFileOperations, 'readyClassroomFile' | 'advanceRevision'>) {
    this.run = context.run.bind(context);
    this.classroom = context.classroom.bind(context);
    this.publisher = createLibraryMaterialPublisher(dependencies);
    this.advanceRevision = dependencies.advanceRevision;
    this.readyFile = dependencies.readyClassroomFile.bind(dependencies);
  }
  listMaterials(request: unknown, classroomId: string) {
    return this.run(request, false, async (tx, actor) => {
      const classroom = await this.classroom(tx, actor, classroomId);
      return tx.query(`SELECT m.id,m.title,m.body,m.resource_use AS "resourceUse",m.content_kind AS "contentKind",m.file_id AS "fileId",m.unit_id AS "unitId",m.topic_id AS "topicId",
        f.original_name AS "fileName",f.extension,f.size_bytes::text AS "sizeBytes",
        (m.deleted_at IS NOT NULL) AS deleted,(m.deleted_at IS NOT NULL AND f.blob_deleted_at IS NULL) AS "deletionPending",
        (m.deleted_at IS NULL AND f.blob_deleted_at IS NULL AND c.phase='ready' AND f.validation_status='APPROVED' AND f.scan_status='CLEAN'
          AND u.status='COMPLETED' AND c.digest IS NOT NULL AND c.digest=c.validated_digest AND c.digest=c.scanned_digest) AS ready,
        (m.deleted_at IS NULL AND f.extension IN ('pdf','jpg','jpeg','png')) AS previewable,
        EXISTS(SELECT 1 FROM activity_materials a WHERE a.material_id=m.id) AS linked,
        (SELECT r.current_id FROM material_revisions r WHERE r.previous_id=m.id) AS "supersededBy"
        FROM materials m JOIN files f ON f.id=m.file_id JOIN file_custodies c ON c.file_id=f.id JOIN uploads u ON u.file_id=f.id
        WHERE m.classroom_id=$1::uuid AND ($2::boolean OR (m.deleted_at IS NULL AND f.blob_deleted_at IS NULL
          AND c.phase='ready' AND f.validation_status='APPROVED' AND f.scan_status='CLEAN' AND u.status='COMPLETED'
          AND c.digest IS NOT NULL AND c.digest=c.validated_digest AND c.digest=c.scanned_digest))
        ORDER BY m.created_at DESC,m.id`, classroomId, classroom.teacher_id === actor.id);
    });
  }

  changeLibrary(request: unknown, classroomId: string, input: unknown) {
    const body = object(input, ['revision', 'operation']), expected = revision(body.revision);
    const op = object(body.operation, ['action', 'id', 'title', 'fileId', 'unitId', 'topicId', 'confirm', 'body', 'resourceUse', 'contentKind']);
    const metadataKeys = ['body','resourceUse','contentKind'].filter(key => Object.hasOwn(op,key));
    const content = materialText(op.body);
    const resourceUse = op.resourceUse ?? 'STUDY', contentKind = op.contentKind ?? 'FILE';
    if (!['STUDY','RECOMMENDED','COMPLEMENTARY'].includes(resourceUse) || !['TEXT','FILE'].includes(contentKind)
      || (contentKind === 'TEXT' && (op.action === 'publish' || Object.hasOwn(op,'body')) && !content?.trim())) return fail('INVALID_INPUT');
    return this.run(request, true, async (tx, actor) => {
      const classroom = await this.classroom(tx, actor, classroomId, true, true);
      if(op.action==='revise') {
        object(op,['action','id','title','fileId','unitId','topicId','body','resourceUse','contentKind']);
        if(contentKind!=='TEXT'||!content?.trim()||!uuid(op.id)||!uuid(op.fileId))return fail('INVALID_INPUT');
        const title=text(op.title,200),previous=await this.material(tx,classroomId,op.id);
        if(previous.content_kind!=='TEXT')return fail('CONFLICT');
        const commandHash=createHash('sha256').update(JSON.stringify([expected,op.id.toLowerCase(),op.fileId.toLowerCase(),title,content,resourceUse,op.unitId,op.topicId])).digest('hex');
        const [existing]=await tx.query<{current_id:string;classroom_revision:bigint}>(`SELECT r.current_id,r.classroom_revision FROM material_revisions r
          WHERE r.previous_id=$1::uuid AND r.command_hash=$2`,op.id,commandHash);
        if(existing)return {revision:String(existing.classroom_revision),materialId:existing.current_id};
        if(classroom.revision.toString()!==expected)return fail('CONFLICT');
        if((await tx.query('SELECT 1 FROM material_revisions WHERE previous_id=$1::uuid',op.id)).length)return fail('CONFLICT');
        await this.verifyText(tx,request,classroomId,op.fileId,title,content);
        const result=await this.publisher.publish(tx,request,actor.id,{classroomId,revision:expected,title,fileId:op.fileId,unitId:op.unitId,topicId:op.topicId});
        await tx.query('UPDATE materials SET body=$2,resource_use=$3,content_kind=$4 WHERE id=$1::uuid',result.materialId,content,resourceUse,'TEXT');
        await tx.query('INSERT INTO material_revisions(previous_id,current_id,classroom_id,classroom_revision,command_hash) VALUES($1::uuid,$2::uuid,$3::uuid,$4::bigint,$5)',op.id,result.materialId,classroomId,result.classroomRevision,commandHash);
        return {revision:result.classroomRevision,materialId:result.materialId};
      }
      if (classroom.revision.toString() !== expected) return fail('CONFLICT');
      const exact = (keys: string[]) => {
        object(op, ['action', ...keys]);
        if (keys.some(key => !Object.hasOwn(op, key))) return fail('INVALID_INPUT');
      };
      if (op.action === 'publish' || op.action === 'edit') {
        exact([...(op.action === 'publish' ? ['title', 'fileId', 'unitId', 'topicId'] : ['id', 'title', 'unitId', 'topicId']),...metadataKeys]);
        const title = text(op.title, 200);
        if (op.action === 'publish') {
          if(contentKind==='TEXT')await this.verifyText(tx,request,classroomId,op.fileId,title,content!);
          const result = await this.publisher.publish(tx, request, actor.id, { classroomId, revision: expected, title,
            fileId: op.fileId, unitId: op.unitId, topicId: op.topicId });
          await tx.query('UPDATE materials SET body=$2,resource_use=$3,content_kind=$4 WHERE id=$1::uuid RETURNING id',result.materialId,content,resourceUse,contentKind);
          return { revision: result.classroomRevision };
        } else {
          await this.materialAssociation(tx, classroomId, op.unitId, op.topicId);
          const previous = await this.material(tx, classroomId, op.id);
          const nextBody=Object.hasOwn(op,'body')?content:previous.body,nextKind=Object.hasOwn(op,'contentKind')?contentKind:previous.content_kind;
          if(nextKind!==previous.content_kind)return fail('CONFLICT');
          if (previous.content_kind === 'TEXT' && (nextKind !== 'TEXT' || nextBody !== previous.body || title!==previous.title)) return fail('CONFLICT');
          if((await tx.query('SELECT 1 FROM material_revisions WHERE previous_id=$1::uuid',op.id)).length)return fail('CONFLICT');
          if (metadataKeys.length) await tx.query(`UPDATE materials SET body=$2,resource_use=$3,content_kind=$4 WHERE id=$1::uuid RETURNING id`,op.id,nextBody,Object.hasOwn(op,'resourceUse')?resourceUse:previous.resource_use,nextKind);
          await tx.query(`UPDATE materials SET title=$2,unit_id=$3::uuid,topic_id=$4::uuid,updated_at=clock_timestamp()
            WHERE id=$1::uuid RETURNING id`, op.id, title, op.unitId, op.topicId);
        }
      } else if (op.action === 'delete') {
        exact(['id', 'confirm']);
        if (op.confirm !== true) return fail('INVALID_INPUT');
        const material = await this.material(tx, classroomId, op.id);
        if((await tx.query('SELECT 1 FROM material_revisions WHERE previous_id=$1::uuid',op.id)).length)return fail('CONFLICT');
        const [linked] = await tx.query(`SELECT 1 FROM activity_materials WHERE material_id=$1::uuid
          UNION ALL SELECT 1 FROM materials WHERE file_id=$2::uuid AND id<>$1::uuid
          UNION ALL SELECT 1 FROM study_plan_versions WHERE file_id=$2::uuid
          UNION ALL SELECT 1 FROM activity_instruction_files WHERE file_id=$2::uuid
          UNION ALL SELECT 1 FROM attempt_attachments WHERE file_id=$2::uuid LIMIT 1`, material.id, material.file_id);
        if (linked) return fail('CONFLICT');
        // Immediate durable denial, not abandoned-upload cleanup. Quota remains until confirmed object removal.
        await tx.query(`UPDATE materials SET deleted_at=clock_timestamp(),unit_id=NULL,topic_id=NULL,updated_at=clock_timestamp()
          WHERE id=$1::uuid RETURNING id`, material.id);
      } else return fail('INVALID_INPUT');
      return this.advanceRevision(tx, classroomId, classroom.revision);
    });
  }

  private async material(tx: Transaction, classroomId: string, id: unknown) {
    if (!uuid(id)) return fail('INVALID_INPUT');
    const [row] = await tx.query<{ id: string; title:string;file_id: string; deleted_at: Date | null; content_kind: string; body: string | null; resource_use: string }>(
      'SELECT id,title,file_id,deleted_at,content_kind,body,resource_use FROM materials WHERE id=$1::uuid AND classroom_id=$2::uuid FOR UPDATE', id, classroomId);
    if (!row) return fail('FORBIDDEN');
    if (row.deleted_at) return fail('CONFLICT');
    return row;
  }
  private async verifyText(tx:Transaction,request:unknown,classroomId:string,fileId:unknown,title:string,body:string){
    const file=await this.readyFile(tx,request,classroomId,fileId,'material');
    const digest=createHash('sha256').update(createTextDocument(title,body)).digest('hex');
    if(file.extension!=='docx'||file.digest!==digest)return fail('CONFLICT');
  }
  private async materialAssociation(tx: Transaction, classroomId: string, unitId: unknown, topicId: unknown) {
    if (unitId !== null && !uuid(unitId)) return fail('INVALID_INPUT');
    if (topicId !== null && (!uuid(topicId) || unitId === null)) return fail('INVALID_INPUT');
    if (unitId !== null) {
      const [unit] = await tx.query('SELECT id FROM units WHERE id=$1::uuid AND classroom_id=$2::uuid FOR SHARE', unitId, classroomId);
      if (!unit) return fail('FORBIDDEN');
    }
    if (topicId !== null) {
      const [topic] = await tx.query('SELECT id FROM topics WHERE id=$1::uuid AND unit_id=$2::uuid AND classroom_id=$3::uuid FOR SHARE', topicId, unitId, classroomId);
      if (!topic) return fail('FORBIDDEN');
    }
  }
}

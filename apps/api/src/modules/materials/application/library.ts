import type { LibraryRepository } from './library-repository.ts';
import type { MaterialPublisherPort } from './ports.ts';
import type { ClassroomFileOperations } from './ports.ts';
import type { ClassroomAccess } from '../../classrooms/public.ts';
import { revision } from '../../classrooms/public.ts';
import { fail, object, text, uuid } from '../../classrooms/public.ts';
import type { Transaction } from '../../classrooms/public.ts';
import {createTextDocument} from '../../../../../../src/core/domain/documents/text-document.ts';
function materialText(value: unknown): string | null {
  if(value===null||value===undefined)return null;
  if(typeof value!=='string'||[...value].length>20000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value))return fail('INVALID_INPUT');
  return value||null;
}

/** Material identity and file bytes are permanent; organization may change independently of activity links. */
export class LibraryService {
  private readonly run: ClassroomAccess['run'];
  private readonly classroom: ClassroomAccess['classroom'];
  private readonly publisher: MaterialPublisherPort;
  private readonly advanceRevision: ClassroomFileOperations['advanceRevision'];
  private readonly readyFile: ClassroomFileOperations['readyClassroomFile'];
  constructor(context: Pick<ClassroomAccess, 'run' | 'classroom'>, dependencies: Pick<ClassroomFileOperations, 'readyClassroomFile' | 'advanceRevision'> & { publisher: MaterialPublisherPort }, private readonly repository: LibraryRepository, private readonly digest: (content: string | Uint8Array) => string) {
    this.run = context.run.bind(context);
    this.classroom = context.classroom.bind(context);
    this.publisher = dependencies.publisher;
    this.advanceRevision = dependencies.advanceRevision;
    this.readyFile = dependencies.readyClassroomFile.bind(dependencies);
  }
  listMaterials(request: unknown, classroomId: string) {
    return this.run(request, false, async (tx, actor) => {
      const classroom = await this.classroom(tx, actor, classroomId);
      return this.repository.readActivityMaterials01(tx, classroomId, classroom.teacher_id === actor.id);
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
        const commandHash=this.digest(JSON.stringify([expected,op.id.toLowerCase(),op.fileId.toLowerCase(),title,content,resourceUse,op.unitId,op.topicId]));
        const [existing]=await this.repository.readMaterialRevisions02<{current_id:string;classroom_revision:bigint}>(tx, op.id, commandHash);
        if(existing)return {revision:String(existing.classroom_revision),materialId:existing.current_id};
        if(classroom.revision.toString()!==expected)return fail('CONFLICT');
        if((await this.repository.readMaterialRevisions03(tx, op.id)).length)return fail('CONFLICT');
        await this.verifyText(tx,request,classroomId,op.fileId,title,content);
        const result=await this.publisher.publish(tx,request,actor.id,{classroomId,revision:expected,title,fileId:op.fileId,unitId:op.unitId,topicId:op.topicId});
        await this.repository.updateMaterials04(tx, result.materialId, content, resourceUse, 'TEXT');
        await this.repository.insertMaterialRevisions05(tx, op.id, result.materialId, classroomId, result.classroomRevision, commandHash);
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
          await this.repository.updateMaterials06(tx, result.materialId, content, resourceUse, contentKind);
          return { revision: result.classroomRevision };
        } else {
          await this.materialAssociation(tx, classroomId, op.unitId, op.topicId);
          const previous = await this.material(tx, classroomId, op.id);
          const nextBody=Object.hasOwn(op,'body')?content:previous.body,nextKind=Object.hasOwn(op,'contentKind')?contentKind:previous.content_kind;
          if(nextKind!==previous.content_kind)return fail('CONFLICT');
          if (previous.content_kind === 'TEXT' && (nextKind !== 'TEXT' || nextBody !== previous.body || title!==previous.title)) return fail('CONFLICT');
          if((await this.repository.readMaterialRevisions07(tx, op.id)).length)return fail('CONFLICT');
          if (metadataKeys.length) await this.repository.updateMaterials08(tx, op.id, nextBody, Object.hasOwn(op,'resourceUse')?resourceUse:previous.resource_use, nextKind);
          await this.repository.updateMaterials09(tx, op.id, title, op.unitId, op.topicId);
        }
      } else if (op.action === 'delete') {
        exact(['id', 'confirm']);
        if (op.confirm !== true) return fail('INVALID_INPUT');
        const material = await this.material(tx, classroomId, op.id);
        if((await this.repository.readMaterialRevisions10(tx, op.id)).length)return fail('CONFLICT');
        const [linked] = await this.repository.readActivityMaterials11(tx, material.id, material.file_id);
        if (linked) return fail('CONFLICT');
        // Immediate durable denial, not abandoned-upload cleanup. Quota remains until confirmed object removal.
        await this.repository.updateMaterials12(tx, material.id);
      } else return fail('INVALID_INPUT');
      return this.advanceRevision(tx, classroomId, classroom.revision);
    });
  }

  private async material(tx: Transaction, classroomId: string, id: unknown) {
    if (!uuid(id)) return fail('INVALID_INPUT');
    const [row] = await this.repository.readMaterials13<{ id: string; title:string;file_id: string; deleted_at: Date | null; content_kind: string; body: string | null; resource_use: string }>(tx, id, classroomId);
    if (!row) return fail('FORBIDDEN');
    if (row.deleted_at) return fail('CONFLICT');
    return row;
  }
  private async verifyText(tx:Transaction,request:unknown,classroomId:string,fileId:unknown,title:string,body:string){
    const file=await this.readyFile(tx,request,classroomId,fileId,'material');
    const digest=this.digest(createTextDocument(title,body));
    if(file.extension!=='docx'||file.digest!==digest)return fail('CONFLICT');
  }
  private async materialAssociation(tx: Transaction, classroomId: string, unitId: unknown, topicId: unknown) {
    if (unitId !== null && !uuid(unitId)) return fail('INVALID_INPUT');
    if (topicId !== null && (!uuid(topicId) || unitId === null)) return fail('INVALID_INPUT');
    if (unitId !== null) {
      const [unit] = await this.repository.readUnits14(tx, unitId, classroomId);
      if (!unit) return fail('FORBIDDEN');
    }
    if (topicId !== null) {
      const [topic] = await this.repository.readTopics15(tx, topicId, unitId, classroomId);
      if (!topic) return fail('FORBIDDEN');
    }
  }
}

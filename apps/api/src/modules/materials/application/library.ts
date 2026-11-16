import type { LibraryRepository } from './library-repository.ts';
import type { MaterialPublisherPort } from './ports.ts';
import type { ClassroomFileOperations } from './ports.ts';
import type { ClassroomAccess } from '../../classrooms/public.ts';
import { revision } from '../../classrooms/public.ts';
import { fail, object, text, uuid } from '../../classrooms/public.ts';
import type { Transaction } from '../../classrooms/public.ts';
import {createTextDocument} from '../../../../../../src/core/domain/documents/text-document.ts';
function materialText(value: unknown, max = 20000): string | null {
  if(value===null||value===undefined)return null;
  if(typeof value!=='string'||[...value].length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value))return fail('INVALID_INPUT');
  return value||null;
}

function materialActivityIds(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every(uuid)) return fail('INVALID_INPUT');
  const ids = value.map(id => id.toLowerCase());
  if (new Set(ids).size !== ids.length) return fail('INVALID_INPUT');
  return ids;
}

/** Material identity and file bytes are permanent. Metadata and eligible activity links change atomically. */
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
    const op = object(body.operation, ['action', 'id', 'title', 'fileId', 'unitId', 'topicId', 'confirm', 'body', 'resourceUse', 'contentKind', 'description', 'activityIds']);
    const metadataKeys = ['body','resourceUse','contentKind'].filter(key => Object.hasOwn(op,key));
    const publishMetadata = ['description', 'activityIds'].filter(key => Object.hasOwn(op, key));
    const description = publishMetadata.includes('description') ? materialText(op.description, 2000)?.trim() || null : undefined;
    const activityIds = publishMetadata.includes('activityIds') ? materialActivityIds(op.activityIds) : undefined;
    const content = materialText(op.body);
    const resourceUse = op.resourceUse ?? 'STUDY', contentKind = op.contentKind ?? 'FILE';
    if (!['STUDY','RECOMMENDED','COMPLEMENTARY'].includes(resourceUse) || !['TEXT','FILE'].includes(contentKind)
      || (contentKind === 'TEXT' && (op.action === 'publish' || Object.hasOwn(op,'body')) && !content?.trim())) return fail('INVALID_INPUT');
    return this.run(request, true, async (tx, actor) => {
      const classroom = await this.classroom(tx, actor, classroomId, true, true);
      if(op.action==='revise') {
        object(op,['action','id','title','fileId','unitId','topicId','body','resourceUse','contentKind',...publishMetadata]);
        if(contentKind!=='TEXT'||!content?.trim()||!uuid(op.id)||!uuid(op.fileId))return fail('INVALID_INPUT');
        const title=text(op.title,200),previous=await this.material(tx,classroomId,op.id);
        if(previous.content_kind!=='TEXT')return fail('CONFLICT');
        const hashParts: unknown[] = [expected,op.id.toLowerCase(),op.fileId.toLowerCase(),title,content,resourceUse,op.unitId,op.topicId];
        if (publishMetadata.length) hashParts.push({description,activityIds});
        const commandHash=this.digest(JSON.stringify(hashParts));
        const [existing]=await this.repository.readMaterialRevisions02<{current_id:string;classroom_revision:bigint}>(tx, op.id, commandHash);
        if(existing)return {revision:String(existing.classroom_revision),materialId:existing.current_id};
        if(classroom.revision.toString()!==expected)return fail('CONFLICT');
        if((await this.repository.readMaterialRevisions03(tx, op.id)).length)return fail('CONFLICT');
        await this.verifyText(tx,request,classroomId,op.fileId,title,content);
        const result=await this.publisher.publish(tx,request,actor.id,{classroomId,revision:expected,title,fileId:op.fileId,unitId:op.unitId,topicId:op.topicId});
        await this.repository.updateMaterials04(tx, result.materialId, content, resourceUse, 'TEXT');
        if (description !== undefined || previous.description !== null) await this.repository.updateDescription(tx, result.materialId, description === undefined ? previous.description : description);
        if (activityIds !== undefined) {
          const links = await this.repository.activitiesForLinks(tx, classroomId, previous.id, activityIds);
          const desired = new Set(activityIds);
          if (links.filter(item => desired.has(item.id)).length !== desired.size) return fail('FORBIDDEN');
          if (links.some(item => item.first_started_at !== null && item.linked !== desired.has(item.id))) return fail('CONFLICT');
          if (links.some(item => item.status === 'WITHDRAWN' && !item.linked && desired.has(item.id))) return fail('CONFLICT');
          const eligible = links.filter(item => item.first_started_at === null && !(item.status === 'WITHDRAWN' && item.linked && desired.has(item.id)));
          const attach = eligible.filter(item => desired.has(item.id)).map(item => item.id);
          await this.updateActivityLinks(tx, classroomId, result.materialId, attach);
          const detach = eligible.filter(item => item.linked).map(item => item.id);
          if (detach.length) await this.repository.removeActivityLinks(tx, classroomId, previous.id, detach);
        }
        await this.repository.insertMaterialRevisions05(tx, op.id, result.materialId, classroomId, result.classroomRevision, commandHash);
        return {revision:result.classroomRevision,materialId:result.materialId};
      }
      if (classroom.revision.toString() !== expected) return fail('CONFLICT');
      const exact = (keys: string[]) => {
        object(op, ['action', ...keys]);
        if (keys.some(key => !Object.hasOwn(op, key))) return fail('INVALID_INPUT');
      };
      if (['publish', 'edit', 'organize'].includes(op.action)) {
        exact([...(op.action === 'publish' ? ['title', 'fileId', 'unitId', 'topicId'] : ['id', 'title', 'unitId', 'topicId']),...metadataKeys, ...publishMetadata]);
        const title = text(op.title, 200);
        if (op.action === 'publish') {
          if(contentKind==='TEXT')await this.verifyText(tx,request,classroomId,op.fileId,title,content!);
          const result = await this.publisher.publish(tx, request, actor.id, { classroomId, revision: expected, title,
            fileId: op.fileId, unitId: op.unitId, topicId: op.topicId });
          await this.repository.updateMaterials06(tx, result.materialId, content, resourceUse, contentKind);
          if (description !== undefined) await this.repository.updateDescription(tx, result.materialId, description);
          if (activityIds !== undefined) await this.updateActivityLinks(tx, classroomId, result.materialId, activityIds);
          return { revision: result.classroomRevision };
        } else {
          await this.materialAssociation(tx, classroomId, op.unitId, op.topicId);
          const previous = await this.material(tx, classroomId, op.id);
          const nextBody=Object.hasOwn(op,'body')?content:previous.body,nextKind=Object.hasOwn(op,'contentKind')?contentKind:previous.content_kind;
          if(nextKind!==previous.content_kind)return fail('CONFLICT');
          if (previous.content_kind === 'TEXT' && (nextKind !== 'TEXT' || nextBody !== previous.body || title!==previous.title)) return fail('CONFLICT');
          if((await this.repository.readMaterialRevisions07(tx, op.id)).length)return fail('CONFLICT');
          const legacyDescription = nextKind === 'FILE' && Object.hasOwn(op, 'body') && description === undefined;
          if (metadataKeys.length) await this.repository.updateMaterials08(tx, op.id, nextBody,
            Object.hasOwn(op,'resourceUse') ? resourceUse : previous.resource_use, nextKind, legacyDescription);
          await this.repository.updateMaterials09(tx, op.id, title, op.unitId, op.topicId);
          if (description !== undefined) await this.repository.updateDescription(tx, previous.id, description);
          if (activityIds !== undefined) await this.updateActivityLinks(tx, classroomId, previous.id, activityIds,
            () => this.readyFile(tx, request, classroomId, previous.file_id, 'material'));
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
    const [row] = await this.repository.readMaterials13<{ id: string; title:string;file_id: string; deleted_at: Date | null; content_kind: string; description: string | null; body: string | null; resource_use: string }>(tx, id, classroomId);
    if (!row) return fail('FORBIDDEN');
    if (row.deleted_at) return fail('CONFLICT');
    return row;
  }
  private async updateActivityLinks(tx: Transaction, classroomId: string, materialId: string, desiredIds: string[],
    ensureFileReady?: () => Promise<unknown>) {
    const activities = await this.repository.activitiesForLinks(tx, classroomId, materialId, desiredIds);
    const desired = new Set(desiredIds);
    if (activities.filter(activity => desired.has(activity.id)).length !== desired.size) return fail('FORBIDDEN');
    const changed = activities.filter(activity => activity.linked !== desired.has(activity.id));
    if (changed.some(activity => activity.first_started_at !== null || (!activity.linked && activity.status === 'WITHDRAWN')))
      return fail('CONFLICT');
    const removed = changed.filter(activity => activity.linked).map(activity => activity.id);
    const added = changed.filter(activity => !activity.linked).map(activity => activity.id);
    if (added.length) await ensureFileReady?.();
    if (removed.length) await this.repository.removeActivityLinks(tx, classroomId, materialId, removed);
    if (added.length) await this.repository.addActivityLinks(tx, classroomId, materialId, added);
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

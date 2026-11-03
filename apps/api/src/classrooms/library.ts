import { createLibraryMaterialPublisher } from './library-publication.ts';
import type { ClassroomFileOperations } from './classroom-file.ts';
import type { ClassroomCore } from './core.ts';
import { revision } from './revision.ts';
import { fail, object, text, uuid } from './policy.ts';
import type { Transaction } from './contracts.ts';

/** Material identity and file bytes are permanent; organization may change independently of activity links. */
export class LibraryService {
  private readonly run: ClassroomCore['run'];
  private readonly classroom: ClassroomCore['classroom'];
  private readonly publisher: ReturnType<typeof createLibraryMaterialPublisher>;
  private readonly advanceRevision: ClassroomFileOperations['advanceRevision'];
  constructor(context: Pick<ClassroomCore, 'run' | 'classroom'>, dependencies: Pick<ClassroomFileOperations, 'readyClassroomFile' | 'advanceRevision'>) {
    this.run = context.run.bind(context);
    this.classroom = context.classroom.bind(context);
    this.publisher = createLibraryMaterialPublisher(dependencies);
    this.advanceRevision = dependencies.advanceRevision;
  }
  listMaterials(request: unknown, classroomId: string) {
    return this.run(request, false, async (tx, actor) => {
      const classroom = await this.classroom(tx, actor, classroomId);
      return tx.query(`SELECT m.id,m.title,m.file_id AS "fileId",m.unit_id AS "unitId",m.topic_id AS "topicId",
        f.original_name AS "fileName",f.extension,f.size_bytes::text AS "sizeBytes",
        (m.deleted_at IS NOT NULL) AS deleted,(m.deleted_at IS NOT NULL AND f.blob_deleted_at IS NULL) AS "deletionPending",
        (m.deleted_at IS NULL AND f.blob_deleted_at IS NULL AND c.phase='ready' AND f.validation_status='APPROVED' AND f.scan_status='CLEAN'
          AND u.status='COMPLETED' AND c.digest IS NOT NULL AND c.digest=c.validated_digest AND c.digest=c.scanned_digest) AS ready,
        (m.deleted_at IS NULL AND f.extension IN ('pdf','jpg','jpeg','png')) AS previewable,
        EXISTS(SELECT 1 FROM activity_materials a WHERE a.material_id=m.id) AS linked
        FROM materials m JOIN files f ON f.id=m.file_id JOIN file_custodies c ON c.file_id=f.id JOIN uploads u ON u.file_id=f.id
        WHERE m.classroom_id=$1::uuid AND ($2::boolean OR (m.deleted_at IS NULL AND f.blob_deleted_at IS NULL
          AND c.phase='ready' AND f.validation_status='APPROVED' AND f.scan_status='CLEAN' AND u.status='COMPLETED'
          AND c.digest IS NOT NULL AND c.digest=c.validated_digest AND c.digest=c.scanned_digest))
        ORDER BY m.created_at DESC,m.id`, classroomId, classroom.teacher_id === actor.id);
    });
  }

  changeLibrary(request: unknown, classroomId: string, input: unknown) {
    const body = object(input, ['revision', 'operation']), expected = revision(body.revision);
    const op = object(body.operation, ['action', 'id', 'title', 'fileId', 'unitId', 'topicId', 'confirm']);
    return this.run(request, true, async (tx, actor) => {
      const classroom = await this.classroom(tx, actor, classroomId, true, true);
      if (classroom.revision.toString() !== expected) return fail('CONFLICT');
      const exact = (keys: string[]) => {
        object(op, ['action', ...keys]);
        if (keys.some(key => !Object.hasOwn(op, key))) return fail('INVALID_INPUT');
      };
      if (op.action === 'publish' || op.action === 'edit') {
        exact(op.action === 'publish' ? ['title', 'fileId', 'unitId', 'topicId'] : ['id', 'title', 'unitId', 'topicId']);
        const title = text(op.title, 200);
        if (op.action === 'publish') {
          const result = await this.publisher.publish(tx, request, actor.id, { classroomId, revision: expected, title,
            fileId: op.fileId, unitId: op.unitId, topicId: op.topicId });
          return { revision: result.classroomRevision };
        } else {
          await this.materialAssociation(tx, classroomId, op.unitId, op.topicId);
          await this.material(tx, classroomId, op.id);
          await tx.query(`UPDATE materials SET title=$2,unit_id=$3::uuid,topic_id=$4::uuid,updated_at=clock_timestamp()
            WHERE id=$1::uuid RETURNING id`, op.id, title, op.unitId, op.topicId);
        }
      } else if (op.action === 'delete') {
        exact(['id', 'confirm']);
        if (op.confirm !== true) return fail('INVALID_INPUT');
        const material = await this.material(tx, classroomId, op.id);
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
    const [row] = await tx.query<{ id: string; file_id: string; deleted_at: Date | null }>(
      'SELECT id,file_id,deleted_at FROM materials WHERE id=$1::uuid AND classroom_id=$2::uuid FOR UPDATE', id, classroomId);
    if (!row) return fail('FORBIDDEN');
    if (row.deleted_at) return fail('CONFLICT');
    return row;
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

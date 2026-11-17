import test from 'node:test';
import assert from 'node:assert/strict';
import { createLibraryRepository } from '../infrastructure/library-repository.ts';

const cases = [
  {
    "name": "listMaterials",
    "input": {
      "classroomId": "classroomId",
      "includeDeleted": true
    },
    "sql": "SELECT m.id,m.title,m.body,\n        CASE WHEN m.content_kind='FILE' THEN COALESCE(m.description,m.body) ELSE m.description END AS description,m.resource_use AS \"resourceUse\",m.content_kind AS \"contentKind\",m.file_id AS \"fileId\",m.unit_id AS \"unitId\",m.topic_id AS \"topicId\",\n        f.original_name AS \"fileName\",f.extension,f.size_bytes::text AS \"sizeBytes\",\n        (m.deleted_at IS NOT NULL) AS deleted,(m.deleted_at IS NOT NULL AND f.blob_deleted_at IS NULL) AS \"deletionPending\",\n        (m.deleted_at IS NULL AND f.blob_deleted_at IS NULL AND c.phase='ready' AND f.validation_status='APPROVED' AND f.scan_status='CLEAN'\n          AND u.status='COMPLETED' AND c.digest IS NOT NULL AND c.digest=c.validated_digest AND c.digest=c.scanned_digest) AS ready,\n        (m.deleted_at IS NULL AND f.extension IN ('pdf','jpg','jpeg','png')) AS previewable,\n        linked_activities.ids AS \"activityIds\",cardinality(linked_activities.ids)>0 AS linked,\n        (SELECT r.current_id FROM material_revisions r WHERE r.previous_id=m.id) AS \"supersededBy\"\n        FROM materials m JOIN files f ON f.id=m.file_id JOIN file_custodies c ON c.file_id=f.id JOIN uploads u ON u.file_id=f.id\n        CROSS JOIN LATERAL (SELECT ARRAY(\n          SELECT link.activity_id FROM activity_materials link JOIN activities a ON a.id=link.activity_id AND a.classroom_id=link.classroom_id\n          WHERE link.material_id=m.id AND link.classroom_id=m.classroom_id AND ($2::boolean OR a.status='PUBLISHED')\n          ORDER BY a.title,a.id) AS ids) linked_activities\n        WHERE m.classroom_id=$1::uuid AND ($2::boolean OR (m.deleted_at IS NULL AND f.blob_deleted_at IS NULL\n          AND c.phase='ready' AND f.validation_status='APPROVED' AND f.scan_status='CLEAN' AND u.status='COMPLETED'\n          AND c.digest IS NOT NULL AND c.digest=c.validated_digest AND c.digest=c.scanned_digest))\n        ORDER BY m.created_at DESC,m.id",
    "args": [
      "classroomId",
      true
    ]
  },
  {
    "name": "findRevisionReplay",
    "input": {
      "previousId": "previousId",
      "commandHash": "commandHash"
    },
    "sql": "SELECT r.current_id,r.classroom_revision FROM material_revisions r\n          WHERE r.previous_id=$1::uuid AND r.command_hash=$2",
    "args": [
      "previousId",
      "commandHash"
    ]
  },
  {
    "name": "findSuccessor",
    "input": {
      "materialId": "materialId"
    },
    "sql": "SELECT 1 FROM material_revisions WHERE previous_id=$1::uuid",
    "args": [
      "materialId"
    ]
  },
  {
    "name": "saveRevisionContent",
    "input": {
      "materialId": "materialId",
      "body": "body",
      "resourceUse": "resourceUse",
      "contentKind": "contentKind"
    },
    "sql": "UPDATE materials SET body=$2,resource_use=$3,content_kind=$4 WHERE id=$1::uuid",
    "args": [
      "materialId",
      "body",
      "resourceUse",
      "contentKind"
    ]
  },
  {
    "name": "recordRevision",
    "input": {
      "previousId": "previousId",
      "currentId": "currentId",
      "classroomId": "classroomId",
      "classroomRevision": "classroomRevision",
      "commandHash": "commandHash"
    },
    "sql": "INSERT INTO material_revisions(previous_id,current_id,classroom_id,classroom_revision,command_hash) VALUES($1::uuid,$2::uuid,$3::uuid,$4::bigint,$5)",
    "args": [
      "previousId",
      "currentId",
      "classroomId",
      "classroomRevision",
      "commandHash"
    ]
  },
  {
    "name": "savePublishedContent",
    "input": {
      "materialId": "materialId",
      "body": "body",
      "resourceUse": "resourceUse",
      "contentKind": "contentKind"
    },
    "sql": "UPDATE materials SET body=$2,resource_use=$3,content_kind=$4 WHERE id=$1::uuid RETURNING id",
    "args": [
      "materialId",
      "body",
      "resourceUse",
      "contentKind"
    ]
  },
  {
    "name": "findSuccessorForEdit",
    "input": {
      "materialId": "materialId"
    },
    "sql": "SELECT 1 FROM material_revisions WHERE previous_id=$1::uuid",
    "args": [
      "materialId"
    ]
  },
  {
    "name": "updateContentMetadata",
    "input": {
      "materialId": "materialId",
      "body": "body",
      "resourceUse": "resourceUse",
      "contentKind": "contentKind",
      "clearDescription": true
    },
    "sql": "UPDATE materials SET body=$2,resource_use=$3,content_kind=$4,\n    description=CASE WHEN $5::boolean THEN NULL ELSE description END WHERE id=$1::uuid RETURNING id",
    "args": [
      "materialId",
      "body",
      "resourceUse",
      "contentKind",
      true
    ]
  },
  {
    "name": "updateOrganization",
    "input": {
      "materialId": "materialId",
      "title": "title",
      "unitId": "unitId",
      "topicId": "topicId"
    },
    "sql": "UPDATE materials SET title=$2,unit_id=$3::uuid,topic_id=$4::uuid,updated_at=clock_timestamp()\n            WHERE id=$1::uuid RETURNING id",
    "args": [
      "materialId",
      "title",
      "unitId",
      "topicId"
    ]
  },
  {
    "name": "findSuccessorForDeletion",
    "input": {
      "materialId": "materialId"
    },
    "sql": "SELECT 1 FROM material_revisions WHERE previous_id=$1::uuid",
    "args": [
      "materialId"
    ]
  },
  {
    "name": "findFileReferences",
    "input": {
      "materialId": "materialId",
      "fileId": "fileId"
    },
    "sql": "SELECT 1 FROM activity_materials WHERE material_id=$1::uuid\n          UNION ALL SELECT 1 FROM materials WHERE file_id=$2::uuid AND id<>$1::uuid\n          UNION ALL SELECT 1 FROM study_plan_versions WHERE file_id=$2::uuid\n          UNION ALL SELECT 1 FROM activity_instruction_files WHERE file_id=$2::uuid\n          UNION ALL SELECT 1 FROM attempt_attachments WHERE file_id=$2::uuid LIMIT 1",
    "args": [
      "materialId",
      "fileId"
    ]
  },
  {
    "name": "markDeleted",
    "input": {
      "materialId": "materialId"
    },
    "sql": "UPDATE materials SET deleted_at=clock_timestamp(),unit_id=NULL,topic_id=NULL,updated_at=clock_timestamp()\n          WHERE id=$1::uuid RETURNING id",
    "args": [
      "materialId"
    ]
  },
  {
    "name": "lockMaterial",
    "input": {
      "materialId": "materialId",
      "classroomId": "classroomId"
    },
    "sql": "SELECT id,title,file_id,deleted_at,content_kind,body,description,resource_use FROM materials WHERE id=$1::uuid AND classroom_id=$2::uuid FOR UPDATE",
    "args": [
      "materialId",
      "classroomId"
    ]
  },
  {
    "name": "findUnit",
    "input": {
      "unitId": "unitId",
      "classroomId": "classroomId"
    },
    "sql": "SELECT id FROM units WHERE id=$1::uuid AND classroom_id=$2::uuid FOR SHARE",
    "args": [
      "unitId",
      "classroomId"
    ]
  },
  {
    "name": "findTopic",
    "input": {
      "topicId": "topicId",
      "unitId": "unitId",
      "classroomId": "classroomId"
    },
    "sql": "SELECT id FROM topics WHERE id=$1::uuid AND unit_id=$2::uuid AND classroom_id=$3::uuid FOR SHARE",
    "args": [
      "topicId",
      "unitId",
      "classroomId"
    ]
  }
];
for (const scenario of cases) {
  test('library '+scenario.name+' preserves SQL, argument order and transaction', async () => {
    const rows = [{id: 'synthetic'}];
    const tx = {query: async function(sql, ...args) {
      assert.equal(this, tx);
      assert.equal(sql, scenario.sql);
      assert.deepEqual(args, scenario.args);
      return rows;
    }};
    assert.equal(await createLibraryRepository()[scenario.name](tx, scenario.input), rows);
  });
}

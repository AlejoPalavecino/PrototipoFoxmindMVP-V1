import { loadTsModule } from './load-ts-module.mjs';
import { hookView } from '../agenda-ui-helpers.test.mjs';
import { useState } from 'react';
import assert from 'node:assert/strict';

const grading = loadTsModule('apps/web/src/features/grading/api.ts');
const { createMaterialsApi } = loadTsModule('apps/web/src/features/materials/api.ts');
const { createActivityAuthoringApi, createActivityGenerationApi } = loadTsModule('apps/web/src/features/activity-authoring/api.ts');
const participation = loadTsModule('apps/web/src/features/participation/api.ts');

export function participationFixtureProps(kind, props) {
  const { api, classroomId, ...rest } = props;
  const attemptId = props.data.attempt?.id ?? null, editor = props.editor ?? null;
  if (kind === 'AttemptAnswers') return { ...rest, operations: participation.createAttemptReadingApi(api) };
  if (kind === 'QuestionnaireAttempt') return { ...rest,
    operations: participation.createQuestionnaireAttemptApi(api, classroomId, attemptId, editor),
    reading: participation.createAttemptReadingApi(api),
  };
  assert.equal(kind, 'PracticalAttempt');
  return { ...rest,
    operations: participation.createPracticalAttemptApi(api, classroomId, attemptId, editor),
    attachments: participation.createAttemptAttachmentsApi(api, classroomId, attemptId, editor),
  };
}

// The transport fake still records HTTP paths/payloads. Production adapters bind
// those same fixtures to the capability ports now required by each component.
export function gradingFixtureProps(kind, props) {
  const { api, roomId, attemptId, classroomId, studentId, ...rest } = props;
  const identities = { roomId, attemptId, classroomId, studentId };
  if (kind === 'GradingEditor') return { ...rest, ...identities,
    operations: grading.createGradingEditingApi(api, roomId, attemptId),
    publication: grading.createGradingPublicationApi(api, roomId, attemptId),
    aiReview: grading.createGradingAiReviewApi(api, roomId, attemptId),
    corrections: grading.createGradeCorrectionsApi(api, roomId, attemptId),
  };
  if (kind === 'StudentRecord') return { ...rest, ...identities,
    progressOperations: grading.createGradingProgressApi(api, classroomId),
    summaryOperations: grading.createStudentSummaryApi(api, classroomId, props.summary.studentId),
  };
  const factory = { GradingAiReview: grading.createGradingAiReviewApi,
    PublishedGradeCorrection: grading.createGradeCorrectionsApi,
    PublishedResult: grading.createGradingResultsApi,
    Progress: grading.createGradingProgressApi, StudentAiSummary: grading.createStudentSummaryApi }[kind];
  return { ...rest, ...identities, operations: factory(api, roomId ?? classroomId, attemptId ?? studentId) };
}

const generationCache = new WeakMap();
export function generationFixtureApi(transport, roomId) {
  let rooms = generationCache.get(transport);
  if (!rooms) generationCache.set(transport, rooms = new Map());
  if (!rooms.has(roomId)) rooms.set(roomId, createActivityGenerationApi(transport, roomId));
  return rooms.get(roomId);
}
export function authoringFixtureProps(kind, props) {
  return { ...props, api: kind === 'ActivityGeneration'
    ? generationFixtureApi(props.api, props.room.id)
    : createActivityAuthoringApi(props.api, props.room.id) };
}
export function materialsFixtureProps(props) { return { ...props, api: createMaterialsApi(props.api) }; }

// Explicitly mount the Library dispatcher and its real MaterialPublishing
// render prop with independent hook lifecycles. No other child is auto-expanded.
export function libraryFixtureView(Library, props) {
  const adapted = materialsFixtureProps(props), operationApi = adapted.api;
  const entry = Library(adapted);
  let refreshHost;
  function LibraryCaseHost() {
    const [, update] = useState(0);
    refreshHost = () => update(value => value + 1);
    return entry.type(adapted);
  }
  const host = hookView(LibraryCaseHost, {});
  let publisher, publisherProps, rerender;
  function PublishingHost() {
    const [, update] = useState(0);
    rerender = () => update(value => value + 1);
    return host.tree.type(publisherProps);
  }
  return {
    get tree() { return publisher ? publisher.tree : host.tree; },
    update(next) { Object.assign(props, next); refreshHost(); },
    async flush() {
      Object.assign(adapted, props, { api: operationApi });
      await host.flush();
      if (entry.type.name !== 'MaterialCatalog') return;
      assert.equal(host.tree.type.name, 'MaterialPublishing', 'catalog must compose the real publisher');
      for (let i = 0; i < 3; i++) {
        publisherProps = host.tree.props;
        if (!publisher) publisher = hookView(PublishingHost, {});
        else rerender();
        await publisher.flush();
        await host.flush();
      }
    },
    close() { publisher?.close(); host.close(); },
  };
}

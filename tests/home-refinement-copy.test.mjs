import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const helpers = () => loadTsModule('apps/classrooms-ui/home-presentation.ts');

test('setup summary includes only positive counts with correct singular and plural', () => {
  const { homeSetupSummary } = helpers();
  for (const [setup, expected] of [
    [{ drafts: 0, invitations: 0 }, ''],
    [{ drafts: 1, invitations: 0 }, '1 borrador privado'],
    [{ drafts: 2, invitations: 0 }, '2 borradores privados'],
    [{ drafts: 0, invitations: 1 }, '1 invitación pendiente'],
    [{ drafts: 0, invitations: 2 }, '2 invitaciones pendientes'],
    [{ drafts: 1, invitations: 2 }, '1 borrador privado · 2 invitaciones pendientes'],
    [{ drafts: 2, invitations: 1 }, '2 borradores privados · 1 invitación pendiente'],
  ]) assert.equal(homeSetupSummary(setup), expected);
});

test('review count uses the correct activity noun', () => {
  const { homeReviewCount } = helpers();
  assert.equal(homeReviewCount(0), '0 actividades');
  assert.equal(homeReviewCount(1), '1 actividad');
  assert.equal(homeReviewCount(2), '2 actividades');
});

test('review summary inflects deliveries and ready items while preserving zero counts', () => {
  const { homeReviewSummary } = helpers();
  assert.equal(homeReviewSummary({ attempts: 0, needsReview: 0, readyToPublish: 0 }), '0 entregas · 0 por revisar · 0 listas para publicar');
  assert.equal(homeReviewSummary({ attempts: 1, needsReview: 0, readyToPublish: 1 }), '1 entrega · 0 por revisar · 1 lista para publicar');
  assert.equal(homeReviewSummary({ attempts: 2, needsReview: 1, readyToPublish: 2 }), '2 entregas · 1 por revisar · 2 listas para publicar');
});

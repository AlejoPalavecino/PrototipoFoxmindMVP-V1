import type { SettingsRepository } from './settings-repository.ts';
import type { ClassroomRuntimeAccess } from '../../access/public.ts';
import { draftPayload, fail, object } from '../../domain/policy.ts';
import { revision } from '../../domain/revision.ts';
type DraftPublicationAccess = Pick<ClassroomRuntimeAccess, 'run' | 'classroom' | 'ports'>;
export function createSettingsOperations(repository: SettingsRepository) {
async function updateSettingsOperation(capability: DraftPublicationAccess, request: unknown, id: string, input: unknown) {
    const { expected, payload, aiGradingEnabled } = settingsInput(input);
    return capability.run(request, true, async (tx, actor) => {
      const row = await capability.classroom(tx, actor, id, true, true);
      if (row.revision.toString() !== expected) return fail('CONFLICT');
      if (aiGradingEnabled === true && !row.ai_grading_enabled && capability.ports.gradingAiAvailable !== true)
        return fail('SERVICE_UNAVAILABLE');
      await repository.updateSettings(tx, { classroomId: id, name: payload.name, subject: payload.subject, division: payload.division, academicYear: payload.academicYear, aiGradingEnabled: aiGradingEnabled ?? null, coverKey: payload.coverKey ?? null });
      return { revision: (row.revision + 1n).toString() };
    });
  }


function settingsInput(input: unknown) {
    const body = object(input, [
      'revision',
      'name',
      'subject',
      'division',
      'academicYear',
      'aiGradingEnabled',
      'coverKey',
    ]);
    if (Object.hasOwn(body, 'aiGradingEnabled') && typeof body.aiGradingEnabled !== 'boolean') return fail('INVALID_INPUT');
    const expected = revision(body.revision),
      { revision: _, aiGradingEnabled, ...fields } = body;
    const payload = draftPayload(fields, false);
    if (
      ['name', 'subject', 'division', 'academicYear'].some(
        (k) => !(k in payload),
      )
    )
      return fail('INVALID_INPUT');
    if (!payload.name || !payload.subject || !payload.division)
      return fail('INVALID_INPUT');

    return { expected, payload, aiGradingEnabled };
}

return { updateSettingsOperation };
}
